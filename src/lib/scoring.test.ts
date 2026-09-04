import { describe, expect, it } from 'vitest'
import { extractAcousticFeatures } from './acoustics'
import { exercises } from '../data/curriculum'
import { editDistance, inferAcousticSound, normalizeSpeech, scorePronunciation } from './scoring'

describe('speech normalization', () => {
  it('normalizes case, tone marks, and punctuation', () => {
    expect(normalizeSpeech('  LÁN, please! ')).toBe('lan please')
  })

  it('computes Unicode-aware edit distance', () => {
    expect(editDistance('light', 'night')).toBe(1)
  })
})

describe('acoustic cue extraction', () => {
  const tone = (frequency: number) => {
    const sampleRate = 16_000
    const samples = Float32Array.from({ length: sampleRate }, (_, index) =>
      0.2 * Math.sin((2 * Math.PI * frequency * index) / sampleRate),
    )
    return extractAcousticFeatures(samples, sampleRate)
  }

  it('finds more low-band energy in a nasal-murmur-like tone', () => {
    expect(tone(250).lowBandRatio).toBeGreaterThan(tone(1500).lowBandRatio)
  })

  it('leans N for low-frequency continuity and L for mid-frequency energy', () => {
    expect(inferAcousticSound(tone(250)).detected).toBe('N')
    expect(inferAcousticSound(tone(1500)).detected).toBe('L')
  })
})

describe('hybrid pronunciation score', () => {
  const exercise = exercises.find(({ id }) => id === 'en-light-night')!
  const lLikeFeatures = {
    rms: 0.08,
    noiseFloor: 0.003,
    zeroCrossingRate: 0.05,
    lowBandRatio: 0.08,
    midBandRatio: 0.52,
    spectralCentroidHz: 1500,
    spectralTiltDb: 0,
    pitchHz: 145,
    pitchContour: [142, 144, 145, 146, 148],
    firstFormantHz: 500,
    secondFormantHz: 1250,
    formantSpacingHz: 750,
    firstFormantBandwidthHz: 160,
    nasalPeakContrastDb: 7,
    voicedContinuity: 0.9,
    durationMs: 900,
    onsetMs: 35,
    onsetDurationMs: 240,
    signalQuality: 0.92,
    waveform: [0, 0.2, -0.2, 0.12],
    spectrum: [0.1, 0.35, 0.8, 0.5],
  }

  it('rewards the expected word and matching acoustic cues', () => {
    const correct = scorePronunciation(exercise, 'light', lLikeFeatures)
    const confused = scorePronunciation(exercise, 'night', lLikeFeatures)
    expect(correct.overall).toBeGreaterThan(confused.overall)
    expect(correct.recognition).toBe(100)
    expect(correct.evidence.lEvidence).toBeGreaterThan(correct.evidence.nEvidence)
  })
})
