import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
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
import { exercises, languageLabels, lessonPrinciples } from './data/curriculum'
import { decodeAudioFeatures } from './lib/acoustics'
import { loadAttempts, saveAttempt, trainingStreak, type AttemptRecord } from './lib/progress'
import { buildAcousticCalibration, scorePronunciation } from './lib/scoring'
import { beginSpeechRecognition, speakExample, transcribeWithWhisper, type SpeechSession } from './lib/speech'
import type { AcousticFeatures, Exercise, PronunciationScore, TrainingLanguage } from './types'

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

const metricLabels: Array<[
  keyof Pick<PronunciationScore, 'recognition' | 'contrast' | 'acoustic' | 'delivery'>,
  string,
]> = [
  ['recognition', 'Word'],
  ['contrast', 'L/N contrast'],
  ['acoustic', 'Sound cues'],
  ['delivery', 'Voice'],
]

function App() {
  const [tab, setTab] = useState<Tab>('practice')
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
      setError(caught instanceof Error ? caught.message : 'The recording could not be scored.')
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
      pendingStream?.getTracks().forEach((track) => track.stop())
      if (pendingAudioContext) void pendingAudioContext.close()
      setError(caught instanceof Error ? caught.message : 'Microphone permission is required to practise.')
    }
  }

  const toggleRecording = () => {
    if (recording) void finishRecording()
    else void startRecording()
  }

  const renderPractice = () => (
    <main className="practice-page">
      <section className="hero-copy">
        <div className="eyebrow"><Sparkles size={14} /> Today · 4 minute drill</div>
        <h1>Make the air path<br /><span>easy to feel.</span></h1>
        <p>Listen once. Say one word. Get a cue-specific score.</p>
      </section>

      <div className="language-switcher" aria-label="Training language">
        {(Object.entries(languageLabels) as Array<[TrainingLanguage, string]>).map(([code, label]) => (
          <button key={code} className={language === code ? 'active' : ''} onClick={() => selectLanguage(code)}>{label}</button>
        ))}
      </div>

      <section className="drill-card">
        <div className="drill-topline">
          <button className="icon-button" aria-label="Previous word" onClick={() => moveExercise(-1)}><ChevronLeft /></button>
          <div className="sound-toggle" aria-label={`Target sound ${exercise.target}`}>
            <span className={exercise.target === 'L' ? 'l active' : 'l'}>L</span>
            <span className={exercise.target === 'N' ? 'n active' : 'n'}>N</span>
          </div>
          <button className="icon-button" aria-label="Next word" onClick={() => moveExercise(1)}><ChevronRight /></button>
        </div>

        <div className="word-area">
          <span className="target-label">TARGET /{exercise.target.toLowerCase()}/</span>
          <h2>{exercise.word}</h2>
          <p className="ipa">{exercise.ipa} <span>· {exercise.translation}</span></p>
          <SoundSpelling exercise={exercise} />
          <button className="listen-button" title="Verified offline studio example" onClick={() => void speakExample(exercise)}>
            <Volume2 size={19} /> Hear studio model
          </button>
        </div>

        <div className="contrast-row">
          <div><span>Say</span><strong>{exercise.word}</strong></div>
          <ArrowRight size={18} />
          <div className="avoid"><span>Not</span><strong>{exercise.pair}</strong></div>
        </div>

        <div className="cue"><Target size={18} /><p>{exercise.cue}</p></div>

        <SignalVisualizer analyser={analyser} features={lastFeatures} recording={recording} target={exercise.target} />

        <button
          className={`record-button ${recording ? 'recording' : ''}`}
          onClick={toggleRecording}
          disabled={processing}
          aria-label={recording ? 'Stop and score recording' : 'Start recording'}
        >
          <span className="record-orbit"><Mic size={30} /></span>
          <span>{processing ? 'Analysing…' : recording ? 'Tap to score' : 'Tap, then say it'}</span>
          {recording && <span className="recording-time">Listening</span>}
        </button>

        {error && <p className="error-message">{error}</p>}
      </section>

      {score && <ScoreCard score={score} onRetry={() => setScore(null)} onNext={() => moveExercise(1)} />}

      <section className="science-note">
        <Waves size={22} />
        <div><strong>How this score works</strong><p>Word recognition + minimal-pair contrast + nasal/lateral acoustic cues + delivery stability. Online Whisper is a transient word-level cross-check; recordings are not kept.</p></div>
      </section>
    </main>
  )

  const renderLearn = () => (
    <main className="learn-page">
      <div className="section-heading"><span className="eyebrow"><BookOpen size={14} /> The 60-second science</span><h1>Same place.<br />Different pathway.</h1></div>
      <Suspense fallback={<div className="model-loading">Preparing the mouth model…</div>}><MouthModel3D /></Suspense>
      <section className="principles">
        {lessonPrinciples.map((principle, index) => (
          <article key={principle.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{principle.title}</h2><p>{principle.body}</p></div></article>
        ))}
      </section>
      <section className="source-card">
        <Headphones size={22} />
        <div><strong>Lesson source</strong><p>Built from the linked Pronunciation Snippets lesson, then extended with Mandarin and Cantonese minimal-pair practice.</p><a href="https://www.youtube.com/watch?v=78RQW1Kq_3A" target="_blank" rel="noreferrer">Watch “The Difference Between L &amp; N”</a></div>
      </section>
    </main>
  )

  const renderProgress = () => (
    <main className="progress-page">
      <div className="section-heading"><span className="eyebrow"><Activity size={14} /> Private on this device</span><h1>Your sound map.</h1><p>Short, frequent practice beats one long session.</p></div>
      <section className="stats-grid">
        <article><Flame /><strong>{streak}</strong><span>day streak</span></article>
        <article><Target /><strong>{average || '—'}</strong><span>average score</span></article>
        <article><Check /><strong>{attempts.length}</strong><span>attempts</span></article>
      </section>
      <section className="history-card">
        <h2>Recent attempts</h2>
        {attempts.length === 0 ? (
          <div className="empty-state"><Mic /><p>Your first recording will appear here.</p><button onClick={() => setTab('practice')}>Start a drill</button></div>
        ) : attempts.slice(0, 12).map((attempt) => {
          const item = exercises.find(({ id }) => id === attempt.exerciseId)
          return <article key={`${attempt.exerciseId}-${attempt.createdAt}`}><div><strong>{item?.word ?? attempt.exerciseId}</strong><span>target /{item?.target.toLowerCase()}/ · detected {attempt.detectedSound}</span></div><b>{attempt.score}</b></article>
        })}
      </section>
      <p className="clinical-note">Scores are coaching feedback, not diagnosis. They combine on-device recognition and acoustic cues, and should be validated with a speech-language professional for clinical use.</p>
    </main>
  )

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" onClick={() => setTab('practice')}><img src="/icons/icon-192.png" alt="" /><span>L–and–N</span></button>
        <div className="streak"><Flame size={16} /> {streak}</div>
      </header>
      {tab === 'practice' && renderPractice()}
      {tab === 'learn' && renderLearn()}
      {tab === 'progress' && renderProgress()}
      <nav className="bottom-nav" aria-label="Primary navigation">
        <button className={tab === 'practice' ? 'active' : ''} onClick={() => setTab('practice')}><Mic /><span>Practice</span></button>
        <button className={tab === 'learn' ? 'active' : ''} onClick={() => setTab('learn')}><BookOpen /><span>Learn</span></button>
        <button className={tab === 'progress' ? 'active' : ''} onClick={() => setTab('progress')}><Activity /><span>Progress</span></button>
      </nav>
    </div>
  )
}

function SoundSpelling({ exercise }: { exercise: Exercise }) {
  if (exercise.language === 'en-US') {
    return (
      <div className="sound-spelling" aria-label={`The first letter ${exercise.target} is the measured sound`}>
        <span className={`focus ${exercise.target.toLowerCase()}`}>{exercise.word.slice(0, 1)}</span>
        <span>{exercise.word.slice(1)}</span>
        <small>measured onset</small>
      </div>
    )
  }

  const [character, romanization = ''] = exercise.word.split(' ')
  return (
    <div className="sound-spelling chinese" aria-label={`The ${exercise.target} onset in the romanization is measured`}>
      <span>{character}</span>
      <span className={`focus ${exercise.target.toLowerCase()}`}>{romanization.slice(0, 1)}</span>
      <span>{romanization.slice(1)}</span>
      <small>onset · tone separate</small>
    </div>
  )
}

function ScoreCard({ score, onRetry, onNext }: { score: PronunciationScore; onRetry: () => void; onNext: () => void }) {
  return (
    <section className="score-card" aria-live="polite">
      <div className="score-summary">
        <div className="score-ring" style={{ '--score': `${score.overall * 3.6}deg` } as React.CSSProperties}><div><strong>{score.overall}</strong><span>/ 100</span></div></div>
        <div><span className={`confidence ${score.confidence}`}>{score.confidence} confidence</span><h2>{score.overall >= 82 ? 'That contrast landed.' : score.overall >= 60 ? 'Close—shape the first sound.' : 'Build the sound slowly.'}</h2><p>Detected: <strong>/{score.detectedSound.toLowerCase()}/</strong></p></div>
      </div>
      <div className="metrics">
        {metricLabels.map(([key, label]) => <div key={key}><span>{label}</span><i><b style={{ width: `${score[key]}%` }} /></i><strong>{score[key]}</strong></div>)}
        {score.tone !== null && <div><span>Tone</span><i><b style={{ width: `${score.tone}%` }} /></i><strong>{score.tone}</strong></div>}
      </div>
      <div className="feedback-list">{score.feedback.map((item) => <p key={item}><Check size={16} />{item}</p>)}</div>
      <details className="evidence-panel">
        <summary>See the sound evidence</summary>
        <div className="evidence-grid">
          <div><span>L-like</span><strong>{score.evidence.lEvidence}</strong></div>
          <div><span>N-like</span><strong>{score.evidence.nEvidence}</strong></div>
          <div><span>Signal</span><strong>{score.evidence.signalQuality}%</strong></div>
          <div><span>Nasal band</span><strong>{score.evidence.nasalEnergy}%</strong></div>
        </div>
        <p>A1–P0 proxy {score.evidence.nasalPeakContrastDb} dB · formant spacing ≈ {score.evidence.formantSpacingHz || '—'} Hz · tilt {score.evidence.spectralTiltDb} dB. These are microphone estimates, not a view of tongue motion.</p>
      </details>
      <div className="score-actions"><button onClick={onRetry}><RotateCcw size={17} /> Try again</button><button className="primary" onClick={onNext}>Next word <ChevronRight size={17} /></button></div>
    </section>
  )
}

export default App
