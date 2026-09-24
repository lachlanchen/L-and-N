import { Capacitor } from '@capacitor/core'

const CONSENT_KEY = 'landn.android-online-speech.v1'

export function isAndroidApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export function hasAndroidSpeechConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === 'granted'
  } catch {
    return false
  }
}

export function setAndroidSpeechConsent(allowed: boolean): void {
  try {
    if (allowed) window.localStorage.setItem(CONSENT_KEY, 'granted')
    else window.localStorage.removeItem(CONSENT_KEY)
  } catch {
    // Storage failure must not prevent a session-only choice or imply consent.
  }
}
