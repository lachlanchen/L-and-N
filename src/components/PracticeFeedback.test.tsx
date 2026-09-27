// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PracticeFeedback } from './PracticeFeedback'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('reserves the largest result height until switching exercise, preventing scroll clamping on retry', () => {
  let contentHeight = 90
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return { height: Math.max(contentHeight, Number.parseFloat(this.style.minHeight) || 0) } as DOMRect
  })
  const { rerender } = render(<PracticeFeedback key="light">Ready</PracticeFeedback>)
  expect(screen.getByTestId('practice-feedback').style.minHeight).toBe('90px')
  contentHeight = 680
  rerender(<PracticeFeedback key="light">Scored result</PracticeFeedback>)
  expect(screen.getByTestId('practice-feedback').style.minHeight).toBe('680px')
  contentHeight = 90
  rerender(<PracticeFeedback key="light">Recording again</PracticeFeedback>)
  expect(screen.getByTestId('practice-feedback').style.minHeight).toBe('680px')
  rerender(<PracticeFeedback key="low">Next word</PracticeFeedback>)
  expect(screen.getByTestId('practice-feedback').style.minHeight).toBe('90px')
})
