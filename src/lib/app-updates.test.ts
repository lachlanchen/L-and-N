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
  it('keeps Pro updates separate from free Android and Apple releases', () => {
    const pro = { appId: 'art.lazying.landn.pro', version: '1.0.13', status: 'public', url: 'https://invalid.example/' }
    const editions = { schema: 1, platforms: {
      android: { appId: 'art.lazying.landn', version: '9.0.0', status: 'public' }, androidPro: pro,
    } }
    expect(nativeUpdateFromManifest(editions, 'android', '1.0.12', pro.appId)).toEqual({
      id: 'androidPro-1.0.13', kind: 'native', version: '1.0.13',
      url: 'https://play.google.com/store/apps/details?id=art.lazying.landn.pro',
    })
    expect(nativeUpdateFromManifest(editions, 'android', '1.0.13', pro.appId)).toBeNull()
    expect(nativeUpdateFromManifest(editions, 'ios', '1.0.12', pro.appId)).toBeNull()
    expect(nativeUpdateFromManifest({ schema: 1, platforms: { android: editions.platforms.android } }, 'android', '1.0.12', pro.appId)).toBeNull()
    for (const patch of [{ status: 'in-review' }, { appId: 'art.lazying.landn' }]) {
      expect(nativeUpdateFromManifest({ schema: 1, platforms: { androidPro: { ...pro, ...patch } } }, 'android', '1.0.12', pro.appId)).toBeNull()
    }
    dismissUpdate('android-1.0.13')
    expect(updateDismissed('androidPro-1.0.13')).toBe(false)
  })
  it('lets Pro check public metadata without sending installed app details', async () => {
    vi.mocked(App.getInfo).mockResolvedValue({ id: 'art.lazying.landn.pro', version: '1.0.12', build: '22', name: 'L & N Pro' })
    vi.mocked(CapacitorHttp.get).mockResolvedValue({ status: 200, data: {
      schema: 1, platforms: { androidPro: { appId: 'art.lazying.landn.pro', version: '1.0.13', status: 'public' } },
    }, headers: {}, url: '' })
    expect((await checkNativeUpdate('android'))?.url).toBe('https://play.google.com/store/apps/details?id=art.lazying.landn.pro')
    expect(CapacitorHttp.get).toHaveBeenCalledWith({ url: 'https://l-and-n.lazying.art/app-updates.json', connectTimeout: 5000, readTimeout: 5000, responseType: 'json', headers: { 'Cache-Control': 'no-cache' } })
  })
  it('reads only public metadata using native HTTP and does not send installed version or identifiers', async () => {
    vi.mocked(App.getInfo).mockResolvedValue({ id: 'art.lazying.landn', version: '1.0.6', build: '16', name: 'L & N' })
    vi.mocked(CapacitorHttp.get).mockResolvedValue({ status: 200, data: manifest, headers: {}, url: '' })
    expect((await checkNativeUpdate('ios'))?.version).toBe('1.0.7')
    expect(CapacitorHttp.get).toHaveBeenCalledWith({ url: 'https://l-and-n.lazying.art/app-updates.json', connectTimeout: 5000, readTimeout: 5000, responseType: 'json', headers: { 'Cache-Control': 'no-cache' } })
  })
})
