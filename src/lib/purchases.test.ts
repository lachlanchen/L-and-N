import { afterEach, describe, expect, it, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { exercises } from '../data/curriculum'
import { listeningPairs } from './listening-exam'
import { FREE_PAIRS_PER_LANGUAGE, isGatedPlatform, isLocked, UNGATED, unlockedExercises, type Entitlement } from './purchases'

const locked: Entitlement = { gated: true, owned: false, available: true, price: 'US$0.99' }
const owned: Entitlement = { gated: true, owned: true, available: true }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('where the paywall applies', () => {
  it('gates Android only', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android')
    expect(isGatedPlatform()).toBe(true)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios')
    expect(isGatedPlatform()).toBe(false)
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('web')
    expect(isGatedPlatform()).toBe(false)
  })
})

describe('free and locked exercises', () => {
  it('leaves everything open when not gated or when owned', () => {
    for (const language of ['en-US', 'zh-CN', 'yue-HK'] as const) {
      const all = exercises.filter((item) => item.language === language)
      expect(unlockedExercises(exercises, language, UNGATED)).toHaveLength(all.length)
      expect(unlockedExercises(exercises, language, owned)).toHaveLength(all.length)
    }
  })

  it('keeps the first three pairs of each language free, both words of each', () => {
    for (const language of ['en-US', 'zh-CN', 'yue-HK'] as const) {
      const free = unlockedExercises(exercises, language, locked)
      expect(free).toHaveLength(FREE_PAIRS_PER_LANGUAGE * 2)
      for (const exercise of free) {
        expect(free.some((item) => item.word === exercise.pair)).toBe(true)
      }
    }
    const english = unlockedExercises(exercises, 'en-US', locked).map((item) => item.word)
    expect(english).toEqual(['light', 'night', 'low', 'no', 'need', 'lead'])
    expect(unlockedExercises(exercises, 'zh-CN', locked).map((item) => item.word.split(' ')[0])).toEqual(['蓝', '南', '老', '脑', '里', '你'])
  })

  it('marks later pairs as locked and every listening pair consistently', () => {
    const line = exercises.find((item) => item.id === 'en-line-nine')!
    const light = exercises.find((item) => item.id === 'en-light-night')!
    expect(isLocked(exercises, line, locked)).toBe(true)
    expect(isLocked(exercises, light, locked)).toBe(false)
    expect(isLocked(exercises, line, owned)).toBe(false)
    for (const pair of listeningPairs('en-US')) {
      expect(isLocked(exercises, pair.lateral, locked)).toBe(isLocked(exercises, pair.nasal, locked))
    }
    expect(listeningPairs('en-US').filter((pair) => !isLocked(exercises, pair.lateral, locked)).length).toBeGreaterThanOrEqual(2)
  })
})
