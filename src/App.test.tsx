// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Capacitor } from '@capacitor/core'
import App from './App'
import { loadAttempts, saveAttempt } from './lib/progress'
import * as takes from './lib/takes'
import { AudioCaptureError } from './lib/audio-capture'
import { extractAcousticFeatures } from './lib/acoustics'

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
  loadListeningResults: vi.fn(async () => []),
  saveListeningResult: vi.fn(async () => []),
  listeningAccuracy: vi.fn(() => null),
  trainingStreak: vi.fn(() => 0),
}))

const audioMocks = vi.hoisted(() => ({
  playSequence: vi.fn((exerciseIds: string[], options?: { onItem?: (index: number | null) => void }) => {
    options?.onItem?.(null)
    return Promise.resolve({ finished: Promise.resolve(), stop: vi.fn(), played: exerciseIds })
  }),
  unlockAudio: vi.fn(),
}))

const entitlementMocks = vi.hoisted(() => ({
  next: null as null | { gated: boolean; owned: boolean; available: boolean; price?: string },
  buy: vi.fn(),
}))

// Google Play billing only exists inside the Android app; tests set the
// entitlement they want and assert what the UI does with it.
vi.mock('./lib/purchases', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/purchases')>()
  return {
    ...actual,
    loadEntitlement: vi.fn(async () => entitlementMocks.next ?? actual.UNGATED),
    buyFullAccess: vi.fn(async () => {
      entitlementMocks.buy()
      return { gated: true, owned: true, available: true }
    }),
    restorePurchases: vi.fn(async () => entitlementMocks.next ?? actual.UNGATED),
  }
})

// Web Audio is unavailable in jsdom, so the exam's player is mocked; its own
// behaviour is covered by src/lib/listening-exam.test.ts.
vi.mock('./lib/word-audio', () => ({
  playSequence: audioMocks.playSequence,
  unlockAudio: audioMocks.unlockAudio,
  preloadClips: vi.fn(async () => undefined),
  releaseAudio: vi.fn(),
  isVerifiedClip: () => true,
  clipKeyForExercise: (id: string) => id.split('-').slice(0, 2).join('-'),
  wordClip: (id: string) => ({
    key: id.split('-').slice(0, 2).join('-'),
    src: '',
    start: 0,
    end: 0.5,
    expected: 'L',
    verdict: 'clear',
  }),
  WordAudioError: class WordAudioError extends Error {},
}))

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => null),
  })
})

afterEach(() => {
  cleanup()
  entitlementMocks.next = null
  entitlementMocks.buy.mockClear()
  window.localStorage.clear()
  audioCaptureMocks.startAudioCapture.mockReset()
  audioMocks.playSequence.mockClear()
  audioMocks.unlockAudio.mockClear()
  vi.mocked(saveAttempt).mockClear()
  vi.mocked(loadAttempts).mockReset().mockResolvedValue([])
  vi.restoreAllMocks()
})

describe('web store links', () => {
  it('localizes the phone prompt independently of practice language and remembers dismissal', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone')
    render(<App />)
    expect(screen.getByRole('link', { name: 'View on the App Store' })).toBeTruthy()
    fireEvent.click(screen.getByTestId('practice-language-yue-HK'))
    expect(screen.getByText('Prefer the app?')).toBeTruthy()
    fireEvent.change(screen.getByTestId('ui-language-picker'), { target: { value: 'zh-Hans' } })
    expect(screen.getByText('想用手机应用练习？')).toBeTruthy()
    expect(screen.getByTestId('app-root').getAttribute('data-practice-language')).toBe('yue-HK')
    fireEvent.click(screen.getByRole('button', { name: '继续使用网页版' }))
    fireEvent.click(screen.getByRole('button', { name: '进度' }))
    // Dismissal only affects the nudge, not the permanent links.
    expect(screen.getByRole('link', { name: '在 App Store 查看' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '练习' }))
    expect(screen.queryByTestId('app-store-prompt')).toBeNull()
  })

  it('suppresses the prompt through microphone startup, recording and scoring', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android')
    let resolveCapture: ((value: unknown) => void) | undefined
    audioCaptureMocks.startAudioCapture.mockReturnValueOnce(new Promise((resolve) => { resolveCapture = resolve }))
    render(<App />)
    expect(screen.getByRole('link', { name: 'View on Google Play' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    expect(screen.getByTestId('app-store-prompt').hasAttribute('inert')).toBe(true)
    resolveCapture?.({
      analyser: null,
      stop: vi.fn(() => new Promise<never>(() => undefined)),
      cancel: vi.fn(async () => undefined),
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop and score recording' })).toBeTruthy())
    expect(screen.queryByRole('link', { name: 'View on Google Play' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Stop and score recording' }))
    expect(screen.getByTestId('app-store-prompt').hasAttribute('inert')).toBe(true)
  })

  it.each([
    ['en', 'Progress', 'Also available as an app', 'View on the App Store', 'View on Google Play'],
    ['zh-Hans', '进度', '也可以使用手机应用', '在 App Store 查看', '在 Google Play 查看'],
    ['zh-Hant', '進度', '也可以使用手機應用程式', '在 App Store 查看', '在 Google Play 查看'],
    ['yue', '進度', '亦可以用手機 App', '去 App Store 睇', '去 Google Play 睇'],
  ])('offers the existing store listings in the %s Progress view', (locale, progress, title, apple, google) => {
    render(<App />)
    expect(screen.queryByRole('link', { name: /App Store/ })).toBeNull()
    fireEvent.change(screen.getByTestId('ui-language-picker'), { target: { value: locale } })
    fireEvent.click(screen.getByRole('button', { name: progress }))

    expect(screen.getByRole('navigation', { name: title })).toBeTruthy()
    const appStore = screen.getByRole('link', { name: apple })
    const googlePlay = screen.getByRole('link', { name: google })
    expect(appStore.getAttribute('href')).toBe('https://apps.apple.com/us/app/l-n-speech-practice/id6808872450')
    expect(googlePlay.getAttribute('href')).toBe('https://play.google.com/store/apps/details?id=art.lazying.landn')
    for (const link of [appStore, googlePlay]) {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    }
    // Changing the interface language must not change the practice language.
    expect(screen.getByTestId('app-root').getAttribute('data-practice-language')).toBe('en-US')
  })

  it.each(['ios', 'android'])('excludes store links from the %s native UI', (platform) => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue(platform)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }))

    expect(screen.getByRole('heading', { name: 'Your sound map' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Privacy' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /App Store/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Google Play/ })).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Also available as an app' })).toBeNull()
  })
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

  it('translates the practice-language tabs and coaching cue with the interface language', () => {
    render(<App />)

    fireEvent.change(screen.getByTestId('ui-language-picker'), { target: { value: 'zh-Hans' } })

    expect(screen.getByTestId('practice-language-en-US').textContent).toBe('英语')
    expect(screen.getByTestId('practice-language-yue-HK').textContent).toBe('粤语')
    expect(screen.getByTestId('practice-language-switcher').textContent).not.toContain('English')
    expect(screen.getByText(/舌尖收窄并放到前面/)).toBeTruthy()
    expect(screen.queryByText(/Make the tongue tip narrow/)).toBeNull()

    fireEvent.change(screen.getByTestId('ui-language-picker'), { target: { value: 'en' } })
    fireEvent.click(screen.getByTestId('practice-language-zh-CN'))

    expect(screen.getByTestId('practice-language-zh-CN').textContent).toBe('Mandarin')
    expect(screen.getByText(/Touch the tongue tip lightly to the ridge/)).toBeTruthy()
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
  it('requires explicit, revocable consent before Android recording', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android')
    render(<App />)
    const record = screen.getByRole('button', { name: 'Start recording' })
    const consent = screen.getByRole('checkbox', { name: 'Allow online word recognition' })
    expect(record.hasAttribute('disabled')).toBe(true)
    fireEvent.click(record)
    expect(audioCaptureMocks.startAudioCapture).not.toHaveBeenCalled()
    fireEvent.click(consent)
    expect(record.hasAttribute('disabled')).toBe(false)
    fireEvent.click(consent)
    expect(record.hasAttribute('disabled')).toBe(true)
  })

  it.each(['', '...', '。'])('does not score/save an Android attempt with empty recognition (%s)', async (transcript) => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android')
    const features = extractAcousticFeatures(Float32Array.from({ length: 16000 }, (_, i) => 0.15 * Math.sin(i / 10)), 16000)
    audioCaptureMocks.startAudioCapture.mockResolvedValueOnce({
      analyser: null,
      stop: vi.fn(async () => ({ transcript, features, rawBytes: 32000, source: 'web' })),
      cancel: vi.fn(async () => undefined),
    })
    render(<App />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow online word recognition' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop and score recording' })).toBeTruthy())
    expect(audioCaptureMocks.startAudioCapture.mock.calls[0][0].allowOnlineRecognition).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Stop and score recording' }))
    expect(await screen.findByText(/No L\/N judgment or score was saved/)).toBeTruthy()
    expect(screen.getByText('Last sound')).toBeTruthy()
    expect(screen.queryByText('/ 100')).toBeNull()
    expect(saveAttempt).not.toHaveBeenCalled()
  })

  it('does not add the Android disclosure to native iOS', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios')
    render(<App />)
    expect(screen.queryByTestId('android-speech-consent')).toBeNull()
    expect(screen.getByRole('button', { name: 'Start recording' }).hasAttribute('disabled')).toBe(false)
  })

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

  it('scores from the sound when the recognizer returns no word', async () => {
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

    // Cantonese often comes back with no word at all. The attempt is still
    // scored, from the onset and the acoustic cues, and the card says so.
    expect(await screen.findByText(/Word recognition was unavailable/)).toBeTruthy()
    expect(screen.getByText('Last sound')).toBeTruthy()
    expect(screen.getByText('/ 100')).toBeTruthy()
  })
})

describe('listening exam', () => {
  const openExam = async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Listen' }))
    return screen.getByTestId('exam-play')
  }

  it('plays a five-word sequence and collects answers in order', async () => {
    const play = await openExam()
    expect(screen.getByTestId('exam-length-5').getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(play)
    await waitFor(() => expect(screen.getByTestId('exam-replay')).toBeTruthy())
    expect(audioMocks.unlockAudio).toHaveBeenCalled()
    const sequence = audioMocks.playSequence.mock.calls[0][0]
    expect(sequence).toHaveLength(5)
    expect(new Set(sequence).size).toBe(2)

    expect(screen.getByTestId('exam-submit').hasAttribute('disabled')).toBe(true)
    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByTestId(index % 2 === 0 ? 'exam-choose-l' : 'exam-choose-n'))
    }
    const chips = screen.getByTestId('exam-answers')
    expect(chips.textContent).toBe('lightnightlightnightlight')
    expect(screen.getByTestId('exam-submit').hasAttribute('disabled')).toBe(false)
  })

  it('lets the learner hear each word of the pair on its own while answering', async () => {
    const play = await openExam()
    fireEvent.click(play)
    await waitFor(() => expect(screen.getByTestId('exam-replay')).toBeTruthy())
    audioMocks.playSequence.mockClear()
    fireEvent.click(screen.getByTestId('exam-hear-l'))
    expect(audioMocks.playSequence.mock.calls[0][0]).toEqual(['en-light-night'])
    fireEvent.click(screen.getByTestId('exam-hear-n'))
    expect(audioMocks.playSequence.mock.calls[1][0]).toEqual(['en-night-light'])
    expect(screen.getByTestId('exam-hear-l').textContent).toContain('light')
    expect(screen.getByTestId('exam-hear-n').textContent).toContain('night')
  })

  it('scores the submitted answers against what was played', async () => {
    const play = await openExam()
    fireEvent.click(play)
    await waitFor(() => expect(screen.getByTestId('exam-replay')).toBeTruthy())
    const sequence = audioMocks.playSequence.mock.calls[0][0]

    for (const exerciseId of sequence) {
      fireEvent.click(screen.getByTestId(exerciseId.startsWith('en-light') ? 'exam-choose-l' : 'exam-choose-n'))
    }
    fireEvent.click(screen.getByTestId('exam-submit'))

    const result = screen.getByTestId('exam-result')
    expect(screen.getByTestId('exam-score').textContent).toBe('5 of 5 correct')
    expect(result.querySelectorAll('.result-rows li')).toHaveLength(5)
    expect(result.querySelectorAll('.result-rows li.wrong')).toHaveLength(0)
    expect(screen.getByTestId('exam-new')).toBeTruthy()
  })

  it('marks a wrong answer and keeps the interface language', async () => {
    render(<App />)
    fireEvent.change(screen.getByTestId('ui-language-picker'), { target: { value: 'zh-Hans' } })
    fireEvent.click(screen.getByRole('button', { name: '听辨' }))
    fireEvent.click(screen.getByTestId('exam-play'))
    await waitFor(() => expect(screen.getByTestId('exam-replay')).toBeTruthy())
    const sequence = audioMocks.playSequence.mock.calls[0][0]

    sequence.forEach((exerciseId, index) => {
      const heard = exerciseId.startsWith('en-light') ? 'exam-choose-l' : 'exam-choose-n'
      const flipped = heard === 'exam-choose-l' ? 'exam-choose-n' : 'exam-choose-l'
      fireEvent.click(screen.getByTestId(index === 0 ? flipped : heard))
    })
    fireEvent.click(screen.getByTestId('exam-submit'))

    expect(screen.getByTestId('exam-score').textContent).toBe('答对 4 / 5')
    expect(screen.getByTestId('exam-result').querySelectorAll('.result-rows li.wrong')).toHaveLength(1)
  })
})

describe('Android full-curriculum unlock', () => {
  it('shows only the free pairs and the unlock card until the purchase completes', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android')
    entitlementMocks.next = { gated: true, owned: false, available: true, price: 'US$0.99' }
    render(<App />)

    const card = await screen.findByTestId('unlock-card')
    expect(card.textContent).toContain('US$0.99')
    // Six free exercises: cycling forward six times returns to the first word.
    const word = () => document.querySelector('.word-area h2')?.textContent
    const first = word()
    fireEvent.click(screen.getByRole('button', { name: 'Next word' }))
    expect(word()).not.toBe(first)
    for (let step = 1; step < 6; step += 1) fireEvent.click(screen.getByRole('button', { name: 'Next word' }))
    expect(word()).toBe(first)

    fireEvent.click(screen.getByRole('button', { name: 'Listen' }))
    const locked = screen.getByTestId('exam-pair-en-line-nine|en-nine-line') as HTMLButtonElement
    expect(locked.disabled).toBe(true)
    const free = screen.getByTestId('exam-pair-en-light-night|en-night-light') as HTMLButtonElement
    expect(free.disabled).toBe(false)

    fireEvent.click(screen.getByTestId('unlock-buy'))
    await waitFor(() => expect(entitlementMocks.buy).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByTestId('unlock-card')).toBeNull())
    expect((screen.getByTestId('exam-pair-en-line-nine|en-nine-line') as HTMLButtonElement).disabled).toBe(false)
  })

  it('never gates the web or iOS builds', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('web')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Listen' }))
    expect(screen.queryByTestId('unlock-card')).toBeNull()
    expect((screen.getByTestId('exam-pair-en-line-nine|en-nine-line') as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('kept takes', () => {
  const features = {
    rms: 0.08, noiseFloor: 0.003, zeroCrossingRate: 0.05, lowBandRatio: 0.08, midBandRatio: 0.52, spectralCentroidHz: 1500,
    spectralTiltDb: 0, pitchHz: 145, pitchContour: [142, 145, 148], firstFormantHz: 500, secondFormantHz: 1250, formantSpacingHz: 750,
    firstFormantBandwidthHz: 160, nasalPeakContrastDb: 7, voicedContinuity: 0.9, durationMs: 900, onsetMs: 35, onsetDurationMs: 240,
    signalQuality: 0.92, waveform: [0, 0.2, -0.2, 0.12, 0.08, -0.1, 0.04, 0], spectrum: [0.1, 0.35, 0.8, 0.5],
  }

  it('shows missing-recording feedback in Progress, and keeps loaded history across tab changes', async () => {
    vi.mocked(loadAttempts).mockResolvedValueOnce(Array.from({ length: 25 }, (_, index) => ({
      exerciseId: 'en-light-night', score: 90, detectedSound: 'L' as const,
      createdAt: new Date(2026, 8, 26, 0, 0, index).toISOString(), takeId: `missing-${index}`,
    })))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }))
    await waitFor(() => expect(screen.getAllByTestId('history-attempt')).toHaveLength(12))
    fireEvent.click(screen.getByRole('button', { name: 'Load older attempts' }))
    expect(screen.getAllByTestId('history-attempt')).toHaveLength(24)
    fireEvent.click(screen.getAllByTestId('history-play')[23])
    expect((await screen.findByRole('alert')).textContent).toContain('no longer on this device')
    fireEvent.change(screen.getByTestId('ui-language-picker'), { target: { value: 'zh-Hans' } })
    expect(screen.getByRole('alert').textContent).toContain('本机已没有')
    fireEvent.change(screen.getByTestId('ui-language-picker'), { target: { value: 'en' } })
    fireEvent.click(screen.getByRole('button', { name: 'Practice' }))
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }))
    expect(screen.getAllByTestId('history-attempt')).toHaveLength(24)
  })

  it('cancels pending recording playback when leaving history', async () => {
    vi.mocked(loadAttempts).mockResolvedValueOnce([{ exerciseId: 'en-light-night', score: 90, detectedSound: 'L', createdAt: '2026-09-26T01:00:00.000Z', takeId: 'pending' }])
    let resolveTake!: (take: takes.TakeRecord) => void
    vi.spyOn(takes, 'loadTake').mockReturnValueOnce(new Promise((resolve) => { resolveTake = resolve }))
    const play = vi.spyOn(takes, 'playTakeBlob')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }))
    fireEvent.click(await screen.findByTestId('history-play'))
    fireEvent.click(screen.getByRole('button', { name: 'Practice' }))
    resolveTake({ id: 'pending', exerciseId: 'en-light-night', score: 90, detectedSound: 'L', createdAt: '', mimeType: 'audio/wav', blob: new Blob() })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start recording' })).toBeTruthy())
    expect(play).not.toHaveBeenCalled()
  })

  it('reports audio storage failure without losing the score', async () => {
    vi.spyOn(takes, 'saveTake').mockRejectedValueOnce(new Error('QuotaExceededError'))
    vi.mocked(saveAttempt).mockImplementationOnce(async (attempt) => [attempt])
    audioCaptureMocks.startAudioCapture.mockResolvedValueOnce({ analyser: null,
      stop: vi.fn(async () => ({ transcript: 'light', features, rawBytes: 32000, source: 'web',
        recording: { blob: new Blob([new Uint8Array([1])]), mimeType: 'audio/wav' } })), cancel: vi.fn(async () => undefined) })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Stop and score recording' }))
    expect((await screen.findByText(/this recording could not be saved/)).textContent).toContain('earlier recordings have not been removed')
    expect(screen.queryByTestId('take-replay')).toBeNull()
    await waitFor(() => expect(saveAttempt).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }))
    expect(screen.getByTestId('history-attempt')).toBeTruthy()
    expect(screen.getByText('No audio saved')).toBeTruthy()
  })

  it('offers to replay the scored attempt and lists it in the history', async () => {
    const played: string[] = []
    class FakeAudio extends EventTarget {
      src: string
      preload = ''
      constructor(src: string) { super(); this.src = src }
      async play(): Promise<void> { played.push(this.src); this.dispatchEvent(new Event('ended')) }
      pause(): void {}
    }
    vi.stubGlobal('Audio', FakeAudio)
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:my-take', revokeObjectURL: vi.fn() })
    vi.mocked(saveAttempt).mockImplementationOnce(async (attempt) => [attempt])
    audioCaptureMocks.startAudioCapture.mockResolvedValueOnce({
      analyser: null,
      stop: vi.fn(async () => ({
        transcript: 'light',
        rawBytes: 32_000,
        source: 'web' as const,
        features,
        recording: { blob: new Blob([new Uint8Array(16)], { type: 'audio/webm' }), mimeType: 'audio/webm' },
      })),
      cancel: vi.fn(async () => undefined),
    })
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop and score recording' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Stop and score recording' }))

    const replay = await screen.findByTestId('take-replay')
    expect(replay.textContent).toContain('Replay my take')
    expect(screen.getByTestId('take-compare')).toBeTruthy()
    fireEvent.click(replay)
    await waitFor(() => expect(played).toEqual(['blob:my-take']))

    fireEvent.click(screen.getByRole('button', { name: 'Progress' }))
    expect(screen.getByTestId('history-play')).toBeTruthy()
    vi.unstubAllGlobals()
  })
})
