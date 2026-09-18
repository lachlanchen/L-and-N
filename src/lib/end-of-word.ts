/**
 * Decides when a single practice word has finished so a recording can stop
 * without waiting for the fixed maximum duration. Feed it the live RMS level
 * at a steady cadence; it answers `true` once speech was heard and has been
 * followed by enough silence.
 *
 * The thresholds are deliberately conservative: a hesitation of a few hundred
 * milliseconds inside a word does not end the recording, and nothing ends
 * before the minimum duration, so the tone contour of a Chinese syllable and
 * the final consonant of an English word are still captured.
 */
export interface EndOfWordOptions {
  /** Never stop before this many milliseconds of recording. */
  minimumDurationMs?: number
  /** Continuous quiet after speech that ends the word. */
  trailingSilenceMs?: number
  /** Speech must exceed the floor for this long before it counts as a word. */
  minimumSpeechMs?: number
  /** Absolute RMS floor below which nothing counts as speech. */
  absoluteThreshold?: number
  /** Speech must exceed the measured background by this factor. */
  noiseMultiplier?: number
}

export class EndOfWordDetector {
  private readonly minimumDurationMs: number
  private readonly trailingSilenceMs: number
  private readonly minimumSpeechMs: number
  private readonly absoluteThreshold: number
  private readonly noiseMultiplier: number
  private startedAt: number | null = null
  private noiseSamples: number[] = []
  private speechSince: number | null = null
  private speechConfirmed = false
  private quietSince: number | null = null

  constructor(options: EndOfWordOptions = {}) {
    this.minimumDurationMs = options.minimumDurationMs ?? 900
    this.trailingSilenceMs = options.trailingSilenceMs ?? 650
    this.minimumSpeechMs = options.minimumSpeechMs ?? 90
    this.absoluteThreshold = options.absoluteThreshold ?? 0.012
    this.noiseMultiplier = options.noiseMultiplier ?? 3.5
  }

  get heardSpeech(): boolean {
    return this.speechConfirmed
  }

  /** Returns true when the recording should stop now. */
  feed(rms: number, timestampMs: number): boolean {
    if (this.startedAt === null) this.startedAt = timestampMs
    const elapsed = timestampMs - this.startedAt
    const level = Number.isFinite(rms) ? Math.max(0, rms) : 0

    // The first 200 ms before any speech estimate the background level.
    if (!this.speechConfirmed && elapsed <= 200) this.noiseSamples.push(level)
    const noise = this.noiseSamples.length
      ? [...this.noiseSamples].sort((a, b) => a - b)[Math.floor(this.noiseSamples.length / 2)]
      : 0
    const threshold = Math.max(this.absoluteThreshold, noise * this.noiseMultiplier)
    const loud = level >= threshold

    if (loud) {
      this.quietSince = null
      if (this.speechSince === null) this.speechSince = timestampMs
      if (timestampMs - this.speechSince >= this.minimumSpeechMs) this.speechConfirmed = true
      return false
    }

    this.speechSince = null
    if (!this.speechConfirmed) return false
    if (this.quietSince === null) this.quietSince = timestampMs
    return elapsed >= this.minimumDurationMs && timestampMs - this.quietSince >= this.trailingSilenceMs
  }
}

/** RMS of the analyser's current time-domain block. */
export function analyserRms(analyser: AnalyserNode, buffer: Float32Array<ArrayBuffer>): number {
  analyser.getFloatTimeDomainData(buffer)
  let sum = 0
  for (let index = 0; index < buffer.length; index += 1) sum += buffer[index] * buffer[index]
  return Math.sqrt(sum / Math.max(1, buffer.length))
}
