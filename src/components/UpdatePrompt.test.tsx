// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Capacitor } from '@capacitor/core'
import { UpdatePrompt } from './UpdatePrompt'
import { uiCopy } from '../i18n'
import * as updates from '../lib/app-updates'

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); delete document.documentElement.dataset.nativePlatform })
describe('gentle update prompt', () => {
  it('does not activate a web update until the user taps; hidden and inert while busy', async () => {
    const apply = vi.fn(async () => undefined)
    vi.spyOn(updates, 'currentWebUpdate').mockReturnValue({ id: 'web', kind: 'web', apply })
    const { rerender } = render(<UpdatePrompt copy={uiCopy('en')} busy={true} />)
    expect(screen.getByTestId('update-prompt')).toHaveAttribute('inert')
    expect(screen.getByTestId('update-prompt')).toHaveAttribute('aria-hidden', 'true')
    expect(apply).not.toHaveBeenCalled()
    rerender(<UpdatePrompt copy={uiCopy('en')} busy={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Update and refresh' }))
    await waitFor(() => expect(apply).toHaveBeenCalledOnce())
  })
  it.each(['en', 'zh-Hans', 'zh-Hant', 'yue'] as const)('localizes and dismisses without updating in %s', (language) => {
    const apply = vi.fn(async () => undefined)
    vi.spyOn(updates, 'currentWebUpdate').mockReturnValue({ id: 'web', kind: 'web', apply })
    const copy = uiCopy(language)
    render(<UpdatePrompt copy={copy} busy={false} />)
    fireEvent.click(screen.getByRole('button', { name: copy.updates.later }))
    expect(screen.queryByTestId('update-prompt')).toBeNull()
    expect(apply).not.toHaveBeenCalled()
  })
  it('offers a native store link, remembers later and never mixes in a web reload', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios')
    vi.spyOn(updates, 'checkNativeUpdate').mockResolvedValue({ id: 'ios-1.0.7', kind: 'native', version: '1.0.7', url: 'https://apps.apple.com/app/id6808872450' })
    render(<UpdatePrompt copy={uiCopy('en')} busy={false} />)
    expect(await screen.findByRole('link', { name: 'View update' })).toHaveAttribute('href', 'https://apps.apple.com/app/id6808872450')
    expect(screen.queryByRole('button', { name: 'Update and refresh' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Later' }))
    expect(updates.updateDismissed('ios-1.0.7')).toBe(true)
  })
  it('does not change Mac behavior or render an offline failure as an upgrade', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    document.documentElement.dataset.nativePlatform = 'macos'
    const check = vi.spyOn(updates, 'checkNativeUpdate').mockRejectedValue(new Error('offline'))
    const { unmount } = render(<UpdatePrompt copy={uiCopy('en')} busy={false} />)
    expect(check).not.toHaveBeenCalled()
    unmount()
    delete document.documentElement.dataset.nativePlatform
    render(<UpdatePrompt copy={uiCopy('en')} busy={false} />)
    await waitFor(() => expect(check).toHaveBeenCalled())
    expect(screen.queryByTestId('update-prompt')).toBeNull()
  })
})
