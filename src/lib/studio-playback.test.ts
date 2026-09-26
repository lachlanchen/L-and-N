// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { speakExample } from './speech'
import { exercises } from '../data/curriculum'

class ModelAudio extends EventTarget {
  static instances: ModelAudio[] = []
  static refuse = false
  preload = ''
  src: string
  pause = vi.fn()
  constructor(src: string) { super(); this.src = src; ModelAudio.instances.push(this) }
  play = vi.fn(async () => { if (ModelAudio.refuse) throw new Error('unavailable') })
}

beforeEach(() => {
  vi.useFakeTimers()
  ModelAudio.instances = []
  ModelAudio.refuse = false
  vi.stubGlobal('Audio', ModelAudio)
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('full studio-model lifetime', () => {
  it('stays pending until the full two-repeat file ends', async () => {
    const finished = vi.fn()
    const promise = speakExample(exercises[0]).then(finished)
    await vi.advanceTimersByTimeAsync(10)
    expect(ModelAudio.instances[0].src).toBe('/audio/models/en-light.mp3?v=3')
    expect(finished).not.toHaveBeenCalled()
    ModelAudio.instances[0].dispatchEvent(new Event('ended'))
    await promise
    expect(finished).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stops on cancellation and never starts a fallback afterwards', async () => {
    const controller = new AbortController()
    const promise = speakExample(exercises[0], controller.signal)
    controller.abort()
    await promise
    const media = ModelAudio.instances[0]
    expect(media.pause).toHaveBeenCalled()
    media.dispatchEvent(new Event('error'))
    expect(vi.getTimerCount()).toBe(0)
    await speakExample(exercises[0], controller.signal)
    expect(ModelAudio.instances).toHaveLength(1)
  })

  it('rejects a stalled player after a bounded wait so the control can recover', async () => {
    const result = expect(speakExample(exercises[0])).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(30_000)
    await result
    expect(ModelAudio.instances[0].pause).toHaveBeenCalled()
  })

  it('waits for both words in the fallback utterance too', async () => {
    ModelAudio.refuse = true
    class Utterance {
      text: string
      lang = ''; rate = 1; pitch = 1
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(text: string) { this.text = text }
    }
    const speak = vi.fn()
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
    vi.stubGlobal('speechSynthesis', { speak, getVoices: () => [], cancel: vi.fn() })
    const finished = vi.fn()
    const result = speakExample(exercises[0]).then(finished)
    await vi.advanceTimersByTimeAsync(0)
    const utterance = speak.mock.calls[0][0] as Utterance
    expect(utterance.text).toBe('light. light.')
    expect(finished).not.toHaveBeenCalled()
    utterance.onend?.()
    await result
    expect(finished).toHaveBeenCalledOnce()
  })

  it('reports media failure when no fallback voice is available', async () => {
    vi.stubGlobal('speechSynthesis', undefined)
    vi.stubGlobal('SpeechSynthesisUtterance', undefined)
    const result = expect(speakExample(exercises[0])).rejects.toThrow('unavailable')
    ModelAudio.instances[0].dispatchEvent(new Event('error'))
    await result
  })
})
