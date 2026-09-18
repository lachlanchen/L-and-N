/**
 * On-device L/N onset classifier.
 *
 * A small 1-D convolutional network scores the first 300 ms of a word from a
 * mean-normalised log-mel spectrogram. It was trained on thousands of real
 * spoken words that begin with /l/ or /n/, cut from lecture recordings with
 * Whisper word timestamps (see `tools/onset-model/`). Inference is plain
 * TypeScript, runs in well under 10 ms on a phone, and needs no network.
 *
 * Every constant below mirrors `tools/onset-model/features.py`.
 */
import weights from './onset-model.json'

export const SAMPLE_RATE = 16_000
export const WINDOW_SAMPLES = 4_800
export const LEAD_SAMPLES = 640
const FRAME_SIZE = 400
const HOP_SIZE = 160
const FFT_SIZE = 512
const MEL_BANDS = 40
const MEL_MAX_HZ = 8_000
const LOG_FLOOR = 1e-5
export const N_FRAMES = Math.floor((WINDOW_SAMPLES - FRAME_SIZE) / HOP_SIZE) + 1

interface ConvLayer {
  /** [out][in][kernel] */
  weight: number[][][]
  bias: number[]
}

interface DenseLayer {
  /** [out][in] */
  weight: number[][]
  bias: number[]
}

export interface OnsetModelWeights {
  version: string
  conv1: ConvLayer
  conv2: ConvLayer
  fc1: DenseLayer
  fc2: DenseLayer
}

const hzToMel = (hz: number) => 2595 * Math.log10(1 + hz / 700)
const melToHz = (mel: number) => 700 * (10 ** (mel / 2595) - 1)

let filterbank: Float64Array[] | null = null

function melFilterbank(): Float64Array[] {
  if (filterbank) return filterbank
  const bins = FFT_SIZE / 2 + 1
  const topMel = hzToMel(MEL_MAX_HZ)
  const points = Array.from({ length: MEL_BANDS + 2 }, (_, index) => melToHz((topMel * index) / (MEL_BANDS + 1)))
  filterbank = Array.from({ length: MEL_BANDS }, (_, band) => {
    const [lower, centre, upper] = [points[band], points[band + 1], points[band + 2]]
    const filter = new Float64Array(bins)
    for (let bin = 0; bin < bins; bin += 1) {
      const hz = (bin * SAMPLE_RATE) / FFT_SIZE
      const rising = (hz - lower) / Math.max(centre - lower, 1e-9)
      const falling = (upper - hz) / Math.max(upper - centre, 1e-9)
      filter[bin] = Math.max(0, Math.min(rising, falling))
    }
    return filter
  })
  return filterbank
}

const hann = Float64Array.from({ length: FRAME_SIZE }, (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / FRAME_SIZE))

/** In-place iterative radix-2 FFT on interleaved real/imaginary arrays. */
function fft(real: Float64Array, imag: Float64Array): void {
  const n = real.length
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[real[i], real[j]] = [real[j], real[i]]
      ;[imag[i], imag[j]] = [imag[j], imag[i]]
    }
  }
  for (let length = 2; length <= n; length <<= 1) {
    const angle = (-2 * Math.PI) / length
    const wReal = Math.cos(angle)
    const wImag = Math.sin(angle)
    for (let start = 0; start < n; start += length) {
      let curReal = 1
      let curImag = 0
      for (let k = 0; k < length / 2; k += 1) {
        const a = start + k
        const b = a + length / 2
        const tReal = real[b] * curReal - imag[b] * curImag
        const tImag = real[b] * curImag + imag[b] * curReal
        real[b] = real[a] - tReal
        imag[b] = imag[a] - tImag
        real[a] += tReal
        imag[a] += tImag
        const nextReal = curReal * wReal - curImag * wImag
        curImag = curReal * wImag + curImag * wReal
        curReal = nextReal
      }
    }
  }
}

/**
 * Mean-normalised log-mel matrix, `N_FRAMES` rows of `MEL_BANDS` values, for
 * a 300 ms window at 16 kHz. Shorter input is zero-padded.
 */
export function logMelFeatures(samples: ArrayLike<number>): Float32Array[] {
  const bank = melFilterbank()
  const bins = FFT_SIZE / 2 + 1
  const audio = new Float64Array(WINDOW_SAMPLES)
  for (let index = 0; index < Math.min(WINDOW_SAMPLES, samples.length); index += 1) audio[index] = samples[index]
  const frames: Float32Array[] = []
  const real = new Float64Array(FFT_SIZE)
  const imag = new Float64Array(FFT_SIZE)
  const power = new Float64Array(bins)
  for (let start = 0; start + FRAME_SIZE <= WINDOW_SAMPLES; start += HOP_SIZE) {
    real.fill(0)
    imag.fill(0)
    for (let index = 0; index < FRAME_SIZE; index += 1) real[index] = audio[start + index] * hann[index]
    fft(real, imag)
    for (let bin = 0; bin < bins; bin += 1) power[bin] = real[bin] ** 2 + imag[bin] ** 2
    const frame = new Float32Array(MEL_BANDS)
    for (let band = 0; band < MEL_BANDS; band += 1) {
      let energy = 0
      const filter = bank[band]
      for (let bin = 0; bin < bins; bin += 1) energy += power[bin] * filter[bin]
      frame[band] = Math.log(energy + LOG_FLOOR)
    }
    frames.push(frame)
  }
  for (let band = 0; band < MEL_BANDS; band += 1) {
    let mean = 0
    for (const frame of frames) mean += frame[band]
    mean /= frames.length
    for (const frame of frames) frame[band] -= mean
  }
  return frames
}

function conv1d(input: Float32Array[], layer: ConvLayer): Float32Array[] {
  const frames = input.length
  const inChannels = input[0].length
  const outChannels = layer.weight.length
  const kernel = layer.weight[0][0].length
  const pad = Math.floor(kernel / 2)
  return Array.from({ length: frames }, (_, t) => {
    const out = new Float32Array(outChannels)
    for (let o = 0; o < outChannels; o += 1) {
      let sum = layer.bias[o]
      const weight = layer.weight[o]
      for (let k = 0; k < kernel; k += 1) {
        const source = t + k - pad
        if (source < 0 || source >= frames) continue
        const frame = input[source]
        for (let c = 0; c < inChannels; c += 1) sum += weight[c][k] * frame[c]
      }
      out[o] = Math.max(0, sum)
    }
    return out
  })
}

function dense(input: Float32Array, layer: DenseLayer, relu: boolean): Float32Array {
  const out = new Float32Array(layer.weight.length)
  for (let o = 0; o < out.length; o += 1) {
    let sum = layer.bias[o]
    const weight = layer.weight[o]
    for (let i = 0; i < input.length; i += 1) sum += weight[i] * input[i]
    out[o] = relu ? Math.max(0, sum) : sum
  }
  return out
}

/** Probability, in 0..1, that the analysed onset is nasal (/n/) rather than lateral (/l/). */
export function nasalProbability(features: Float32Array[], model: OnsetModelWeights = weights as OnsetModelWeights): number {
  const hidden = conv1d(conv1d(features, model.conv1), model.conv2)
  const channels = hidden[0].length
  const pooled = new Float32Array(channels * 2)
  for (let c = 0; c < channels; c += 1) {
    let mean = 0
    let max = -Infinity
    for (const frame of hidden) {
      mean += frame[c]
      if (frame[c] > max) max = frame[c]
    }
    pooled[c] = mean / hidden.length
    pooled[channels + c] = max
  }
  const logit = dense(dense(pooled, model.fc1, true), model.fc2, false)[0]
  return 1 / (1 + Math.exp(-logit))
}

/** Linear resampling to the model's 16 kHz rate. */
export function resampleTo16k(samples: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === SAMPLE_RATE) return samples
  const ratio = sampleRate / SAMPLE_RATE
  const length = Math.floor(samples.length / ratio)
  const out = new Float32Array(length)
  for (let index = 0; index < length; index += 1) {
    const position = index * ratio
    const left = Math.floor(position)
    const right = Math.min(samples.length - 1, left + 1)
    const mix = position - left
    out[index] = samples[left] * (1 - mix) + samples[right] * mix
  }
  return out
}

/**
 * Score a recording whose word onset starts at `onsetSample` (in the given
 * sample rate). Returns the nasal probability, or null when there is not
 * enough audio after the onset to fill half of the analysis window.
 */
export function scoreOnset(samples: Float32Array, sampleRate: number, onsetSample: number): number | null {
  const audio = resampleTo16k(samples, sampleRate)
  const onset = Math.round((onsetSample * SAMPLE_RATE) / sampleRate)
  const start = onset - LEAD_SAMPLES
  if (audio.length - onset < WINDOW_SAMPLES / 2) return null
  const window = new Float32Array(WINDOW_SAMPLES)
  for (let index = 0; index < WINDOW_SAMPLES; index += 1) {
    const source = start + index
    window[index] = source >= 0 && source < audio.length ? audio[source] : 0
  }
  return nasalProbability(logMelFeatures(window))
}
