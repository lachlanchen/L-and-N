// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteTake, listTakeIds, loadTake, playTakeBlob, saveTake, wavFromFloat32 } from './takes'

// jsdom has no IndexedDB, so these tests exercise the in-memory fallback,
// which is also what the app uses when storage is blocked.
const take = (id: string, score = 80) => ({
  id,
  exerciseId: 'en-light-night',
  createdAt: id,
  score,
  detectedSound: 'L',
  mimeType: 'audio/wav',
  blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/wav' }),
})

beforeEach(async () => {
  for (const id of await listTakeIds()) await deleteTake(id)
})

describe('kept takes', () => {
  it('stores, lists newest first, and deletes', async () => {
    await saveTake(take('2026-09-20T10:00:00.000Z'))
    await saveTake(take('2026-09-20T11:00:00.000Z', 91))
    expect(await listTakeIds()).toEqual(['2026-09-20T11:00:00.000Z', '2026-09-20T10:00:00.000Z'])
    const loaded = await loadTake('2026-09-20T11:00:00.000Z')
    expect(loaded?.score).toBe(91)
    expect(loaded?.blob.size).toBe(3)
    await deleteTake('2026-09-20T11:00:00.000Z')
    expect(await loadTake('2026-09-20T11:00:00.000Z')).toBeNull()
  })

  it('keeps earlier takes past the old 60-recording limit and reports session-only storage', async () => {
    for (let index = 0; index < 75; index += 1) {
      await saveTake(take(`2026-09-20T10:00:00.${String(index).padStart(3, '0')}Z`))
    }
    const ids = await listTakeIds()
    expect(ids).toHaveLength(75)
    expect(ids[0] > ids[ids.length - 1]).toBe(true)
    expect(await loadTake('2026-09-20T10:00:00.000Z')).not.toBeNull()
    expect(await saveTake(take('2026-09-21T10:00:00.000Z'))).toBe('session')
  })
})

describe('WAV packaging of the native recorder output', () => {
  it('writes a valid 16-bit mono header and scales samples', async () => {
    const blob = wavFromFloat32(new Float32Array([0, 0.5, -1, 1]), 16000)
    expect(blob.type).toBe('audio/wav')
    const buffer = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.readAsArrayBuffer(blob)
    })
    const bytes = new DataView(buffer)
    expect(String.fromCharCode(bytes.getUint8(0), bytes.getUint8(1), bytes.getUint8(2), bytes.getUint8(3))).toBe('RIFF')
    expect(bytes.getUint16(22, true)).toBe(1) // channels
    expect(bytes.getUint32(24, true)).toBe(16000) // sample rate
    expect(bytes.getUint16(34, true)).toBe(16) // bits per sample
    expect(bytes.getUint32(40, true)).toBe(8) // data bytes
    expect(bytes.getInt16(44, true)).toBe(0)
    expect(bytes.getInt16(46, true)).toBe(0x3fff)
    expect(bytes.getInt16(48, true)).toBe(-0x8000)
    expect(bytes.getInt16(50, true)).toBe(0x7fff)
  })
})

describe('take playback', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reports playback failure and releases its object URL only once', async () => {
    class FailedAudio extends EventTarget {
      preload = ''
      async play(): Promise<void> { throw new Error('Playback blocked') }
      pause(): void {}
    }
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('Audio', FailedAudio)
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:failed', revokeObjectURL })
    const playback = playTakeBlob(new Blob())
    await expect(playback.finished).rejects.toThrow('Playback blocked')
    playback.stop()
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:failed')
  })

  it('plays through a media element and settles when it ends', async () => {
    const instances: FakeAudio[] = []
    class FakeAudio extends EventTarget {
      src: string
      preload = ''
      constructor(src: string) {
        super()
        this.src = src
        instances.push(this)
      }
      async play(): Promise<void> {}
      pause(): void {}
    }
    vi.stubGlobal('Audio', FakeAudio)
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:take', revokeObjectURL: vi.fn() })
    const playback = playTakeBlob(new Blob([new Uint8Array(4)], { type: 'audio/wav' }))
    expect(instances[0].src).toBe('blob:take')
    instances[0].dispatchEvent(new Event('ended'))
    await expect(playback.finished).resolves.toBeUndefined()
  })
})
