// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { beginSpeechRecognition, isIOSWebBrowser, transcribeWithAllowedFallback } from './speech'

const speechRecognitionMocks = vi.hoisted(() => ({
  available: vi.fn(),
  checkPermissions: vi.fn(),
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
  vi.clearAllMocks()
  delete (window as typeof window & { SpeechRecognition?: typeof BrowserRecognition })
    .SpeechRecognition
  delete (window as typeof window & { webkitSpeechRecognition?: typeof BrowserRecognition })
    .webkitSpeechRecognition
})

describe('speech-recognition privacy boundary', () => {
  it('allows the same-origin fallback when browser recognition is absent', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)

    const session = await beginSpeechRecognition('en-US')

    expect(session.sameOriginFallback).toBe('when-empty')
  })

  it('does not upload a second copy when browser recognition returns text', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)
    ;(
      window as typeof window & {
        SpeechRecognition?: typeof BrowserRecognition
      }
    ).SpeechRecognition = BrowserRecognition

    const session = await beginSpeechRecognition('en-US')
    const fetchSpy = vi.spyOn(window, 'fetch')

    expect(session.sameOriginFallback).toBe('when-empty')
    await expect(
      transcribeWithAllowedFallback(session, new Blob(['audio']), 'en-US', ' light '),
    ).resolves.toBe('light')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('uses the fallback after a declared browser recognizer returns no text', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)
    ;(
      window as typeof window & {
        SpeechRecognition?: typeof BrowserRecognition
      }
    ).SpeechRecognition = BrowserRecognition
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ text: 'night' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const session = await beginSpeechRecognition('en-US')

    await expect(
      transcribeWithAllowedFallback(session, new Blob(['audio']), 'en-US', ''),
    ).resolves.toBe('night')
    expect(window.fetch).toHaveBeenCalledOnce()
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

    expect(session.sameOriginFallback).toBe('when-empty')
  })

  it('uses one captured stream on iPhone web instead of starting a competing recognizer', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    )
    const start = vi.fn()
    class IOSBrowserRecognition extends BrowserRecognition {
      start = start
    }
    ;(
      window as typeof window & {
        SpeechRecognition?: typeof IOSBrowserRecognition
      }
    ).SpeechRecognition = IOSBrowserRecognition

    expect(isIOSWebBrowser()).toBe(true)
    const session = await beginSpeechRecognition('en-US')

    expect(session.sameOriginFallback).toBe('when-empty')
    expect(start).not.toHaveBeenCalled()
  })

  it('never opts a native app into the L & N server fallback', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    speechRecognitionMocks.available.mockResolvedValue({ available: false })

    const session = await beginSpeechRecognition('en-US')

    expect(session.sameOriginFallback).toBe('never')
  })

  it('does not let an unresolved native stop call block analysis', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    speechRecognitionMocks.available.mockResolvedValue({ available: true })
    speechRecognitionMocks.checkPermissions.mockResolvedValue({ speechRecognition: 'granted' })
    speechRecognitionMocks.start.mockResolvedValue({ matches: ['light'] })
    speechRecognitionMocks.stop.mockReturnValue(new Promise(() => undefined))

    const session = await beginSpeechRecognition('en-US')

    await expect(session.stop()).resolves.toBeUndefined()
    await expect(session.result).resolves.toBe('light')
    expect(speechRecognitionMocks.requestPermissions).not.toHaveBeenCalled()
    expect(speechRecognitionMocks.stop).toHaveBeenCalledOnce()
  })
})
