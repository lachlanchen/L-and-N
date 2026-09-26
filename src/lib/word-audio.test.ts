// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playSequence, releaseAudio, unlockAudio, WordAudioError, wordClip } from './word-audio'

interface Started {
  when: number
}

class FakeSource {
  buffer: AudioBuffer | null = null
  stopped = false

  private readonly ctx: FakeContext

  constructor(ctx: FakeContext) {
    this.ctx = ctx
  }

  connect(): void {}
  disconnect(): void {}

  start(when: number): void {
    this.ctx.started.push({ when })
  }

  stop(): void {
    this.stopped = true
    this.ctx.stops += 1
  }
}

class FakeContext {
  static autoResume = true
  state: AudioContextState = 'suspended'
  currentTime = 0
  destination = {} as AudioDestinationNode
  started: Started[] = []
  stops = 0

  async resume(): Promise<void> {
    if (!FakeContext.autoResume) {
      // Matches a browser with no audio output: the promise never settles.
      await new Promise<void>(() => undefined)
      return
    }
    this.state = 'running'
  }

  createBufferSource(): AudioBufferSourceNode {
    return new FakeSource(this) as unknown as AudioBufferSourceNode
  }

  async decodeAudioData(): Promise<AudioBuffer> {
    return { duration: 0.5 } as AudioBuffer
  }

  async close(): Promise<void> {
    this.state = 'closed'
  }
}

class FakeAudio extends EventTarget {
  static refuse = false
  static instances: FakeAudio[] = []
  src = ''
  preload = ''
  currentTime = 0
  readyState = 0
  paused = true
  plays: string[] = []

  constructor() {
    super()
    FakeAudio.instances.push(this)
  }

  setAttribute(): void {}
  removeAttribute(): void {}

  load(): void {
    this.readyState = 0
    // Metadata arrives asynchronously, as it does in a browser.
    window.setTimeout(() => {
      this.readyState = 1
      this.dispatchEvent(new Event('loadedmetadata'))
    }, 5)
  }

  async play(): Promise<void> {
    if (FakeAudio.refuse) {
      const error = new Error('play() failed because the user did not interact')
      error.name = 'NotAllowedError'
      throw error
    }
    this.paused = false
    this.plays.push(`${this.src}@${this.currentTime.toFixed(2)}`)
  }

  pause(): void {
    this.paused = true
  }
}

const light = 'en-light-night'
const night = 'en-night-light'

beforeEach(() => {
  FakeContext.autoResume = true
  FakeAudio.refuse = false
  FakeAudio.instances = []
  vi.stubGlobal('AudioContext', FakeContext)
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })))
  vi.useFakeTimers()
})

afterEach(() => {
  releaseAudio()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('studio clip playback', () => {
  it('decodes status-zero media from the bundled Apple asset handler', async () => {
    vi.stubGlobal('location', new URL('capacitor://localhost/'))
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 0, type: 'basic', arrayBuffer: async () => new ArrayBuffer(8) })))
    const pending = playSequence([light, night])
    await vi.advanceTimersByTimeAsync(0)
    const playback = await pending
    expect(playback.route).toBe('web-audio')
    expect((unlockAudio() as unknown as FakeContext).started).toHaveLength(2)
    playback.stop()
  })

  it.each(['opaque', 'empty'])('does not accept %s bundled media as a decoded clip', async (kind) => {
    vi.stubGlobal('location', new URL('capacitor://localhost/'))
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 0, type: kind === 'opaque' ? 'opaque' : 'basic', arrayBuffer: async () => new ArrayBuffer(kind === 'empty' ? 0 : 8) })))
    const pending = playSequence([light])
    await vi.advanceTimersByTimeAsync(20)
    const playback = await pending
    expect(playback.route).toBe('element')
    playback.stop()
  })

  it('does not accept status-zero network responses on the web', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 0, type: 'basic', arrayBuffer: async () => new ArrayBuffer(8) })))
    const pending = playSequence([light])
    await vi.advanceTimersByTimeAsync(20)
    const playback = await pending
    expect(playback.route).toBe('element')
    playback.stop()
  })

  it('schedules each word in order with a gap between them', async () => {
    const heard: Array<number | null> = []
    const pending = playSequence([light, night, light], { gapMs: 500, onItem: (index) => heard.push(index) })
    await vi.advanceTimersByTimeAsync(0)
    const playback = await pending
    const context = unlockAudio() as unknown as FakeContext

    expect(context.started).toHaveLength(3)
    expect(wordClip(light)!.src).toBe('/audio/clips/en-light.mp3')
    // Second word starts after the decoded first word (0.5 s) plus the gap.
    expect(context.started[1].when - context.started[0].when).toBeCloseTo(0.5 + 0.5, 3)
    expect(context.started[2].when).toBeGreaterThan(context.started[1].when)

    let done = false
    void playback.finished.then(() => {
      done = true
    })
    await vi.advanceTimersByTimeAsync(6000)
    expect(done).toBe(true)
    expect(heard).toEqual([0, 1, 2, null])
  })

  it('leaves a longer pause before a repeated word', async () => {
    const pending = playSequence([night, night, light], { gapMs: 500, repeatGapMs: 300 })
    await vi.advanceTimersByTimeAsync(0)
    await pending
    const context = unlockAudio() as unknown as FakeContext
    expect(context.started[1].when - context.started[0].when).toBeCloseTo(0.5 + 0.5 + 0.3, 3)
    expect(context.started[2].when - context.started[1].when).toBeCloseTo(0.5 + 0.5, 3)
  })

  it('downloads each distinct word once', async () => {
    const pending = playSequence([light, night, light, light])
    await vi.advanceTimersByTimeAsync(0)
    await pending
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
  })

  it('falls back to the primed media element when the audio context never starts', async () => {
    FakeContext.autoResume = false
    const heard: Array<number | null> = []
    const pending = playSequence([light, night], { gapMs: 300, onItem: (index) => heard.push(index) })
    await vi.advanceTimersByTimeAsync(1500) // the bounded resume wait
    await vi.advanceTimersByTimeAsync(20) // metadata for the first clip
    const playback = await pending
    expect(playback.route).toBe('element')

    const media = FakeAudio.instances[0]
    // The silent unlock clip was played inside the tap, then the real word,
    // from the start of its own file: no seeking is involved.
    expect(media.plays[0]).toContain('data:audio/wav')
    expect(media.plays[1]).toBe(`${wordClip(light)!.src}@0.00`)
    expect(heard).toEqual([0])

    await vi.advanceTimersByTimeAsync(6000)
    await expect(playback.finished).resolves.toBeUndefined()
    expect(media.plays).toHaveLength(3)
    expect(media.plays[2]).toContain(wordClip(night)!.src)
    expect(heard).toEqual([0, 1, null])
    expect(media.paused).toBe(true)
  })

  it('reports both reasons when Web Audio and the media element both refuse', async () => {
    FakeContext.autoResume = false
    FakeAudio.refuse = true
    const pending = playSequence([light])
    const assertion = expect(pending).rejects.toMatchObject({
      name: 'WordAudioError',
      message: expect.stringMatching(/audio context stayed suspended; fallback: .*NotAllowedError/),
    })
    await vi.advanceTimersByTimeAsync(1500)
    await vi.advanceTimersByTimeAsync(20)
    await assertion
  })

  it('uses the media element when the browser has no Web Audio at all', async () => {
    vi.stubGlobal('AudioContext', undefined)
    const pending = playSequence([light])
    await vi.advanceTimersByTimeAsync(20)
    const playback = await pending
    expect(playback.route).toBe('element')
  })

  it('stops every scheduled word and settles when cancelled', async () => {
    const heard: Array<number | null> = []
    const pending = playSequence([light, night], { onItem: (index) => heard.push(index) })
    await vi.advanceTimersByTimeAsync(0)
    const playback = await pending
    const context = unlockAudio() as unknown as FakeContext

    playback.stop()
    await expect(playback.finished).resolves.toBeUndefined()
    expect(context.stops).toBe(2)
    expect(heard.at(-1)).toBeNull()

    const before = heard.length
    await vi.advanceTimersByTimeAsync(6000)
    expect(heard).toHaveLength(before)
  })

  it('refuses a word with no studio recording', async () => {
    await expect(playSequence(['en-missing-word'])).rejects.toBeInstanceOf(WordAudioError)
  })

  it('settles cancelled fallback playback and never plays the second word', async () => {
    vi.stubGlobal('AudioContext', undefined)
    const heard: Array<number | null> = []
    const pending = playSequence([light, night], { onItem: (index) => heard.push(index) })
    await vi.advanceTimersByTimeAsync(20)
    const playback = await pending
    const media = FakeAudio.instances[0]
    playback.stop()
    await expect(playback.finished).resolves.toBeUndefined()
    const count = media.plays.length
    await vi.advanceTimersByTimeAsync(6000)
    expect(media.plays).toHaveLength(count)
    expect(media.paused).toBe(true)
    expect(heard).toEqual([0, null])
  })
})
