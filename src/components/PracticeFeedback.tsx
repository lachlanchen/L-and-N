import { useLayoutEffect, useRef, type ReactNode } from 'react'

/** Keep the page from shrinking under a scrolled finger between attempts.
 * Remount for a different exercise; never scroll the learner automatically.
 */
export function PracticeFeedback({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    element.style.minHeight = `${Math.ceil(element.getBoundingClientRect().height)}px`
  })
  return <div className="practice-feedback" data-testid="practice-feedback" ref={ref}>{children}</div>
}
