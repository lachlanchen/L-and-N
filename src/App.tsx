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
import { decodeAudioFeatures } from './lib/acoustics'
import { loadAttempts, saveAttempt, trainingStreak, type AttemptRecord } from './lib/progress'
import { buildAcousticCalibration, scorePronunciation } from './lib/scoring'
import { beginSpeechRecognition, speakExample, transcribeWithWhisper, type SpeechSession } from './lib/speech'
import type { AcousticFeatures, Exercise, PronunciationScore, TargetSound, TrainingLanguage, UILanguage } from './types'

type Tab = 'practice' | 'learn' | 'progress'

const MouthModel3D = lazy(() =>
  import('./components/MouthModel3D').then((module) => ({ default: module.MouthModel3D })),
)

interface RecordingSession {
  recorder: MediaRecorder
  stream: MediaStream
  speech: SpeechSession
  chunks: Blob[]
  audioContext: AudioContext
  analyser: AnalyserNode
}

const emptyFeatures: AcousticFeatures = {
  rms: 0.04,
  noiseFloor: 0.003,
  zeroCrossingRate: 0.08,
  lowBandRatio: 0.22,
  midBandRatio: 0.35,
  spectralCentroidHz: 1100,
  spectralTiltDb: 4,
  pitchHz: 150,
  pitchContour: [],
  firstFormantHz: 500,
  secondFormantHz: 1450,
  formantSpacingHz: 950,
  firstFormantBandwidthHz: 220,
  nasalPeakContrastDb: 4,
  voicedContinuity: 0.58,
  durationMs: 800,
  onsetMs: 0,
  onsetDurationMs: 220,
  signalQuality: 0.25,
  waveform: [],
  spectrum: [],
}

function App() {
  const [tab, setTab] = useState<Tab>('practice')
  const [uiLanguage, setUILanguage] = useState<UILanguage>(initialUILanguage)
  const [language, setLanguage] = useState<TrainingLanguage>('en-US')
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [score, setScore] = useState<PronunciationScore | null>(null)
  const [lastFeatures, setLastFeatures] = useState<AcousticFeatures | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState<AttemptRecord[]>([])
  const sessionRef = useRef<RecordingSession | null>(null)
  const stopTimerRef = useRef<number | null>(null)
  const copy = uiCopy(uiLanguage)

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

  useEffect(
    () => () => {
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current)
      sessionRef.current?.stream.getTracks().forEach((track) => track.stop())
      void sessionRef.current?.audioContext.close()
    },
    [],
  )

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
    if (!session || processing) return
    setRecording(false)
    setProcessing(true)
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current)

    const blobPromise = new Promise<Blob>((resolve) => {
      session.recorder.addEventListener(
        'stop',
        () => resolve(new Blob(session.chunks, { type: session.recorder.mimeType || 'audio/webm' })),
        { once: true },
      )
    })

    if (session.recorder.state !== 'inactive') session.recorder.stop()
    session.stream.getTracks().forEach((track) => track.stop())
    void session.speech.stop().catch(() => undefined)

    try {
      const blob = await Promise.race([
        blobPromise,
        new Promise<Blob>((resolve) =>
          window.setTimeout(() => resolve(new Blob(session.chunks, { type: session.recorder.mimeType || 'audio/webm' })), 1200),
        ),
      ])
      const [features, nativeTranscript, whisperTranscript] = await Promise.all([
        decodeAudioFeatures(blob).catch(() => emptyFeatures),
        Promise.race([
          session.speech.result.catch(() => ''),
          new Promise<string>((resolve) => window.setTimeout(() => resolve(''), 1800)),
        ]),
        transcribeWithWhisper(blob, language),
      ])
      const transcript = nativeTranscript || whisperTranscript
      setLastFeatures(features)
      const result = scorePronunciation(exercise, transcript, features, calibration)
      setScore(result)
      const next = await saveAttempt({
        exerciseId: exercise.id,
        score: result.overall,
        detectedSound: result.detectedSound,
        createdAt: new Date().toISOString(),
        target: exercise.target,
        language: exercise.language,
        features,
      })
      setAttempts(next)
    } catch (caught) {
      console.warn('Pronunciation scoring failed', caught)
      setError(copy.errors.scoring)
    } finally {
      sessionRef.current = null
      setAnalyser(null)
      void session.audioContext.close()
      setProcessing(false)
    }
  }

  const startRecording = async () => {
    setError('')
    setScore(null)
    let pendingStream: MediaStream | null = null
    let pendingAudioContext: AudioContext | null = null
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      pendingStream = stream
      const speech = await beginSpeechRecognition(language)
      const audioContext = new AudioContext()
      pendingAudioContext = audioContext
      const analyserNode = audioContext.createAnalyser()
      analyserNode.fftSize = 2048
      analyserNode.smoothingTimeConstant = 0.72
      audioContext.createMediaStreamSource(stream).connect(analyserNode)
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''
      const recorder = new MediaRecorder(stream, preferredMime ? { mimeType: preferredMime } : undefined)
      const session: RecordingSession = { recorder, stream, speech, chunks: [], audioContext, analyser: analyserNode }
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size) session.chunks.push(event.data)
      })
      recorder.start(100)
      sessionRef.current = session
      pendingStream = null
      pendingAudioContext = null
      setAnalyser(analyserNode)
      setRecording(true)
      stopTimerRef.current = window.setTimeout(() => void finishRecording(), 5000)
    } catch (caught) {
      console.warn('Microphone start failed', caught)
      pendingStream?.getTracks().forEach((track) => track.stop())
      if (pendingAudioContext) void pendingAudioContext.close()
      setError(copy.errors.microphone)
    }
  }

  const toggleRecording = () => {
    if (recording) void finishRecording()
    else void startRecording()
  }

  const renderPractice = () => (
    <main className="practice-page">
      <div className="language-switcher" data-testid="practice-language-switcher" aria-label={copy.trainingLanguage}>
        {(Object.entries(languageLabels) as Array<[TrainingLanguage, string]>).map(([code, label]) => (
          <button key={code} data-testid={`practice-language-${code}`} aria-pressed={language === code} className={language === code ? 'active' : ''} onClick={() => selectLanguage(code)}>{label}</button>
        ))}
      </div>

      <div className="practice-kicker">
        <span className="eyebrow"><Sparkles size={14} /> {copy.practice.session}</span>
        <small>{copy.practice.sessionHint}</small>
      </div>

      <section className="drill-card">
        <div className="drill-topline">
          <button className="icon-button" aria-label={copy.practice.previousWord} onClick={() => moveExercise(-1)}><ChevronLeft /></button>
          <div className="sound-toggle" role="group" aria-label={copy.practice.soundPicker}>
            {(['L', 'N'] as const).map((sound) => (
              <button
                key={sound}
                data-testid={`practice-sound-${sound.toLowerCase()}`}
                type="button"
                aria-pressed={exercise.target === sound}
                className={`${sound.toLowerCase()} ${exercise.target === sound ? 'active' : ''}`}
                onClick={() => selectTargetSound(sound)}
              >{sound}</button>
            ))}
          </div>
          <button className="icon-button" aria-label={copy.practice.nextWord} onClick={() => moveExercise(1)}><ChevronRight /></button>
        </div>

        <div className="word-area">
          <span className="target-label">{copy.practice.target} /{exercise.target.toLowerCase()}/</span>
          <h2>{exercise.word}</h2>
          <p className="ipa">{exercise.ipa} <span>· {exercise.translation}</span></p>
          <SoundSpelling exercise={exercise} copy={copy} />
          <button className="listen-button" title={copy.practice.studioTitle} onClick={() => void speakExample(exercise)}>
            <Volume2 size={19} /> {copy.practice.hearModel}
          </button>
        </div>

        <div className="contrast-row">
          <div><span>{copy.practice.say}</span><strong>{exercise.word}</strong></div>
          <ArrowRight size={18} />
          <div className="avoid"><span>{copy.practice.not}</span><strong>{exercise.pair}</strong></div>
        </div>

        <div className="cue"><Target size={18} /><p>{exercise.cue}</p></div>

        <SignalVisualizer analyser={analyser} features={lastFeatures} recording={recording} target={exercise.target} copy={copy.signal} />

        <button
          className={`record-button ${recording ? 'recording' : ''}`}
          onClick={toggleRecording}
          disabled={processing}
          aria-label={recording ? copy.practice.stopAndScore : copy.practice.startRecording}
        >
          <span className="record-orbit"><Mic size={30} /></span>
          <span>{processing ? copy.practice.analysing : recording ? copy.practice.tapToScore : copy.practice.tapThenSay}</span>
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
        <button className={tab === 'practice' ? 'active' : ''} onClick={() => setTab('practice')}><Mic /><span>{copy.nav.practice}</span></button>
        <button className={tab === 'learn' ? 'active' : ''} onClick={() => setTab('learn')}><BookOpen /><span>{copy.nav.learn}</span></button>
        <button className={tab === 'progress' ? 'active' : ''} onClick={() => setTab('progress')}><Activity /><span>{copy.nav.progress}</span></button>
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
