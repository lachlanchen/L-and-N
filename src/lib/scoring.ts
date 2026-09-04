import type { AcousticFeatures, Exercise, PronunciationScore, TargetSound, TrainingLanguage } from '../types'

const clampScore = (value: number) => Math.round(Math.min(100, Math.max(0, value)))

export function normalizeSpeech(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function editDistance(first: string, second: string): number {
  const a = [...first]
  const b = [...second]
  const row = Array.from({ length: b.length + 1 }, (_, index) => index)

  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1))
      diagonal = above
    }
  }
  return row[b.length]
}

function comparableWord(value: string): string {
  return normalizeSpeech(value).split(' ')[0] ?? ''
}

function recognitionScore(expected: string, transcript: string): number {
  const target = comparableWord(expected)
  const heard = normalizeSpeech(transcript)
  if (!target || !heard) return 20
  if (heard.split(' ').includes(target)) return 100
  const best = Math.min(...heard.split(' ').map((word) => editDistance(target, word)))
  return clampScore(100 * (1 - best / Math.max(target.length, 1)))
}

interface AcousticCentroid {
  lowBandRatio: number
  spectralTiltDb: number
  formantSpacingHz: number
  spectralCentroidHz: number
  midBandRatio: number
  firstFormantBandwidthHz: number
  nasalPeakContrastDb: number
}

export interface AcousticCalibration {
  L?: AcousticCentroid
  N?: AcousticCentroid
  counts: Record<TargetSound, number>
}

interface CalibrationAttempt {
  target?: TargetSound
  language?: TrainingLanguage
  score: number
  detectedSound: PronunciationScore['detectedSound']
  features?: AcousticFeatures
}

const defaultCentroids: Record<TrainingLanguage, Record<TargetSound, AcousticCentroid>> = {
  'en-US': {
    L: { lowBandRatio: 0.14, spectralTiltDb: 0, formantSpacingHz: 720, spectralCentroidHz: 1450, midBandRatio: 0.46, firstFormantBandwidthHz: 170, nasalPeakContrastDb: 6 },
    N: { lowBandRatio: 0.42, spectralTiltDb: 12, formantSpacingHz: 1320, spectralCentroidHz: 680, midBandRatio: 0.2, firstFormantBandwidthHz: 330, nasalPeakContrastDb: 0 },
  },
  'zh-CN': {
    L: { lowBandRatio: 0.18, spectralTiltDb: 3, formantSpacingHz: 920, spectralCentroidHz: 1320, midBandRatio: 0.4, firstFormantBandwidthHz: 180, nasalPeakContrastDb: 6 },
    N: { lowBandRatio: 0.4, spectralTiltDb: 11, formantSpacingHz: 1310, spectralCentroidHz: 720, midBandRatio: 0.22, firstFormantBandwidthHz: 330, nasalPeakContrastDb: 0 },
  },
  'yue-HK': {
    L: { lowBandRatio: 0.2, spectralTiltDb: 5, formantSpacingHz: 1030, spectralCentroidHz: 1220, midBandRatio: 0.36, firstFormantBandwidthHz: 190, nasalPeakContrastDb: 5 },
    N: { lowBandRatio: 0.4, spectralTiltDb: 11, formantSpacingHz: 1330, spectralCentroidHz: 700, midBandRatio: 0.21, firstFormantBandwidthHz: 340, nasalPeakContrastDb: 0 },
  },
}

const centroidKeys: Array<keyof AcousticCentroid> = [
  'lowBandRatio',
  'spectralTiltDb',
  'formantSpacingHz',
  'spectralCentroidHz',
  'midBandRatio',
  'firstFormantBandwidthHz',
  'nasalPeakContrastDb',
]

export function buildAcousticCalibration(
  attempts: CalibrationAttempt[],
  language: TrainingLanguage,
): AcousticCalibration | undefined {
  const usable = attempts.filter(
    (attempt) =>
      attempt.language === language &&
      attempt.features &&
      attempt.target &&
      attempt.detectedSound === attempt.target &&
      attempt.score >= 72 &&
      attempt.features.signalQuality >= 0.45,
  )
  const counts: Record<TargetSound, number> = { L: 0, N: 0 }
  const calibration: AcousticCalibration = { counts }

  for (const sound of ['L', 'N'] as const) {
    const samples = usable.filter(({ target }) => target === sound).slice(0, 12)
    counts[sound] = samples.length
    if (samples.length < 3) continue
    const centroid = {} as AcousticCentroid
    for (const key of centroidKeys) {
      centroid[key] = samples.reduce((sum, attempt) => sum + (attempt.features?.[key] ?? 0), 0) / samples.length
    }
    calibration[sound] = centroid
  }

  return calibration.L || calibration.N ? calibration : undefined
}

function blendedCentroid(
  standard: AcousticCentroid,
  personal: AcousticCentroid | undefined,
  count: number,
): AcousticCentroid {
  if (!personal) return standard
  const personalWeight = Math.min(0.58, count / 16)
  return Object.fromEntries(
    centroidKeys.map((key) => [key, standard[key] * (1 - personalWeight) + personal[key] * personalWeight]),
  ) as unknown as AcousticCentroid
}

function distanceFromCentroid(features: AcousticFeatures, centroid: AcousticCentroid): number {
  const dimensions: Array<[number, number, number]> = [
    [features.lowBandRatio, centroid.lowBandRatio, 0.2],
    [features.spectralTiltDb, centroid.spectralTiltDb, 14],
    [features.formantSpacingHz || centroid.formantSpacingHz, centroid.formantSpacingHz, 700],
    [features.spectralCentroidHz, centroid.spectralCentroidHz, 1050],
    [features.midBandRatio, centroid.midBandRatio, 0.28],
    [features.firstFormantBandwidthHz || centroid.firstFormantBandwidthHz, centroid.firstFormantBandwidthHz, 220],
    [features.nasalPeakContrastDb, centroid.nasalPeakContrastDb, 10],
  ]
  const weights = [0.23, 0.12, 0.14, 0.13, 0.11, 0.14, 0.13]
  return dimensions.reduce((sum, [value, expected, scale], index) => {
    const normalized = (value - expected) / scale
    return sum + normalized ** 2 * weights[index]
  }, 0)
}

const toneTemplates: Record<TrainingLanguage, Record<number, number[]>> = {
  'en-US': {},
  'zh-CN': {
    1: [0, 0.05, 0.03, 0.05, 0],
    2: [-0.75, -0.5, -0.15, 0.4, 1],
    3: [0.15, -0.45, -0.8, -0.35, 0.45],
    4: [0.95, 0.55, 0.1, -0.45, -0.85],
  },
  'yue-HK': {
    1: [0.2, 0.15, 0.15, 0.1, 0.1],
    2: [-0.75, -0.35, 0.05, 0.5, 0.9],
    3: [0.05, 0, 0, -0.05, -0.05],
    4: [-0.1, -0.15, -0.2, -0.22, -0.25],
    5: [-0.65, -0.4, -0.05, 0.25, 0.55],
    6: [-0.35, -0.4, -0.42, -0.4, -0.4],
  },
}

function resample(values: number[], length: number): number[] {
  if (values.length === 1) return Array.from({ length }, () => values[0])
  return Array.from({ length }, (_, index) => {
    const position = (index / (length - 1)) * (values.length - 1)
    const left = Math.floor(position)
    const right = Math.min(values.length - 1, left + 1)
    const mix = position - left
    return values[left] * (1 - mix) + values[right] * mix
  })
}

function scoreTone(exercise: Exercise, features: AcousticFeatures): number | null {
  if (!exercise.tone) return null
  const validPitch = features.pitchContour.filter((value) => value >= 65 && value <= 420)
  if (validPitch.length < 3) return 45
  const sampled = resample(validPitch, 5)
  const medianPitch = [...sampled].sort((a, b) => a - b)[2]
  const semitones = sampled.map((value) => 12 * Math.log2(value / medianPitch))
  const scale = Math.max(1.5, ...semitones.map(Math.abs))
  const normalized = semitones.map((value) => value / scale)
  const template = toneTemplates[exercise.language][exercise.tone]
  if (!template) return 50
  const error = Math.sqrt(
    normalized.reduce((sum, value, index) => sum + (value - template[index]) ** 2, 0) / template.length,
  )
  return clampScore((1 - Math.min(1, error / 1.15)) * 100 * (0.72 + features.signalQuality * 0.28))
}

export function inferAcousticSound(
  features: AcousticFeatures,
  language: TrainingLanguage = 'en-US',
  calibration?: AcousticCalibration,
): {
  detected: TargetSound | 'uncertain'
  lEvidence: number
  nEvidence: number
} {
  const standard = defaultCentroids[language]
  const lCentroid = blendedCentroid(standard.L, calibration?.L, calibration?.counts.L ?? 0)
  const nCentroid = blendedCentroid(standard.N, calibration?.N, calibration?.counts.N ?? 0)
  const lDistance = distanceFromCentroid(features, lCentroid)
  const nDistance = distanceFromCentroid(features, nCentroid)
  const nProbability = 1 / (1 + Math.exp((nDistance - lDistance) * 2.4))
  const qualityWeight = 0.38 + features.signalQuality * 0.62
  const nEvidence = clampScore(50 + (nProbability * 100 - 50) * qualityWeight)
  const lEvidence = clampScore(50 + ((1 - nProbability) * 100 - 50) * qualityWeight)
  const difference = Math.abs(lEvidence - nEvidence)
  return {
    detected: difference < 11 || features.signalQuality < 0.24 ? 'uncertain' : lEvidence > nEvidence ? 'L' : 'N',
    lEvidence,
    nEvidence,
  }
}

export function scorePronunciation(
  exercise: Exercise,
  transcript: string,
  features: AcousticFeatures,
  calibration?: AcousticCalibration,
): PronunciationScore {
  const recognitionAvailable = normalizeSpeech(transcript).length > 0
  const recognition = recognitionScore(exercise.word, transcript)
  const pairRecognition = recognitionScore(exercise.pair, transcript)
  const contrast = recognitionAvailable ? clampScore(recognition - pairRecognition * 0.55 + 38) : 50
  const acousticInference = inferAcousticSound(features, exercise.language, calibration)
  const acoustic = exercise.target === 'L' ? acousticInference.lEvidence : acousticInference.nEvidence
  const delivery = clampScore(
    (features.signalQuality * 0.5 +
      features.voicedContinuity * 0.25 +
      Math.min(1, features.durationMs / 700) * 0.25) *
      100,
  )
  const tone = scoreTone(exercise, features)
  const soundOverall = recognitionAvailable
    ? clampScore(recognition * 0.38 + contrast * 0.2 + acoustic * 0.32 + delivery * 0.1)
    : clampScore(acoustic * 0.7 + delivery * 0.3)
  const overall = tone === null ? soundOverall : clampScore(soundOverall * 0.88 + tone * 0.12)
  const feedback: string[] = []

  if (!recognitionAvailable) {
    feedback.push('Word recognition was unavailable, so this score relies on the recorded onset and carries lower confidence.')
  } else if (recognition < 70) {
    feedback.push(`The recognizer heard “${transcript || '—'}”. Slow down and make the first sound clear before the vowel.`)
  } else {
    feedback.push(`The word identity was clear: “${exercise.word}”.`)
  }

  if (exercise.target === 'N' && acousticInference.nEvidence < 58) {
    feedback.push('Add a brief nasal murmur at the start. Touch your nose lightly and check for vibration.')
  } else if (exercise.target === 'L' && acousticInference.lEvidence < 58) {
    feedback.push('Reduce nasal resonance. Keep the tongue tip up and release air around its sides.')
  } else {
    feedback.push(`The acoustic pattern supports /${exercise.target.toLowerCase()}/.`)
  }

  if (features.signalQuality < 0.4) feedback.push('Signal quality was limited; move closer, reduce background noise, and avoid clipping.')
  if (features.durationMs < 350) feedback.push('Hold the word slightly longer so the contrast can be measured reliably.')
  if (tone !== null && tone < 62) feedback.push(`The onset and tone are scored separately. Repeat tone ${exercise.tone} with a steadier pitch shape.`)
  if (calibration?.L || calibration?.N) feedback.push('Your on-device acoustic baseline contributed to this comparison.')

  const confidence = !recognitionAvailable || features.signalQuality < 0.4
    ? 'low'
    : overall >= 82 && acoustic >= 62
      ? 'high'
      : overall >= 60
        ? 'medium'
        : 'low'

  return {
    overall,
    recognition,
    contrast,
    acoustic,
    delivery,
    tone,
    detectedSound: acousticInference.detected,
    transcript,
    confidence,
    feedback,
    evidence: {
      lEvidence: acousticInference.lEvidence,
      nEvidence: acousticInference.nEvidence,
      signalQuality: clampScore(features.signalQuality * 100),
      nasalEnergy: clampScore(features.lowBandRatio * 100),
      spectralTiltDb: Math.round(features.spectralTiltDb * 10) / 10,
      formantSpacingHz: Math.round(features.formantSpacingHz),
      nasalPeakContrastDb: Math.round(features.nasalPeakContrastDb * 10) / 10,
      personalized: Boolean(calibration?.L || calibration?.N),
    },
  }
}
