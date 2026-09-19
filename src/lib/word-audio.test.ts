// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playSequence, releaseAudio, unlockAudio, WordAudioError, wordClip } from './word-audio'

interface Started {
  when: number
  offset: number
  duration: number
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

  start(when: number, offset: number, duration: number): void {
    this.ctx.started.push({ when, offset, duration })
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
    return { duration: 3 } as AudioBuffer
  }

  async close(): Promise<void> {
    this.state = 'closed'
  }
}

const light = 'en-light-night'
const night = 'en-night-light'

beforeEach(() => {
  FakeContext.autoResume = true
  vi.stubGlobal('AudioContext', FakeContext)
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })))
  vi.useFakeTimers()
})

afterEach(() => {
  releaseAudio()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('studio clip playback', () => {
  it('schedules each word in order with the clip offsets and a gap', async () => {
    const heard: Array<number | null> = []
    const pending = playSequence([light, night, light], { gapMs: 500, onItem: (index) => heard.push(index) })
    await vi.advanceTimersByTimeAsync(0)
    const playback = await pending
    const context = unlockAudio() as unknown as FakeContext

    expect(context.started).toHaveLength(3)
    const lightClip = wordClip(light)!
    const nightClip = wordClip(night)!
    expect(context.started[0].offset).toBeCloseTo(lightClip.start, 3)
    expect(context.started[0].duration).toBeCloseTo(lightClip.end - lightClip.start, 3)
    expect(context.started[1].offset).toBeCloseTo(nightClip.start, 3)
    // Second word starts after the first word plus the gap.
    expect(context.started[1].when - context.started[0].when).toBeCloseTo(
      lightClip.end - lightClip.start + 0.5,
      3,
    )
    expect(context.started[2].when).toBeGreaterThan(context.started[1].when)

    let done = false
    void playback.finished.then(() => {
      done = true
    })
    await vi.advanceTimersByTimeAsync(6000)
    expect(done).toBe(true)
    expect(heard).toEqual([0, 1, 2, null])
  })

  it('downloads each distinct word once', async () => {
    const pending = playSequence([light, night, light, light])
    await vi.advanceTimersByTimeAsync(0)
    await pending
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
  })

  it('reports an error instead of hanging when the audio output never starts', async () => {
    FakeContext.autoResume = false
    const pending = playSequence([light])
    const assertion = expect(pending).rejects.toBeInstanceOf(WordAudioError)
    await vi.advanceTimersByTimeAsync(1500)
    await assertion
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
})
