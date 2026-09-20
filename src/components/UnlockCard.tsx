import { useState } from 'react'
import { Lock, RotateCcw, Unlock } from 'lucide-react'
import { formatCopy, type UICopy } from '../i18n'
import { buyFullAccess, FREE_PAIRS_PER_LANGUAGE, restorePurchases, type Entitlement } from '../lib/purchases'

interface UnlockCardProps {
  copy: UICopy
  entitlement: Entitlement
  onChange: (entitlement: Entitlement) => void
  /** Compact variant for inline placement under a locked chip row. */
  compact?: boolean
}

/**
 * The Android paywall card: shown only when content is gated and not owned.
 * Purchases go through the PlayBilling plugin; the price comes from Play.
 */
export function UnlockCard({ copy, entitlement, onChange, compact = false }: UnlockCardProps) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  if (!entitlement.gated || entitlement.owned) return null

  const run = async (action: () => Promise<Entitlement>, successText: (next: Entitlement) => string) => {
    setBusy(true)
    setMessage('')
    try {
      const next = await action()
      onChange(next)
      setMessage(successText(next))
    } catch (caught) {
      console.warn('Purchase flow failed', caught)
      setMessage(entitlement.available ? copy.unlock.failed : copy.unlock.unavailable)
    } finally {
      setBusy(false)
    }
  }

  const buy = () => run(buyFullAccess, (next) => (next.owned ? copy.unlock.thanks : next.cancelled ? '' : copy.unlock.failed))
  const restore = () => run(restorePurchases, (next) => (next.owned ? copy.unlock.restored : copy.unlock.notRestored))
  const price = entitlement.price ?? 'US$0.99'

  return (
    <section className={`unlock-card${compact ? ' compact' : ''}`} data-testid="unlock-card" aria-live="polite">
      <div className="unlock-heading">
        <Lock size={16} aria-hidden="true" />
        <h2>{copy.unlock.title}</h2>
      </div>
      {!compact && <p>{formatCopy(copy.unlock.body, { free: FREE_PAIRS_PER_LANGUAGE })}</p>}
      <div className="unlock-actions">
        <button type="button" className="primary" data-testid="unlock-buy" disabled={busy || !entitlement.available} onClick={buy}>
          <Unlock size={16} /> {formatCopy(copy.unlock.buy, { price })}
        </button>
        <button type="button" data-testid="unlock-restore" disabled={busy} onClick={restore}>
          <RotateCcw size={14} /> {copy.unlock.restore}
        </button>
      </div>
      {!entitlement.available && <small className="unlock-note">{copy.unlock.unavailable}</small>}
      {message && <small className="unlock-note">{message}</small>}
    </section>
  )
}
