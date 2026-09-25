import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { ArrowUpRight, X } from 'lucide-react'
import type { UICopy } from '../i18n'
import { APP_STORE_URL, GOOGLE_PLAY_URL, mobileStore } from '../lib/app-stores'

const DISMISSED_KEY = 'landn.store-prompt-dismissed.v1'

export function AppStorePrompt({ copy, busy }: { copy: UICopy; busy: boolean }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(DISMISSED_KEY) === '1'
    } catch {
      return false
    }
  })
  const store = mobileStore(navigator.userAgent, navigator.maxTouchPoints)
  if (Capacitor.isNativePlatform() || !store || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Private/restricted storage must not stop browser practice or dismissal.
    }
  }

  return (
    <aside className={`app-store-prompt${busy ? ' is-busy' : ''}`} data-testid="app-store-prompt"
      aria-label={copy.storePrompt.title} aria-hidden={busy || undefined} inert={busy}>
      <img src="/icons/icon-192.png" width="36" height="36" alt="" />
      <div className="app-store-prompt-copy">
        <strong>{copy.storePrompt.title}</strong>
        <p>{copy.storePrompt.note}</p>
        <a href={store === 'apple' ? APP_STORE_URL : GOOGLE_PLAY_URL}
          target="_blank" rel="noopener noreferrer">
          {store === 'apple' ? copy.storeLinks.appStore : copy.storeLinks.googlePlay}
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
      <button type="button" className="app-store-prompt-dismiss" onClick={dismiss}
        aria-label={copy.storePrompt.dismiss} title={copy.storePrompt.dismiss}>
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  )
}
