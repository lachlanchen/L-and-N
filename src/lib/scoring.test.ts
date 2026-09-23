import { describe, expect, it } from 'vitest'
import { extractAcousticFeatures } from './acoustics'
import { exercises } from '../data/curriculum'
import onsetTokens from './__fixtures__/onset-tokens.json'
import { detectSoundFromTranscript, editDistance, inferAcousticSound, normalizeSpeech, scorePronunciation } from './scoring'
import { syllableOf } from './han-readings'

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

  it('falls back to the spectral centroids when the onset network cannot score', () => {
    expect(inferAcousticSound({ ...tone(250), onsetNasalProbability: null }).detected).toBe('N')
    expect(inferAcousticSound({ ...tone(1500), onsetNasalProbability: null }).detected).toBe('L')
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

  it('refuses to manufacture a number when no word was recognized', () => {
    expect(() => scorePronunciation(exercise, '', lLikeFeatures)).toThrow(
      'A recognized word is required before pronunciation can be scored.',
    )
  })
})

describe('recognizer-anchored sound detection', () => {
  const light = exercises.find(({ id }) => id === 'en-light-night')!
  const lan = exercises.find(({ id }) => id === 'zh-lan-nan')!
  const nei = exercises.find(({ id }) => id === 'yue-nei-lei')!

  it('reads the target or paired word from the transcript', () => {
    expect(detectSoundFromTranscript(light, 'Light.')).toBe('L')
    expect(detectSoundFromTranscript(light, 'night')).toBe('N')
    expect(detectSoundFromTranscript(light, 'the practice word is light, light')).toBe('L')
  })

  it('accepts near spellings but not ambiguity', () => {
    expect(detectSoundFromTranscript(light, 'lite')).toBe('L')
    expect(detectSoundFromTranscript(light, 'nite')).toBe('N')
    expect(detectSoundFromTranscript(light, 'light night')).toBeNull()
    expect(detectSoundFromTranscript(light, 'fight')).toBeNull()
  })

  it('matches Chinese homophones in either script', () => {
    expect(detectSoundFromTranscript(lan, '藍')).toBe('L')
    expect(detectSoundFromTranscript(lan, '难')).toBe('N')
    expect(detectSoundFromTranscript(nei, '尼')).toBe('N')
    expect(detectSoundFromTranscript(nei, '李')).toBe('L')
  })
})

describe('score consistency with the recognized word', () => {
  const exercise = exercises.find(({ id }) => id === 'en-light-night')!
  const nasalLeaningFeatures = {
    rms: 0.08,
    noiseFloor: 0.003,
    zeroCrossingRate: 0.03,
    lowBandRatio: 0.75,
    midBandRatio: 0.08,
    spectralCentroidHz: 480,
    spectralTiltDb: 16,
    pitchHz: 145,
    pitchContour: [142, 144, 145, 146, 148],
    firstFormantHz: 300,
    secondFormantHz: 1600,
    formantSpacingHz: 1300,
    firstFormantBandwidthHz: 330,
    nasalPeakContrastDb: 0,
    voicedContinuity: 0.9,
    durationMs: 900,
    onsetMs: 35,
    onsetDurationMs: 240,
    signalQuality: 0.92,
    waveform: [0, 0.2, -0.2, 0.12],
    spectrum: [0.1, 0.35, 0.8, 0.5],
  }

  it('never reports the paired sound as detected when the target word was recognized', () => {
    const result = scorePronunciation(exercise, 'light', nasalLeaningFeatures)
    expect(inferAcousticSound(nasalLeaningFeatures).detected).toBe('N')
    expect(result.detectedSound).toBe('L')
    expect(result.detectionSource).toBe('recognizer')
    expect(result.overall).toBeGreaterThanOrEqual(60)
    expect(result.feedback.some((item) => item.code === 'cuesLean')).toBe(true)
  })

  it('caps the score when the recognizer heard the paired word', () => {
    const result = scorePronunciation(exercise, 'night', nasalLeaningFeatures)
    expect(result.detectedSound).toBe('N')
    expect(result.overall).toBeLessThanOrEqual(45)
    expect(result.recognition).toBeLessThanOrEqual(30)
    expect(result.feedback[0]).toEqual({ code: 'heardPair', value: 'night' })
    expect(result.feedback[1]).toEqual({ code: 'reduceNasal' })
  })

  it('falls back to acoustic cues when the transcript names neither word', () => {
    const result = scorePronunciation(exercise, 'fight', nasalLeaningFeatures)
    expect(result.detectionSource).toBe('acoustic')
    expect(result.detectedSound).toBe('N')
  })
})

describe('trained onset network on real speech', () => {
  it('separates a recorded lateral onset from a recorded nasal onset', () => {
    for (const [expected, token] of Object.entries(onsetTokens) as Array<[
      'L' | 'N',
      { word: string; samples: number[]; nasalProbability: number },
    ]>) {
      const features = extractAcousticFeatures(Float32Array.from(token.samples), 16_000)
      expect(features.onsetNasalProbability).not.toBeNull()
      expect(Math.abs((features.onsetNasalProbability ?? 0) - token.nasalProbability)).toBeLessThan(0.15)
      expect(inferAcousticSound(features, 'en-US').detected).toBe(expected)
    }
  })
})

describe('Chinese attempts are judged by sound, not by character', () => {
  const features = {
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

  const mandarin = exercises.find((item) => item.id === 'zh-nan-lan')!
  const cantonese = exercises.find((item) => item.id === 'yue-naam-laam')!

  it('accepts a homophone of the Mandarin target', () => {
    // The recognizer writes 男 when the learner said 南: same syllable.
    expect(detectSoundFromTranscript(mandarin, '男')).toBe('N')
    expect(detectSoundFromTranscript(mandarin, '楠')).toBe('N')
  })

  it('accepts a homophone of the Cantonese target', () => {
    expect(detectSoundFromTranscript(cantonese, '南')).toBe('N')
  })

  it('still hears the paired word as the other sound', () => {
    expect(detectSoundFromTranscript(mandarin, '蓝')).toBe('L')
    expect(detectSoundFromTranscript(mandarin, '兰')).toBe('L')
    expect(detectSoundFromTranscript(cantonese, '藍')).toBe('L')
  })

  it('scores the word as recognized when a homophone comes back', () => {
    const score = scorePronunciation(mandarin, '男', features)
    expect(score.detectedSound).toBe('N')
    expect(score.recognition).toBe(100)
  })

  it('reads ü as the v the table uses', () => {
    expect(syllableOf('旅 lǚ')).toBe('lv')
    expect(syllableOf('南 nán')).toBe('nan')
    expect(syllableOf('男 naam4')).toBe('naam')
  })
})
