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
})
