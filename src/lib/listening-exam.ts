/**
 * The listening exam: a random run of one minimal pair, played end to end,
 * answered afterwards in order.
 *
 * The learner hears something like "light night light light night", then taps
 * the word heard at each position. Nothing is revealed until the whole answer
 * is submitted, so the test measures perception rather than memory of the
 * last word.
 */
import { exercises } from '../data/curriculum'
import type { Exercise, TargetSound, TrainingLanguage } from '../types'
import { isVerifiedClip } from './word-audio'

export const EXAM_LENGTHS = [3, 5, 7] as const
export const DEFAULT_EXAM_LENGTH = 5
/** Never play more than this many identical words in a row. */
const MAX_RUN = 3

export interface MinimalPair {
  id: string
  language: TrainingLanguage
  lateral: Exercise
  nasal: Exercise
}

export interface ExamItem {
  exerciseId: string
  word: string
  sound: TargetSound
}

export interface ListeningExam {
  pairId: string
  language: TrainingLanguage
  items: ExamItem[]
}

export interface ExamItemResult {
  played: ExamItem
  chosen: TargetSound
  correct: boolean
}

export interface ExamResult {
  total: number
  correct: number
  /** Whole percent, 0-100. */
  accuracy: number
  items: ExamItemResult[]
}

const other = (sound: TargetSound): TargetSound => (sound === 'L' ? 'N' : 'L')

/** The headword without its romanization, e.g. `蓝 lán` -> `蓝`. */
export function displayWord(exercise: Exercise): string {
  return exercise.word
}

/**
 * Minimal pairs for a practice language whose two studio clips were both
 * verified. Pairs whose recording is ambiguous are left out rather than
 * used to test a contrast the audio does not actually carry.
 */
export function listeningPairs(language: TrainingLanguage): MinimalPair[] {
  const pool = exercises.filter((exercise) => exercise.language === language)
  const seen = new Set<string>()
  const pairs: MinimalPair[] = []
  for (const exercise of pool) {
    const partner = pool.find((item) => item.word === exercise.pair && item.pair === exercise.word)
    if (!partner) continue
    const id = [exercise.id, partner.id].sort().join('|')
    if (seen.has(id)) continue
    seen.add(id)
    const lateral = exercise.target === 'L' ? exercise : partner
    const nasal = exercise.target === 'N' ? exercise : partner
    if (lateral.target !== 'L' || nasal.target !== 'N') continue
    if (!isVerifiedClip(lateral.id) || !isVerifiedClip(nasal.id)) continue
    pairs.push({ id, language, lateral, nasal })
  }
  return pairs
}

/**
 * Builds a random sequence. Repeats are allowed, because telling
 * "light light" from "light night" is the point, but both words always
 * appear and no word repeats more than three times in a row.
 */
export function createListeningExam(
  pair: MinimalPair,
  length: number = DEFAULT_EXAM_LENGTH,
  random: () => number = Math.random,
): ListeningExam {
  const total = Math.max(2, Math.floor(length))
  const sounds: TargetSound[] = []
  for (let index = 0; index < total; index += 1) {
    let sound: TargetSound = random() < 0.5 ? 'L' : 'N'
    const run = sounds.length >= MAX_RUN && sounds.slice(-MAX_RUN).every((item) => item === sound)
    if (run) sound = other(sound)
    sounds.push(sound)
  }
  if (sounds.every((sound) => sound === sounds[0])) {
    const at = Math.min(total - 1, Math.floor(random() * total))
    sounds[at] = other(sounds[0])
  }
  return {
    pairId: pair.id,
    language: pair.language,
    items: sounds.map((sound) => {
      const exercise = sound === 'L' ? pair.lateral : pair.nasal
      return { exerciseId: exercise.id, word: exercise.word, sound }
    }),
  }
}

export function examIsComplete(exam: ListeningExam, answers: TargetSound[]): boolean {
  return answers.length === exam.items.length
}

export function scoreListeningExam(exam: ListeningExam, answers: TargetSound[]): ExamResult {
  const items = exam.items.map((played, index) => {
    const chosen = answers[index]
    return { played, chosen, correct: chosen === played.sound }
  })
  const correct = items.filter((item) => item.correct).length
  return {
    total: items.length,
    correct,
    accuracy: items.length ? Math.round((correct / items.length) * 100) : 0,
    items,
  }
}
