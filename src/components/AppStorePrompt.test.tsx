// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Capacitor } from '@capacitor/core'
import { AppStorePrompt } from './AppStorePrompt'
import { uiCopy } from '../i18n'
import { APP_STORE_URL, GOOGLE_PLAY_URL, mobileStore } from '../lib/app-stores'
import type { UILanguage } from '../types'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('mobile store routing', () => {
  it.each([
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5, 'apple'],
    ['Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)', 5, 'apple'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15', 5, 'apple'],
    ['Mozilla/5.0 (Linux; Android 15; HONOR PTP-N49) AppleWebKit/537.36 Chrome/140 Mobile', 5, 'google'],
    ['Mozilla/5.0 (Linux; Android 14; Tablet) AppleWebKit/537.36', 5, 'google'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 0, null],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 10, null],
    ['Mozilla/5.0 (Windows Phone 10.0; Android 6.0; Microsoft)', 5, null],
    ['Mozilla/5.0 (X11; Linux x86_64)', 0, null],
    ['', 0, null],
  ])('routes %s without guessing a desktop store', (ua, touch, expected) => {
    expect(mobileStore(ua as string, touch as number)).toBe(expected)
  })
})

describe('gentle app-store prompt', () => {
  it.each(['en', 'zh-Hans', 'zh-Hant', 'yue'] as UILanguage[])(
    'uses %s interface copy and only the matching store', (locale) => {
      for (const [agent, expected] of [['iPhone', APP_STORE_URL], ['Android', GOOGLE_PLAY_URL]]) {
        vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(agent)
        const copy = uiCopy(locale)
        const before = location.href
        const open = vi.spyOn(window, 'open')
        const view = render(<AppStorePrompt copy={copy} busy={false} />)
        expect(screen.getByRole('complementary', { name: copy.storePrompt.title })).toBeTruthy()
        const link = screen.getByRole('link')
        expect(link.getAttribute('href')).toBe(expected)
        expect(link.textContent).toBe(agent === 'iPhone' ? copy.storeLinks.appStore : copy.storeLinks.googlePlay)
        expect(link.getAttribute('target')).toBe('_blank')
        expect(link.getAttribute('rel')).toBe('noopener noreferrer')
        expect(location.href).toBe(before)
        expect(open).not.toHaveBeenCalled()
        view.unmount()
      }
    },
  )

  it.each(['ios', 'android'])('never shows inside the %s native app', (platform) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(platform === 'ios' ? 'iPhone' : 'Android')
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    render(<AppStorePrompt copy={uiCopy('en')} busy={false} />)
    expect(screen.queryByTestId('app-store-prompt')).toBeNull()
  })

  it('does not prompt on a desktop', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0)')
    render(<AppStorePrompt copy={uiCopy('en')} busy={false} />)
    expect(screen.queryByTestId('app-store-prompt')).toBeNull()
  })

  it('remembers the browser choice across remounts', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android')
    const view = render(<AppStorePrompt copy={uiCopy('en')} busy={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Keep using the browser' }))
    expect(screen.queryByTestId('app-store-prompt')).toBeNull()
    view.unmount()
    render(<AppStorePrompt copy={uiCopy('en')} busy={false} />)
    expect(screen.queryByTestId('app-store-prompt')).toBeNull()
  })

  it('still renders and dismisses when storage is blocked', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    render(<AppStorePrompt copy={uiCopy('en')} busy={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Keep using the browser' }))
    expect(screen.queryByTestId('app-store-prompt')).toBeNull()
  })

  it('makes the prompt inert and inaccessible while capture is busy', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android')
    const view = render(<AppStorePrompt copy={uiCopy('en')} busy />)
    expect(screen.getByTestId('app-store-prompt').hasAttribute('inert')).toBe(true)
    expect(screen.queryByRole('link')).toBeNull()
    view.rerender(<AppStorePrompt copy={uiCopy('en')} busy={false} />)
    expect(screen.getByTestId('app-store-prompt').hasAttribute('inert')).toBe(false)
    expect(screen.getByRole('link')).toBeTruthy()
  })
})
