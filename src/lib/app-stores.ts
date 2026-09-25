export const APP_STORE_URL = 'https://apps.apple.com/us/app/l-n-speech-practice/id6808872450'
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=art.lazying.landn'

/** Routing hint only: never guesses from language, viewport width or IP. */
export function mobileStore(userAgent: string, maxTouchPoints = 0): 'apple' | 'google' | null {
  if (/Windows Phone|Windows NT/i.test(userAgent)) return null
  if (/Android/i.test(userAgent)) return 'google'
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'apple'
  // iPadOS Safari can request the desktop site with a Macintosh user agent.
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'apple'
  return null
}
