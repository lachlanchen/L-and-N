export function watchForServiceWorkerUpdate(
  serviceWorker: ServiceWorkerContainer,
  offer: (apply: () => Promise<void>) => void,
  reload: () => void = () => window.location.reload(),
): () => void {
  // Never reload an active recording without an explicit user tap.
  let hasControlledPage = Boolean(serviceWorker.controller)
  let disposed = false
  let approved = false
  let reloaded = false
  let registration: ServiceWorkerRegistration | undefined
  const cleanups: Array<() => void> = []
  const reloadOnce = () => { if (!reloaded) { reloaded = true; reload() } }
  const apply = async () => {
    approved = true
    if (registration?.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    else reloadOnce()
  }
  const offerWaiting = () => {
    if (!disposed && serviceWorker.controller && registration?.waiting) offer(apply)
  }
  const handleControllerChange = () => {
    if (disposed) return
    if (!hasControlledPage) { hasControlledPage = true; if (!approved) return }
    if (approved) reloadOnce()
    else offer(async () => reloadOnce())
  }

  serviceWorker.addEventListener('controllerchange', handleControllerChange)
  void serviceWorker.ready.then((ready) => {
    if (disposed) return
    registration = ready
    const watchInstalling = () => {
      const worker = ready.installing
      if (!worker) return
      worker.addEventListener('statechange', offerWaiting)
      cleanups.push(() => worker.removeEventListener('statechange', offerWaiting))
    }
    ready.addEventListener('updatefound', watchInstalling)
    cleanups.push(() => ready.removeEventListener('updatefound', watchInstalling))
    watchInstalling()
    offerWaiting()
    const check = () => {
      if (document.visibilityState !== 'hidden' && navigator.onLine !== false) void ready.update().catch(() => undefined)
    }
    check()
    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)
    cleanups.push(() => document.removeEventListener('visibilitychange', check), () => window.removeEventListener('online', check))
  }).catch(() => undefined)
  return () => {
    disposed = true
    serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    cleanups.forEach((cleanup) => cleanup())
  }
}
