// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractAcousticFeatures } from './acoustics'

const recorder = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(), cancel: vi.fn(), addListener: vi.fn() }))
vi.mock('@capacitor/core', async (original) => {
  const actual = await original<typeof import('@capacitor/core')>()
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true, getPlatform: () => 'ios', isPluginAvailable: () => true },
    registerPlugin: (name: string) => name === 'NativeAudioRecorder' ? recorder : actual.registerPlugin(name) }
})
import { decodePCM16Base64, startAudioCapture } from './audio-capture'

beforeEach(() => {
  vi.resetAllMocks()
  recorder.start.mockResolvedValue({ sampleRate: 16000, speechRecognitionAvailable: true })
  recorder.addListener.mockResolvedValue({ remove: vi.fn(async () => undefined) })
})

describe('compact native replay is independent of scoring audio', () => {
  it.each([undefined, 'AQIDBA==', 'invalid base64%'])('preserves full PCM features and transcript: replay %s', async (replayBase64) => {
    const pcm = Int16Array.from({ length: 8000 }, (_, i) => Math.sin(i * 220 * 2 * Math.PI / 16000) * 8000)
    const pcm16Base64 = btoa(Array.from(new Uint8Array(pcm.buffer), (byte) => String.fromCharCode(byte)).join(''))
    recorder.stop.mockResolvedValue({ pcm16Base64, sampleRate: 16000, transcript: 'light', durationMs: 500,
      replayBase64, replayMimeType: 'audio/mp4' })
    const capture = await startAudioCapture({ language: 'en-US', expectedWords: ['light', 'night'], onLiveSignal: vi.fn() })
    const result = await capture.stop()
    expect(result.features).toEqual(extractAcousticFeatures(decodePCM16Base64(pcm16Base64), 16000))
    expect(result.transcript).toBe('light')
    expect(result.rawBytes).toBe(32000)
    expect(result.recording?.mimeType).toBe(replayBase64 === 'AQIDBA==' ? 'audio/mp4' : 'audio/wav')
    expect(result.recording?.blob.size).toBe(replayBase64 === 'AQIDBA==' ? 4 : 16044)
    expect(recorder.stop).toHaveBeenCalledOnce()
  })
})
