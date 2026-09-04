import { useEffect, useRef } from 'react'
import type { AcousticFeatures, TargetSound } from '../types'

interface SignalVisualizerProps {
  analyser: AnalyserNode | null
  features: AcousticFeatures | null
  recording: boolean
  target: TargetSound
}

export function SignalVisualizer({ analyser, features, recording, target }: SignalVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    let animationFrame = 0
    const timeData = analyser ? new Uint8Array(analyser.fftSize) : null
    const frequencyData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null

    const render = (time: number) => {
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
      } else if (features?.waveform.length) {
        waveform = features.waveform
        spectrum = features.spectrum
      } else {
        waveform = Array.from({ length: 96 }, (_, index) =>
          Math.sin(index * 0.38 + time / 520) * (0.08 + Math.sin(index * 0.12) * 0.025),
        )
        spectrum = Array.from({ length: 32 }, (_, index) => Math.max(0.03, 0.18 - index * 0.004))
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
  }, [analyser, features, recording, target])

  return (
    <section className="signal-studio" aria-label="Live waveform and onset spectrum">
      <div className="signal-heading">
        <div><span className={recording ? 'live-dot active' : 'live-dot'} />{recording ? 'Listening live' : features ? 'Last sound' : 'Sound lens'}</div>
        <span>onset · spectrum</span>
      </div>
      <canvas ref={canvasRef} />
      <p>The shaded opening is where L/N evidence is measured. Wave height shows signal, not correctness.</p>
    </section>
  )
}
