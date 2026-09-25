import { App as NativeApp } from '@capacitor/app'
import { CapacitorHttp } from '@capacitor/core'
import { APP_STORE_URL, GOOGLE_PLAY_URL } from './app-stores'

export interface AppUpdate {
  id: string
  kind: 'web' | 'native'
  version?: string
  url?: string
  apply?: () => Promise<void>
}
let webUpdate: AppUpdate | null = null
const listeners = new Set<() => void>()
export const currentWebUpdate = () => webUpdate
export function subscribeWebUpdate(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function offerWebUpdate(apply: () => Promise<void>): void {
  webUpdate = { id: 'web-update', kind: 'web', apply }
  listeners.forEach((listener) => listener())
}
function versionParts(version: unknown): number[] | null {
  if (typeof version !== 'string' || !/^\d{1,6}(\.\d{1,6}){0,3}$/.test(version)) return null
  return version.split('.').map(Number)
}
/** Release versions only: malformed/beta labels must never suggest a downgrade. */
export function newerVersion(candidate: unknown, installed: string): boolean {
  const a = versionParts(candidate)
  const b = versionParts(installed)
  if (!a || !b) return false
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0)
  }
  return false
}
export function nativeUpdateFromManifest(data: unknown, platform: string, installed: string, appId: string): AppUpdate | null {
  if (appId !== 'art.lazying.landn' || (platform !== 'ios' && platform !== 'android')) return null
  if (!data || typeof data !== 'object') return null
  const manifest = data as { schema?: unknown; platforms?: Record<string, unknown> }
  if (manifest.schema !== 1) return null
  const release = manifest.platforms?.[platform] as { version?: unknown; status?: unknown; appId?: unknown } | undefined
  if (!release || release.status !== 'public' || release.appId !== appId || !newerVersion(release.version, installed)) return null
  const version = release.version as string
  // The server cannot supply arbitrary URLs, executable code, or mandatory updates.
  return { id: `${platform}-${version}`, kind: 'native', version, url: platform === 'ios' ? APP_STORE_URL : GOOGLE_PLAY_URL }
}
export async function checkNativeUpdate(platform: string): Promise<AppUpdate | null> {
  const info = await NativeApp.getInfo()
  if (info.id !== 'art.lazying.landn') return null
  // Native HTTP avoids WebView CORS without weakening the site's origin policy.
  // Sends no recording, identifier, installed version or account data.
  const response = await CapacitorHttp.get({
    url: 'https://l-and-n.lazying.art/app-updates.json',
    connectTimeout: 5000, readTimeout: 5000, responseType: 'json',
    headers: { 'Cache-Control': 'no-cache' },
  })
  return response.status === 200 ? nativeUpdateFromManifest(response.data, platform, info.version, info.id) : null
}
const DISMISSED_KEY = 'landn.update-later.v1'
export function updateDismissed(id: string, now = Date.now()): boolean {
  try {
    const value = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? 'null')
    return value?.id === id && Number.isFinite(value.until) && value.until > now && value.until <= now + 86_400_000
  } catch { return false }
}
export function dismissUpdate(id: string): void {
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify({ id, until: Date.now() + 86_400_000 })) } catch { /* optional storage */ }
}
