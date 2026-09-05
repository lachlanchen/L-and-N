export function watchForServiceWorkerUpdate(
  serviceWorker: ServiceWorkerContainer,
  reload: () => void = () => window.location.reload(),
): () => void {
  // Do not reload on a first install. If this page already had a controller,
  // however, a controller change means a newer precached app shell has taken
  // over and the current document should move to it exactly once.
  const hadController = Boolean(serviceWorker.controller)
  let reloading = false
  const handleControllerChange = () => {
    if (!hadController || reloading) return
    reloading = true
    reload()
  }

  serviceWorker.addEventListener('controllerchange', handleControllerChange)
  void serviceWorker.ready
    .then((registration) => registration.update())
    .catch(() => undefined)

  return () => serviceWorker.removeEventListener('controllerchange', handleControllerChange)
}
