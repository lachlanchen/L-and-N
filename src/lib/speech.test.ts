// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { beginSpeechRecognition, transcribeWithAllowedFallback } from './speech'

const speechRecognitionMocks = vi.hoisted(() => ({
  available: vi.fn(),
  requestPermissions: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}))

vi.mock('@capacitor-community/speech-recognition', () => ({
  SpeechRecognition: speechRecognitionMocks,
}))

class BrowserRecognition extends EventTarget {
  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1
  onresult = null
  onerror = null
  onend = null
  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()
}

afterEach(() => {
  vi.restoreAllMocks()
  delete (window as typeof window & { SpeechRecognition?: typeof BrowserRecognition })
    .SpeechRecognition
  delete (window as typeof window & { webkitSpeechRecognition?: typeof BrowserRecognition })
    .webkitSpeechRecognition
})

describe('speech-recognition privacy boundary', () => {
  it('uses the same-origin fallback only when browser recognition is absent', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)

    const session = await beginSpeechRecognition('en-US')

    expect(session.useSameOriginFallback).toBe(true)
  })

  it('does not upload a second copy when browser recognition is available', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)
    ;(
      window as typeof window & {
        SpeechRecognition?: typeof BrowserRecognition
      }
    ).SpeechRecognition = BrowserRecognition

    const session = await beginSpeechRecognition('en-US')
    const fetchSpy = vi.spyOn(window, 'fetch')

    expect(session.useSameOriginFallback).toBe(false)
    await expect(
      transcribeWithAllowedFallback(session, new Blob(['audio']), 'en-US'),
    ).resolves.toBe('')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back when a declared browser recognizer cannot start', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)
    class FailingBrowserRecognition extends BrowserRecognition {
      start = vi.fn(() => {
        throw new Error('not supported')
      })
    }
    ;(
      window as typeof window & {
        SpeechRecognition?: typeof FailingBrowserRecognition
      }
    ).SpeechRecognition = FailingBrowserRecognition

    const session = await beginSpeechRecognition('en-US')

    expect(session.useSameOriginFallback).toBe(true)
  })

  it('never opts a native app into the L & N server fallback', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    speechRecognitionMocks.available.mockResolvedValue({ available: false })

    const session = await beginSpeechRecognition('en-US')

    expect(session.useSameOriginFallback).toBe(false)
  })
})
