/**
 * Plays the isolated practice word out of a bundled studio recording.
 *
 * Each file in `public/audio/models/` is a carrier phrase followed by the word
 * on its own. `tools/audio/verify_word_clips.py` locates and grades that
 * isolated repeat, records the verdict in `src/data/word-clips.json`, and
 * writes the repeat out as a small standalone file under
 * `public/audio/clips/`. Playback uses those files whole: nothing here seeks
 * inside a recording, because media elements cannot seek without HTTP range
 * support and native asset handlers do not always provide it.
 *
 * Two playback routes exist. Web Audio decodes the clips once and schedules
 * them on the audio clock, which gives exact gaps. When a browser refuses to
 * start the audio context (iOS after the native recorder held the session,
 * a web view without a user gesture, or no Web Audio at all), the same
 * sequence is played through a gesture-primed `<audio>` element instead.
 * It is reused for the words of that sequence, then retired so an old
 * interrupted request cannot affect the next tap.
 */
import clipData from '../data/word-clips.json'
import type { TargetSound } from '../types'

export type ClipVerdict = 'clear' | 'weak' | 'bad'

export interface WordClip {
  key: string
  /** Standalone clip file containing only the isolated word. */
  src: string
  /** Nominal length of the clip, for scheduling estimates. */
  seconds: number
  expected: TargetSound
  /** Whether both the recognizer and the onset model identified this clip. */
  verdict: ClipVerdict
}

interface RawClip {
  /** Length of the standalone clip file. */
  seconds?: number
  /** Older entries: the span cut out of the carrier recording. */
  start?: number
  end?: number
  expected: string
  verdict: string
}

const raw = clipData.clips as Record<string, RawClip>

/** The studio recording key for an exercise id, e.g. `en-light-night` -> `en-light`. */
export function clipKeyForExercise(exerciseId: string): string {
  return exerciseId.split('-').slice(0, 2).join('-')
}

export function wordClip(exerciseId: string): WordClip | null {
  const key = clipKeyForExercise(exerciseId)
  const entry = raw[key]
  if (!entry) return null
  return {
    key,
    src: `/audio/clips/${key}.mp3`,
    seconds: Math.max(0.05, entry.seconds ?? (entry.end ?? 0) - (entry.start ?? 0)),
    expected: entry.expected === 'N' ? 'N' : 'L',
    verdict: entry.verdict === 'clear' ? 'clear' : entry.verdict === 'weak' ? 'weak' : 'bad',
  }
}

/** True when the clip is unambiguous enough to be used as an exam prompt. */
export function isVerifiedClip(exerciseId: string): boolean {
  return wordClip(exerciseId)?.verdict === 'clear'
}

export type WordAudioErrorCode = 'missing-clip' | 'web-audio' | 'element'

export class WordAudioError extends Error {
  readonly code: WordAudioErrorCode

  constructor(code: WordAudioErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'WordAudioError'
    this.code = code
  }
}

export interface SequencePlayback {
  /**
   * Resolves when the last word has finished or after `stop()`. Rejects with
   * a `WordAudioError` if playback fails part-way through.
   */
  readonly finished: Promise<void>
  stop: () => void
  /** Which route is playing, for diagnostics. */
  readonly route: 'web-audio' | 'element'
}

export interface SequenceOptions {
  /** Cancels even while downloading/starting, before a playback handle exists. */
  signal?: AbortSignal
  /** Silence between words, in milliseconds. */
  gapMs?: number
  /** Extra silence before a word that repeats the previous one, so "night night" is heard as two. */
  repeatGapMs?: number
  /** Called with the index being played, then with null when the sequence ends. */
  onItem?: (index: number | null) => void
}

const RESUME_TIMEOUT_MS = 1200
const LOAD_TIMEOUT_MS = 4000
const DEFAULT_GAP_MS = 800
const DEFAULT_REPEAT_GAP_MS = 350

/** Silence to leave after `clips[index]` before the next word. */
function gapAfter(clips: WordClip[], index: number, gapMs: number, repeatGapMs: number): number {
  const next = clips[index + 1]
  return gapMs + (next && next.key === clips[index].key ? repeatGapMs : 0)
}
/** One silent sample; playing it inside a tap unlocks the shared element on iOS. */
const SILENT_WAV = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQIAAAAAAA=='

type AudioContextConstructor = typeof AudioContext

function contextConstructor(): AudioContextConstructor | undefined {
  const audioWindow = window as typeof window & { webkitAudioContext?: AudioContextConstructor }
  return window.AudioContext ?? audioWindow.webkitAudioContext
}

let context: AudioContext | null = null
/** Decoded clips, keyed by recording. Stores the in-flight promise so a
 * sequence that repeats a word downloads and decodes it only once. */
const buffers = new Map<string, Promise<AudioBuffer>>()
let element: HTMLAudioElement | null = null
const activeStops = new Set<() => void>()

function cancelled(): DOMException {
  return new DOMException('Playback cancelled', 'AbortError')
}

/** Media promises may never settle on an interrupted WKWebView audio session. */
function bounded<T>(pending: Promise<T>, timeoutMs: number, failure: Error, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
    }
    const abort = () => { cleanup(); reject(cancelled()) }
    const timer = window.setTimeout(() => { cleanup(); reject(failure) }, timeoutMs)
    // Attach both handlers even if already aborted: late rejections are handled.
    pending.then((value) => { cleanup(); resolve(value) }, (error: unknown) => { cleanup(); reject(error) })
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
  })
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw cancelled()
}

/**
 * Prepares both playback routes. Call this synchronously inside the tap
 * handler: iOS only unlocks audio from a user gesture, and an `await` before
 * this point loses the gesture. Returns the audio context when Web Audio
 * exists, otherwise null.
 */
export function unlockAudio(): AudioContext | null {
  if (typeof Audio !== 'undefined' && !element) {
    element = new Audio()
    element.preload = 'auto'
    element.setAttribute('playsinline', '')
    element.src = SILENT_WAV
    void element.play().catch(() => undefined)
  }
  const Constructor = contextConstructor()
  if (!Constructor) return null
  if (!context || context.state === 'closed') context = new Constructor()
  void context.resume().catch(() => undefined)
  return context
}

/**
 * Waits, briefly, for the context to start. `resume()` never settles when the
 * page has no audio output or no user gesture, so the wait is bounded and a
 * blocked context becomes an error the caller can fall back from.
 */
async function ensureRunning(active: AudioContext, signal?: AbortSignal): Promise<void> {
  throwIfCancelled(signal)
  // Read through a function so the compiler does not assume the state is
  // unchanged after awaiting.
  const running = () => (active.state as AudioContextState) === 'running'
  if (!running()) {
    await bounded(active.resume(), RESUME_TIMEOUT_MS,
      new WordAudioError('web-audio', `audio context stayed ${active.state}`), signal)
      .catch((caught: unknown) => {
        throwIfCancelled(signal)
        throw new WordAudioError('web-audio', `audio context stayed ${active.state}`, { cause: caught })
      })
  }
  if (!running()) {
    throw new WordAudioError('web-audio', `audio context stayed ${active.state}`)
  }
  // WKWebView can claim "running" while its output clock is frozen after an
  // interruption. Test the real clock before scheduling, then fall back to the
  // already gesture-primed element if this context is not producing output.
  const began = active.currentTime
  let probe: number | undefined
  const ticking = new Promise<void>((resolve) => {
    probe = window.setInterval(() => { if (active.currentTime > began) resolve() }, 50)
  })
  try {
    await bounded(ticking, RESUME_TIMEOUT_MS, new WordAudioError('web-audio', 'audio output clock did not start'), signal)
  } catch (caught) {
    if (!signal?.aborted) {
      if (context === active) context = null
      void active.close().catch(() => undefined)
    }
    throw caught
  } finally { window.clearInterval(probe) }
}

function bufferFor(active: AudioContext, clip: WordClip): Promise<AudioBuffer> {
  const cached = buffers.get(clip.key)
  if (cached) return cached
  const download = new AbortController()
  const loading = (async () => {
    const response = await fetch(clip.src, { cache: 'force-cache', signal: download.signal })
    // Capacitor's Apple asset handler returns URLResponse (not HTTPURLResponse)
    // for media, so a successfully loaded bundled MP3 has status 0. This is
    // only valid for our local custom-scheme assets, never an opaque web fetch.
    const bundledAppleMedia = window.location.protocol === 'capacitor:'
      && window.location.hostname === 'localhost'
      && response.status === 0 && response.type !== 'opaque'
    if (!response.ok && !bundledAppleMedia) throw new WordAudioError('web-audio', `download of ${clip.key} failed (${response.status})`)
    try {
      const bytes = await response.arrayBuffer()
      if (!bytes.byteLength) throw new Error('Empty audio file')
      return await active.decodeAudioData(bytes)
    } catch (caught) {
      throw new WordAudioError('web-audio', `decode of ${clip.key} failed`, { cause: caught })
    }
  })()
  const pending = bounded(loading, LOAD_TIMEOUT_MS,
    new WordAudioError('web-audio', `loading ${clip.key} timed out`))
    .catch((caught: unknown) => {
      download.abort()
      throw caught instanceof WordAudioError ? caught
        : new WordAudioError('web-audio', `loading ${clip.key} failed`, { cause: caught })
    })
  buffers.set(clip.key, pending)
  // A failed download must not be remembered, so the next tap can retry.
  void pending.catch(() => {
    if (buffers.get(clip.key) === pending) buffers.delete(clip.key)
  })
  return pending
}

/** Downloads and decodes clips ahead of playback so a sequence starts without gaps. */
export async function preloadClips(exerciseIds: string[]): Promise<void> {
  const Constructor = contextConstructor()
  if (!Constructor) return
  if (!context || context.state === 'closed') context = new Constructor()
  const active = context
  const clips = exerciseIds.map(wordClip).filter((clip): clip is WordClip => clip !== null)
  await Promise.all(clips.map((clip) => bufferFor(active, clip).catch(() => undefined)))
}

function clipsFor(exerciseIds: string[]): WordClip[] {
  return exerciseIds.map((id) => {
    const clip = wordClip(id)
    if (!clip) throw new WordAudioError('missing-clip', `no studio clip for ${id}`)
    return clip
  })
}

async function playWithWebAudio(
  clips: WordClip[],
  { gapMs = DEFAULT_GAP_MS, repeatGapMs = DEFAULT_REPEAT_GAP_MS, onItem, signal }: SequenceOptions,
): Promise<SequencePlayback> {
  throwIfCancelled(signal)
  const active = unlockAudio()
  if (!active) throw new WordAudioError('web-audio', 'Web Audio is not available')
  const decoded = await bounded(Promise.all(clips.map((clip) => bufferFor(active, clip))), LOAD_TIMEOUT_MS + 100,
    new WordAudioError('web-audio', 'clip loading timed out'), signal)
  await ensureRunning(active, signal)
  throwIfCancelled(signal)

  const sources: AudioBufferSourceNode[] = []
  const timers: number[] = []
  let stopped = false
  let settle: () => void = () => undefined
  let fail: (error: Error) => void = () => undefined
  const finished = new Promise<void>((resolve, reject) => {
    settle = resolve
    fail = reject
  })

  const stop = () => {
    if (stopped) return
    stopped = true
    signal?.removeEventListener('abort', stop)
    activeStops.delete(stop)
    timers.forEach((timer) => window.clearTimeout(timer))
    sources.forEach((source) => {
      try { source.stop() } catch { /* Already ended or not yet started. */ }
      source.disconnect()
    })
    onItem?.(null)
    settle()
  }

  const startAt = active.currentTime + 0.12
  let offset = 0
  try {
    clips.forEach((clip, index) => {
      const source = active.createBufferSource()
      source.buffer = decoded[index]
      source.connect(active.destination)
      const duration = Math.max(0.05, decoded[index].duration || clip.seconds)
      const when = startAt + offset
      sources.push(source)
      source.start(when)
      timers.push(window.setTimeout(() => onItem?.(index), Math.max(0, (when - active.currentTime) * 1000)))
      offset += duration + (index < clips.length - 1 ? gapAfter(clips, index, gapMs, repeatGapMs) / 1000 : 0)
    })
  } catch (caught) {
    stop()
    throw new WordAudioError('web-audio', 'could not schedule audio', { cause: caught })
  }

  const totalMs = Math.max(0, (startAt + offset - active.currentTime) * 1000)
  timers.push(window.setTimeout(() => {
    // A wall-clock timer alone can report success when iOS has interrupted
    // the audio clock. Retire that context so the next tap can start fresh.
    if (active.currentTime < startAt + offset - 0.05) {
      fail(new WordAudioError('web-audio', 'audio output was interrupted; tap to retry'))
      if (context === active) context = null
      void active.close().catch(() => undefined)
    }
    stop()
  }, totalMs + 120))
  signal?.addEventListener('abort', stop, { once: true })
  activeStops.add(stop)

  return { finished, stop, route: 'web-audio' }
}

async function waitForMetadata(media: HTMLAudioElement, signal: AbortSignal): Promise<void> {
  throwIfCancelled(signal)
  if (media.readyState >= 1) return Promise.resolve()
  let cleanup: () => void = () => undefined
  const loaded = new Promise<void>((resolve, reject) => {
    const done = () => resolve()
    const fail = () => reject(new WordAudioError('element', 'media element could not load clip'))
    cleanup = () => {
      media.removeEventListener('loadedmetadata', done)
      media.removeEventListener('error', fail)
    }
    media.addEventListener('loadedmetadata', done)
    media.addEventListener('error', fail)
  })
  try {
    await bounded(loaded, LOAD_TIMEOUT_MS, new WordAudioError('element', 'media loading timed out'), signal)
  } finally { cleanup() }
}

async function cueClip(media: HTMLAudioElement, clip: WordClip, signal: AbortSignal): Promise<void> {
  throwIfCancelled(signal)
  // Reload for every word, including a repeat of the previous one. The files
  // are a few kilobytes and cached, and a fresh load avoids any seek, which
  // some web views cannot perform reliably even to zero.
  media.src = clip.src
  media.load()
  await waitForMetadata(media, signal)
}

/**
 * Consumes the gesture-primed element for this sequence. A later tap gets a
 * fresh element, so late load/play promises cannot change the newer player.
 */
async function playWithElement(
  clips: WordClip[],
  { gapMs = DEFAULT_GAP_MS, repeatGapMs = DEFAULT_REPEAT_GAP_MS, onItem, signal }: SequenceOptions,
): Promise<SequencePlayback> {
  throwIfCancelled(signal)
  // Do not recreate/resume a failed AudioContext while handing output to the
  // element that was already primed by the original tap.
  if (!element) unlockAudio()
  const media = element
  if (!media) throw new WordAudioError('element', 'no media element')
  element = null
  const lifetime = new AbortController()
  let stopped = false
  let cancelWait: (() => void) | null = null
  let settleCancelled: () => void = () => undefined
  const cancellation = new Promise<void>((resolve) => { settleCancelled = resolve })
  const timers: number[] = []
  const stop = () => {
    if (stopped) return
    stopped = true
    lifetime.abort()
    signal?.removeEventListener('abort', stop)
    activeStops.delete(stop)
    timers.forEach((timer) => window.clearTimeout(timer))
    cancelWait?.()
    cancelWait = null
    settleCancelled()
    media.pause()
    onItem?.(null)
  }
  signal?.addEventListener('abort', stop, { once: true })
  activeStops.add(stop)
  const sleep = (ms: number) => new Promise<void>((resolve) => {
    cancelWait = resolve
    timers.push(window.setTimeout(resolve, ms))
  })

  const playCued = async (clip: WordClip) => {
    try {
      throwIfCancelled(lifetime.signal)
      const started = media.play().then(() => {
        // A browser may fulfil play() after timeout or cancellation.
        if (stopped) media.pause()
      })
      await bounded(started, LOAD_TIMEOUT_MS,
        new WordAudioError('element', `starting ${clip.key} timed out`), lifetime.signal)
      throwIfCancelled(lifetime.signal)
    } catch (caught) {
      if (lifetime.signal.aborted) throw cancelled()
      if (caught instanceof WordAudioError) throw caught
      const name = caught instanceof Error ? caught.name : 'play failed'
      throw new WordAudioError('element', `media element refused ${clip.key} (${name})`, { cause: caught })
    }
  }

  const untilClipEnd = (clip: WordClip) =>
    new Promise<void>((resolve, reject) => {
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        media.removeEventListener('ended', done)
        media.pause()
        resolve()
      }
      media.addEventListener('ended', done)
      cancelWait = done
      // Safety net in case the ended event never arrives.
      const seconds = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : clip.seconds
      timers.push(window.setTimeout(() => {
        if (settled) return
        if (media.currentTime < seconds - 0.05) {
          reject(new WordAudioError('element', `audio output stalled during ${clip.key}; tap to retry`))
        }
        done()
      }, seconds * 1000 + 300))
    })

  // Start the first word before returning so a refused play() surfaces as a
  // rejection rather than a silent sequence.
  try {
    await cueClip(media, clips[0], lifetime.signal)
    await playCued(clips[0])
    onItem?.(0)
  } catch (caught) {
    stop()
    throw caught
  }

  const run = (async () => {
    for (let index = 0; index < clips.length; index += 1) {
      if (stopped) return
      if (index > 0) {
        await cueClip(media, clips[index], lifetime.signal)
        if (stopped) return
        await playCued(clips[index])
        onItem?.(index)
      }
      await untilClipEnd(clips[index])
      if (stopped) return
      if (index < clips.length - 1) await sleep(gapAfter(clips, index, gapMs, repeatGapMs))
    }
    cancelWait = null
  })()
  const finished = Promise.race([run, cancellation]).finally(stop)

  return { finished, stop, route: 'element' }
}

/**
 * Plays the given exercises as one sequence and returns a handle once the
 * first word is under way. Call `unlockAudio()` in the tap handler first.
 * Web Audio is tried first; if the browser refuses it, the sequence is
 * played through the primed `<audio>` element instead.
 */
export async function playSequence(exerciseIds: string[], options: SequenceOptions = {}): Promise<SequencePlayback> {
  throwIfCancelled(options.signal)
  const clips = clipsFor(exerciseIds)
  if (!clips.length) return { finished: Promise.resolve(), stop: () => undefined, route: 'web-audio' }
  let webAudioFailure: WordAudioError
  try {
    return await playWithWebAudio(clips, options)
  } catch (caught) {
    throwIfCancelled(options.signal)
    if (!(caught instanceof WordAudioError) || caught.code === 'missing-clip') throw caught
    webAudioFailure = caught
  }
  try {
    return await playWithElement(clips, options)
  } catch (caught) {
    throwIfCancelled(options.signal)
    const detail = caught instanceof Error ? caught.message : String(caught)
    throw new WordAudioError('element', `${webAudioFailure.message}; fallback: ${detail}`, { cause: caught })
  }
}

/** Releases the shared audio resources, for example when the view unmounts. */
export function releaseAudio(): void {
  activeStops.forEach((stop) => stop())
  buffers.clear()
  if (context && context.state !== 'closed') void context.close().catch(() => undefined)
  context = null
  if (element) {
    element.pause()
    element.removeAttribute('src')
    element.load()
  }
  element = null
}
