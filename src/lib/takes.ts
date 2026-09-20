/**
 * Your own takes: the audio of each scored attempt, kept only on this device
 * so a learner can replay a take that landed and compare it with the studio
 * model. Storage is IndexedDB (works in browsers and in the Android and iOS
 * WebViews); when IndexedDB is unavailable, an in-memory store keeps the
 * feature working for the session. Nothing here ever leaves the device.
 */

export interface TakeRecord {
  /** Same value as the attempt's `createdAt`, so an attempt maps to its take. */
  id: string
  exerciseId: string
  createdAt: string
  score: number
  detectedSound: string
  mimeType: string
  blob: Blob
}

export const MAX_TAKES = 60
const DB_NAME = 'landn-takes'
const STORE = 'takes'

const memory = new Map<string, TakeRecord>()

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
    request.onblocked = () => reject(new Error('IndexedDB open blocked'))
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await openDb()
  try {
    const transaction = db.transaction(STORE, mode)
    const result = await run(transaction.objectStore(STORE))
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
    })
    return result
  } finally {
    db.close()
  }
}

/** Stores a take and evicts the oldest ones beyond MAX_TAKES. */
export async function saveTake(take: TakeRecord): Promise<void> {
  if (!hasIndexedDb()) {
    memory.set(take.id, take)
    pruneMemory()
    return
  }
  await withStore('readwrite', async (store) => {
    await requestToPromise(store.put(take))
    const keys = (await requestToPromise(store.index('createdAt').getAllKeys())) as IDBValidKey[]
    if (keys.length > MAX_TAKES) {
      const extra = keys.length - MAX_TAKES
      // getAllKeys on the index returns ascending createdAt: the oldest first.
      for (const key of keys.slice(0, extra)) await requestToPromise(store.delete(key))
    }
  })
}

function pruneMemory(): void {
  const sorted = [...memory.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  while (sorted.length > MAX_TAKES) {
    const oldest = sorted.shift()!
    memory.delete(oldest.id)
  }
}

export async function loadTake(id: string): Promise<TakeRecord | null> {
  if (!hasIndexedDb()) return memory.get(id) ?? null
  return withStore('readonly', async (store) => ((await requestToPromise(store.get(id))) as TakeRecord | undefined) ?? null)
}

export async function deleteTake(id: string): Promise<void> {
  if (!hasIndexedDb()) {
    memory.delete(id)
    return
  }
  await withStore('readwrite', async (store) => {
    await requestToPromise(store.delete(id))
  })
}

/** Ids of every stored take, newest first. */
export async function listTakeIds(): Promise<string[]> {
  if (!hasIndexedDb()) return [...memory.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((t) => t.id)
  const keys = await withStore('readonly', async (store) => (await requestToPromise(store.index('createdAt').getAllKeys())) as string[])
  return keys.reverse()
}

/** A 16-bit PCM WAV file from normalized float samples (the native iOS recorder's output). */
export function wavFromFloat32(samples: Float32Array, sampleRate: number): Blob {
  const header = new ArrayBuffer(44)
  const view = new DataView(header)
  const dataBytes = samples.length * 2
  const writeAscii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index))
  }
  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, dataBytes, true)
  const pcm = new Int16Array(samples.length)
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]))
    pcm[index] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
  }
  return new Blob([header, pcm.buffer], { type: 'audio/wav' })
}

export interface TakePlayback {
  finished: Promise<void>
  stop: () => void
}

/** Plays a stored take through a media element. Resolves when it ends or is stopped. */
export function playTakeBlob(blob: Blob): TakePlayback {
  const url = URL.createObjectURL(blob)
  const media = new Audio(url)
  media.preload = 'auto'
  let settle: () => void = () => undefined
  const finished = new Promise<void>((resolve) => {
    settle = () => {
      URL.revokeObjectURL(url)
      resolve()
    }
  })
  media.addEventListener('ended', () => settle(), { once: true })
  media.addEventListener('error', () => settle(), { once: true })
  void media.play().catch(() => settle())
  return {
    finished,
    stop: () => {
      media.pause()
      settle()
    },
  }
}
