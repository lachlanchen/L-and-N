import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Ear, Lock, Play, RotateCcw, Square, Undo2, Volume2, X } from 'lucide-react'
import { formatCopy, type UICopy } from '../i18n'
import {
  createListeningExam,
  DEFAULT_EXAM_LENGTH,
  EXAM_LENGTHS,
  examIsComplete,
  listeningPairs,
  scoreListeningExam,
  type ExamResult,
  type ListeningExam as Exam,
  type MinimalPair,
} from '../lib/listening-exam'
import { isLocked, UNGATED, type Entitlement } from '../lib/purchases'
import { playSequence, preloadClips, unlockAudio, type SequencePlayback } from '../lib/word-audio'
import { exercises } from '../data/curriculum'
import { UnlockCard } from './UnlockCard'
import type { TargetSound, TrainingLanguage } from '../types'

type Phase = 'idle' | 'loading' | 'playing' | 'answering' | 'reviewed'

interface ListeningExamProps {
  language: TrainingLanguage
  copy: UICopy
  onResult?: (result: ExamResult, exam: Exam) => void
  entitlement?: Entitlement
  onEntitlementChange?: (entitlement: Entitlement) => void
}

function WordLabel({ word, sound }: { word: string; sound: TargetSound }) {
  const [head, ...rest] = word.split(' ')
  const romanization = rest.join(' ')
  // English words carry the contrast in their first letter; Chinese entries
  // carry it in the romanization that follows the character.
  const focus = romanization ? romanization.slice(0, 1) : head.slice(0, 1)
  const tail = romanization ? romanization.slice(1) : head.slice(1)
  return (
    <span className="exam-word">
      {romanization && <span className="exam-word-head">{head}</span>}
      <span className={`focus ${sound.toLowerCase()}`}>{focus}</span>
      <span>{tail}</span>
    </span>
  )
}

/** Remount this component when the practice language changes (keyed by language). */
export function ListeningExam({ language, copy, onResult, entitlement = UNGATED, onEntitlementChange }: ListeningExamProps) {
  const pairs = useMemo(() => listeningPairs(language), [language])
  const lockedIds = useMemo(
    () => new Set(pairs.filter((item) => isLocked(exercises, item.lateral, entitlement)).map((item) => item.id)),
    [pairs, entitlement],
  )
  const [pairId, setPairId] = useState<string | null>(pairs[0]?.id ?? null)
  const [length, setLength] = useState<number>(DEFAULT_EXAM_LENGTH)
  const [exam, setExam] = useState<Exam | null>(null)
  const [answers, setAnswers] = useState<TargetSound[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [result, setResult] = useState<ExamResult | null>(null)
  const [error, setError] = useState('')
  const [errorDetail, setErrorDetail] = useState('')
  const playbackRef = useRef<SequencePlayback | null>(null)
  const operationRef = useRef(0)

  const pair: MinimalPair | undefined =
    pairs.find((item) => item.id === pairId && !lockedIds.has(item.id)) ?? pairs.find((item) => !lockedIds.has(item.id)) ?? pairs[0]

  const reset = useCallback(() => {
    operationRef.current += 1
    playbackRef.current?.stop()
    playbackRef.current = null
    setExam(null)
    setAnswers([])
    setResult(null)
    setPlayingIndex(null)
    setPhase('idle')
    setError('')
    setErrorDetail('')
  }, [])

  useEffect(() => () => {
    operationRef.current += 1
    playbackRef.current?.stop()
  }, [])

  useEffect(() => {
    if (!pair) return
    void preloadClips([pair.lateral.id, pair.nasal.id])
  }, [pair])

  const play = async (current: Exam) => {
    const operation = operationRef.current + 1
    operationRef.current = operation
    playbackRef.current?.stop()
    setError('')
    setErrorDetail('')
    setPhase('loading')
    try {
      // Unlock inside the tap handler chain: iOS ignores audio started later.
      unlockAudio()
      const playback = await playSequence(
        current.items.map((item) => item.exerciseId),
        {
          onItem: (index) => {
            if (operationRef.current === operation) setPlayingIndex(index)
          },
        },
      )
      if (operationRef.current !== operation) {
        playback.stop()
        return
      }
      playbackRef.current = playback
      setPhase('playing')
      await playback.finished
      if (operationRef.current !== operation) return
      playbackRef.current = null
      setPlayingIndex(null)
      setPhase((active) => (active === 'reviewed' ? active : 'answering'))
    } catch (caught) {
      console.warn('Listening playback failed', caught)
      if (operationRef.current !== operation) return
      setPlayingIndex(null)
      setPhase(result ? 'reviewed' : exam ? 'answering' : 'idle')
      setError(copy.listen.audioError)
      // The technical reason stays in English: it is for reporting, not reading.
      setErrorDetail(caught instanceof Error ? caught.message : String(caught))
    }
  }

  const startExam = () => {
    if (!pair) return
    const next = createListeningExam(pair, length)
    setExam(next)
    setAnswers([])
    setResult(null)
    void play(next)
  }

  const replay = () => {
    if (exam) void play(exam)
  }

  const stop = () => {
    operationRef.current += 1
    playbackRef.current?.stop()
    playbackRef.current = null
    setPlayingIndex(null)
    setPhase(exam ? 'answering' : 'idle')
  }

  const playOne = (exerciseId: string) => {
    const operation = operationRef.current + 1
    operationRef.current = operation
    playbackRef.current?.stop()
    unlockAudio()
    void playSequence([exerciseId])
      .then((playback) => {
        if (operationRef.current !== operation) {
          playback.stop()
          return
        }
        playbackRef.current = playback
      })
      .catch((caught: unknown) => {
        setError(copy.listen.audioError)
        setErrorDetail(caught instanceof Error ? caught.message : String(caught))
      })
  }

  const choose = (sound: TargetSound) => {
    if (!exam || phase === 'playing' || phase === 'loading' || result) return
    setAnswers((current) => (current.length >= exam.items.length ? current : [...current, sound]))
  }

  const submit = () => {
    if (!exam || !examIsComplete(exam, answers)) return
    const scored = scoreListeningExam(exam, answers)
    setResult(scored)
    setPhase('reviewed')
    onResult?.(scored, exam)
  }

  if (!pair) {
    return (
      <main className="listen-page">
        <div className="section-heading compact">
          <span className="eyebrow"><Ear size={14} /> {copy.listen.eyebrow}</span>
          <h1>{copy.listen.title}</h1>
        </div>
        <section className="exam-card"><p className="exam-empty">{copy.listen.unavailable}</p></section>
      </main>
    )
  }

  const busy = phase === 'playing' || phase === 'loading'
  const answered = answers.length
  const total = exam?.items.length ?? length

  return (
    <main className="listen-page">
      <div className="section-heading compact">
        <span className="eyebrow"><Ear size={14} /> {copy.listen.eyebrow}</span>
        <h1>{copy.listen.title}</h1>
        <p>{copy.listen.hint}</p>
      </div>

      <section className="exam-card">
        <div className="exam-setup">
          <div className="exam-field">
            <span>{copy.listen.pairLabel}</span>
            <div className="chip-row" role="group" aria-label={copy.listen.pairLabel}>
              {pairs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`exam-pair-${item.id}`}
                  aria-pressed={item.id === pair.id}
                  className={`${item.id === pair.id ? 'active' : ''}${lockedIds.has(item.id) ? ' locked' : ''}`}
                  disabled={busy || lockedIds.has(item.id)}
                  title={lockedIds.has(item.id) ? copy.unlock.lockedPair : undefined}
                  onClick={() => {
                    setPairId(item.id)
                    reset()
                  }}
                >
                  {lockedIds.has(item.id) && <Lock size={11} aria-hidden="true" />}
                  {item.lateral.word.split(' ')[0]} · {item.nasal.word.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="exam-field">
            <span>{copy.listen.lengthLabel}</span>
            <div className="chip-row" role="group" aria-label={copy.listen.lengthLabel}>
              {EXAM_LENGTHS.map((option) => (
                <button
                  key={option}
                  type="button"
                  data-testid={`exam-length-${option}`}
                  aria-pressed={option === length}
                  className={option === length ? 'active' : ''}
                  disabled={busy}
                  onClick={() => {
                    setLength(option)
                    reset()
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="exam-dots" aria-hidden="true">
          {Array.from({ length: total }, (_, index) => (
            <i
              key={index}
              className={[
                playingIndex === index ? 'playing' : '',
                result ? (result.items[index]?.correct ? 'right' : 'wrong') : index < answered ? 'filled' : '',
              ].filter(Boolean).join(' ')}
            />
          ))}
        </div>

        <div className="exam-actions">
          {busy ? (
            <button type="button" className="exam-primary" data-testid="exam-stop" onClick={stop}>
              <Square size={18} />
              {phase === 'loading'
                ? copy.listen.loading
                : formatCopy(copy.listen.playing, { index: (playingIndex ?? 0) + 1, total })}
            </button>
          ) : exam && !result ? (
            <button type="button" className="exam-primary" data-testid="exam-replay" onClick={replay}>
              <RotateCcw size={18} /> {copy.listen.replay}
            </button>
          ) : (
            <button type="button" className="exam-primary" data-testid="exam-play" onClick={startExam}>
              <Play size={18} /> {exam ? copy.listen.newExam : copy.listen.play}
            </button>
          )}
        </div>

        {exam && !result && (
          <>
            <p className="exam-prompt">
              {copy.listen.chooseHeard}
              <b>{formatCopy(copy.listen.answerProgress, { done: answered, total })}</b>
            </p>
            <div className="answer-chips" data-testid="exam-answers">
              {exam.items.map((_item, index) => {
                const chosen = answers[index]
                return (
                  <span key={index} className={chosen ? `chip ${chosen.toLowerCase()}` : 'chip empty'}>
                    {chosen ? (chosen === 'L' ? pair.lateral.word.split(' ')[0] : pair.nasal.word.split(' ')[0]) : index + 1}
                  </span>
                )
              })}
            </div>
            <div className="option-buttons">
              {([pair.lateral, pair.nasal] as const).map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  className={`option ${exercise.target.toLowerCase()}`}
                  data-testid={`exam-choose-${exercise.target.toLowerCase()}`}
                  disabled={busy || answered >= total}
                  onClick={() => choose(exercise.target)}
                >
                  <WordLabel word={exercise.word} sound={exercise.target} />
                </button>
              ))}
            </div>
            <div className="hear-words" role="group" aria-label={copy.listen.hearWords}>
              {([pair.lateral, pair.nasal] as const).map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  className={`hear ${exercise.target.toLowerCase()}`}
                  data-testid={`exam-hear-${exercise.target.toLowerCase()}`}
                  disabled={busy}
                  onClick={() => playOne(exercise.id)}
                >
                  <Volume2 size={16} /> {formatCopy(copy.listen.hearWord, { word: exercise.word.split(' ')[0] })}
                </button>
              ))}
            </div>
            <div className="exam-secondary">
              <button type="button" disabled={!answered || busy} onClick={() => setAnswers((current) => current.slice(0, -1))}>
                <Undo2 size={16} /> {copy.listen.undo}
              </button>
              <button type="button" disabled={!answered || busy} onClick={() => setAnswers([])}>
                {copy.listen.clear}
              </button>
              <button
                type="button"
                className="primary"
                data-testid="exam-submit"
                disabled={!examIsComplete(exam, answers) || busy}
                onClick={submit}
              >
                {copy.listen.submit}
              </button>
            </div>
          </>
        )}

        {error && (
          <p className="error-message">
            {error}
            {errorDetail && <small className="error-detail">{errorDetail}</small>}
          </p>
        )}
      </section>

      {lockedIds.size > 0 && onEntitlementChange && (
        <UnlockCard copy={copy} entitlement={entitlement} onChange={onEntitlementChange} compact />
      )}

      {result && exam && (
        <section className="exam-result" aria-live="polite" data-testid="exam-result">
          <header>
            <h2>{copy.listen.resultTitle}</h2>
            <strong data-testid="exam-score">{formatCopy(copy.listen.correctCount, { correct: result.correct, total: result.total })}</strong>
            <p>{result.correct === result.total ? copy.listen.perfect : copy.listen.keepGoing}</p>
          </header>
          <ol className="result-rows">
            {result.items.map((item, index) => (
              <li key={index} className={item.correct ? 'right' : 'wrong'}>
                <span className="position">{index + 1}</span>
                <span className="played">
                  <small>{copy.listen.played}</small>
                  <WordLabel word={item.played.word} sound={item.played.sound} />
                </span>
                <span className="chosen">
                  <small>{copy.listen.yourAnswer}</small>
                  <WordLabel
                    word={item.chosen === 'L' ? pair.lateral.word : pair.nasal.word}
                    sound={item.chosen}
                  />
                </span>
                {item.correct ? <Check size={17} className="mark" /> : <X size={17} className="mark" />}
                <button type="button" aria-label={copy.listen.replayItem} disabled={busy} onClick={() => playOne(item.played.exerciseId)}>
                  <Volume2 size={16} />
                </button>
              </li>
            ))}
          </ol>
          <button type="button" className="exam-primary" data-testid="exam-new" onClick={startExam}>
            <Play size={18} /> {copy.listen.newExam}
          </button>
        </section>
      )}
    </main>
  )
}
