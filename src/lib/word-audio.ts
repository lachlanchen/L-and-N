/**
 * Plays the isolated practice word out of a bundled studio recording.
 *
 * Each file in `public/audio/models/` is a carrier phrase followed by the word
 * on its own. `src/data/word-clips.json` holds the offsets of that isolated
 * repeat, chosen and graded by `tools/audio/verify_word_clips.py`. The
 * listening exam needs several words in a row with exact gaps, so playback
 * goes through Web Audio: the clips are decoded once and scheduled on the
 * audio clock instead of being chased with timers.
 */
import clipData from '../data/word-clips.json'
import type { TargetSound } from '../types'

export type ClipVerdict = 'clear' | 'weak' | 'bad'

export interface WordClip {
  key: string
  src: string
  start: number
  end: number
  expected: TargetSound
  /** Whether both the recognizer and the onset model identified this clip. */
  verdict: ClipVerdict
}

interface RawClip {
  start: number
  end: number
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
    // The same URL the practice screen uses, so both share one cache entry.
    src: `/audio/models/${key}.mp3?v=2`,
    start: entry.start,
    end: entry.end,
    expected: entry.expected === 'N' ? 'N' : 'L',
    verdict: entry.verdict === 'clear' ? 'clear' : entry.verdict === 'weak' ? 'weak' : 'bad',
  }
}

/** True when the clip is unambiguous enough to be used as an exam prompt. */
export function isVerifiedClip(exerciseId: string): boolean {
  return wordClip(exerciseId)?.verdict === 'clear'
}

export class WordAudioError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'WordAudioError'
  }
}

type AudioContextConstructor = typeof AudioContext

function contextConstructor(): AudioContextConstructor | undefined {
  const audioWindow = window as typeof window & { webkitAudioContext?: AudioContextConstructor }
  return window.AudioContext ?? audioWindow.webkitAudioContext
}

const RESUME_TIMEOUT_MS = 1200

let context: AudioContext | null = null
/** Decoded clips, keyed by recording. Stores the in-flight promise so a
 * sequence that repeats a word downloads and decodes it only once. */
const buffers = new Map<string, Promise<AudioBuffer>>()

/**
 * Creates and resumes the audio context. Call this synchronously inside the
 * tap handler: iOS only unlocks audio from a user gesture, and an `await`
 * before this point loses the gesture.
 */
export function unlockAudio(): AudioContext {
  const Constructor = contextConstructor()
  if (!Constructor) throw new WordAudioError('This browser does not provide Web Audio.')
  if (!context || context.state === 'closed') context = new Constructor()
  void context.resume().catch(() => undefined)
  return context
}

/**
 * Waits, briefly, for the context to start. `resume()` never settles when the
 * page has no audio output or no user gesture, so the wait is bounded and a
 * blocked context becomes a visible error instead of a stuck screen.
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
    throw new WordAudioError('The audio output did not start; tap play again.')
  }
}

function bufferFor(clip: WordClip): Promise<AudioBuffer> {
  const cached = buffers.get(clip.key)
  if (cached) return cached
  const active = unlockAudio()
  const pending = (async () => {
    const response = await fetch(clip.src, { cache: 'force-cache' })
    if (!response.ok) throw new WordAudioError(`Could not download ${clip.key} (${response.status}).`)
    return active.decodeAudioData(await response.arrayBuffer())
  })()
  buffers.set(clip.key, pending)
  // A failed download must not be remembered, so the next tap can retry.
  void pending.catch(() => buffers.delete(clip.key))
  return pending
}

/** Downloads and decodes clips ahead of playback so a sequence starts without gaps. */
export async function preloadClips(exerciseIds: string[]): Promise<void> {
  const clips = exerciseIds.map(wordClip).filter((clip): clip is WordClip => clip !== null)
  await Promise.all(clips.map((clip) => bufferFor(clip).catch(() => undefined)))
}

export interface SequencePlayback {
  /** Resolves when the last word has finished, or immediately after `stop()`. */
  readonly finished: Promise<void>
  stop: () => void
}

export interface SequenceOptions {
  /** Silence between words, in milliseconds. */
  gapMs?: number
  /** Called with the index being played, then with null when the sequence ends. */
  onItem?: (index: number | null) => void
}

/**
 * Schedules the given exercises as one sequence and returns a handle. Buffers
 * are decoded first, so call `unlockAudio()` in the tap handler beforehand.
 */
export async function playSequence(
  exerciseIds: string[],
  { gapMs = 650, onItem }: SequenceOptions = {},
): Promise<SequencePlayback> {
  const clips = exerciseIds.map((id) => {
    const clip = wordClip(id)
    if (!clip) throw new WordAudioError(`No studio clip for ${id}.`)
    return clip
  })
  const active = unlockAudio()
  const decoded = await Promise.all(clips.map(bufferFor))
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
    const duration = Math.max(0.05, clip.end - clip.start)
    const when = startAt + offset
    source.start(when, clip.start, duration)
    sources.push(source)
    timers.push(window.setTimeout(() => onItem?.(index), Math.max(0, (when - active.currentTime) * 1000)))
    offset += duration + gapMs / 1000
  })

  const totalMs = Math.max(0, (startAt + offset - gapMs / 1000 - active.currentTime) * 1000)
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

  return { finished, stop }
}

/** Releases the shared audio context, for example when the view unmounts. */
export function releaseAudio(): void {
  buffers.clear()
  if (context && context.state !== 'closed') void context.close().catch(() => undefined)
  context = null
}
