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
  static stalledClock = false
  state: AudioContextState = 'suspended'
  private created = Date.now()
  get currentTime(): number { return FakeContext.stalledClock ? 0 : (Date.now() - this.created) / 1000 }
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
  static stalledMetadata = ''
  static stalledPlay = ''
  static stalledOutput = false
  static finishPlay: (() => void) | null = null
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
    if (FakeAudio.stalledMetadata === this.src) return
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
    if (FakeAudio.stalledPlay === this.src) {
      await new Promise<void>((resolve) => { FakeAudio.finishPlay = resolve })
    }
    this.paused = false
    this.plays.push(`${this.src}@${this.currentTime.toFixed(2)}`)
    const playing = this.src
    if (!playing.startsWith('data:') && !FakeAudio.stalledOutput) {
      window.setTimeout(() => {
        if (!this.paused && this.src === playing) this.dispatchEvent(new Event('ended'))
      }, 500)
    }
  }

  pause(): void {
    this.paused = true
  }
}

const light = 'en-light-night'
const night = 'en-night-light'

async function startSequence(...args: Parameters<typeof playSequence>) {
  const pending = playSequence(...args)
  await vi.advanceTimersByTimeAsync(100)
  return pending
}

beforeEach(() => {
  FakeContext.autoResume = true
  FakeContext.stalledClock = false
  FakeAudio.refuse = false
  FakeAudio.stalledMetadata = ''
  FakeAudio.stalledPlay = ''
  FakeAudio.stalledOutput = false
  FakeAudio.finishPlay = null
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
    await vi.advanceTimersByTimeAsync(100)
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
    await vi.advanceTimersByTimeAsync(100)
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
    await vi.advanceTimersByTimeAsync(100)
    await pending
    const context = unlockAudio() as unknown as FakeContext
    expect(context.started[1].when - context.started[0].when).toBeCloseTo(0.5 + 0.5 + 0.3, 3)
    expect(context.started[2].when - context.started[1].when).toBeCloseTo(0.5 + 0.5, 3)
  })

  it('downloads each distinct word once', async () => {
    const pending = playSequence([light, night, light, light])
    await vi.advanceTimersByTimeAsync(100)
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
    await vi.advanceTimersByTimeAsync(100)
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

  it('times out stalled metadata and lets pair 1, pair 2, pair 1 play again', async () => {
    vi.stubGlobal('AudioContext', undefined)
    FakeAudio.stalledMetadata = wordClip(light)!.src
    let failure: unknown
    void playSequence([light, night]).catch((error) => { failure = error })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(failure).toBeInstanceOf(WordAudioError)
    expect(FakeAudio.instances[0].paused).toBe(true)
    FakeAudio.stalledMetadata = ''
    for (const ids of [[light, night], ['en-low-no', 'en-no-low'], [light, night], [light, night]]) {
      const heard: Array<number | null> = []
      const pending = playSequence(ids, { onItem: (index) => heard.push(index) })
      await vi.advanceTimersByTimeAsync(20)
      const playback = await pending
      await vi.advanceTimersByTimeAsync(6000)
      await expect(playback.finished).resolves.toBeUndefined()
      expect(heard).toEqual([0, 1, null])
    }
  })

  it('times out a stalled second word instead of leaving finished pending', async () => {
    vi.stubGlobal('AudioContext', undefined)
    FakeAudio.stalledMetadata = wordClip(night)!.src
    const pending = playSequence([light, night])
    await vi.advanceTimersByTimeAsync(20)
    const playback = await pending
    let failure: unknown
    void playback.finished.catch((error) => { failure = error })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(failure).toBeInstanceOf(WordAudioError)
    expect(FakeAudio.instances[0].paused).toBe(true)
  })

  it('bounds play() and isolates a late completion from a newer pair', async () => {
    vi.stubGlobal('AudioContext', undefined)
    FakeAudio.stalledPlay = wordClip(light)!.src
    let failure: unknown
    void playSequence([light, night]).catch((error) => { failure = error })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(failure).toBeInstanceOf(WordAudioError)
    const staleMedia = FakeAudio.instances[0]
    const finishStale = FakeAudio.finishPlay!
    FakeAudio.stalledPlay = ''
    const retry = playSequence([night, light])
    await vi.advanceTimersByTimeAsync(20)
    const playback = await retry
    const currentMedia = FakeAudio.instances.at(-1)!
    finishStale()
    await vi.advanceTimersByTimeAsync(0)
    expect(staleMedia).not.toBe(currentMedia)
    expect(staleMedia.paused).toBe(true)
    expect(currentMedia.paused).toBe(false)
    playback.stop()
  })

  it('falls back after a hung fetch and evicts it so the next tap retries', async () => {
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => undefined))
    let first: Awaited<ReturnType<typeof playSequence>> | undefined
    void playSequence([light]).then((playback) => { first = playback })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(first?.route).toBe('element')
    first!.stop()
    const retry = await startSequence([light])
    expect(retry.route).toBe('web-audio')
    expect(fetch).toHaveBeenCalledTimes(2)
    retry.stop()
  })

  it('falls back when fetch rejects, not just when it returns an HTTP error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Load failed'))
    const pending = playSequence([light])
    // Observe rejection immediately so the pre-fix regression is not unhandled.
    const outcome = pending.catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(20)
    expect(await outcome).toMatchObject({ route: 'element' })
  })

  it('reports a frozen audio clock and creates a fresh context on retry', async () => {
    const previous = unlockAudio() as unknown as FakeContext
    const playback = await startSequence([light, night])
    FakeContext.stalledClock = true
    const outcome = expect(playback.finished).rejects.toThrow('audio output was interrupted')
    await vi.advanceTimersByTimeAsync(6000)
    await outcome
    expect(previous.state).toBe('closed')
    FakeContext.stalledClock = false
    const retry = await startSequence([light, night])
    expect(unlockAudio()).not.toBe(previous)
    await vi.advanceTimersByTimeAsync(6000)
    await expect(retry.finished).resolves.toBeUndefined()
  })

  it('automatically uses real media fallback when a running context has a frozen clock before playback', async () => {
    FakeContext.stalledClock = true
    const previous = unlockAudio() as unknown as FakeContext
    const pending = playSequence([light, night])
    await vi.advanceTimersByTimeAsync(1300)
    const playback = await pending
    expect(playback.route).toBe('element')
    expect(previous.started).toHaveLength(0)
    expect(previous.state).toBe('closed')
    await vi.advanceTimersByTimeAsync(6000)
    await expect(playback.finished).resolves.toBeUndefined()
  })

  it('reports stalled element output instead of silently claiming the pair finished', async () => {
    vi.stubGlobal('AudioContext', undefined)
    FakeAudio.stalledOutput = true
    const heard: Array<number | null> = []
    const pending = playSequence([light, night], { onItem: (index) => heard.push(index) })
    await vi.advanceTimersByTimeAsync(20)
    const playback = await pending
    const outcome = expect(playback.finished).rejects.toThrow('audio output stalled')
    await vi.advanceTimersByTimeAsync(6000)
    await outcome
    expect(heard).toEqual([0, null])
    expect(FakeAudio.instances[0].paused).toBe(true)
    FakeAudio.stalledOutput = false
    const retry = playSequence([light, night])
    await vi.advanceTimersByTimeAsync(20)
    const next = await retry
    await vi.advanceTimersByTimeAsync(6000)
    await expect(next.finished).resolves.toBeUndefined()
  })

  it('bounds decoding as well as downloading and retries after a stalled decode', async () => {
    const active = unlockAudio()!
    vi.spyOn(active, 'decodeAudioData').mockImplementationOnce(() => new Promise(() => undefined))
    const pending = playSequence([light])
    await vi.advanceTimersByTimeAsync(4500)
    const fallback = await pending
    expect(fallback.route).toBe('element')
    fallback.stop()
    const retry = await startSequence([light])
    expect(retry.route).toBe('web-audio')
    retry.stop()
  })

  it.each(['fetch', 'metadata', 'play'])('cancels during %s before a handle exists, without late audio', async (stage) => {
    let completeFetch!: (value: Response) => void
    if (stage === 'fetch') {
      vi.mocked(fetch).mockImplementationOnce(() => new Promise((resolve) => { completeFetch = resolve }))
    } else {
      vi.stubGlobal('AudioContext', undefined)
      if (stage === 'metadata') FakeAudio.stalledMetadata = wordClip(light)!.src
      else FakeAudio.stalledPlay = wordClip(light)!.src
    }
    const abort = new AbortController()
    const heard: Array<number | null> = []
    const pending = playSequence([light, night], { signal: abort.signal, onItem: (index) => heard.push(index) })
    const outcome = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(20)
    abort.abort()
    await outcome
    if (stage === 'fetch') completeFetch({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) } as Response)
    if (stage === 'metadata') FakeAudio.instances[0].dispatchEvent(new Event('loadedmetadata'))
    if (stage === 'play') FakeAudio.finishPlay!()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(heard.filter((index) => index !== null)).toEqual([])
    if (stage === 'fetch') expect((unlockAudio() as unknown as FakeContext).started).toEqual([])
    else expect(FakeAudio.instances[0].paused).toBe(true)
  })

  it('settles abort during a stalled second-word load and removes event listeners', async () => {
    vi.stubGlobal('AudioContext', undefined)
    FakeAudio.stalledMetadata = wordClip(night)!.src
    const abort = new AbortController()
    const pending = playSequence([light, night], { gapMs: 0, signal: abort.signal })
    await vi.advanceTimersByTimeAsync(20)
    const playback = await pending
    const media = FakeAudio.instances[0]
    const remove = vi.spyOn(media, 'removeEventListener')
    await vi.advanceTimersByTimeAsync(1500)
    abort.abort()
    await expect(playback.finished).resolves.toBeUndefined()
    expect(media.paused).toBe(true)
    expect(remove).toHaveBeenCalledWith('loadedmetadata', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('error', expect.any(Function))
    const heard = media.plays.length
    media.dispatchEvent(new Event('loadedmetadata'))
    await vi.advanceTimersByTimeAsync(10_000)
    expect(media.plays).toHaveLength(heard)
  })
})
