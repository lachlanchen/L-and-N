import { describe, expect, it, vi } from 'vitest'
import javaSource from '../../android/app/src/main/java/art/lazying/landn/NativeUpdateMigration.java?raw'

const script = javaSource.match(/"""([\s\S]*?)"""/)![1].trim().replace(/;$/, '')
async function run(origin = 'https://localhost', controlled = true) {
  const local = { scope: origin + '/', active: { scriptURL: origin + '/sw.js' }, unregister: vi.fn(async () => true) }
  const other = { scope: origin + '/other/', active: { scriptURL: origin + '/other/sw.js' }, unregister: vi.fn(async () => true) }
  const caches = { keys: vi.fn(async () => ['workbox-precache-v2-https://localhost/', 'recording-backups', 'other-cache']), delete: vi.fn(async () => true) }
  const location = { origin, reload: vi.fn() }
  const navigator = { serviceWorker: { controller: controlled ? local.active : null, getRegistrations: vi.fn(async () => controlled ? [local, other] : []) } }
  const window = { caches }
  const execute = new Function('window', 'location', 'navigator', 'caches', `return ${script}`)
  await execute(window, location, navigator, caches)
  return { local, other, caches, location, navigator, window, execute }
}
describe('native legacy service-worker migration', () => {
  it('unregisters only the app worker and deletes only its static precache, then reloads once', async () => {
    const r = await run()
    expect(r.local.unregister).toHaveBeenCalledOnce()
    expect(r.other.unregister).not.toHaveBeenCalled()
    expect(r.caches.delete).toHaveBeenCalledExactlyOnceWith('workbox-precache-v2-https://localhost/')
    expect(r.location.reload).toHaveBeenCalledOnce()
    await r.execute(r.window, r.location, r.navigator, r.caches)
    expect(r.location.reload).toHaveBeenCalledOnce()
    expect(script).not.toMatch(/indexedDB\.|localStorage\.|sessionStorage\.|document\.cookie|clearData/)
  })
  it('does not reload a clean native app or operate on a website origin', async () => {
    expect((await run('https://localhost', false)).location.reload).not.toHaveBeenCalled()
    const web = await run('https://l-and-n.lazying.art')
    expect(web.navigator.serviceWorker.getRegistrations).not.toHaveBeenCalled()
    expect(web.caches.delete).not.toHaveBeenCalled()
  })
})
