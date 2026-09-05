import { Capacitor } from '@capacitor/core'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import type { Exercise, TrainingLanguage } from '../types'

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
  recognition.lang = language
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

export async function beginSpeechRecognition(language: TrainingLanguage): Promise<SpeechSession> {
  if (Capacitor.isNativePlatform()) return beginNativeRecognition(language)
  return beginBrowserRecognition(language)
}

function browserVoice(text: string, language: TrainingLanguage): void {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = language
  utterance.rate = 0.72
  utterance.pitch = 1
  const languageStem = language.toLowerCase().split('-')[0]
  const preferredVoice = window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang.toLowerCase().startsWith(languageStem))
  if (preferredVoice) utterance.voice = preferredVoice
  window.speechSynthesis.speak(utterance)
}

function exampleAudioPath(exercise: Exercise): string {
  const key = exercise.id.split('-').slice(0, 2).join('-')
  return `/audio/models/${key}.mp3?v=2`
}

export async function speakExample(exercise: Exercise): Promise<void> {
  const text = exercise.word.split(' ')[0]
  const audio = new Audio(exampleAudioPath(exercise))
  audio.preload = 'auto'
  try {
    await audio.play()
  } catch {
    browserVoice(text, exercise.language)
  }
}

interface WhisperResponse {
  text?: string
}

export async function transcribeWithWhisper(
  blob: Blob,
  language: TrainingLanguage,
  timeoutMs = 15000,
): Promise<string> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  const body = new FormData()
  const extension = blob.type.includes('mp4') ? 'm4a' : 'webm'
  body.append('file', blob, `practice.${extension}`)
  // Whisper uses its Chinese model for both Mandarin and Cantonese; `yue` is
  // not a supported language code on every backend.
  body.append('language', language === 'en-US' ? 'en' : 'zh')
  try {
    const response = await fetch('/api/pronunciation/transcriptions', {
      method: 'POST',
      body,
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
    if (!response.ok) return ''
    const result = (await response.json()) as WhisperResponse
    return result.text?.trim() ?? ''
  } catch {
    return ''
  } finally {
    window.clearTimeout(timeout)
  }
}

export function transcribeWithAllowedFallback(
  session: Pick<SpeechSession, 'sameOriginFallback'>,
  blob: Blob,
  language: TrainingLanguage,
  recognizedText = '',
): Promise<string> {
  const recognized = recognizedText.trim()
  if (recognized || session.sameOriginFallback === 'never') return Promise.resolve(recognized)
  return transcribeWithWhisper(blob, language)
}
