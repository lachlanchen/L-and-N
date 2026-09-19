import { describe, expect, it } from 'vitest'
import { exercises } from '../data/curriculum'
import {
  createListeningExam,
  DEFAULT_EXAM_LENGTH,
  examIsComplete,
  listeningPairs,
  scoreListeningExam,
} from './listening-exam'
import { isVerifiedClip, wordClip } from './word-audio'
import type { TargetSound } from '../types'

/** Deterministic RNG so a sequence can be reproduced in a failing test. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('studio clips for the listening exam', () => {
  it('points at the standalone clip file for a bundled recording', () => {
    const clip = wordClip('en-light-night')
    expect(clip).not.toBeNull()
    expect(clip!.key).toBe('en-light')
    expect(clip!.src).toBe('/audio/clips/en-light.mp3')
    expect(clip!.seconds).toBeGreaterThan(0.2)
    expect(clip!.seconds).toBeLessThan(1.2)
    expect(clip!.expected).toBe('L')
  })

  it('refuses clips the verifier could not confirm', () => {
    // tools/audio/verify_word_clips.py graded these studio takes as
    // ambiguous: the recognizer and the onset model disagree with the label.
    expect(isVerifiedClip('en-low-no')).toBe(false)
    expect(isVerifiedClip('en-lead-need')).toBe(false)
    expect(isVerifiedClip('en-loon-noon')).toBe(false)
    expect(isVerifiedClip('en-light-night')).toBe(true)
  })
})

describe('minimal pairs offered for ear training', () => {
  it('pairs each word with its partner and verifies both clips', () => {
    const pairs = listeningPairs('en-US')
    expect(pairs.length).toBeGreaterThanOrEqual(5)
    for (const pair of pairs) {
      expect(pair.lateral.target).toBe('L')
      expect(pair.nasal.target).toBe('N')
      expect(pair.lateral.pair).toBe(pair.nasal.word)
      expect(pair.nasal.pair).toBe(pair.lateral.word)
      expect(isVerifiedClip(pair.lateral.id)).toBe(true)
      expect(isVerifiedClip(pair.nasal.id)).toBe(true)
    }
  })

  it('lists every pair once and leaves out unverified recordings', () => {
    const words = listeningPairs('en-US').map((pair) => pair.lateral.word)
    expect(new Set(words).size).toBe(words.length)
    expect(words).toContain('light')
    expect(words).not.toContain('low')
    expect(words).not.toContain('lead')
    expect(words).not.toContain('loon')
  })

  it('covers the Chinese practice languages', () => {
    expect(listeningPairs('zh-CN').map((pair) => pair.lateral.word)).toEqual(['蓝 lán', '老 lǎo'])
    expect(listeningPairs('yue-HK').map((pair) => pair.nasal.word)).toEqual(['你 nei5'])
  })
})

describe('exam sequences', () => {
  const pair = listeningPairs('en-US').find((item) => item.lateral.word === 'light')!

  it('defaults to five words drawn from the chosen pair', () => {
    const exam = createListeningExam(pair, DEFAULT_EXAM_LENGTH, seeded(11))
    expect(DEFAULT_EXAM_LENGTH).toBe(5)
    expect(exam.items).toHaveLength(5)
    expect(exam.pairId).toBe(pair.id)
    for (const item of exam.items) {
      expect(['light', 'night']).toContain(item.word)
      expect(item.exerciseId).toBe(item.sound === 'L' ? pair.lateral.id : pair.nasal.id)
    }
  })

  it('always plays both words and never repeats one more than three times', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      for (const length of [3, 5, 7]) {
        const sounds = createListeningExam(pair, length, seeded(seed)).items.map((item) => item.sound)
        expect(sounds).toHaveLength(length)
        expect(new Set(sounds).size).toBe(2)
        let run = 1
        for (let index = 1; index < sounds.length; index += 1) {
          run = sounds[index] === sounds[index - 1] ? run + 1 : 1
          expect(run, `seed ${seed} length ${length}: ${sounds.join('')}`).toBeLessThanOrEqual(3)
        }
      }
    }
  })

  it('produces different sequences for different seeds', () => {
    const first = createListeningExam(pair, 8, seeded(1)).items.map((item) => item.sound).join('')
    const second = createListeningExam(pair, 8, seeded(2)).items.map((item) => item.sound).join('')
    expect(first).not.toBe(second)
  })
})

describe('scoring the answer sheet', () => {
  const pair = listeningPairs('en-US').find((item) => item.lateral.word === 'light')!
  const exam = createListeningExam(pair, 5, seeded(7))
  const played = exam.items.map((item) => item.sound)

  it('only accepts a full answer sheet', () => {
    expect(examIsComplete(exam, played.slice(0, 4))).toBe(false)
    expect(examIsComplete(exam, played)).toBe(true)
  })

  it('marks every position and reports whole-percent accuracy', () => {
    const perfect = scoreListeningExam(exam, played)
    expect(perfect.correct).toBe(5)
    expect(perfect.accuracy).toBe(100)
    expect(perfect.items.every((item) => item.correct)).toBe(true)

    const flipped: TargetSound[] = [...played]
    flipped[0] = flipped[0] === 'L' ? 'N' : 'L'
    const scored = scoreListeningExam(exam, flipped)
    expect(scored.correct).toBe(4)
    expect(scored.accuracy).toBe(80)
    expect(scored.items[0].correct).toBe(false)
    expect(scored.items[0].played.sound).toBe(played[0])
    expect(scored.items[0].chosen).toBe(flipped[0])
  })

  it('keeps every curriculum word playable in the practice tab', () => {
    // The exam is selective, but "Hear studio model" still uses every file.
    for (const exercise of exercises) {
      expect(wordClip(exercise.id)).not.toBeNull()
    }
  })
})
