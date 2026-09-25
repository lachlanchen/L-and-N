import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Preferences } from '@capacitor/preferences'
import { loadAttempts, saveAttempt, type AttemptRecord } from './progress'
import type { AcousticFeatures } from '../types'

vi.mock('@capacitor/preferences', () => ({ Preferences: { get: vi.fn(), set: vi.fn() } }))
let stored: string | null = null
beforeEach(() => {
  stored = null
  vi.mocked(Preferences.get).mockImplementation(async () => ({ value: stored }))
  vi.mocked(Preferences.set).mockImplementation(async ({ value }) => { stored = value })
})
const attempt = (index: number): AttemptRecord => ({
  exerciseId: 'en-light-night', score: 92, detectedSound: 'L', takeId: `take-${index}`,
  createdAt: new Date(Date.UTC(2026, 8, 26, 0, 0, index)).toISOString(),
})

describe('persistent recording history', () => {
  it('preserves all summaries and recording links beyond the previous 200-entry limit', async () => {
    const earlier = Array.from({ length: 210 }, (_, index) => attempt(210 - index))
    stored = JSON.stringify(earlier)
    await saveAttempt(attempt(211))
    const loaded = await loadAttempts()
    expect(loaded).toHaveLength(211)
    expect(loaded.at(-1)).toEqual(earlier.at(-1))
    expect(loaded[0].takeId).toBe('take-211')
  })

  it('keeps recent calibration arrays without bloating older replayable history', async () => {
    const features = { waveform: [0, 1], spectrum: [0, 0.5] } as AcousticFeatures
    stored = JSON.stringify(Array.from({ length: 205 }, (_, index) => ({ ...attempt(205 - index), features })))
    const next = await saveAttempt({ ...attempt(206), features })
    expect(next[199].features).toEqual(features)
    expect(next[200].features).toBeUndefined()
    expect(next[200].takeId).toBeDefined()
    expect(next).toHaveLength(206)
  })

  it('propagates a full-storage failure without deleting the existing history', async () => {
    const previous = JSON.stringify([attempt(1)])
    stored = previous
    vi.mocked(Preferences.set).mockRejectedValueOnce(new Error('QuotaExceededError'))
    await expect(saveAttempt(attempt(2))).rejects.toThrow('QuotaExceededError')
    expect(stored).toBe(previous)
  })
})
