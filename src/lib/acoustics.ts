import type { AcousticFeatures } from '../types'

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

const emptyFeatures = (): AcousticFeatures => ({
  rms: 0,
  noiseFloor: 0,
  zeroCrossingRate: 0,
  lowBandRatio: 0,
  midBandRatio: 0,
  spectralCentroidHz: 0,
  spectralTiltDb: 0,
  pitchHz: 0,
  pitchContour: [],
  firstFormantHz: 0,
  secondFormantHz: 0,
  formantSpacingHz: 0,
  firstFormantBandwidthHz: 0,
  nasalPeakContrastDb: 0,
  voicedContinuity: 0,
  durationMs: 0,
  onsetMs: 0,
  onsetDurationMs: 0,
  signalQuality: 0,
  waveform: [],
  spectrum: [],
})

function goertzelPower(samples: Float32Array, sampleRate: number, frequency: number): number {
  const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / sampleRate)
  let previous = 0
  let previousTwo = 0

  for (const sample of samples) {
    const current = sample + coefficient * previous - previousTwo
    previousTwo = previous
    previous = current
  }

  return Math.max(0, previousTwo ** 2 + previous ** 2 - coefficient * previous * previousTwo)
}

function rms(samples: Float32Array): number {
  if (!samples.length) return 0
  return Math.sqrt(samples.reduce((sum, sample) => sum + sample ** 2, 0) / samples.length)
}

function percentile(values: number[], fraction: number): number {
  if (!values.length) return 0
  const ordered = [...values].sort((a, b) => a - b)
  return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * fraction))]
}

function estimatePitch(samples: Float32Array, sampleRate: number): number {
  const minimumLag = Math.floor(sampleRate / 350)
  const maximumLag = Math.min(Math.floor(sampleRate / 70), samples.length - 2)
  let bestLag = 0
  let bestCorrelation = 0

  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    let cross = 0
    let leftEnergy = 0
    let rightEnergy = 0
    for (let index = 0; index < samples.length - lag; index += 2) {
      const left = samples[index]
      const right = samples[index + lag]
      cross += left * right
      leftEnergy += left ** 2
      rightEnergy += right ** 2
    }
    const correlation = cross / Math.sqrt(Math.max(1e-12, leftEnergy * rightEnergy))
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestLag = lag
    }
  }

  return bestCorrelation >= 0.28 && bestLag ? sampleRate / bestLag : 0
}

function estimatePitchContour(samples: Float32Array, sampleRate: number): number[] {
  const windowSize = Math.max(1, Math.floor(sampleRate * 0.075))
  const stepSize = Math.max(1, Math.floor(sampleRate * 0.04))
  const contour: number[] = []
  for (let offset = 0; offset + windowSize <= samples.length; offset += stepSize) {
    const frame = samples.slice(offset, offset + windowSize)
    contour.push(rms(frame) >= 0.006 ? estimatePitch(frame, sampleRate) : 0)
  }
  return contour.slice(0, 36).map((value) => Number(value.toFixed(2)))
}

function downsampleWaveform(samples: Float32Array, points = 96): number[] {
  if (!samples.length) return []
  const bucketSize = Math.max(1, Math.floor(samples.length / points))
  return Array.from({ length: points }, (_, bucket) => {
    const start = bucket * bucketSize
    const end = Math.min(samples.length, start + bucketSize)
    let peak = 0
    let signed = 0
    for (let index = start; index < end; index += 1) {
      if (Math.abs(samples[index]) > Math.abs(peak)) peak = samples[index]
      signed += samples[index]
    }
    return Number((peak * 0.75 + (signed / Math.max(1, end - start)) * 0.25).toFixed(4))
  })
}

function strongestPeak(frequencies: number[], powers: number[], minimum: number, maximum: number): number {
  let bestFrequency = 0
  let bestPower = -1
  for (let index = 1; index < powers.length - 1; index += 1) {
    const frequency = frequencies[index]
    const smoothed = powers[index - 1] + powers[index] * 2 + powers[index + 1]
    if (frequency >= minimum && frequency <= maximum && smoothed > bestPower) {
      bestPower = smoothed
      bestFrequency = frequency
    }
  }
  return bestFrequency
}

function peakPower(frequencies: number[], powers: number[], minimum: number, maximum: number): number {
  return powers.reduce(
    (best, power, index) => frequencies[index] >= minimum && frequencies[index] <= maximum ? Math.max(best, power) : best,
    0,
  )
}

function estimatePeakBandwidth(frequencies: number[], powers: number[], peakFrequency: number): number {
  if (!peakFrequency) return 0
  const peakIndex = frequencies.reduce(
    (best, frequency, index) => Math.abs(frequency - peakFrequency) < Math.abs(frequencies[best] - peakFrequency) ? index : best,
    0,
  )
  const halfPower = powers[peakIndex] * 0.5
  let left = peakIndex
  let right = peakIndex
  while (left > 0 && powers[left] >= halfPower) left -= 1
  while (right < powers.length - 1 && powers[right] >= halfPower) right += 1
  return Math.max(0, frequencies[right] - frequencies[left])
}

export function extractAcousticFeatures(samples: Float32Array, sampleRate: number): AcousticFeatures {
  if (samples.length === 0 || sampleRate <= 0) return emptyFeatures()

  const frameSize = Math.max(1, Math.floor(sampleRate * 0.012))
  const frameRms: number[] = []
  for (let offset = 0; offset < samples.length; offset += frameSize) {
    frameRms.push(rms(samples.slice(offset, Math.min(samples.length, offset + frameSize))))
  }
  const peakFrame = Math.max(...frameRms, 0)
  const edgeFrames = Math.max(1, Math.floor(frameRms.length * 0.12))
  const noiseFloor = percentile([...frameRms.slice(0, edgeFrames), ...frameRms.slice(-edgeFrames)], 0.5)
  const threshold = Math.max(0.003, noiseFloor * 2.8, peakFrame * 0.14)
  let firstActiveFrame = frameRms.findIndex(
    (value, index) => value >= threshold && (frameRms[index + 1] ?? value) >= threshold,
  )
  if (firstActiveFrame < 0) firstActiveFrame = 0
  let lastActiveFrame = frameRms.length - 1
  for (let index = frameRms.length - 1; index >= firstActiveFrame; index -= 1) {
    if (frameRms[index] >= threshold) {
      lastActiveFrame = index
      break
    }
  }

  const activeStart = Math.min(samples.length - 1, firstActiveFrame * frameSize)
  const activeEnd = Math.max(activeStart + 1, Math.min(samples.length, (lastActiveFrame + 1) * frameSize))
  const maximumOnset = Math.floor(sampleRate * 0.24)
  const onsetEnd = Math.min(activeEnd, activeStart + maximumOnset)
  const window = samples.slice(activeStart, Math.max(activeStart + 1, onsetEnd))
  const mean = window.reduce((sum, sample) => sum + sample, 0) / window.length
  const centered = Float32Array.from(window, (sample, index) => {
    const hann = window.length > 1 ? 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (window.length - 1)) : 1
    return (sample - mean) * hann
  })

  let sumSquares = 0
  let crossings = 0
  for (let index = 0; index < centered.length; index += 1) {
    sumSquares += centered[index] ** 2
    if (index > 0 && Math.sign(centered[index]) !== Math.sign(centered[index - 1])) crossings += 1
  }

  const frequencies: number[] = []
  for (let frequency = 100; frequency <= Math.min(4000, sampleRate / 2 - 50); frequency += 50) {
    frequencies.push(frequency)
  }
  const powers = frequencies.map((frequency) => goertzelPower(centered, sampleRate, frequency))
  const totalPower = powers.reduce((sum, power) => sum + power, 0) || 1
  const bandPower = (minimum: number, maximum: number) =>
    powers.reduce(
      (sum, power, index) => sum + (frequencies[index] >= minimum && frequencies[index] <= maximum ? power : 0),
      0,
    )
  const centroid = powers.reduce((sum, power, index) => sum + power * frequencies[index], 0) / totalPower
  const activeFrames = frameRms.filter((value) => value >= peakFrame * 0.28).length
  const pitchHz = estimatePitch(centered, sampleRate)
  const fourthHarmonic = pitchHz ? Math.min(1800, pitchHz * 4) : 400
  const tiltLowPower = goertzelPower(centered, sampleRate, fourthHarmonic)
  const tiltHighPower = goertzelPower(centered, sampleRate, 2000)
  const spectralTiltDb = Math.max(-30, Math.min(30, 10 * Math.log10((tiltLowPower + 1e-12) / (tiltHighPower + 1e-12))))
  const firstFormantHz = strongestPeak(frequencies, powers, 250, 950)
  const secondFormantHz = strongestPeak(frequencies, powers, Math.max(900, firstFormantHz + 350), 2800)
  const formantSpacingHz = firstFormantHz && secondFormantHz ? secondFormantHz - firstFormantHz : 0
  const firstFormantBandwidthHz = estimatePeakBandwidth(frequencies, powers, firstFormantHz)
  const p0Power = peakPower(frequencies, powers, 180, 400)
  const a1Power = firstFormantHz ? peakPower(frequencies, powers, firstFormantHz - 80, firstFormantHz + 80) : 0
  const nasalPeakContrastDb = Math.max(-24, Math.min(24, 10 * Math.log10((a1Power + 1e-12) / (p0Power + 1e-12))))
  const maximumPower = Math.max(...powers, 1)
  const spectrum = Array.from({ length: 32 }, (_, bin) => {
    const start = Math.floor((bin / 32) * powers.length)
    const end = Math.max(start + 1, Math.floor(((bin + 1) / 32) * powers.length))
    const value = powers.slice(start, end).reduce((sum, power) => sum + power, 0) / (end - start)
    return Number(Math.sqrt(value / maximumPower).toFixed(4))
  })
  const snrDb = 20 * Math.log10((peakFrame + 1e-6) / (noiseFloor + 1e-6))
  const activeDurationMs = ((activeEnd - activeStart) / sampleRate) * 1000
  const clipped = samples.reduce((count, sample) => count + (Math.abs(sample) >= 0.985 ? 1 : 0), 0) / samples.length
  const signalQuality = clamp(
    clamp((snrDb - 6) / 24) * 0.52 +
      clamp((activeDurationMs - 180) / 520) * 0.3 +
      (1 - clamp(clipped / 0.015)) * 0.18,
  )

  return {
    rms: Math.sqrt(sumSquares / centered.length),
    noiseFloor,
    zeroCrossingRate: crossings / Math.max(1, centered.length - 1),
    lowBandRatio: clamp(bandPower(150, 450) / totalPower),
    midBandRatio: clamp(bandPower(800, 2500) / totalPower),
    spectralCentroidHz: Number.isFinite(centroid) ? centroid : 0,
    spectralTiltDb: Number.isFinite(spectralTiltDb) ? spectralTiltDb : 0,
    pitchHz,
    pitchContour: estimatePitchContour(samples.slice(activeStart, activeEnd), sampleRate),
    firstFormantHz,
    secondFormantHz,
    formantSpacingHz,
    firstFormantBandwidthHz,
    nasalPeakContrastDb: Number.isFinite(nasalPeakContrastDb) ? nasalPeakContrastDb : 0,
    voicedContinuity: clamp(activeFrames / Math.max(1, frameRms.length)),
    durationMs: activeDurationMs,
    onsetMs: (activeStart / sampleRate) * 1000,
    onsetDurationMs: ((onsetEnd - activeStart) / sampleRate) * 1000,
    signalQuality,
    waveform: downsampleWaveform(samples.slice(activeStart, activeEnd)),
    spectrum,
  }
}

export async function decodeAudioFeatures(blob: Blob): Promise<AcousticFeatures> {
  const context = new AudioContext()
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer())
    return extractAcousticFeatures(buffer.getChannelData(0), buffer.sampleRate)
  } finally {
    await context.close()
  }
}
