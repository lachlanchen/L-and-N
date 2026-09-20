/**
 * Full-curriculum unlock on Android.
 *
 * The web app is free and the iOS app is paid up front, so only the Android
 * build gates content: the first FREE_PAIRS_PER_LANGUAGE minimal pairs of each
 * practice language are free, and one non-consumable Google Play product
 * (`full_access`, USD 0.99 tier) unlocks the rest. Ownership is read from Play
 * at launch and cached in Preferences so a cold start without network still
 * shows what the learner bought.
 */
import { Capacitor, registerPlugin } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import type { Exercise, TrainingLanguage } from '../types'

export const FREE_PAIRS_PER_LANGUAGE = 3
export const PRODUCT_ID = 'full_access'
const STORAGE_KEY = 'landn.entitlement'

export interface BillingStatus {
  available: boolean
  owned: boolean
  productId?: string
  price?: string
  cancelled?: boolean
}

interface PlayBillingPlugin {
  getStatus(): Promise<BillingStatus>
  purchase(): Promise<BillingStatus>
  restore(): Promise<BillingStatus>
}

const PlayBilling = registerPlugin<PlayBillingPlugin>('PlayBilling')

export interface Entitlement {
  /** Whether this build gates content at all (Android only). */
  gated: boolean
  /** Whether the full curriculum is unlocked (always true when not gated). */
  owned: boolean
  /** Whether the store could be reached and the product exists. */
  available: boolean
  /** Localized price from Play, when known. */
  price?: string
  /** Set after a purchase attempt the learner backed out of. */
  cancelled?: boolean
}

export const UNGATED: Entitlement = { gated: false, owned: true, available: false }

export function isGatedPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

async function readCache(): Promise<boolean> {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY })
    return value === 'owned'
  } catch {
    return false
  }
}

async function writeCache(owned: boolean): Promise<void> {
  try {
    await Preferences.set({ key: STORAGE_KEY, value: owned ? 'owned' : 'none' })
  } catch {
    // The cache is a convenience; Play remains the source of truth.
  }
}

function fromStatus(status: BillingStatus, cachedOwned: boolean): Entitlement {
  return {
    gated: true,
    owned: status.owned || (!status.available && cachedOwned),
    available: status.available,
    price: status.price,
    cancelled: status.cancelled,
  }
}

/** Current entitlement: Play's answer when reachable, otherwise the cached one. */
export async function loadEntitlement(): Promise<Entitlement> {
  if (!isGatedPlatform()) return UNGATED
  const cached = await readCache()
  try {
    const status = await PlayBilling.getStatus()
    if (status.available) await writeCache(status.owned)
    return fromStatus(status, cached)
  } catch {
    return { gated: true, owned: cached, available: false }
  }
}

/** Opens the Play purchase sheet. Resolves with the entitlement afterwards. */
export async function buyFullAccess(): Promise<Entitlement> {
  if (!isGatedPlatform()) return UNGATED
  const status = await PlayBilling.purchase()
  if (status.owned) await writeCache(true)
  return fromStatus(status, false)
}

/** Re-reads owned purchases, for a learner who reinstalled or changed device. */
export async function restorePurchases(): Promise<Entitlement> {
  if (!isGatedPlatform()) return UNGATED
  const cached = await readCache()
  const status = await PlayBilling.restore()
  if (status.available) await writeCache(status.owned)
  return fromStatus(status, cached)
}

/**
 * The exercises a learner may use. Pairs are counted in curriculum order, so
 * the free ones are the first pairs of each language (light/night, low/no,
 * need/lead for English).
 */
export function unlockedExercises(all: Exercise[], language: TrainingLanguage, entitlement: Entitlement): Exercise[] {
  const pool = all.filter((exercise) => exercise.language === language)
  if (!entitlement.gated || entitlement.owned) return pool
  const freeWords = new Set<string>()
  const unlocked: Exercise[] = []
  for (const exercise of pool) {
    const partner = exercise.pair
    const pairKey = [exercise.word, partner].sort().join('|')
    if (!freeWords.has(pairKey) && freeWords.size >= FREE_PAIRS_PER_LANGUAGE) continue
    freeWords.add(pairKey)
    unlocked.push(exercise)
  }
  return unlocked
}

/** True when `exercise` is behind the paywall for this entitlement. */
export function isLocked(all: Exercise[], exercise: Exercise, entitlement: Entitlement): boolean {
  return !unlockedExercises(all, exercise.language, entitlement).some((item) => item.id === exercise.id)
}
