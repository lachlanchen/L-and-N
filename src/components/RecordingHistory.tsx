import { useEffect, useRef } from 'react'
import { Mic, Square, Volume2 } from 'lucide-react'
import { exercises } from '../data/curriculum'
import { formatCopy, type UICopy } from '../i18n'
import type { AttemptRecord } from '../lib/progress'
import type { UILanguage } from '../types'

export const HISTORY_PAGE_SIZE = 12

interface Props {
  attempts: AttemptRecord[]
  copy: UICopy
  language: UILanguage
  visibleCount: number
  onLoadMore: () => void
  onPractice: () => void
  playingTakeId: string | null
  onPlay: (id: string) => void
  playbackError?: { takeId: string; message: string }
}

export function RecordingHistory({ attempts, copy, language, visibleCount, onLoadMore, onPractice, playingTakeId, onPlay, playbackError }: Props) {
  const sentinel = useRef<HTMLDivElement>(null)
  const shown = Math.min(visibleCount, attempts.length)
  const hasMore = shown < attempts.length

  useEffect(() => {
    const element = sentinel.current
    if (!element || !hasMore || typeof IntersectionObserver === 'undefined') return
    let consumed = false
    const observer = new IntersectionObserver((entries) => {
      if (consumed || !entries.some((entry) => entry.isIntersecting)) return
      consumed = true
      observer.disconnect()
      onLoadMore()
    }, { rootMargin: '200px 0px' })
    observer.observe(element)
    return () => { consumed = true; observer.disconnect() }
  }, [hasMore, shown, onLoadMore])

  const dateFormat = new Intl.DateTimeFormat(language === 'yue' ? 'zh-HK' : language, {
    dateStyle: 'medium', timeStyle: 'short',
  })

  return (
    <section className="history-card" aria-label={copy.progress.recent}>
      <h2>{copy.progress.recent}</h2>
      {attempts.length === 0 ? (
        <div className="empty-state"><Mic /><p>{copy.progress.empty}</p><button onClick={onPractice}>{copy.progress.start}</button></div>
      ) : <>
        <p className="history-note">{copy.progress.historyNote}</p>
        {attempts.slice(0, shown).map((attempt) => {
          const item = exercises.find(({ id }) => id === attempt.exerciseId)
          const date = new Date(attempt.createdAt)
          return (
            <article key={`${attempt.exerciseId}-${attempt.createdAt}`} data-testid="history-attempt">
              <div className="history-word">
                <strong>{item?.word ?? attempt.exerciseId}</strong>
                <span>{copy.progress.target} /{(attempt.target ?? item?.target)?.toLowerCase() ?? '—'}/ · {copy.progress.detected} {attempt.detectedSound}</span>
                {attempt.transcript && <span>{copy.score.heard}: {attempt.transcript}</span>}
                <time dateTime={attempt.createdAt}>{Number.isFinite(date.getTime()) ? dateFormat.format(date) : attempt.createdAt}</time>
                {playbackError && playbackError.takeId === attempt.takeId && <p className="error-message" role="alert">{playbackError.message}</p>}
              </div>
              {attempt.takeId ? (
                <button type="button" className={`take-play${playingTakeId === attempt.takeId ? ' playing' : ''}`}
                  aria-label={playingTakeId === attempt.takeId ? copy.takes.stop : copy.takes.replay}
                  data-testid="history-play" onClick={() => onPlay(attempt.takeId!)}>
                  {playingTakeId === attempt.takeId ? <Square size={15} /> : <Volume2 size={15} />}
                </button>
              ) : <span className="history-no-audio">{copy.takes.noAudio}</span>}
              <b>{attempt.score}</b>
            </article>
          )
        })}
        <div ref={sentinel} className="history-pagination" data-testid="history-pagination">
          <p role="status">{formatCopy(copy.progress.shown, { shown, total: attempts.length })}</p>
          {hasMore
            ? <button type="button" onClick={onLoadMore}>{copy.progress.loadMore}</button>
            : <p>{copy.progress.allLoaded}</p>}
        </div>
      </>}
    </section>
  )
}
