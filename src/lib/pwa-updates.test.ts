// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { watchForServiceWorkerUpdate } from './pwa-updates'

function fakeContainer(controlled: boolean) {
  const events = new EventTarget()
  const update = vi.fn(async () => undefined)
  const container = {
    controller: controlled ? {} : null,
    ready: Promise.resolve({ update }),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  } as unknown as ServiceWorkerContainer
  return { container, events, update }
}

describe('PWA service-worker updates', () => {
  it('reloads an existing controlled app exactly once after an update takes over', async () => {
    const { container, events, update } = fakeContainer(true)
    const reload = vi.fn()

    const stopWatching = watchForServiceWorkerUpdate(container, reload)
    await Promise.resolve()
    events.dispatchEvent(new Event('controllerchange'))
    events.dispatchEvent(new Event('controllerchange'))

    expect(update).toHaveBeenCalledOnce()
    expect(reload).toHaveBeenCalledOnce()
    stopWatching()
  })

  it('does not reload during the first service-worker installation', () => {
    const { container, events } = fakeContainer(false)
    const reload = vi.fn()

    watchForServiceWorkerUpdate(container, reload)
    events.dispatchEvent(new Event('controllerchange'))

    expect(reload).not.toHaveBeenCalled()
  })
})
