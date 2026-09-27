/**
 * Your own takes: the audio of each scored attempt, kept only on this device
 * so a learner can replay a take that landed and compare it with the studio
 * model. Storage is IndexedDB (works in browsers and in the Android and iOS
 * WebViews); when IndexedDB is unavailable or a write fails, an in-memory store keeps the
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

const DB_NAME = 'landn-takes'
const STORE = 'takes'

const memory = new Map<string, TakeRecord>()
const STORAGE_TIMEOUT_MS = 2500
const SESSION_AUDIO_BYTES = 32 * 1024 * 1024
type StoredTake = Omit<TakeRecord, 'blob'> & { audioBytes: ArrayBuffer }
export type TakeStorage = 'persistent' | 'session' | 'session-full'

function keepForSession(take: TakeRecord): void {
  const used = [...memory.values()].reduce((total, item) => total + (item.id === take.id ? 0 : item.blob.size), 0)
  // Never solve a quota error by deleting a learner's earlier recordings.
  if (used + take.blob.size > SESSION_AUDIO_BYTES) throw new Error('Session audio storage is full')
  memory.set(take.id, take)
}

function audioBytes(blob: Blob): Promise<ArrayBuffer> {
  // Read BEFORE opening a transaction: awaiting a Blob read inside a transaction
  // can make WebKit commit it before put() runs. Bytes also avoid WebView Blob
  // structured-clone failures. Older Blob records remain readable below.
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error ?? new Error('Audio read failed'))
    reader.readAsArrayBuffer(blob)
  })
}

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false
    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(error)
    }
    const timer = setTimeout(() => fail(new Error('Audio storage open timed out')), STORAGE_TIMEOUT_MS)
    let request: IDBOpenDBRequest
    try { request = indexedDB.open(DB_NAME, 1) } catch (error) { fail(error); return }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
      }
    }
    request.onsuccess = () => {
      if (settled) { request.result.close(); return }
      settled = true
      clearTimeout(timer)
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () => fail(request.error ?? new Error('IndexedDB open failed'))
    request.onblocked = () => fail(new Error('IndexedDB open blocked'))
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
    // Subscribe before issuing requests, not after awaiting their success.
    // A successful put is not proof that the containing transaction committed.
    const completion = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Audio storage transaction timed out'))
        try { transaction.abort() } catch { /* already settled */ }
      }, STORAGE_TIMEOUT_MS)
      transaction.oncomplete = () => { clearTimeout(timer); resolve() }
      const failed = () => {
        clearTimeout(timer)
        reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
      }
      transaction.onerror = failed
      transaction.onabort = failed
    })
    const [result] = await Promise.all([run(transaction.objectStore(STORE)), completion])
    return result
  } finally {
    db.close()
  }
}

/** Never evict a learner's earlier take to make room for a newer one. */
export async function saveTake(take: TakeRecord): Promise<TakeStorage> {
  if (!hasIndexedDb()) {
    keepForSession(take)
    return 'session'
  }
  try {
    const { blob, ...metadata } = take
    const stored: StoredTake = { ...metadata, audioBytes: await audioBytes(blob) }
    await withStore('readwrite', async (store) => {
      await requestToPromise(store.put(stored))
    })
    memory.delete(take.id)
    return 'persistent'
  } catch (error) {
    keepForSession(take)
    // Only a real quota exception means storage is full. Do not guess from a
    // generic WebView/database failure or expose the recording in diagnostics.
    return error instanceof Error && error.name === 'QuotaExceededError' ? 'session-full' : 'session'
  }
}

export async function loadTake(id: string): Promise<TakeRecord | null> {
  if (memory.has(id) || !hasIndexedDb()) return memory.get(id) ?? null
  const stored = await withStore('readonly', async (store) => await requestToPromise(store.get(id)) as TakeRecord | StoredTake | undefined)
  if (!stored) return null
  if ('blob' in stored) return stored // pre-upgrade recordings: no destructive migration
  const { audioBytes, ...metadata } = stored
  return { ...metadata, blob: new Blob([audioBytes], { type: stored.mimeType }) }
}

export async function deleteTake(id: string): Promise<void> {
  if (!hasIndexedDb()) {
    memory.delete(id)
    return
  }
  await withStore('readwrite', async (store) => {
    await requestToPromise(store.delete(id))
  })
  memory.delete(id)
}

/** Ids of every stored take, newest first. */
export async function listTakeIds(): Promise<string[]> {
  if (!hasIndexedDb()) return [...memory.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((t) => t.id)
  const keys = await withStore('readonly', async (store) => (await requestToPromise(store.index('createdAt').getAllKeys())) as string[])
  return [...new Set([...keys, ...memory.keys()])].sort().reverse()
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
  let settle: (error?: unknown) => void = () => undefined
  let settled = false
  const finished = new Promise<void>((resolve, reject) => {
    settle = (error) => {
      if (settled) return
      settled = true
      media.removeEventListener('ended', onEnded)
      media.removeEventListener('error', onError)
      URL.revokeObjectURL(url)
      if (error) reject(error)
      else resolve()
    }
  })
  const onEnded = () => settle()
  const onError = () => settle(new Error('Recording playback failed'))
  media.addEventListener('ended', onEnded, { once: true })
  media.addEventListener('error', onError, { once: true })
  void media.play().catch(settle)
  return {
    finished,
    stop: () => {
      media.pause()
      settle()
    },
  }
}
