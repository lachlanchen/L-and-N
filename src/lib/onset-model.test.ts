import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/onset-model-parity.json'
import weights from './onset-model.json'
import { logMelFeatures, N_FRAMES, nasalProbability, resampleTo16k, scoreOnset, WINDOW_SAMPLES } from './onset-model'

describe('on-device onset model', () => {
  it('computes the same log-mel features as the Python trainer', () => {
    const features = logMelFeatures(Float32Array.from(fixture.samples))
    expect(features).toHaveLength(N_FRAMES)
    let worst = 0
    features.forEach((frame, row) => {
      frame.forEach((value, band) => {
        worst = Math.max(worst, Math.abs(value - fixture.features[row][band]))
      })
    })
    expect(worst).toBeLessThan(2e-3)
  })

  it('reproduces the reference network output for the shipped weights', () => {
    expect(weights.version).toBe(fixture.modelVersion)
    const probability = nasalProbability(logMelFeatures(Float32Array.from(fixture.samples)))
    expect(Math.abs(probability - fixture.nasalProbability)).toBeLessThan(1e-3)
  })

  it('resamples and windows recordings around the detected onset', () => {
    const sampleRate = 48_000
    const samples = new Float32Array(sampleRate)
    for (let index = 0; index < samples.length; index += 1) samples[index] = 0.2 * Math.sin((2 * Math.PI * 200 * index) / sampleRate)
    expect(resampleTo16k(samples, sampleRate)).toHaveLength(16_000)
    const probability = scoreOnset(samples, sampleRate, 12_000)
    expect(probability).not.toBeNull()
    expect(probability!).toBeGreaterThanOrEqual(0)
    expect(probability!).toBeLessThanOrEqual(1)
    expect(scoreOnset(samples, sampleRate, samples.length - 100)).toBeNull()
    expect(WINDOW_SAMPLES).toBe(4_800)
  })
})
