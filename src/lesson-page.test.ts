// @vitest-environment jsdom
/// <reference types="node" />
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const lessonPath = resolve(process.cwd(), 'public/lessons/light-vs-night/index.html')
const lessonUrl = pathToFileURL(lessonPath)
const lessonHtml = readFileSync(lessonPath, 'utf8')
const lesson = new DOMParser().parseFromString(lessonHtml, 'text/html')

describe('light and night static lesson', () => {
  it('publishes crawlable metadata and structured lesson content', () => {
    expect(lesson.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://l-and-n.lazying.art/lessons/light-vs-night/')
    expect(lesson.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://l-and-n.lazying.art/lessons/light-vs-night/social.png')
    expect(lesson.querySelectorAll('.steps > li')).toHaveLength(4)

    const structured = JSON.parse(lesson.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}')
    expect(structured['@type']).toBe('LearningResource')
    expect(structured.isAccessibleForFree).toBe(true)
  })

  it('uses accessible local media and the reviewed campaign asset', () => {
    expect(lesson.querySelectorAll('audio[controls]')).toHaveLength(2)
    expect(lesson.querySelectorAll('audio[aria-label]')).toHaveLength(2)
    expect(lesson.querySelector('video track[kind="captions"][default]')).toBeTruthy()
    expect([...lesson.querySelectorAll('img')].every((image) => image.hasAttribute('alt'))).toBe(true)

    for (const element of lesson.querySelectorAll<HTMLSourceElement | HTMLTrackElement | HTMLImageElement>('source[src], track[src], img[src]')) {
      const source = element.getAttribute('src')
      expect(source).toBeTruthy()
      expect(existsSync(fileURLToPath(new URL(source!, lessonUrl)))).toBe(true)
    }

    const video = readFileSync(resolve(process.cwd(), 'public/lessons/light-vs-night/light-vs-night-demo.mp4'))
    expect(createHash('sha256').update(video).digest('hex')).toBe('da3962c6ce0a34db33d27ed1defa69e0ad6ea08e3f6f7c71f7e205024368f971')
  })

  it('leads to the free drill and asks only for restrained feedback', () => {
    const drillLink = lesson.querySelector<HTMLAnchorElement>('a[href*="utm_content=light_night_lesson"]')
    const feedbackLink = lesson.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')

    expect(drillLink?.textContent).toContain('free browser drill')
    expect(drillLink?.getAttribute('href')).toContain('utm_campaign=l_and_n_pronunciation_launch')
    expect(feedbackLink?.getAttribute('href')).toContain('Please%20do%20not%20attach%20a%20voice%20recording')
  })
})
