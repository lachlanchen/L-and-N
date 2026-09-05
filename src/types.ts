export type TargetSound = 'L' | 'N'

export type TrainingLanguage = 'en-US' | 'zh-CN' | 'yue-HK'

export type UILanguage =
  | 'en'
  | 'zh-Hans'
  | 'zh-Hant'
  | 'yue'

export interface Exercise {
  id: string
  language: TrainingLanguage
  target: TargetSound
  word: string
  pair: string
  ipa: string
  translation: string
  prompt: string
  cue: string
  tone?: number
}

export interface AcousticFeatures {
  rms: number
  noiseFloor: number
  zeroCrossingRate: number
  lowBandRatio: number
  midBandRatio: number
  spectralCentroidHz: number
  spectralTiltDb: number
  pitchHz: number
  pitchContour: number[]
  firstFormantHz: number
  secondFormantHz: number
  formantSpacingHz: number
  firstFormantBandwidthHz: number
  nasalPeakContrastDb: number
  voicedContinuity: number
  durationMs: number
  onsetMs: number
  onsetDurationMs: number
  signalQuality: number
  waveform: number[]
  spectrum: number[]
}

export interface AcousticEvidence {
  lEvidence: number
  nEvidence: number
  signalQuality: number
  nasalEnergy: number
  spectralTiltDb: number
  formantSpacingHz: number
  nasalPeakContrastDb: number
  personalized: boolean
}

export type PronunciationFeedbackCode =
  | 'recognitionUnavailable'
  | 'recognitionUnclear'
  | 'recognitionClear'
  | 'addNasal'
  | 'reduceNasal'
  | 'acousticSupports'
  | 'signalLimited'
  | 'holdLonger'
  | 'toneShape'
  | 'personalized'

export interface PronunciationFeedback {
  code: PronunciationFeedbackCode
  value?: string | number
}

export interface PronunciationScore {
  overall: number
  recognition: number
  contrast: number
  acoustic: number
  delivery: number
  tone: number | null
  detectedSound: TargetSound | 'uncertain'
  transcript: string
  confidence: 'high' | 'medium' | 'low'
  feedback: PronunciationFeedback[]
  evidence: AcousticEvidence
}
