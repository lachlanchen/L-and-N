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
 * sequence is played through one reusable `<audio>` element instead. The
 * element is primed inside the tap with a silent clip, which is what lets
 * iOS keep playing through it later.
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
  /** Silence between words, in milliseconds. */
  gapMs?: number
  /** Extra silence before a word that repeats the previous one, so "night night" is heard as two. */
  repeatGapMs?: number
  /** Called with the index being played, then with null when the sequence ends. */
  onItem?: (index: number | null) => void
}

const RESUME_TIMEOUT_MS = 1200
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
async function ensureRunning(active: AudioContext): Promise<void> {
  // Read through a function so the compiler does not assume the state is
  // unchanged after awaiting.
  const running = () => (active.state as AudioContextState) === 'running'
  if (running()) return
  await Promise.race([
    active.resume().catch(() => undefined),
    new Promise((resolve) => window.setTimeout(resolve, RESUME_TIMEOUT_MS)),
  ])
  if (!running()) {
    throw new WordAudioError('web-audio', `audio context stayed ${active.state}`)
  }
}

function bufferFor(active: AudioContext, clip: WordClip): Promise<AudioBuffer> {
  const cached = buffers.get(clip.key)
  if (cached) return cached
  const pending = (async () => {
    const response = await fetch(clip.src, { cache: 'force-cache' })
    if (!response.ok) throw new WordAudioError('web-audio', `download of ${clip.key} failed (${response.status})`)
    try {
      return await active.decodeAudioData(await response.arrayBuffer())
    } catch (caught) {
      throw new WordAudioError('web-audio', `decode of ${clip.key} failed`, { cause: caught })
    }
  })()
  buffers.set(clip.key, pending)
  // A failed download must not be remembered, so the next tap can retry.
  void pending.catch(() => buffers.delete(clip.key))
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
  { gapMs = DEFAULT_GAP_MS, repeatGapMs = DEFAULT_REPEAT_GAP_MS, onItem }: SequenceOptions,
): Promise<SequencePlayback> {
  const active = unlockAudio()
  if (!active) throw new WordAudioError('web-audio', 'Web Audio is not available')
  const decoded = await Promise.all(clips.map((clip) => bufferFor(active, clip)))
  await ensureRunning(active)

  const sources: AudioBufferSourceNode[] = []
  const timers: number[] = []
  let stopped = false
  let settle: () => void = () => undefined
  const finished = new Promise<void>((resolve) => {
    settle = resolve
  })

  const startAt = active.currentTime + 0.12
  let offset = 0
  clips.forEach((clip, index) => {
    const source = active.createBufferSource()
    source.buffer = decoded[index]
    source.connect(active.destination)
    const duration = Math.max(0.05, decoded[index].duration || clip.seconds)
    const when = startAt + offset
    source.start(when)
    sources.push(source)
    timers.push(window.setTimeout(() => onItem?.(index), Math.max(0, (when - active.currentTime) * 1000)))
    offset += duration + (index < clips.length - 1 ? gapAfter(clips, index, gapMs, repeatGapMs) / 1000 : 0)
  })

  const totalMs = Math.max(0, (startAt + offset - active.currentTime) * 1000)
  timers.push(
    window.setTimeout(() => {
      if (stopped) return
      onItem?.(null)
      settle()
    }, totalMs + 60),
  )

  const stop = () => {
    if (stopped) return
    stopped = true
    timers.forEach((timer) => window.clearTimeout(timer))
    sources.forEach((source) => {
      try {
        source.stop()
      } catch {
        // A source that never started throws; nothing to clean up.
      }
      source.disconnect()
    })
    onItem?.(null)
    settle()
  }

  return { finished, stop, route: 'web-audio' }
}

function waitForMetadata(media: HTMLAudioElement): Promise<void> {
  if (media.readyState >= 1) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const done = () => {
      media.removeEventListener('loadedmetadata', done)
      media.removeEventListener('error', fail)
      resolve()
    }
    const fail = () => {
      media.removeEventListener('loadedmetadata', done)
      media.removeEventListener('error', fail)
      reject(new WordAudioError('element', `media element could not load ${media.currentSrc || media.src}`))
    }
    media.addEventListener('loadedmetadata', done)
    media.addEventListener('error', fail)
  })
}

async function cueClip(media: HTMLAudioElement, clip: WordClip): Promise<void> {
  // Reload for every word, including a repeat of the previous one. The files
  // are a few kilobytes and cached, and a fresh load avoids any seek, which
  // some web views cannot perform reliably even to zero.
  media.src = clip.src
  media.load()
  await waitForMetadata(media)
}

/**
 * Plays the same sequence through the shared `<audio>` element. Each clip is
 * its own file, so a word is simply played to its end.
 */
async function playWithElement(
  clips: WordClip[],
  { gapMs = DEFAULT_GAP_MS, repeatGapMs = DEFAULT_REPEAT_GAP_MS, onItem }: SequenceOptions,
): Promise<SequencePlayback> {
  unlockAudio()
  const media = element
  if (!media) throw new WordAudioError('element', 'no media element')
  let stopped = false
  const timers: number[] = []
  const sleep = (ms: number) => new Promise<void>((resolve) => timers.push(window.setTimeout(resolve, ms)))

  const playCued = async (clip: WordClip) => {
    try {
      await media.play()
    } catch (caught) {
      const name = caught instanceof Error ? caught.name : 'play failed'
      throw new WordAudioError('element', `media element refused ${clip.key} (${name})`, { cause: caught })
    }
  }

  const untilClipEnd = (clip: WordClip) =>
    new Promise<void>((resolve) => {
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        media.removeEventListener('ended', done)
        media.pause()
        resolve()
      }
      media.addEventListener('ended', done)
      // Safety net in case the ended event never arrives.
      const seconds = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : clip.seconds
      timers.push(window.setTimeout(done, seconds * 1000 + 300))
    })

  // Start the first word before returning so a refused play() surfaces as a
  // rejection rather than a silent sequence.
  await cueClip(media, clips[0])
  await playCued(clips[0])
  onItem?.(0)

  const finished = (async () => {
    for (let index = 0; index < clips.length; index += 1) {
      if (stopped) return
      if (index > 0) {
        await cueClip(media, clips[index])
        if (stopped) return
        await playCued(clips[index])
        onItem?.(index)
      }
      await untilClipEnd(clips[index])
      if (stopped) return
      if (index < clips.length - 1) await sleep(gapAfter(clips, index, gapMs, repeatGapMs))
    }
    if (!stopped) onItem?.(null)
  })()

  const stop = () => {
    if (stopped) return
    stopped = true
    timers.forEach((timer) => window.clearTimeout(timer))
    media.pause()
    onItem?.(null)
  }

  return { finished, stop, route: 'element' }
}

/**
 * Plays the given exercises as one sequence and returns a handle once the
 * first word is under way. Call `unlockAudio()` in the tap handler first.
 * Web Audio is tried first; if the browser refuses it, the sequence is
 * played through the primed `<audio>` element instead.
 */
export async function playSequence(exerciseIds: string[], options: SequenceOptions = {}): Promise<SequencePlayback> {
  const clips = clipsFor(exerciseIds)
  let webAudioFailure: WordAudioError
  try {
    return await playWithWebAudio(clips, options)
  } catch (caught) {
    if (!(caught instanceof WordAudioError) || caught.code === 'missing-clip') throw caught
    webAudioFailure = caught
  }
  try {
    return await playWithElement(clips, options)
  } catch (caught) {
    const detail = caught instanceof Error ? caught.message : String(caught)
    throw new WordAudioError('element', `${webAudioFailure.message}; fallback: ${detail}`, { cause: caught })
  }
}

/** Releases the shared audio resources, for example when the view unmounts. */
export function releaseAudio(): void {
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
