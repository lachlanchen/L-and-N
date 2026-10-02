import { describe, expect, it } from 'vitest'
import { extractAcousticFeatures } from './acoustics'

describe('bounded pitch analysis', () => {
  it.each([16000, 48000])('keeps the first 36 pitch points unchanged for longer %i Hz recordings', (rate) => {
    const voice = Float32Array.from({ length: rate * 6 }, (_, index) =>
      0.15 * Math.sin(2 * Math.PI * 220 * index / rate))
    const short = extractAcousticFeatures(voice.slice(0, rate * 2), rate)
    const long = extractAcousticFeatures(voice, rate)
    expect(short.pitchContour).toHaveLength(36)
    expect(long.pitchContour).toEqual(short.pitchContour)
    expect(long.onsetNasalProbability).toBe(short.onsetNasalProbability)
    expect(long.durationMs).toBeGreaterThan(short.durationMs)
  })

  it('measures word continuity without penalizing normal auto-stop silence', () => {
    const rate = 16000
    const word = Float32Array.from({ length: rate * .22 }, (_, index) =>
      .08 * Math.sin(2 * Math.PI * 190 * index / rate))
    const short = new Float32Array(word.length + rate * .15)
    short.set(word, rate * .05)
    const padded = new Float32Array(word.length + rate)
    padded.set(word, rate * .05)
    const a = extractAcousticFeatures(short, rate)
    const b = extractAcousticFeatures(padded, rate)
    expect(a.voicedContinuity).toBeGreaterThan(.85)
    expect(b.voicedContinuity).toBeCloseTo(a.voicedContinuity, 1)
    expect(b.signalQuality).toBeGreaterThan(.9)
    expect(b.durationMs).toBeLessThan(260)
  })
})
