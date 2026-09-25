// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { watchForServiceWorkerUpdate } from './pwa-updates'

function fakeContainer(controlled: boolean, waiting = false) {
  const events = new EventTarget()
  const registrationEvents = new EventTarget()
  const update = vi.fn(async () => undefined)
  const postMessage = vi.fn()
  const registration = {
    update, waiting: waiting ? { postMessage } : null, installing: null,
    addEventListener: registrationEvents.addEventListener.bind(registrationEvents),
    removeEventListener: registrationEvents.removeEventListener.bind(registrationEvents),
  }
  const container = {
    controller: controlled ? {} : null,
    ready: Promise.resolve(registration),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  } as unknown as ServiceWorkerContainer
  return { container, events, update, postMessage, registration, registrationEvents }
}

describe('PWA service-worker updates', () => {
  it('asks before refreshing when another tab activates an update', async () => {
    const { container, events, update } = fakeContainer(true)
    const reload = vi.fn()
    const offer = vi.fn()

    const stopWatching = watchForServiceWorkerUpdate(container, offer, reload)
    await Promise.resolve()
    events.dispatchEvent(new Event('controllerchange'))
    events.dispatchEvent(new Event('controllerchange'))

    expect(update).toHaveBeenCalledOnce()
    expect(reload).not.toHaveBeenCalled()
    await offer.mock.calls.at(-1)![0]()
    await offer.mock.calls.at(-1)![0]()
    expect(reload).toHaveBeenCalledOnce()
    stopWatching()
  })

  it('does not reload during the first service-worker installation', () => {
    const { container, events } = fakeContainer(false)
    const reload = vi.fn()
    const offer = vi.fn()

    const stop = watchForServiceWorkerUpdate(container, offer, reload)
    events.dispatchEvent(new Event('controllerchange'))

    expect(reload).not.toHaveBeenCalled()
    expect(offer).not.toHaveBeenCalled()
    stop()
  })

  it('offers an already-waiting update, activates only on tap and reloads once', async () => {
    const { container, events, postMessage } = fakeContainer(true, true)
    const offer = vi.fn()
    const reload = vi.fn()
    const stop = watchForServiceWorkerUpdate(container, offer, reload)
    await Promise.resolve()
    expect(offer).toHaveBeenCalledOnce()
    expect(postMessage).not.toHaveBeenCalled()
    await offer.mock.calls[0][0]()
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(reload).not.toHaveBeenCalled()
    events.dispatchEvent(new Event('controllerchange'))
    events.dispatchEvent(new Event('controllerchange'))
    expect(reload).toHaveBeenCalledOnce()
    stop()
  })

  it('ignores a late ready promise after cleanup', async () => {
    const { container, update } = fakeContainer(true, true)
    const offer = vi.fn()
    watchForServiceWorkerUpdate(container, offer, vi.fn())()
    await Promise.resolve()
    expect(offer).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})
