package art.lazying.landn;

/** Loaded by the native shell, so an obsolete service worker cannot hide it. */
final class NativeUpdateMigration {
    private NativeUpdateMigration() {}

    static final String SCRIPT = """
        (async () => {
          if (location.origin !== 'https://localhost' || window.__landnNativeCacheMigration) return;
          window.__landnNativeCacheMigration = true;
          if (!('serviceWorker' in navigator)) return;
          const ownsWorker = worker => worker?.scriptURL === location.origin + '/sw.js';
          const controlled = ownsWorker(navigator.serviceWorker.controller);
          const registrations = (await navigator.serviceWorker.getRegistrations()).filter(r =>
            r.scope === location.origin + '/' && [r.active, r.waiting, r.installing].some(ownsWorker));
          await Promise.all(registrations.map(r => r.unregister()));
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.filter(key => key.startsWith('workbox-precache-') &&
              key.endsWith(location.origin + '/')).map(key => caches.delete(key)));
          }
          // IndexedDB (recordings), Preferences, localStorage and cookies are untouched.
          if (controlled || registrations.length) location.reload();
        })().catch(() => console.warn('L & N app-page cache migration could not finish'));
        """;
}
