// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { hasAndroidSpeechConsent, setAndroidSpeechConsent } from './android-speech-consent'

afterEach(() => window.localStorage.clear())

describe('Android online speech consent', () => {
  it('is opt-in, remembered and revocable', () => {
    expect(hasAndroidSpeechConsent()).toBe(false)
    setAndroidSpeechConsent(true)
    expect(hasAndroidSpeechConsent()).toBe(true)
    setAndroidSpeechConsent(false)
    expect(hasAndroidSpeechConsent()).toBe(false)
  })
})
