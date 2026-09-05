import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Globe2,
  Headphones,
  Mic,
  RotateCcw,
  Sparkles,
  Target,
  Volume2,
  Waves,
} from 'lucide-react'
import './App.css'
import { SignalVisualizer } from './components/SignalVisualizer'
import { exercises, languageLabels } from './data/curriculum'
import { feedbackCopy, formatCopy, initialUILanguage, uiCopy, uiLanguageLabels, type UICopy } from './i18n'
import {
  AudioCaptureError,
  startAudioCapture,
  type ActiveAudioCapture,
  type LiveSignal,
} from './lib/audio-capture'
import { loadAttempts, saveAttempt, trainingStreak, type AttemptRecord } from './lib/progress'
import { buildAcousticCalibration, scorePronunciation } from './lib/scoring'
import { speakExample } from './lib/speech'
import type { AcousticFeatures, Exercise, PronunciationScore, TargetSound, TrainingLanguage, UILanguage } from './types'

type Tab = 'practice' | 'learn' | 'progress'
type CapturePhase = 'idle' | 'starting' | 'recording' | 'processing'

const MouthModel3D = lazy(() =>
  import('./components/MouthModel3D').then((module) => ({ default: module.MouthModel3D })),
)

interface RecordingSession {
  capture: ActiveAudioCapture
  exercise: Exercise
  calibration: ReturnType<typeof buildAcousticCalibration>
  operationId: number
}

function App() {
  const [tab, setTab] = useState<Tab>('practice')
  const [uiLanguage, setUILanguage] = useState<UILanguage>(initialUILanguage)
  const [language, setLanguage] = useState<TrainingLanguage>('en-US')
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [capturePhase, setCapturePhase] = useState<CapturePhase>('idle')
  const [score, setScore] = useState<PronunciationScore | null>(null)
  const [lastFeatures, setLastFeatures] = useState<AcousticFeatures | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [liveSignal, setLiveSignal] = useState<LiveSignal | null>(null)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState<AttemptRecord[]>([])
  const sessionRef = useRef<RecordingSession | null>(null)
  const stopTimerRef = useRef<number | null>(null)
  const capturePhaseRef = useRef<CapturePhase>('idle')
  const operationRef = useRef(0)
  const copy = uiCopy(uiLanguage)
  const recording = capturePhase === 'recording'
  const starting = capturePhase === 'starting'
  const processing = capturePhase === 'processing'
  const captureBusy = capturePhase !== 'idle'

  const languageExercises = useMemo(
    () => exercises.filter((item) => item.language === language),
    [language],
  )
  const exercise = languageExercises[exerciseIndex % languageExercises.length]
  const calibration = useMemo(() => buildAcousticCalibration(attempts, language), [attempts, language])
  const streak = trainingStreak(attempts)
  const average = attempts.length
    ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length)
    : 0

  useEffect(() => {
    void loadAttempts().then(setAttempts)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('landn.ui-language', uiLanguage)
    document.documentElement.lang = uiLanguage === 'zh-Hans' ? 'zh-CN' : uiLanguage === 'zh-Hant' ? 'zh-TW' : uiLanguage === 'yue' ? 'yue-HK' : 'en'
    document.title = copy.appTitle
  }, [copy.appTitle, uiLanguage])

  useEffect(() => {
    const releaseCapture = (updateUI: boolean) => {
      operationRef.current += 1
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
      const session = sessionRef.current
      sessionRef.current = null
      if (session) void session.capture.cancel().catch(() => undefined)
      if (updateUI) {
        capturePhaseRef.current = 'idle'
        setCapturePhase('idle')
        setAnalyser(null)
        setLiveSignal(null)
      }
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') releaseCapture(true)
    }
    const handlePageHide = () => releaseCapture(true)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', handlePageHide)
      releaseCapture(false)
    }
  }, [])

  const updateCapturePhase = (phase: CapturePhase) => {
    capturePhaseRef.current = phase
    setCapturePhase(phase)
  }

  const moveExercise = (direction: number) => {
    setExerciseIndex((current) =>
      (current + direction + languageExercises.length) % languageExercises.length,
    )
    setScore(null)
    setLastFeatures(null)
    setError('')
  }

  const selectLanguage = (code: TrainingLanguage) => {
    setLanguage(code)
    setExerciseIndex(0)
    setScore(null)
    setLastFeatures(null)
    setError('')
  }

  const selectTargetSound = (target: TargetSound) => {
    if (exercise.target === target) return
    const pairedWord = exercise.pair.split(' ')[0]
    const pairedIndex = languageExercises.findIndex(
      (item) => item.target === target && item.word.split(' ')[0] === pairedWord,
    )
    const fallbackIndex = languageExercises.findIndex((item) => item.target === target)
    setExerciseIndex(pairedIndex >= 0 ? pairedIndex : fallbackIndex >= 0 ? fallbackIndex : 0)
    setScore(null)
    setLastFeatures(null)
    setError('')
  }

  const finishRecording = async () => {
    const session = sessionRef.current
    if (!session || capturePhaseRef.current !== 'recording') return
    updateCapturePhase('processing')
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current)
    stopTimerRef.current = null

    try {
      const captured = await session.capture.stop()
      if (operationRef.current !== session.operationId) return
      setLastFeatures(captured.features)
      const result = scorePronunciation(
        session.exercise,
        captured.transcript,
        captured.features,
        session.calibration,
      )
      setScore(result)
      const next = await saveAttempt({
        exerciseId: session.exercise.id,
        score: result.overall,
        detectedSound: result.detectedSound,
        createdAt: new Date().toISOString(),
        target: session.exercise.target,
        language: session.exercise.language,
        features: captured.features,
      })
      if (operationRef.current === session.operationId) setAttempts(next)
    } catch (caught) {
      console.warn('Pronunciation scoring failed', caught)
      if (operationRef.current !== session.operationId) return
      if (caught instanceof AudioCaptureError && caught.code === 'silent-recording') {
        setError(copy.errors.silence)
      } else if (
        caught instanceof AudioCaptureError &&
        (caught.code === 'empty-recording' || caught.code === 'recording-failed')
      ) {
        setError(copy.errors.recording)
      } else {
        setError(copy.errors.scoring)
      }
    } finally {
      if (sessionRef.current === session) sessionRef.current = null
      if (operationRef.current === session.operationId) {
        setAnalyser(null)
        setLiveSignal(null)
        updateCapturePhase('idle')
      }
    }
  }

  const startRecording = async () => {
    if (capturePhaseRef.current !== 'idle') return
    const operationId = operationRef.current + 1
    operationRef.current = operationId
    updateCapturePhase('starting')
    setError('')
    setScore(null)
    setLastFeatures(null)
    setLiveSignal(null)
    let capture: ActiveAudioCapture | null = null
    try {
      capture = await startAudioCapture({
        language,
        expectedWords: [exercise.word.split(' ')[0], exercise.pair.split(' ')[0]],
        onLiveSignal: (signal) => {
          if (operationRef.current === operationId) setLiveSignal(signal)
        },
      })
      if (operationRef.current !== operationId) {
        await capture.cancel()
        return
      }
      const session: RecordingSession = { capture, exercise, calibration, operationId }
      sessionRef.current = session
      setAnalyser(capture.analyser)
      updateCapturePhase('recording')
      stopTimerRef.current = window.setTimeout(() => void finishRecording(), 5000)
    } catch (caught) {
      console.warn('Microphone start failed', caught)
      await capture?.cancel().catch(() => undefined)
      if (operationRef.current === operationId) {
        updateCapturePhase('idle')
        setAnalyser(null)
        setLiveSignal(null)
        setError(copy.errors.microphone)
      }
    }
  }

  const toggleRecording = () => {
    if (capturePhaseRef.current === 'recording') void finishRecording()
    else if (capturePhaseRef.current === 'idle') void startRecording()
  }

  const renderPractice = () => (
    <main className="practice-page">
      <div className="language-switcher" data-testid="practice-language-switcher" aria-label={copy.trainingLanguage}>
        {(Object.entries(languageLabels) as Array<[TrainingLanguage, string]>).map(([code, label]) => (
          <button key={code} data-testid={`practice-language-${code}`} aria-pressed={language === code} className={language === code ? 'active' : ''} disabled={captureBusy} onClick={() => selectLanguage(code)}>{label}</button>
        ))}
      </div>

      <div className="practice-kicker">
        <span className="eyebrow"><Sparkles size={14} /> {copy.practice.session}</span>
        <small>{copy.practice.sessionHint}</small>
      </div>

      <section className="drill-card">
        <div className="drill-topline">
          <button className="icon-button" aria-label={copy.practice.previousWord} disabled={captureBusy} onClick={() => moveExercise(-1)}><ChevronLeft /></button>
          <div className="sound-toggle" role="group" aria-label={copy.practice.soundPicker}>
            {(['L', 'N'] as const).map((sound) => (
              <button
                key={sound}
                data-testid={`practice-sound-${sound.toLowerCase()}`}
                type="button"
                aria-pressed={exercise.target === sound}
                className={`${sound.toLowerCase()} ${exercise.target === sound ? 'active' : ''}`}
                disabled={captureBusy}
                onClick={() => selectTargetSound(sound)}
              >{sound}</button>
            ))}
          </div>
          <button className="icon-button" aria-label={copy.practice.nextWord} disabled={captureBusy} onClick={() => moveExercise(1)}><ChevronRight /></button>
        </div>

        <div className="word-area">
          <span className="target-label">{copy.practice.target} /{exercise.target.toLowerCase()}/</span>
          <h2>{exercise.word}</h2>
          <p className="ipa">{exercise.ipa} <span>· {exercise.translation}</span></p>
          <SoundSpelling exercise={exercise} copy={copy} />
          <button className="listen-button" title={copy.practice.studioTitle} disabled={captureBusy} onClick={() => void speakExample(exercise)}>
            <Volume2 size={19} /> {copy.practice.hearModel}
          </button>
        </div>

        <div className="contrast-row">
          <div><span>{copy.practice.say}</span><strong>{exercise.word}</strong></div>
          <ArrowRight size={18} />
          <div className="avoid"><span>{copy.practice.not}</span><strong>{exercise.pair}</strong></div>
        </div>

        <div className="cue"><Target size={18} /><p>{exercise.cue}</p></div>

        <SignalVisualizer analyser={analyser} liveSignal={liveSignal} features={lastFeatures} recording={recording} target={exercise.target} copy={copy.signal} />

        <button
          className={`record-button ${recording ? 'recording' : ''}`}
          onClick={toggleRecording}
          disabled={starting || processing}
          aria-busy={starting || processing}
          aria-label={recording ? copy.practice.stopAndScore : copy.practice.startRecording}
        >
          <span className="record-orbit"><Mic size={30} /></span>
          <span>{starting ? copy.practice.preparing : processing ? copy.practice.analysing : recording ? copy.practice.tapToScore : copy.practice.tapThenSay}</span>
          {recording && <span className="recording-time">{copy.practice.listening}</span>}
        </button>

        {error && <p className="error-message">{error}</p>}
      </section>

      {score && <ScoreCard score={score} copy={copy} onRetry={() => setScore(null)} onNext={() => moveExercise(1)} />}

      <section className="science-note">
        <Waves size={22} />
        <div><strong>{copy.practice.scoreHow}</strong><p>{copy.practice.scoreHowBody}</p></div>
      </section>
    </main>
  )

  const renderLearn = () => (
    <main className="learn-page">
      <Suspense fallback={<div className="model-loading">{copy.learn.loading}</div>}><MouthModel3D copy={copy.model} /></Suspense>
      <div className="section-heading compact"><span className="eyebrow"><BookOpen size={14} /> {copy.learn.eyebrow}</span><h1>{copy.learn.title}</h1></div>
      <section className="principles">
        {copy.learn.principles.map((principle, index) => (
          <article key={principle.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{principle.title}</h2><p>{principle.body}</p></div></article>
        ))}
      </section>
      <section className="source-card">
        <Headphones size={22} />
        <div><strong>{copy.learn.source}</strong><p>{copy.learn.sourceBody}</p><a href="https://www.youtube.com/watch?v=78RQW1Kq_3A" target="_blank" rel="noreferrer">{copy.learn.sourceLink}</a></div>
      </section>
    </main>
  )

  const renderProgress = () => (
    <main className="progress-page">
      <div className="section-heading compact"><span className="eyebrow"><Activity size={14} /> {copy.progress.eyebrow}</span><h1>{copy.progress.title}</h1><p>{copy.progress.hint}</p></div>
      <section className="stats-grid">
        <article><Flame /><strong>{streak}</strong><span>{copy.progress.dayStreak}</span></article>
        <article><Target /><strong>{average || '—'}</strong><span>{copy.progress.average}</span></article>
        <article><Check /><strong>{attempts.length}</strong><span>{copy.progress.attempts}</span></article>
      </section>
      <section className="history-card">
        <h2>{copy.progress.recent}</h2>
        {attempts.length === 0 ? (
          <div className="empty-state"><Mic /><p>{copy.progress.empty}</p><button onClick={() => setTab('practice')}>{copy.progress.start}</button></div>
        ) : attempts.slice(0, 12).map((attempt) => {
          const item = exercises.find(({ id }) => id === attempt.exerciseId)
          return <article key={`${attempt.exerciseId}-${attempt.createdAt}`}><div><strong>{item?.word ?? attempt.exerciseId}</strong><span>{copy.progress.target} /{item?.target.toLowerCase()}/ · {copy.progress.detected} {attempt.detectedSound}</span></div><b>{attempt.score}</b></article>
        })}
      </section>
      <p className="clinical-note">{copy.progress.note}</p>
      <div className="legal-links"><a href="/privacy.html" target="_blank">{copy.progress.privacy}</a><a href="/support.html" target="_blank">{copy.progress.support}</a></div>
    </main>
  )

  return (
    <div className="app-shell" data-testid="app-root" data-ui-language={uiLanguage} data-practice-language={language}>
      <header className="app-header">
        <button className="brand" onClick={() => setTab('practice')}><img src="/icons/icon-192.png" alt="" /><span>L–and–N</span></button>
        <div className="header-actions">
          <label className="ui-language-picker">
            <Globe2 size={16} aria-hidden="true" />
            <span className="sr-only">{copy.uiLanguage}</span>
            <select data-testid="ui-language-picker" value={uiLanguage} onChange={(event) => setUILanguage(event.target.value as UILanguage)} aria-label={copy.uiLanguage}>
              {(Object.entries(uiLanguageLabels) as Array<[UILanguage, string]>).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          <div className="streak" aria-label={`${copy.streak}: ${streak}`}><Flame size={16} /> {streak}</div>
        </div>
      </header>
      {tab === 'practice' && renderPractice()}
      {tab === 'learn' && renderLearn()}
      {tab === 'progress' && renderProgress()}
      <nav className="bottom-nav" aria-label={copy.primaryNavigation}>
        <button className={tab === 'practice' ? 'active' : ''} disabled={captureBusy} onClick={() => setTab('practice')}><Mic /><span>{copy.nav.practice}</span></button>
        <button className={tab === 'learn' ? 'active' : ''} disabled={captureBusy} onClick={() => setTab('learn')}><BookOpen /><span>{copy.nav.learn}</span></button>
        <button className={tab === 'progress' ? 'active' : ''} disabled={captureBusy} onClick={() => setTab('progress')}><Activity /><span>{copy.nav.progress}</span></button>
      </nav>
    </div>
  )
}

function SoundSpelling({ exercise, copy }: { exercise: Exercise; copy: UICopy }) {
  if (exercise.language === 'en-US') {
    return (
      <div className="sound-spelling" aria-label={formatCopy(copy.practice.letterMeasured, { value: exercise.target })}>
        <span className={`focus ${exercise.target.toLowerCase()}`}>{exercise.word.slice(0, 1)}</span>
        <span>{exercise.word.slice(1)}</span>
        <small>{copy.practice.measuredOnset}</small>
      </div>
    )
  }

  const [character, romanization = ''] = exercise.word.split(' ')
  return (
    <div className="sound-spelling chinese" aria-label={formatCopy(copy.practice.onsetMeasured, { value: exercise.target })}>
      <span>{character}</span>
      <span className={`focus ${exercise.target.toLowerCase()}`}>{romanization.slice(0, 1)}</span>
      <span>{romanization.slice(1)}</span>
      <small>{copy.practice.onsetToneSeparate}</small>
    </div>
  )
}

function ScoreCard({ score, copy, onRetry, onNext }: { score: PronunciationScore; copy: UICopy; onRetry: () => void; onNext: () => void }) {
  const metricLabels: Array<[
    keyof Pick<PronunciationScore, 'recognition' | 'contrast' | 'acoustic' | 'delivery'>,
    string,
  ]> = [
    ['recognition', copy.score.word],
    ['contrast', copy.score.contrast],
    ['acoustic', copy.score.soundCues],
    ['delivery', copy.score.voice],
  ]
  const detected = score.detectedSound === 'uncertain' ? copy.score.uncertain : `/${score.detectedSound.toLowerCase()}/`
  return (
    <section className="score-card" aria-live="polite">
      <div className="score-summary">
        <div className="score-ring" style={{ '--score': `${score.overall * 3.6}deg` } as React.CSSProperties}><div><strong>{score.overall}</strong><span>/ 100</span></div></div>
        <div><span className={`confidence ${score.confidence}`}>{copy.score.confidence[score.confidence]}</span><h2>{score.overall >= 82 ? copy.score.landed : score.overall >= 60 ? copy.score.close : copy.score.slowly}</h2><p>{copy.score.detected}: <strong>{detected}</strong></p></div>
      </div>
      <div className="metrics">
        {metricLabels.map(([key, label]) => <div key={key}><span>{label}</span><i><b style={{ width: `${score[key]}%` }} /></i><strong>{score[key]}</strong></div>)}
        {score.tone !== null && <div><span>{copy.score.tone}</span><i><b style={{ width: `${score.tone}%` }} /></i><strong>{score.tone}</strong></div>}
      </div>
      <div className="feedback-list">{score.feedback.map((item, index) => <p key={`${item.code}-${index}`}><Check size={16} />{feedbackCopy(copy, item)}</p>)}</div>
      <details className="evidence-panel">
        <summary>{copy.score.evidence}</summary>
        <div className="evidence-grid">
          <div><span>{copy.score.lLike}</span><strong>{score.evidence.lEvidence}</strong></div>
          <div><span>{copy.score.nLike}</span><strong>{score.evidence.nEvidence}</strong></div>
          <div><span>{copy.score.signal}</span><strong>{score.evidence.signalQuality}%</strong></div>
          <div><span>{copy.score.nasalBand}</span><strong>{score.evidence.nasalEnergy}%</strong></div>
        </div>
        <p>{formatCopy(copy.score.evidenceDetail, { nasal: score.evidence.nasalPeakContrastDb, formant: score.evidence.formantSpacingHz || '—', tilt: score.evidence.spectralTiltDb })}</p>
      </details>
      <div className="score-actions"><button onClick={onRetry}><RotateCcw size={17} /> {copy.score.retry}</button><button className="primary" onClick={onNext}>{copy.score.next} <ChevronRight size={17} /></button></div>
    </section>
  )
}

export default App
