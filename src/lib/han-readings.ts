/**
 * Judging Mandarin and Cantonese attempts by sound rather than by character.
 *
 * A recognizer asked for 南 frequently returns 男: the same syllable written
 * with a different character. Comparing characters marks that attempt wrong,
 * which is unfair and confusing, because the learner said exactly the right
 * thing. So the scorer compares syllables instead, using the table built by
 * `tools/lang/generate_homophones.py` from the curriculum.
 *
 * Tone is ignored on purpose. Tone has its own score (`scoreTone`), and two
 * characters that differ only in tone still share the l or n initial this app
 * teaches, so ignoring it can never turn an L into an N.
 */
import table from '../data/han-homophones.json'
import type { TrainingLanguage } from '../types'

type HomophoneTable = Record<string, Record<string, string[]>>

const homophones = table as HomophoneTable

/** `'南 nán'` → `'nan'`, `'男 naam4'` → `'naam'`, `'旅 lǚ'` → `'lv'`. */
export function syllableOf(word: string): string {
  const romanization = word.trim().split(/\s+/).slice(1).join('')
  if (!romanization) return ''
  const decomposed = romanization.normalize('NFD')
  let syllable = ''
  for (let index = 0; index < decomposed.length; index += 1) {
    const character = decomposed[index]
    if (/[̀-ͯ0-9]/.test(character)) continue
    if (character.toLowerCase() === 'u') {
      // A u carrying a diaeresis is pinyin ü, which the table spells v.
      const marks = decomposed.slice(index + 1).match(/^[̀-ͯ]*/)?.[0] ?? ''
      syllable += marks.includes('̈') ? 'v' : 'u'
      continue
    }
    if (character === 'ü') {
      syllable += 'v'
      continue
    }
    syllable += character.toLowerCase()
  }
  return syllable
}

/**
 * Every Han character that is pronounced like `word` in this language,
 * including the word's own character. Empty for English and for a syllable
 * the table does not carry.
 */
export function homophonesOf(language: TrainingLanguage, word: string): string[] {
  const forLanguage = homophones[language]
  if (!forLanguage) return []
  const syllable = syllableOf(word)
  if (!syllable) return []
  return forLanguage[syllable] ?? []
}

/** True when the recognizer's text contains a character pronounced like `word`. */
export function soundsLike(language: TrainingLanguage, word: string, transcript: string): boolean {
  if (!transcript) return false
  return homophonesOf(language, word).some((character) => transcript.includes(character))
}
