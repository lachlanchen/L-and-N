// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { beginSpeechRecognition, isIOSWebBrowser, isEmptyTranscript, isWordTranscript, transcribeWithAllowedFallback, transcribeWithWhisper, UnreliableTranscriptError } from './speech'

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
  vi.useRealTimers()
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

  it('keeps native iOS out of the L & N server fallback', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios')
    speechRecognitionMocks.available.mockResolvedValue({ available: false })

    const session = await beginSpeechRecognition('en-US')

    expect(session.sameOriginFallback).toBe('never')
  })

  it('does not let an unresolved native stop call block analysis', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios')
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

  it('does not open a second Android microphone or upload without consent', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android')
    const fetchSpy = vi.spyOn(window, 'fetch')
    const session = await beginSpeechRecognition('en-US')
    expect(session.sameOriginFallback).toBe('never')
    await expect(transcribeWithAllowedFallback(session, new Blob(['audio']), 'en-US')).resolves.toBe('')
    expect(speechRecognitionMocks.available).not.toHaveBeenCalled()
    expect(speechRecognitionMocks.start).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it.each(['light', 'low', 'night', 'no'])('transcribes the captured Android word %s without target-word bias', async (word) => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android')
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ text: word })))
    const session = await beginSpeechRecognition('en-US', { allowOnlineRecognition: true })
    const blob = new Blob(['captured sound'], { type: 'audio/webm' })
    await expect(transcribeWithAllowedFallback(session, blob, 'en-US')).resolves.toBe(word)
    expect(speechRecognitionMocks.start).not.toHaveBeenCalled()
    const body = vi.mocked(window.fetch).mock.calls[0][1]?.body as FormData
    expect([...body.keys()]).toEqual(['file', 'language'])
    expect(body.get('language')).toBe('en')
    expect((body.get('file') as File).size).toBe(blob.size)
  })

  it.each([429, 503])('does not retry an unavailable service (%s) as a language problem', async (status) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response('', { status }))
    await expect(transcribeWithAllowedFallback({ sameOriginFallback: 'when-empty' }, new Blob(['audio']), 'en-US')).resolves.toBe('')
    expect(window.fetch).toHaveBeenCalledOnce()
  })

  it('never uploads an already cancelled attempt', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch')
    const controller = new AbortController()
    controller.abort()
    await expect(transcribeWithAllowedFallback({ sameOriginFallback: 'when-empty' }, new Blob(['audio']), 'en-US', '', controller.signal)).resolves.toBe('')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('treats punctuation and whitespace as missing recognition, not a word', () => {
    for (const value of ['', '  ', '。', '...']) expect(isEmptyTranscript(value)).toBe(true)
    for (const value of ['light', 'low', 'night', 'no', '南', '藍']) expect(isEmptyTranscript(value)).toBe(false)
  })

  it.each(['Low.', 'LOW, low.', 'night', 'No! No!', "Let's", 'wrong'])('accepts a short English word without target bias: %s', (text) => {
    expect(isWordTranscript(text, 'en-US')).toBe(true)
  })

  it.each(['藍', '蓝，蓝', '南', 'laam4', 'Nam.', 'lǚ', '女 女'])('preserves Han, homophone and romanized words: %s', (text) => {
    expect(isWordTranscript(text, 'zh-CN')).toBe(true)
    expect(isWordTranscript(text, 'yue-HK')).toBe(true)
  })

  it.each(['Thank you for watching.', 'I feel low today', 'low no', '多謝收睇', '字幕由社群提供', 'low low low low', '12345'])('rejects sentence-like/mixed output without silently scoring it: %s', async (text) => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ text })))
    await expect(transcribeWithWhisper(new Blob(['audio']), 'en-US')).rejects.toBeInstanceOf(UnreliableTranscriptError)
    expect(window.fetch).toHaveBeenCalledOnce()
  })

  it('does not change the native/browser transcript path', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch')
    await expect(transcribeWithAllowedFallback({ sameOriginFallback: 'never' }, new Blob(), 'en-US', 'native text unchanged')).resolves.toBe('native text unchanged')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('shares one deadline between punctuation recovery requests', async () => {
    vi.useFakeTimers()
    vi.spyOn(window, 'fetch').mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 11_000))
      return new Response(JSON.stringify({ text: '.' }))
    }).mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const result = transcribeWithWhisper(new Blob(['audio']), 'en-US')
    await vi.advanceTimersByTimeAsync(15_000)
    await expect(result).resolves.toBe('')
    expect(window.fetch).toHaveBeenCalledTimes(2)
  })
})
