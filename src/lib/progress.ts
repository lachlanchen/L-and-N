import { Preferences } from '@capacitor/preferences'
import type { AcousticFeatures, PronunciationScore, TargetSound, TrainingLanguage } from '../types'

export interface AttemptRecord {
  exerciseId: string
  score: number
  createdAt: string
  detectedSound: PronunciationScore['detectedSound']
  target?: TargetSound
  language?: TrainingLanguage
  features?: AcousticFeatures
}

export interface ListeningResult {
  pairId: string
  language: TrainingLanguage
  total: number
  correct: number
  createdAt: string
}

const STORAGE_KEY = 'landn.attempts.v1'
const LISTENING_KEY = 'landn.listening.v1'

export async function loadAttempts(): Promise<AttemptRecord[]> {
  const { value } = await Preferences.get({ key: STORAGE_KEY })
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as AttemptRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function saveAttempt(attempt: AttemptRecord): Promise<AttemptRecord[]> {
  const current = await loadAttempts()
  const next = [attempt, ...current].slice(0, 200)
  await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(next) })
  return next
}

export async function loadListeningResults(): Promise<ListeningResult[]> {
  const { value } = await Preferences.get({ key: LISTENING_KEY })
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as ListeningResult[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function saveListeningResult(result: ListeningResult): Promise<ListeningResult[]> {
  const current = await loadListeningResults()
  const next = [result, ...current].slice(0, 200)
  await Preferences.set({ key: LISTENING_KEY, value: JSON.stringify(next) })
  return next
}

/** Whole-percent accuracy across stored listening exams, or null when there are none. */
export function listeningAccuracy(results: ListeningResult[]): number | null {
  const total = results.reduce((sum, item) => sum + item.total, 0)
  if (!total) return null
  const correct = results.reduce((sum, item) => sum + item.correct, 0)
  return Math.round((correct / total) * 100)
}

/** Days practised in a row, counting pronunciation attempts and listening exams. */
export function trainingStreak(attempts: Array<{ createdAt: string }>): number {
  const days = new Set(attempts.map(({ createdAt }) => createdAt.slice(0, 10)))
  let streak = 0
  const cursor = new Date()
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}
