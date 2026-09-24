// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { extractAcousticFeatures } from './acoustics'
import * as acoustics from './acoustics'
import {
  AudioCaptureError,
  decodePCM16Base64,
  startAudioCapture,
  validateCapturedAudio,
} from './audio-capture'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('captured-audio validation', () => {
  it('decodes signed little-endian PCM16 samples', () => {
    const bytes = String.fromCharCode(0, 0, 255, 127, 0, 128)
    const samples = decodePCM16Base64(window.btoa(bytes))

    expect([...samples]).toEqual([0, 32767 / 32768, -1])
  })

  it('rejects silence instead of returning a synthetic score input', () => {
    const features = extractAcousticFeatures(new Float32Array(16_000), 16_000)

    expect(() => validateCapturedAudio(features, 32_000)).toThrowError(AudioCaptureError)
    try {
      validateCapturedAudio(features, 32_000)
    } catch (error) {
      expect((error as AudioCaptureError).code).toBe('silent-recording')
    }
  })

  it('accepts a decodable voiced recording', () => {
    const samples = Float32Array.from({ length: 8_000 }, (_, index) =>
      Math.sin((2 * Math.PI * 220 * index) / 16_000) * 0.18,
    )
    const features = extractAcousticFeatures(samples, 16_000)

    expect(() => validateCapturedAudio(features, samples.byteLength)).not.toThrow()
  })
})

describe('web capture startup', () => {
  it('never requests the Android microphone without online-recognition consent', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android')
    const getUserMedia = vi.fn()
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
    await expect(startAudioCapture({ language: 'en-US', expectedWords: ['light', 'night'], onLiveSignal: vi.fn() }))
      .rejects.toMatchObject({ code: 'microphone-unavailable' })
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('uses one Android recording and frees the microphone before uploading it', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android')
    const trackStop = vi.fn()
    const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: trackStop }] }))
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
    const close = vi.fn(async () => undefined)
    class Context {
      state = 'running'
      resume = vi.fn(async () => undefined)
      close = close
      createAnalyser = () => ({ fftSize: 2048, smoothingTimeConstant: 0 })
      createMediaStreamSource = () => ({ connect: vi.fn() })
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: Context })
    const chunk = new Blob([new Uint8Array(32000)], { type: 'audio/webm;codecs=opus' })
    class Recorder extends EventTarget {
      static isTypeSupported = () => true
      state = 'inactive'
      mimeType = chunk.type
      start() { this.state = 'recording' }
      stop() {
        this.state = 'inactive'
        this.dispatchEvent(Object.assign(new Event('dataavailable'), { data: chunk }))
        this.dispatchEvent(new Event('stop'))
      }
    }
    Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: Recorder })
    const features = extractAcousticFeatures(Float32Array.from({ length: 16000 }, (_, i) => 0.15 * Math.sin(i / 10)), 16000)
    vi.spyOn(acoustics, 'decodeAudioFeatures').mockResolvedValue(features)
    vi.spyOn(window, 'fetch').mockImplementation(async (_url, options) => {
      expect(trackStop).toHaveBeenCalledOnce()
      expect(close).toHaveBeenCalledOnce()
      const file = (options?.body as FormData).get('file') as File
      expect(file.size).toBe(chunk.size)
      expect(file.type).toBe(chunk.type)
      return new Response(JSON.stringify({ text: 'light' }))
    })
    const capture = await startAudioCapture({ language: 'en-US', expectedWords: ['light', 'night'], allowOnlineRecognition: true, onLiveSignal: vi.fn() })
    expect(getUserMedia).toHaveBeenCalledExactlyOnceWith({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
    const result = await capture.stop()
    expect(result.transcript).toBe('light')
    expect(result.features).toBe(features)
    expect(result.recording?.blob.size).toBe(chunk.size)
    expect(window.fetch).toHaveBeenCalledOnce()
    expect(trackStop).toHaveBeenCalledOnce()
  })

  it('resumes Web Audio in the tap task and releases every resource on cancel', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)
    const trackStop = vi.fn()
    const stream = { getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream
    const getUserMedia = vi.fn(async () => stream)
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })

    const resume = vi.fn(async function (this: { state: AudioContextState }) {
      this.state = 'running'
    })
    const close = vi.fn(async function (this: { state: AudioContextState }) {
      this.state = 'closed'
    })
    const analyser = { fftSize: 0, smoothingTimeConstant: 0 } as AnalyserNode
    const connect = vi.fn()
    class FakeAudioContext {
      state: AudioContextState = 'suspended'
      resume = resume
      close = close
      createAnalyser = vi.fn(() => analyser)
      createMediaStreamSource = vi.fn(() => ({ connect }))
    }
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: FakeAudioContext,
    })

    class FakeMediaRecorder extends EventTarget {
      static isTypeSupported = vi.fn(() => false)
      state: RecordingState = 'inactive'
      mimeType = 'audio/webm'
      start = vi.fn(() => { this.state = 'recording' })
      stop = vi.fn(() => { this.state = 'inactive' })
    }
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: FakeMediaRecorder,
    })
    Object.defineProperty(globalThis, 'MediaRecorder', {
      configurable: true,
      value: FakeMediaRecorder,
    })

    const capture = await startAudioCapture({
      language: 'en-US',
      expectedWords: ['light', 'night'],
      onLiveSignal: vi.fn(),
    })

    expect(resume).toHaveBeenCalledTimes(1)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(connect).toHaveBeenCalledWith(analyser)
    await capture.cancel()
    expect(trackStop).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('releases an opened stream when Web Audio activation fails', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)
    const trackStop = vi.fn()
    const stream = { getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => stream) },
    })

    const close = vi.fn(async function (this: { state: AudioContextState }) {
      this.state = 'closed'
    })
    class FailedAudioContext {
      state: AudioContextState = 'suspended'
      resume = vi.fn(async () => { throw new Error('activation failed') })
      close = close
    }
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: FailedAudioContext,
    })

    await expect(startAudioCapture({
      language: 'en-US',
      expectedWords: ['light', 'night'],
      onLiveSignal: vi.fn(),
    })).rejects.toMatchObject({ code: 'microphone-unavailable' })
    expect(trackStop).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(1)
  })
})
