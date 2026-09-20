// @vitest-environment jsdom
/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const page = new DOMParser().parseFromString(html, 'text/html')
const meta = (selector: string) => page.querySelector(selector)?.getAttribute('content')
const homepage = 'https://l-and-n.lazying.art/'

describe('homepage discovery without JavaScript', () => {
  it('has one absolute canonical and consistent title and description metadata', () => {
    expect(page.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    expect(page.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(homepage)
    expect(meta('meta[property="og:url"]')).toBe(homepage)
    expect(meta('meta[property="og:type"]')).toBe('website')
    expect(page.title).toBe('L & N — English, Mandarin & Cantonese Pronunciation Practice')
    expect(meta('meta[property="og:title"]')).toBe(page.title)
    expect(meta('meta[name="twitter:title"]')).toBe(page.title)
    const description = meta('meta[name="description"]')
    expect(description).toContain('English, Mandarin, and Cantonese')
    expect(description).toContain('Free browser practice.')
    expect(meta('meta[property="og:description"]')).toBe(description)
    expect(meta('meta[name="twitter:description"]')).toBe(description)
  })

  it('reuses the actual square icon for a small summary card', () => {
    expect(meta('meta[name="twitter:card"]')).toBe('summary')
    expect(meta('meta[property="og:image"]')).toBe(`${homepage}icons/icon-512.png`)
    expect(meta('meta[name="twitter:image"]')).toBe(meta('meta[property="og:image"]'))
    expect(meta('meta[name="twitter:image:alt"]')).toBe(meta('meta[property="og:image:alt"]'))
    expect(meta('meta[property="og:image:alt"]')).toBeTruthy()
    expect(meta('meta[property="og:image:type"]')).toBe('image/png')
    const png = readFileSync(resolve(process.cwd(), 'public/icons/icon-512.png'))
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    expect(png.readUInt32BE(16)).toBe(Number(meta('meta[property="og:image:width"]')))
    expect(png.readUInt32BE(20)).toBe(Number(meta('meta[property="og:image:height"]')))
    expect(png.readUInt32BE(16)).toBe(512)
    expect(png.readUInt32BE(20)).toBe(512)
  })

  it('offers an accessible fallback with only the existing free lesson and store listings', () => {
    const fallback = page.querySelector('body > noscript main')!
    expect(fallback).toBeTruthy()
    expect(page.getElementById(fallback.getAttribute('aria-labelledby')!)?.tagName).toBe('H1')
    expect(fallback.textContent).toContain('Interactive browser practice is free and requires JavaScript.')
    expect(fallback.textContent).toContain('regional pricing, in-app purchases, and availability')
    expect(fallback.querySelector('nav')?.getAttribute('aria-label')).toBe('App store listings')
    expect([...fallback.querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual([
      '/lessons/light-vs-night/',
      'https://apps.apple.com/us/app/l-n-speech-practice/id6808872450',
      'https://play.google.com/store/apps/details?id=art.lazying.landn',
    ])
    expect(existsSync(resolve(process.cwd(), 'public/lessons/light-vs-night/index.html'))).toBe(true)
    expect(fallback.querySelectorAll('script, iframe, form')).toHaveLength(0)
  })

  it('keeps fallback styling conditional and leaves the React entry and navigation intact', () => {
    expect(page.querySelectorAll('link[href="/noscript.css"]')).toHaveLength(1)
    expect(page.querySelector('head > noscript > link')?.getAttribute('href')).toBe('/noscript.css')
    expect(existsSync(resolve(process.cwd(), 'public/noscript.css'))).toBe(true)
    expect(page.querySelector('#root')?.childNodes).toHaveLength(0)
    expect(page.querySelector('#root')?.closest('noscript')).toBeNull()
    expect([...page.querySelectorAll('script')].map((script) => script.getAttribute('src'))).toEqual(['/src/main.tsx'])
    expect(page.querySelector('meta[http-equiv="refresh"]')).toBeNull()
  })
})
