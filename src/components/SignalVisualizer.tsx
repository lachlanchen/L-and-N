import { useEffect, useRef } from 'react'
import type { LiveSignal } from '../lib/audio-capture'
import type { AcousticFeatures, TargetSound } from '../types'

interface SignalVisualizerProps {
  analyser: AnalyserNode | null
  liveSignal: LiveSignal | null
  features: AcousticFeatures | null
  recording: boolean
  target: TargetSound
  copy: {
    aria: string
    listeningLive: string
    lastSound: string
    soundLens: string
    onsetSpectrum: string
    note: string
  }
}

function spectrumFromWaveform(waveform: number[], rms: number): number[] {
  if (waveform.length < 8) return Array.from({ length: 32 }, () => 0)
  const bins = Math.min(32, Math.floor(waveform.length / 2))
  const magnitudes = Array.from({ length: bins }, (_, bin) => {
    let real = 0
    let imaginary = 0
    for (let index = 0; index < waveform.length; index += 1) {
      const angle = (2 * Math.PI * bin * index) / waveform.length
      real += waveform[index] * Math.cos(angle)
      imaginary -= waveform[index] * Math.sin(angle)
    }
    return Math.sqrt(real ** 2 + imaginary ** 2) / waveform.length
  })
  const peak = Math.max(...magnitudes, 0.0001)
  // Keep the spectral shape visible without amplifying room noise into a
  // convincing-looking full signal. Normal speech reaches full scale while
  // silence remains visually quiet.
  const level = Math.min(1, Math.max(0, rms) * 12)
  return Array.from({ length: 32 }, (_, index) => ((magnitudes[index] ?? 0) / peak) * level)
}

export function SignalVisualizer({ analyser, liveSignal, features, recording, target, copy }: SignalVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    let animationFrame = 0
    const timeData = analyser ? new Uint8Array(analyser.fftSize) : null
    const frequencyData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null
    const nativeSpectrum = liveSignal
      ? spectrumFromWaveform(liveSignal.waveform, liveSignal.rms)
      : null

    const render = () => {
      const bounds = canvas.getBoundingClientRect()
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(bounds.width * scale))
      const height = Math.max(1, Math.round(bounds.height * scale))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      context.clearRect(0, 0, width, height)
      const gradient = context.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, '#071c45')
      gradient.addColorStop(1, '#12395a')
      context.fillStyle = gradient
      context.fillRect(0, 0, width, height)

      context.strokeStyle = 'rgba(255,255,255,.08)'
      context.lineWidth = 1 * scale
      for (let column = 1; column < 6; column += 1) {
        const x = (column / 6) * width
        context.beginPath()
        context.moveTo(x, 0)
        context.lineTo(x, height)
        context.stroke()
      }

      if (recording) {
        context.fillStyle = target === 'N' ? 'rgba(19,169,155,.12)' : 'rgba(255,112,92,.13)'
        context.fillRect(width * 0.08, height * 0.08, width * 0.25, height * 0.84)
      }

      let waveform: number[]
      let spectrum: number[]
      if (analyser && timeData && frequencyData) {
        analyser.getByteTimeDomainData(timeData)
        analyser.getByteFrequencyData(frequencyData)
        waveform = Array.from(timeData, (value) => (value - 128) / 128)
        spectrum = Array.from({ length: 32 }, (_, index) => {
          const sourceIndex = Math.floor((index / 32) * Math.min(frequencyData!.length, 420))
          return frequencyData![sourceIndex] / 255
        })
      } else if (recording && liveSignal?.waveform.length) {
        waveform = liveSignal.waveform
        spectrum = nativeSpectrum ?? []
      } else if (features?.waveform.length) {
        waveform = features.waveform
        spectrum = features.spectrum
      } else {
        waveform = Array.from({ length: 96 }, () => 0)
        spectrum = Array.from({ length: 32 }, () => 0)
      }

      const barAreaHeight = height * 0.34
      const barWidth = width / Math.max(1, spectrum.length)
      spectrum.forEach((value, index) => {
        const barGradient = context.createLinearGradient(0, height, 0, height - barAreaHeight)
        barGradient.addColorStop(0, 'rgba(19,169,155,.7)')
        barGradient.addColorStop(1, 'rgba(255,112,92,.55)')
        context.fillStyle = barGradient
        const barHeight = Math.max(1.5 * scale, value * barAreaHeight)
        context.fillRect(index * barWidth + 1, height - barHeight, Math.max(1, barWidth - 2), barHeight)
      })

      context.beginPath()
      waveform.forEach((value, index) => {
        const x = (index / Math.max(1, waveform.length - 1)) * width
        const y = height * 0.42 + value * height * 0.27
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
      context.strokeStyle = target === 'N' ? '#55e1ce' : '#ff8b78'
      context.lineWidth = 2.2 * scale
      context.shadowColor = target === 'N' ? '#13a99b' : '#ff705c'
      context.shadowBlur = 7 * scale
      context.stroke()
      context.shadowBlur = 0

      animationFrame = window.requestAnimationFrame(render)
    }

    animationFrame = window.requestAnimationFrame(render)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [analyser, features, liveSignal, recording, target])

  return (
    <section className="signal-studio" aria-label={copy.aria}>
      <div className="signal-heading">
        <div><span className={recording ? 'live-dot active' : 'live-dot'} />{recording ? copy.listeningLive : features ? copy.lastSound : copy.soundLens}</div>
        <span>{copy.onsetSpectrum}</span>
      </div>
      <canvas ref={canvasRef} />
      <p>{copy.note}</p>
    </section>
  )
}
