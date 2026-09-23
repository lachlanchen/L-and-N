import type { AcousticFeatures, Exercise, PronunciationScore, TargetSound, TrainingLanguage } from '../types'
import { homophonesOf, soundsLike } from './han-readings'

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

function recognitionScore(language: TrainingLanguage, expected: string, transcript: string): number {
  const target = comparableWord(expected)
  const heard = normalizeSpeech(transcript)
  if (!target || !heard) return 20
  if (heard.split(' ').includes(target)) return 100
  // A Chinese homophone is the word, spelled with another character.
  if (soundsLike(language, expected, heard)) return 100
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

// Reference centroids for the first ~240 ms of a word. Earlier values assumed
// an /l/ onset carries almost no energy below 450 Hz, which is untrue for real
// voiced speech (the fundamental and second harmonic always sit there), so
// every recording looked nasal. These centroids are placed between the two
// sounds as measured on the bundled studio recordings; the recognizer remains
// the primary judge and these cues only shade the score.
const defaultCentroids: Record<TrainingLanguage, Record<TargetSound, AcousticCentroid>> = {
  'en-US': {
    L: { lowBandRatio: 0.38, spectralTiltDb: 8, formantSpacingHz: 900, spectralCentroidHz: 900, midBandRatio: 0.26, firstFormantBandwidthHz: 180, nasalPeakContrastDb: 6 },
    N: { lowBandRatio: 0.62, spectralTiltDb: 15, formantSpacingHz: 1300, spectralCentroidHz: 560, midBandRatio: 0.12, firstFormantBandwidthHz: 320, nasalPeakContrastDb: 0 },
  },
  'zh-CN': {
    L: { lowBandRatio: 0.4, spectralTiltDb: 8, formantSpacingHz: 950, spectralCentroidHz: 900, midBandRatio: 0.25, firstFormantBandwidthHz: 190, nasalPeakContrastDb: 6 },
    N: { lowBandRatio: 0.62, spectralTiltDb: 14, formantSpacingHz: 1300, spectralCentroidHz: 580, midBandRatio: 0.12, firstFormantBandwidthHz: 320, nasalPeakContrastDb: 0 },
  },
  'yue-HK': {
    L: { lowBandRatio: 0.4, spectralTiltDb: 9, formantSpacingHz: 1000, spectralCentroidHz: 880, midBandRatio: 0.24, firstFormantBandwidthHz: 190, nasalPeakContrastDb: 5 },
    N: { lowBandRatio: 0.62, spectralTiltDb: 14, formantSpacingHz: 1300, spectralCentroidHz: 580, midBandRatio: 0.12, firstFormantBandwidthHz: 330, nasalPeakContrastDb: 0 },
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
  const centroidProbability = 1 / (1 + Math.exp((nDistance - lDistance) * 2.4))
  // The trained onset network is the primary acoustic judge; the hand-tuned
  // centroids (and any personal calibration) only nudge it.
  const modelProbability = features.onsetNasalProbability
  const nProbability =
    typeof modelProbability === 'number' && Number.isFinite(modelProbability)
      ? modelProbability * 0.85 + centroidProbability * 0.15
      : centroidProbability
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

function heardForms(
  language: TrainingLanguage,
  word: string,
  alternatives: string[] | undefined,
): string[] {
  // For Chinese the homophone table decides, so a recognizer that writes 男
  // for 南 still counts: same syllable, same initial, same attempt.
  const forms = new Set<string>([
    comparableWord(word),
    ...(alternatives ?? []).map(normalizeSpeech),
    ...homophonesOf(language, word),
  ])
  return [...forms].filter(Boolean)
}

function initialSound(word: string): TargetSound | null {
  if (/^(kn|n)/.test(word)) return 'N'
  if (word.startsWith('l')) return 'L'
  return null
}

function stripInitial(word: string): string {
  return word.replace(/^(kn|n|l)/, '')
}

/**
 * Decide which of the two minimal-pair sounds the recognizer heard.
 * Returns null when the transcript names neither word or names both.
 */
export function detectSoundFromTranscript(exercise: Exercise, transcript: string): TargetSound | null {
  const heard = normalizeSpeech(transcript)
  if (!heard) return null
  const pairSound: TargetSound = exercise.target === 'L' ? 'N' : 'L'
  const targetForms = heardForms(exercise.language, exercise.word, exercise.heardAs)
  const pairForms = heardForms(exercise.language, exercise.pair, exercise.pairHeardAs)
  const words = heard.split(' ')
  const spaced = exercise.language === 'en-US'
  const contains = (forms: string[]) =>
    forms.some((form) => (spaced ? words.includes(form) : heard.includes(form)))
  const targetHit = contains(targetForms)
  const pairHit = contains(pairForms)
  if (targetHit && !pairHit) return exercise.target
  if (pairHit && !targetHit) return pairSound
  if (targetHit && pairHit) return null
  if (!spaced) return null

  // Fuzzy match for English recognizers that return near spellings such as
  // "lite" or "nite": the initial letter names the sound, and the rest of the
  // word must resemble the rhyme the pair shares.
  const targetRhyme = stripInitial(targetForms[0])
  const tolerance = Math.max(2, Math.ceil(targetRhyme.length * 0.75))
  for (const word of words) {
    const initial = initialSound(word)
    if (!initial) continue
    if (editDistance(stripInitial(word), targetRhyme) <= tolerance) return initial
  }
  return null
}

export function scorePronunciation(
  exercise: Exercise,
  transcript: string,
  features: AcousticFeatures,
  calibration?: AcousticCalibration,
): PronunciationScore {
  if (!normalizeSpeech(transcript)) {
    throw new Error('A recognized word is required before pronunciation can be scored.')
  }
  const pairSound: TargetSound = exercise.target === 'L' ? 'N' : 'L'
  const recognizedSound = detectSoundFromTranscript(exercise, transcript)
  const heardPair = recognizedSound === pairSound
  const heardTarget = recognizedSound === exercise.target
  const rawRecognition = recognitionScore(exercise.language, exercise.word, transcript)
  // "night" is one edit away from "light", so string similarity alone would
  // still award ~80 for the wrong word. When the recognizer clearly heard the
  // paired word, the word score must say so.
  const recognition = heardPair ? Math.min(rawRecognition, 30) : rawRecognition
  const pairRecognition = recognitionScore(exercise.language, exercise.pair, transcript)
  const contrast = heardPair ? clampScore(recognition - 30) : clampScore(recognition - pairRecognition * 0.55 + 38)
  const acousticInference = inferAcousticSound(features, exercise.language, calibration)
  const targetEvidence = exercise.target === 'L' ? acousticInference.lEvidence : acousticInference.nEvidence
  // Acoustic cues are a heuristic; once the recognizer has settled the word
  // identity they shade the score instead of deciding it.
  const acoustic = heardTarget ? clampScore(40 + targetEvidence * 0.6) : targetEvidence
  const delivery = clampScore(
    (features.signalQuality * 0.5 +
      features.voicedContinuity * 0.25 +
      Math.min(1, features.durationMs / 700) * 0.25) *
      100,
  )
  const tone = scoreTone(exercise, features)
  const soundOverall = heardTarget
    ? clampScore(recognition * 0.42 + contrast * 0.2 + acoustic * 0.23 + delivery * 0.15)
    : clampScore(recognition * 0.38 + contrast * 0.2 + acoustic * 0.32 + delivery * 0.1)
  const blended = tone === null ? soundOverall : clampScore(soundOverall * 0.88 + tone * 0.12)
  // A recording in which the recognizer heard the other member of the pair
  // cannot score as a success, whatever the acoustic cues say.
  const overall = heardPair ? Math.min(blended, 45) : blended
  const detectedSound: PronunciationScore['detectedSound'] = recognizedSound ?? acousticInference.detected
  const feedback: PronunciationScore['feedback'] = []

  if (heardPair) {
    feedback.push({ code: 'heardPair', value: transcript })
    feedback.push({ code: exercise.target === 'N' ? 'addNasal' : 'reduceNasal' })
  } else {
    if (recognition < 70) {
      feedback.push({ code: 'recognitionUnclear', value: transcript || '—' })
    } else {
      feedback.push({ code: 'recognitionClear', value: exercise.word })
    }

    if (heardTarget) {
      if (targetEvidence < 40) feedback.push({ code: 'cuesLean', value: pairSound.toLowerCase() })
      else feedback.push({ code: 'acousticSupports', value: exercise.target.toLowerCase() })
    } else if (exercise.target === 'N' && acousticInference.nEvidence < 58) {
      feedback.push({ code: 'addNasal' })
    } else if (exercise.target === 'L' && acousticInference.lEvidence < 58) {
      feedback.push({ code: 'reduceNasal' })
    } else {
      feedback.push({ code: 'acousticSupports', value: exercise.target.toLowerCase() })
    }
  }

  if (features.signalQuality < 0.4) feedback.push({ code: 'signalLimited' })
  if (features.durationMs < 350) feedback.push({ code: 'holdLonger' })
  if (tone !== null && tone < 62) feedback.push({ code: 'toneShape', value: exercise.tone })
  if (calibration?.L || calibration?.N) feedback.push({ code: 'personalized' })

  const confidence: PronunciationScore['confidence'] = features.signalQuality < 0.4
    ? 'low'
    : heardTarget && overall >= 82
      ? 'high'
      : recognizedSound !== null && overall >= 60
        ? 'medium'
        : overall >= 60 && acoustic >= 62
          ? 'medium'
          : 'low'

  return {
    overall,
    recognition,
    contrast,
    acoustic,
    delivery,
    tone,
    detectedSound,
    detectionSource: recognizedSound === null ? 'acoustic' : 'recognizer',
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
