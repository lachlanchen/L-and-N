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

const STORAGE_KEY = 'landn.attempts.v1'

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

export function trainingStreak(attempts: AttemptRecord[]): number {
  const days = new Set(attempts.map(({ createdAt }) => createdAt.slice(0, 10)))
  let streak = 0
  const cursor = new Date()
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}
