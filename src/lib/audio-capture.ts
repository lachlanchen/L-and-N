import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { decodeAudioFeatures, extractAcousticFeatures } from './acoustics'
import {
  beginSpeechRecognition,
  transcribeWithAllowedFallback,
  type SpeechSession,
} from './speech'
import type { AcousticFeatures, TrainingLanguage } from '../types'

export type AudioCaptureErrorCode =
  | 'microphone-unavailable'
  | 'empty-recording'
  | 'silent-recording'
  | 'recording-failed'

export class AudioCaptureError extends Error {
  readonly code: AudioCaptureErrorCode

  constructor(
    code: AudioCaptureErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'AudioCaptureError'
    this.code = code
  }
}

export interface LiveSignal {
  rms: number
  waveform: number[]
}

export interface CapturedAudio {
  features: AcousticFeatures
  transcript: string
  rawBytes: number
  source: 'native-ios' | 'web'
}

export interface ActiveAudioCapture {
  analyser: AnalyserNode | null
  stop: () => Promise<CapturedAudio>
  cancel: () => Promise<void>
}

interface StartCaptureOptions {
  language: TrainingLanguage
  expectedWords: string[]
  onLiveSignal: (signal: LiveSignal) => void
}

interface NativeRecorderStartResult {
  sampleRate: number
  speechRecognitionAvailable: boolean
}

interface NativeRecorderStopResult {
  pcm16Base64: string
  sampleRate: number
  transcript: string
  durationMs: number
}

interface NativeRecorderPlugin {
  start(options: {
    language: TrainingLanguage
    contextualStrings: string[]
    maximumDurationMs: number
  }): Promise<NativeRecorderStartResult>
  stop(): Promise<NativeRecorderStopResult>
  cancel(): Promise<void>
  addListener(
    eventName: 'meter',
    listener: (signal: LiveSignal) => void,
  ): Promise<PluginListenerHandle>
}

const NativeAudioRecorder = registerPlugin<NativeRecorderPlugin>('NativeAudioRecorder')

const inactiveSpeechSession = (): SpeechSession => ({
  result: Promise.resolve(''),
  stop: async () => undefined,
  useSameOriginFallback: false,
})

const timeout = <T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new AudioCaptureError('recording-failed', message)),
      milliseconds,
    )
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })

export function decodePCM16Base64(value: string): Float32Array {
  if (!value) return new Float32Array()
  const binary = window.atob(value)
  const sampleCount = Math.floor(binary.length / 2)
  const samples = new Float32Array(sampleCount)
  for (let index = 0; index < sampleCount; index += 1) {
    const offset = index * 2
    const unsigned = binary.charCodeAt(offset) | (binary.charCodeAt(offset + 1) << 8)
    const signed = unsigned >= 0x8000 ? unsigned - 0x10000 : unsigned
    samples[index] = signed / 32768
  }
  return samples
}

export function validateCapturedAudio(
  features: AcousticFeatures,
  rawBytes: number,
): void {
  const essentialValues = [
    features.rms,
    features.durationMs,
    features.signalQuality,
    features.spectralCentroidHz,
  ]
  if (rawBytes < 256 || features.waveform.length < 8 || essentialValues.some((value) => !Number.isFinite(value))) {
    throw new AudioCaptureError('empty-recording', 'The recorder returned no decodable audio samples.')
  }
  if (features.rms < 0.0018 || features.durationMs < 120) {
    throw new AudioCaptureError('silent-recording', 'The recording did not contain a clear spoken sound.')
  }
}

async function startNativeIOSCapture(options: StartCaptureOptions): Promise<ActiveAudioCapture> {
  let listener: PluginListenerHandle | null = null
  try {
    listener = await NativeAudioRecorder.addListener('meter', (signal) => {
      options.onLiveSignal({
        rms: Number.isFinite(signal.rms) ? Math.max(0, signal.rms) : 0,
        waveform: Array.isArray(signal.waveform)
          ? signal.waveform.filter(Number.isFinite).slice(0, 128)
          : [],
      })
    })
    await NativeAudioRecorder.start({
      language: options.language,
      contextualStrings: options.expectedWords.filter(Boolean).slice(0, 8),
      maximumDurationMs: 6000,
    })
  } catch (error) {
    await listener?.remove().catch(() => undefined)
    await NativeAudioRecorder.cancel().catch(() => undefined)
    throw new AudioCaptureError('microphone-unavailable', 'The native iOS recorder could not start.', {
      cause: error,
    })
  }

  let finished = false
  const removeListener = async () => {
    await listener?.remove().catch(() => undefined)
    listener = null
  }

  return {
    analyser: null,
    stop: async () => {
      if (finished) throw new AudioCaptureError('recording-failed', 'This recording session has already ended.')
      finished = true
      try {
        const result = await timeout(
          NativeAudioRecorder.stop(),
          3500,
          'The native iOS recorder did not finish in time.',
        )
        const samples = decodePCM16Base64(result.pcm16Base64)
        if (!Number.isFinite(result.sampleRate) || result.sampleRate <= 0) {
          throw new AudioCaptureError('empty-recording', 'The native recorder returned an invalid sample rate.')
        }
        const features = extractAcousticFeatures(samples, result.sampleRate)
        validateCapturedAudio(features, samples.byteLength)
        return {
          features,
          transcript: result.transcript?.trim() ?? '',
          rawBytes: samples.byteLength,
          source: 'native-ios',
        }
      } finally {
        await removeListener()
      }
    },
    cancel: async () => {
      if (finished) return
      finished = true
      try {
        await NativeAudioRecorder.cancel()
      } finally {
        await removeListener()
      }
    },
  }
}

function audioContextConstructor(): typeof AudioContext | undefined {
  const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext }
  return window.AudioContext ?? audioWindow.webkitAudioContext
}

function preferredRecorderOptions(): MediaRecorderOptions | undefined {
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    return { mimeType: 'audio/webm;codecs=opus' }
  }
  if (MediaRecorder.isTypeSupported('audio/mp4')) return { mimeType: 'audio/mp4' }
  return undefined
}

async function startWebCapture(options: StartCaptureOptions): Promise<ActiveAudioCapture> {
  const Context = audioContextConstructor()
  if (!Context || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new AudioCaptureError('microphone-unavailable', 'This browser does not provide the required audio capture APIs.')
  }

  // Construct, resume, and request media in the original tap task. In WebKit,
  // doing this only after permission awaits can leave the analyser suspended.
  const audioContext = new Context()
  const resumePromise = audioContext.resume()
  const streamPromise = navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  })

  let stream: MediaStream | null = null
  let speech = inactiveSpeechSession()
  try {
    // Wait for both startup operations to settle so a stream that opens just
    // as Web Audio fails can still be stopped in the catch path. Losing that
    // stream reference leaves WebKit's microphone occupied until the PWA is
    // killed.
    const [resumeResult, streamResult] = await Promise.allSettled([
      resumePromise,
      streamPromise,
    ])
    if (streamResult.status === 'fulfilled') stream = streamResult.value
    if (resumeResult.status === 'rejected') throw resumeResult.reason
    if (streamResult.status === 'rejected') throw streamResult.reason
    const activeStream = streamResult.value
    stream = activeStream
    if (audioContext.state !== 'running') await audioContext.resume()
    if (audioContext.state !== 'running') {
      throw new AudioCaptureError('microphone-unavailable', 'The live audio analyser remained suspended.')
    }

    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.72
    audioContext.createMediaStreamSource(activeStream).connect(analyser)

    speech = await beginSpeechRecognition(options.language).catch(() => inactiveSpeechSession())
    const recorder = new MediaRecorder(activeStream, preferredRecorderOptions())
    const chunks: Blob[] = []
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    })
    recorder.start()

    let finished = false
    const closeResources = async () => {
      stream?.getTracks().forEach((track) => track.stop())
      if (audioContext.state !== 'closed') await audioContext.close().catch(() => undefined)
    }

    return {
      analyser,
      stop: async () => {
        if (finished) throw new AudioCaptureError('recording-failed', 'This recording session has already ended.')
        finished = true
        const stopped = new Promise<Blob>((resolve, reject) => {
          recorder.addEventListener(
            'stop',
            () => resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })),
            { once: true },
          )
          recorder.addEventListener(
            'error',
            () => reject(new AudioCaptureError('recording-failed', 'The browser recorder reported an error.')),
            { once: true },
          )
        })
        const speechStop = speech.stop().catch(() => undefined)
        try {
          if (recorder.state === 'inactive') {
            throw new AudioCaptureError('empty-recording', 'The browser recorder stopped before audio was collected.')
          }
          recorder.stop()
          const blob = await timeout(stopped, 2500, 'The browser recorder did not finish in time.')
          const [features, nativeTranscript, fallbackTranscript] = await Promise.all([
            decodeAudioFeatures(blob),
            timeout(speech.result.catch(() => ''), 2200, 'Speech recognition did not finish in time.').catch(() => ''),
            transcribeWithAllowedFallback(speech, blob, options.language),
          ])
          validateCapturedAudio(features, blob.size)
          return {
            features,
            transcript: nativeTranscript || fallbackTranscript,
            rawBytes: blob.size,
            source: 'web',
          }
        } catch (error) {
          if (error instanceof AudioCaptureError) throw error
          throw new AudioCaptureError('recording-failed', 'The captured audio could not be decoded.', { cause: error })
        } finally {
          await speechStop
          await closeResources()
        }
      },
      cancel: async () => {
        if (finished) return
        finished = true
        try {
          if (recorder.state !== 'inactive') recorder.stop()
          await speech.stop().catch(() => undefined)
        } finally {
          await closeResources()
        }
      },
    }
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop())
    await speech.stop().catch(() => undefined)
    if (audioContext.state !== 'closed') await audioContext.close().catch(() => undefined)
    if (error instanceof AudioCaptureError) throw error
    throw new AudioCaptureError('microphone-unavailable', 'The microphone could not start.', { cause: error })
  }
}

export async function startAudioCapture(options: StartCaptureOptions): Promise<ActiveAudioCapture> {
  const useNativeIOSRecorder =
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === 'ios' &&
    Capacitor.isPluginAvailable('NativeAudioRecorder')
  return useNativeIOSRecorder ? startNativeIOSCapture(options) : startWebCapture(options)
}
