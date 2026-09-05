// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'

vi.mock('./lib/progress', () => ({
  loadAttempts: vi.fn(async () => []),
  saveAttempt: vi.fn(async () => []),
  trainingStreak: vi.fn(() => 0),
}))

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => null),
  })
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('language and sound controls', () => {
  it('keeps interface language independent from practice language', async () => {
    render(<App />)

    fireEvent.change(screen.getByTestId('ui-language-picker'), { target: { value: 'zh-Hans' } })
    fireEvent.click(screen.getByTestId('practice-language-zh-CN'))

    const root = screen.getByTestId('app-root')
    expect(root.getAttribute('data-ui-language')).toBe('zh-Hans')
    expect(root.getAttribute('data-practice-language')).toBe('zh-CN')
    expect(screen.getByRole('button', { name: '练习' })).toBeTruthy()
    await waitFor(() => expect(window.localStorage.getItem('landn.ui-language')).toBe('zh-Hans'))
  })

  it('switches directly between paired L and N exercises', () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('practice-sound-n'))

    expect(screen.getByRole('heading', { level: 2, name: 'night' })).toBeTruthy()
    expect(screen.getByTestId('practice-sound-n').getAttribute('aria-pressed')).toBe('true')
  })
})
