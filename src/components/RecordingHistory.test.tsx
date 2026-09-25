// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { useCallback, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RecordingHistory, HISTORY_PAGE_SIZE } from './RecordingHistory'
import { uiCopy } from '../i18n'
import type { AttemptRecord } from '../lib/progress'
import type { UILanguage } from '../types'

const attempts: AttemptRecord[] = Array.from({ length: 75 }, (_, index) => ({
  exerciseId: 'en-light-night', score: 90, detectedSound: 'L', target: 'L',
  createdAt: new Date(Date.UTC(2026, 8, 25, 12, 0, -index)).toISOString(),
  takeId: `take-${index}`, transcript: 'light',
}))
function History({ language = 'en', onPlay = vi.fn() }: { language?: UILanguage; onPlay?: (id: string) => void }) {
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE)
  const onLoadMore = useCallback(() => setVisibleCount((count) => count + HISTORY_PAGE_SIZE), [])
  return <RecordingHistory attempts={attempts} copy={uiCopy(language)} language={language}
    visibleCount={visibleCount} onLoadMore={onLoadMore} onPractice={vi.fn()}
    playingTakeId={null} onPlay={onPlay} />
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('recording history', () => {
  it('shows batches through the entire history without loading audio until Replay', () => {
    const onPlay = vi.fn()
    render(<History onPlay={onPlay} />)
    expect(screen.getAllByTestId('history-attempt')).toHaveLength(12)
    expect(onPlay).not.toHaveBeenCalled()
    while (screen.queryByRole('button', { name: 'Load older attempts' })) {
      fireEvent.click(screen.getByRole('button', { name: 'Load older attempts' }))
    }
    expect(screen.getAllByTestId('history-attempt')).toHaveLength(75)
    expect(screen.getByText('75 of 75 attempts')).toBeInTheDocument()
    fireEvent.click(screen.getAllByTestId('history-play')[74])
    expect(onPlay).toHaveBeenCalledExactlyOnceWith('take-74')
    expect(screen.getAllByText('Recognizer heard: light')).toHaveLength(75)
  })

  it('loads the next batch on scrolling and ignores stale or duplicate observer events', () => {
    const callbacks: IntersectionObserverCallback[] = []
    const disconnect = vi.fn()
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { callbacks.push(callback) }
      observe() {}
      disconnect = disconnect
    })
    const { unmount } = render(<History />)
    const event = [{ isIntersecting: true }] as IntersectionObserverEntry[]
    const first = callbacks[0]
    act(() => first([{ isIntersecting: false }] as IntersectionObserverEntry[], {} as IntersectionObserver))
    expect(screen.getAllByTestId('history-attempt')).toHaveLength(12)
    act(() => { first(event, {} as IntersectionObserver); first(event, {} as IntersectionObserver) })
    expect(screen.getAllByTestId('history-attempt')).toHaveLength(24)
    act(() => first(event, {} as IntersectionObserver))
    expect(screen.getAllByTestId('history-attempt')).toHaveLength(24)
    act(() => callbacks.at(-1)!(event, {} as IntersectionObserver))
    expect(screen.getAllByTestId('history-attempt')).toHaveLength(36)
    unmount()
    expect(disconnect).toHaveBeenCalled()
  })

  it.each(['en', 'zh-Hans', 'zh-Hant', 'yue'] as const)('localizes history controls in %s', (language) => {
    render(<History language={language} />)
    expect(screen.getByRole('button', { name: uiCopy(language).progress.loadMore })).toBeInTheDocument()
    expect(screen.getAllByTestId('history-play')[0]).toHaveAccessibleName(uiCopy(language).takes.replay)
  })
})
