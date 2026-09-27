// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'

let takes: typeof import('./takes')
const take = (id: string) => ({ id, createdAt: id, exerciseId: 'en-light-night', score: 91,
  detectedSound: 'L', mimeType: 'audio/wav', blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/wav' }) })

beforeEach(async () => {
  vi.resetModules()
  vi.stubGlobal('indexedDB', new IDBFactory())
  takes = await import('./takes')
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('persistent recording storage', () => {
  it('stores binary bytes instead of a WebView Blob, round-trips across reloads, and deletes', async () => {
    const put = vi.spyOn(IDBObjectStore.prototype, 'put')
    expect(await takes.saveTake(take('2026-09-27-a'))).toBe('persistent')
    expect(put.mock.calls[0][0]).not.toHaveProperty('blob')
    expect(put.mock.calls[0][0].audioBytes).toBeInstanceOf(ArrayBuffer)
    vi.resetModules()
    takes = await import('./takes')
    const loaded = await takes.loadTake('2026-09-27-a')
    expect([...new Uint8Array(await loaded!.blob.arrayBuffer())]).toEqual([1, 2, 3])
    expect(loaded?.blob.type).toBe('audio/wav')
    expect(await takes.listTakeIds()).toEqual(['2026-09-27-a'])
    await takes.deleteTake('2026-09-27-a')
    expect(await takes.loadTake('2026-09-27-a')).toBeNull()
  })

  it('reads older Blob records without deleting or rewriting them', async () => {
    await takes.saveTake(take('new'))
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('landn-takes', 1)
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction('takes', 'readwrite')
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => { db.close(); reject(tx.error) }
        tx.objectStore('takes').put(take('legacy'))
      }
    })
    expect((await takes.loadTake('legacy'))?.blob.size).toBe(3)
    expect(await takes.listTakeIds()).toEqual(['new', 'legacy'])
  })

  it.each(['QuotaExceededError', 'DataCloneError', 'UnknownError'])('keeps replay available after %s without deleting old takes', async (name) => {
    await takes.saveTake(take('old'))
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => { throw new DOMException('test', name) })
    expect(await takes.saveTake(take('new'))).toBe(name === 'QuotaExceededError' ? 'session-full' : 'session')
    expect((await takes.loadTake('new'))?.blob.size).toBe(3)
    expect((await takes.loadTake('old'))?.blob.size).toBe(3)
    expect(await takes.listTakeIds()).toEqual(['old', 'new'])
    // A later working write upgrades the session take to durable storage.
    expect(await takes.saveTake(take('new'))).toBe('persistent')
  })

  it('does not mistake request success for a committed transaction', async () => {
    const original = IDBObjectStore.prototype.put
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(function (this: IDBObjectStore, ...args) {
      const request = original.apply(this, args)
      request.addEventListener('success', () => this.transaction.abort())
      return request
    })
    expect(await takes.saveTake(take('aborted'))).toBe('session')
    expect((await takes.loadTake('aborted'))?.blob.size).toBe(3)
  })

  it('recovers from a blocked database and closes a late connection', async () => {
    const close = vi.fn()
    const request = { onblocked: () => undefined, onsuccess: () => undefined, result: { close } }
    vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
      queueMicrotask(() => request.onblocked())
      return request as unknown as IDBOpenDBRequest
    })
    expect(await takes.saveTake(take('blocked'))).toBe('session')
    request.onsuccess()
    expect(close).toHaveBeenCalledOnce()
    expect((await takes.loadTake('blocked'))?.blob.size).toBe(3)
  })

  it('bounds a hung open rather than leaving the recorder busy forever', async () => {
    vi.useFakeTimers()
    vi.spyOn(indexedDB, 'open').mockReturnValueOnce({} as IDBOpenDBRequest)
    const saved = takes.saveTake(take('timeout'))
    await vi.advanceTimersByTimeAsync(2600)
    expect(await saved).toBe('session')
    expect((await takes.loadTake('timeout'))?.blob.size).toBe(3)
  })
})
