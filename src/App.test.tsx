// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { AudioCaptureError } from './lib/audio-capture'

const audioCaptureMocks = vi.hoisted(() => ({
  startAudioCapture: vi.fn(),
}))

vi.mock('./lib/audio-capture', () => {
  class MockAudioCaptureError extends Error {
    readonly code: string

    constructor(code: string, message: string) {
      super(message)
      this.name = 'AudioCaptureError'
      this.code = code
    }
  }
  return {
    AudioCaptureError: MockAudioCaptureError,
    startAudioCapture: audioCaptureMocks.startAudioCapture,
  }
})

vi.mock('./lib/progress', () => ({
  loadAttempts: vi.fn(async () => []),
  saveAttempt: vi.fn(async () => []),
  trainingStreak: vi.fn(() => 0),
}))

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => null),
  })
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  audioCaptureMocks.startAudioCapture.mockReset()
})

describe('language and sound controls', () => {
  it('keeps interface language independent from practice language', async () => {
    render(<App />)

    fireEvent.change(screen.getByTestId('ui-language-picker'), { target: { value: 'zh-Hans' } })
    fireEvent.click(screen.getByTestId('practice-language-zh-CN'))

    const root = screen.getByTestId('app-root')
    expect(root.getAttribute('data-ui-language')).toBe('zh-Hans')
    expect(root.getAttribute('data-practice-language')).toBe('zh-CN')
    expect(screen.getByRole('button', { name: '练习' })).toBeTruthy()
    await waitFor(() => expect(window.localStorage.getItem('landn.ui-language')).toBe('zh-Hans'))
  })

  it('switches directly between paired L and N exercises', () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('practice-sound-n'))

    expect(screen.getByRole('heading', { level: 2, name: 'night' })).toBeTruthy()
    expect(screen.getByTestId('practice-sound-n').getAttribute('aria-pressed')).toBe('true')
  })

  it('links the Learn view to the static light and night lesson', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Learn' }))

    expect(screen.getByRole('link', { name: 'Open the light/night mini-lesson' }).getAttribute('href')).toBe('/lessons/light-vs-night/')
  })
})

describe('recording lifecycle', () => {
  it('allows only one microphone startup while permission is pending', async () => {
    let resolveCapture: ((value: {
      analyser: null
      stop: () => Promise<never>
      cancel: () => Promise<void>
    }) => void) | undefined
    audioCaptureMocks.startAudioCapture.mockImplementationOnce(
      () => new Promise((resolve) => { resolveCapture = resolve }),
    )
    render(<App />)

    const record = screen.getByRole('button', { name: 'Start recording' })
    fireEvent.click(record)
    fireEvent.click(record)

    expect(audioCaptureMocks.startAudioCapture).toHaveBeenCalledTimes(1)
    expect(record.getAttribute('aria-busy')).toBe('true')

    resolveCapture?.({
      analyser: null,
      stop: vi.fn(() => new Promise<never>(() => undefined)),
      cancel: vi.fn(async () => undefined),
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop and score recording' })).toBeTruthy())
  })

  it('rejects silence instead of manufacturing a score', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const cancel = vi.fn(async () => undefined)
    audioCaptureMocks.startAudioCapture.mockResolvedValueOnce({
      analyser: null,
      stop: vi.fn(async () => {
        throw new AudioCaptureError('silent-recording', 'silent')
      }),
      cancel,
    })
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop and score recording' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Stop and score recording' }))

    expect(await screen.findByText('I could not hear a clear word. Move closer to the microphone and try again.')).toBeTruthy()
    expect(screen.queryByText(/confidence/i)).toBeNull()
    expect(warning).toHaveBeenCalledOnce()
  })

  it('shows the captured waveform but saves no score when transcription is empty', async () => {
    audioCaptureMocks.startAudioCapture.mockResolvedValueOnce({
      analyser: null,
      stop: vi.fn(async () => ({
        transcript: '',
        rawBytes: 32_000,
        source: 'web' as const,
        features: {
          rms: 0.08,
          noiseFloor: 0.003,
          zeroCrossingRate: 0.05,
          lowBandRatio: 0.08,
          midBandRatio: 0.52,
          spectralCentroidHz: 1500,
          spectralTiltDb: 0,
          pitchHz: 145,
          pitchContour: [142, 145, 148],
          firstFormantHz: 500,
          secondFormantHz: 1250,
          formantSpacingHz: 750,
          firstFormantBandwidthHz: 160,
          nasalPeakContrastDb: 7,
          voicedContinuity: 0.9,
          durationMs: 900,
          onsetMs: 35,
          onsetDurationMs: 240,
          signalQuality: 0.92,
          waveform: [0, 0.2, -0.2, 0.12, 0.08, -0.1, 0.04, 0],
          spectrum: [0.1, 0.35, 0.8, 0.5],
        },
      })),
      cancel: vi.fn(async () => undefined),
    })
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop and score recording' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Stop and score recording' }))

    expect(await screen.findByText(/I recorded your voice, but could not recognize a word/)).toBeTruthy()
    expect(screen.getByText('Last sound')).toBeTruthy()
    expect(screen.queryByText('/ 100')).toBeNull()
  })
})
