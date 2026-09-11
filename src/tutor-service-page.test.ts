// @vitest-environment jsdom
/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const servicePath = resolve(process.cwd(), 'public/for-tutors/index.html')
const serviceUrl = pathToFileURL(servicePath)
const serviceHtml = readFileSync(servicePath, 'utf8')
const service = new DOMParser().parseFromString(serviceHtml, 'text/html')

describe('tutor pronunciation mini-lesson service page', () => {
  it('publishes one bounded USD 250 offer with crawlable metadata', () => {
    expect(service.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://l-and-n.lazying.art/for-tutors/')
    const structured = JSON.parse(service.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}')
    expect(structured['@type']).toBe('Service')
    expect(structured.offers.price).toBe('250')
    expect(structured.offers.priceCurrency).toBe('USD')
    expect(service.querySelectorAll('.deliverables article')).toHaveLength(4)
  })

  it('uses the finished project sample and a fit check before payment', () => {
    const sampleLinks = [...service.querySelectorAll<HTMLAnchorElement>('a[href="../lessons/light-vs-night/"]')]
    expect(sampleLinks.length).toBeGreaterThanOrEqual(2)
    const fitLink = service.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')
    expect(fitLink?.getAttribute('href')).toContain('Pronunciation%20mini-lesson%20fit%20check')
    expect(fitLink?.getAttribute('href')).toContain('do%20not%20attach%20learner%20recordings')
    expect(service.querySelector('a[href*="stripe.com"]')).toBeNull()
  })

  it('keeps every local image and stylesheet reference present', () => {
    for (const element of service.querySelectorAll<HTMLImageElement | HTMLLinkElement>('img[src], link[rel="stylesheet"]')) {
      const reference = element.getAttribute('src') ?? element.getAttribute('href')
      expect(existsSync(fileURLToPath(new URL(reference!, serviceUrl)))).toBe(true)
    }
  })
})
