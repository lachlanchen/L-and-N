// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { newerVersion, nativeUpdateFromManifest, updateDismissed, dismissUpdate, checkNativeUpdate } from './app-updates'
import { App } from '@capacitor/app'
import { CapacitorHttp } from '@capacitor/core'

vi.mock('@capacitor/app', () => ({ App: { getInfo: vi.fn() } }))
vi.mock('@capacitor/core', () => ({ CapacitorHttp: { get: vi.fn() } }))
afterEach(() => { localStorage.clear(); vi.restoreAllMocks() })
const manifest = { schema: 1, platforms: { ios: { appId: 'art.lazying.landn', version: '1.0.7', status: 'public', url: 'https://invalid.example/' } } }
describe('native update detection', () => {
  it.each([
    ['1.0.10', '1.0.9', true], ['1.0.9', '1.0.10', false], ['1.0.7', '1.0.7', false],
    ['1.0', '1.0.0', false], ['2.0', '1.9.99', true], ['1.0.8-beta', '1.0.7', false], ['bad', '1.0.7', false],
  ])('compares %s against %s', (candidate, installed, expected) => expect(newerVersion(candidate, installed)).toBe(expected))
  it('accepts only public releases of the installed app and uses fixed store URLs', () => {
    expect(nativeUpdateFromManifest(manifest, 'ios', '1.0.6', 'art.lazying.landn')?.url).toContain('https://apps.apple.com/')
    expect(nativeUpdateFromManifest(manifest, 'ios', '1.0.8', 'art.lazying.landn')).toBeNull()
    expect(nativeUpdateFromManifest(manifest, 'ios', '1.0.6', 'art.lazying.landn.pro')).toBeNull()
    expect(nativeUpdateFromManifest(manifest, 'macos', '1.0.0', 'art.lazying.landn')).toBeNull()
    expect(nativeUpdateFromManifest({ ...manifest, schema: 2 }, 'ios', '1.0.6', 'art.lazying.landn')).toBeNull()
    expect(nativeUpdateFromManifest({ schema: 1, platforms: { ios: { ...manifest.platforms.ios, status: 'in-review' } } }, 'ios', '1.0.6', 'art.lazying.landn')).toBeNull()
    expect(nativeUpdateFromManifest(null, 'ios', '1.0.6', 'art.lazying.landn')).toBeNull()
  })
  it('defers only the same version for 24 hours and tolerates inaccessible storage', () => {
    dismissUpdate('ios-1.0.7')
    expect(updateDismissed('ios-1.0.7')).toBe(true)
    expect(updateDismissed('ios-1.0.8')).toBe(false)
    expect(updateDismissed('ios-1.0.7', Date.now() + 86_400_001)).toBe(false)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('Unavailable') })
    expect(updateDismissed('ios-1.0.7')).toBe(false)
  })
  it('reads only public metadata using native HTTP and does not send installed version or identifiers', async () => {
    vi.mocked(App.getInfo).mockResolvedValue({ id: 'art.lazying.landn', version: '1.0.6', build: '16', name: 'L & N' })
    vi.mocked(CapacitorHttp.get).mockResolvedValue({ status: 200, data: manifest, headers: {}, url: '' })
    expect((await checkNativeUpdate('ios'))?.version).toBe('1.0.7')
    expect(CapacitorHttp.get).toHaveBeenCalledWith({ url: 'https://l-and-n.lazying.art/app-updates.json', connectTimeout: 5000, readTimeout: 5000, responseType: 'json', headers: { 'Cache-Control': 'no-cache' } })
  })
})
