import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Capacitor } from '@capacitor/core'
import { ArrowUpRight, RefreshCw } from 'lucide-react'
import { type UICopy, formatCopy } from '../i18n'
import { checkNativeUpdate, currentWebUpdate, dismissUpdate, subscribeWebUpdate, updateDismissed, type AppUpdate } from '../lib/app-updates'

export function UpdatePrompt({ copy, busy }: { copy: UICopy; busy: boolean }) {
  const web = useSyncExternalStore(subscribeWebUpdate, currentWebUpdate)
  const [native, setNative] = useState<AppUpdate | null>(null)
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [failed, setFailed] = useState(false)
  const lastCheck = useRef(0)
  const nativeApp = Capacitor.isNativePlatform()
  useEffect(() => {
    if (!nativeApp || document.documentElement.dataset.nativePlatform === 'macos') return
    let disposed = false
    const check = () => {
      if (document.visibilityState === 'hidden' || navigator.onLine === false || Date.now() - lastCheck.current < 300_000) return
      lastCheck.current = Date.now()
      void checkNativeUpdate(Capacitor.getPlatform()).then((update) => {
        if (!disposed && update && !updateDismissed(update.id)) { setNative(update); setDismissed(null) }
      }).catch(() => undefined)
    }
    check()
    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)
    return () => {
      disposed = true
      lastCheck.current = 0
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('online', check)
    }
  }, [nativeApp])
  const update = nativeApp ? native : web
  if (!update || dismissed === update.id) return null
  const later = () => {
    setDismissed(update.id)
    if (update.kind === 'native') dismissUpdate(update.id)
  }
  const apply = async () => {
    if (busy || applying) return
    setApplying(true)
    setFailed(false)
    try { await update.apply?.() } catch { setFailed(true) } finally { setApplying(false) }
  }
  return (
    <aside className={`update-prompt${busy ? ' is-busy' : ''}`} data-testid="update-prompt"
      aria-label={copy.updates.title} aria-hidden={busy || undefined} inert={busy}>
      <RefreshCw size={20} aria-hidden="true" />
      <div className="update-copy">
        <strong>{copy.updates.title}</strong>
        <p>{update.kind === 'web' ? copy.updates.webNote : formatCopy(copy.updates.nativeNote, { version: update.version ?? '' })}</p>
        <div className="update-actions">
          {update.kind === 'web'
            ? <button disabled={busy || applying} onClick={() => void apply()}>{copy.updates.reload}</button>
            : <a href={update.url} target="_blank" rel="noopener noreferrer">{copy.updates.store}<ArrowUpRight size={14} /></a>}
          <button disabled={busy || applying} className="update-later" onClick={later}>{copy.updates.later}</button>
        </div>
        {failed && <p role="alert">{copy.updates.failed}</p>}
      </div>
    </aside>
  )
}
