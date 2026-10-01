// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatCopy, initialUILanguage, resolveUILanguage, uiCopy, uiLanguageLabels } from './i18n'
import { addedLocales, extraUI } from './data/ui-extra'
import { localizedExercise } from './data/curriculum-i18n'
import { exercises } from './data/curriculum'
import type { UILanguage } from './types'

function leaves(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value }
  return Object.assign({}, ...Object.entries(value as Record<string, unknown>).map(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key)))
}
function placeholders(value: string) {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
}

afterEach(() => { window.localStorage.clear(); vi.restoreAllMocks() })

describe('12-language interface', () => {
  it('includes the 11 profile languages and retains Cantonese', () => {
    expect(Object.keys(uiLanguageLabels)).toEqual(['en','ar','es','fr','ja','ko','vi','zh-Hans','zh-Hant','de','ru','yue'])
  })
  it.each(addedLocales)('has every UI key and preserves placeholders in %s', (locale) => {
    const source = leaves(uiCopy('en'))
    const translated = leaves(uiCopy(locale))
    expect(Object.keys(translated)).toEqual(Object.keys(source))
    expect(Object.keys(extraUI).sort()).toEqual(Object.keys(source).sort())
    for (const [key, value] of Object.entries(source)) {
      expect(translated[key].trim(), key).not.toBe('')
      expect(placeholders(translated[key]), key).toEqual(placeholders(value))
    }
  })
  it.each(Object.keys(uiLanguageLabels) as UILanguage[])('covers all practice words in %s without mutating curriculum', (locale) => {
    const original = JSON.stringify(exercises)
    for (const exercise of exercises) {
      const text = localizedExercise(exercise, locale)
      expect(text.translation.trim(), exercise.id).not.toBe('')
      expect(text.cue.trim(), exercise.id).not.toBe('')
    }
    expect(JSON.stringify(exercises)).toBe(original)
  })
  it.each([
    ['ar-SA','ar'], ['es-MX','es'], ['fr-CA','fr'], ['ja-JP','ja'], ['ko-KR','ko'],
    ['vi-VN','vi'], ['de-AT','de'], ['ru-RU','ru'], ['zh-HK','zh-Hant'],
    ['zh-Hans','zh-Hans'], ['yue-HK','yue'], ['en-GB','en'], ['pl-PL','en'],
  ])('resolves %s as %s', (input, locale) => { expect(resolveUILanguage(input)).toBe(locale) })
  it('restores a saved language independently of device locale', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
    window.localStorage.setItem('landn.ui-language','ja')
    expect(initialUILanguage()).toBe('ja')
  })
  it('ignores unknown persisted locales and works with disabled storage', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('ar-SA')
    window.localStorage.setItem('landn.ui-language','__proto__')
    expect(initialUILanguage()).toBe('ar')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('disabled') })
    expect(initialUILanguage()).toBe('ar')
  })
  it('formats translated score and update messages without leaking placeholders', () => {
    for (const locale of Object.keys(uiLanguageLabels) as UILanguage[]) {
      expect(formatCopy(uiCopy(locale).listen.correctCount,{correct:2,total:3})).not.toContain('{')
      expect(formatCopy(uiCopy(locale).updates.nativeNote,{version:'1.2.3'})).toContain('1.2.3')
    }
  })
  it('preserves nasal endings, silent letters, tone guidance and dialect respect', () => {
    const byId = (id: string) => exercises.find((exercise) => exercise.id === id)!
    expect(localizedExercise(byId('en-line-nine'),'fr').cue).toContain('/n/')
    expect(localizedExercise(byId('en-knife-life'),'de').cue).toContain('k ist stumm')
    expect(localizedExercise(byId('zh-lv-nv'),'ja').cue).toContain('第3声')
    expect(localizedExercise(byId('yue-nei-lei'),'es').cue).toContain('no juzga')
  })
})
