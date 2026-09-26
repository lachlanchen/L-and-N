import { Capacitor } from '@capacitor/core'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import type { Exercise, TrainingLanguage } from '../types'
import { isAndroidApp } from './android-speech-consent'

export interface SpeechSession {
  result: Promise<string>
  stop: () => Promise<void>
  sameOriginFallback: 'never' | 'when-empty'
}

interface BrowserSpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
  error: string
}

interface BrowserSpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognitionInstance

function browserConstructor(): BrowserSpeechRecognitionConstructor | undefined {
  const browserWindow = window as typeof window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
  }
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition
}

function sameOriginFallbackSession(): SpeechSession {
  return {
    result: Promise.resolve(''),
    stop: async () => undefined,
    sameOriginFallback: 'when-empty',
  }
}

export function isIOSWebBrowser(): boolean {
  const userAgent = navigator.userAgent ?? ''
  const iOSDevice = /iPad|iPhone|iPod/i.test(userAgent)
  const iPadDesktopMode = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iOSDevice || iPadDesktopMode
}

/**
 * The tag the browser speech recognizer expects. Chrome has no `yue-HK`; its
 * Cantonese voice is `yue-Hant-HK`, and an unknown tag makes the recognizer
 * end with no result at all, which is why Cantonese attempts reported that no
 * word could be recognized.
 */
export function recognitionLocale(language: TrainingLanguage): string {
  return language === 'yue-HK' ? 'yue-Hant-HK' : language
}

function beginBrowserRecognition(language: TrainingLanguage): SpeechSession {
  // iOS WebKit cannot reliably keep MediaRecorder/Web Audio and the browser
  // speech recognizer on the microphone at the same time. Capture once, show
  // that stream in the waveform, then transcribe that exact blob after stop.
  if (isIOSWebBrowser()) return sameOriginFallbackSession()

  const Constructor = browserConstructor()
  if (!Constructor) return sameOriginFallbackSession()

  let recognition: BrowserSpeechRecognitionInstance
  try {
    recognition = new Constructor()
  } catch {
    return sameOriginFallbackSession()
  }
  recognition.lang = recognitionLocale(language)
  recognition.continuous = false
  recognition.interimResults = false
  recognition.maxAlternatives = 3

  let resolveResult: (value: string) => void = () => undefined
  let settled = false
  const result = new Promise<string>((resolve) => {
    resolveResult = resolve
  })
  const settle = (value: string) => {
    if (settled) return
    settled = true
    resolveResult(value)
  }

  recognition.onresult = (event) => settle(event.results[0]?.[0]?.transcript ?? '')
  recognition.onerror = () => settle('')
  recognition.onend = () => settle('')
  try {
    recognition.start()
  } catch {
    return sameOriginFallbackSession()
  }

  return {
    result,
    stop: async () => {
      try {
        recognition.stop()
      } catch {
        recognition.abort()
      }
    },
    // A constructor and a successful start do not mean that browser speech
    // recognition will return a result. Safari and Chromium can end later
    // with an empty result, so permit a same-origin fallback only in that case.
    sameOriginFallback: 'when-empty',
  }
}

async function beginNativeRecognition(language: TrainingLanguage): Promise<SpeechSession> {
  const availability = await SpeechRecognition.available()
  if (!availability.available) {
    return {
      result: Promise.resolve(''),
      stop: async () => undefined,
      sameOriginFallback: 'never',
    }
  }

  let permission = await SpeechRecognition.checkPermissions()
  if (permission.speechRecognition !== 'granted') {
    permission = await SpeechRecognition.requestPermissions()
  }
  if (permission.speechRecognition !== 'granted') {
    throw new Error('Speech recognition permission was not granted.')
  }

  const result = SpeechRecognition.start({
    language,
    maxResults: 3,
    partialResults: false,
    popup: false,
    prompt: 'Say the practice word',
  }).then(({ matches }) => matches?.[0] ?? '')

  return {
    result,
    stop: async () => {
      // Version 7 of the Android community plugin dispatches stopListening()
      // but never resolves its PluginCall. Fire the command and allow the
      // recognition result/error promise above to settle independently.
      void SpeechRecognition.stop().catch(() => undefined)
    },
    sameOriginFallback: 'never',
  }
}

export async function beginSpeechRecognition(
  language: TrainingLanguage,
  options: { allowOnlineRecognition?: boolean } = {},
): Promise<SpeechSession> {
  // Android's system recognizer opens a second microphone, independent of
  // MediaRecorder. Some OEMs silence that consumer; others have no compatible
  // recognition service. Transcribe the exact waveform recording instead,
  // only after the learner has explicitly opted in. iOS stays native.
  if (isAndroidApp()) {
    return options.allowOnlineRecognition
      ? sameOriginFallbackSession()
      : { result: Promise.resolve(''), stop: async () => undefined, sameOriginFallback: 'never' }
  }
  if (Capacitor.isNativePlatform()) return beginNativeRecognition(language)
  return beginBrowserRecognition(language)
}

function exampleAudioPath(exercise: Exercise): string {
  const key = exercise.id.split('-').slice(0, 2).join('-')
  return `/audio/models/${key}.mp3?v=3`
}

/** Resolves at the end of the whole two-repeat model, not when play() starts. */
export function speakExample(exercise: Exercise, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const audio = new Audio(exampleAudioPath(exercise))
    audio.preload = 'auto'
    let settled = false
    let fallback = false
    let utterance: SpeechSynthesisUtterance | null = null
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      audio.removeEventListener('ended', ended)
      audio.removeEventListener('error', useVoice)
      audio.pause()
      signal?.removeEventListener('abort', cancel)
      if (utterance) { utterance.onend = null; utterance.onerror = null }
      if (error) reject(error)
      else resolve()
    }
    const ended = () => finish()
    const cancel = () => {
      if (utterance) window.speechSynthesis.cancel()
      finish()
    }
    const useVoice = () => {
      if (settled || fallback) return
      fallback = true
      audio.pause()
      audio.removeEventListener('ended', ended)
      audio.removeEventListener('error', useVoice)
      if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
        finish(new Error('Studio audio and speech playback are unavailable'))
        return
      }
      try {
        const text = exercise.word.split(' ')[0]
        utterance = new SpeechSynthesisUtterance(`${text}. ${text}.`)
        utterance.lang = exercise.language
        utterance.rate = 0.72
        utterance.pitch = 1
        const stem = exercise.language.toLowerCase().split('-')[0]
        const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith(stem))
        if (voice) utterance.voice = voice
        utterance.onend = ended
        utterance.onerror = () => finish(new Error('Speech playback failed'))
        window.speechSynthesis.speak(utterance)
      } catch {
        finish(new Error('Speech playback failed'))
      }
    }
    // A lost media event or stalled download must not leave the control locked.
    const timeout = window.setTimeout(() => {
      finish(new Error('Studio playback timed out'))
      if (utterance) window.speechSynthesis.cancel()
    }, 30_000)
    audio.addEventListener('ended', ended)
    audio.addEventListener('error', useVoice)
    signal?.addEventListener('abort', cancel, { once: true })
    try {
      void audio.play().then(() => { if (settled || fallback) audio.pause() }, useVoice)
    } catch {
      useVoice()
    }
  })
}

interface WhisperResponse {
  text?: string
}

/**
 * Where the transcription request goes.
 *
 * A packaged app is served from its own local origin, so a relative path
 * reaches the bundle rather than the site and the request simply fails. The
 * native builds therefore call the public endpoint, which now allows the
 * WebView origins. Android needs this to have any word recognition at all,
 * and it gives iOS a second chance when Apple's dictation returns nothing.
 */
function transcriptionEndpoint(): string {
  const local = /^(capacitor|ionic):/.test(window.location.protocol) || window.location.hostname === 'localhost'
  return local ? 'https://l-and-n.lazying.art/api/pronunciation/transcriptions' : '/api/pronunciation/transcriptions'
}

/** The language hint for one transcription attempt. */
function whisperLanguage(language: TrainingLanguage): string {
  // The service recognizes `yue`, and asking for it keeps short Cantonese
  // clips from being read as Mandarin.
  return language === 'en-US' ? 'en' : language === 'yue-HK' ? 'yue' : 'zh'
}

async function postTranscription(
  blob: Blob,
  language: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) return ''
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  const body = new FormData()
  const extension = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('wav') ? 'wav' : 'webm'
  body.append('file', blob, `practice.${extension}`)
  body.append('language', language)
  try {
    const response = await fetch(transcriptionEndpoint(), {
      method: 'POST',
      body,
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) {
      // Local diagnostic only: never log audio, transcript or request bodies.
      console.warn('L & N transcription unavailable', { status: response.status })
      return ''
    }
    const result = (await response.json()) as WhisperResponse
    return typeof result.text === 'string' ? result.text.trim() : ''
  } catch {
    return ''
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

/** True when a transcript carries no letters or characters, only punctuation. */
export function isEmptyTranscript(value: string): boolean {
  return !/[\p{L}\p{N}]/u.test(value)
}

export async function transcribeWithWhisper(
  blob: Blob,
  language: TrainingLanguage,
  timeoutMs = 15000,
  signal?: AbortSignal,
): Promise<string> {
  const first = await postTranscription(blob, whisperLanguage(language), timeoutMs, signal)
  if (!isEmptyTranscript(first)) return first
  // A failed request is not a language problem. Do not double the load or
  // retry a cancelled upload; retry only a successful punctuation-only result.
  if (!first || signal?.aborted) return ''
  // A short clip often comes back as punctuation under a forced language.
  // Letting the service detect the language itself recovers many of those.
  const second = await postTranscription(blob, 'auto', timeoutMs, signal)
  return isEmptyTranscript(second) ? '' : second
}

export function transcribeWithAllowedFallback(
  session: Pick<SpeechSession, 'sameOriginFallback'>,
  blob: Blob,
  language: TrainingLanguage,
  recognizedText = '',
  signal?: AbortSignal,
): Promise<string> {
  const recognized = recognizedText.trim()
  if (recognized || session.sameOriginFallback === 'never') return Promise.resolve(recognized)
  return transcribeWithWhisper(blob, language, 15000, signal)
}
