import { describe, expect, it } from 'vitest'
import { EndOfWordDetector } from './end-of-word'

function run(levels: Array<[number, number]>, options?: ConstructorParameters<typeof EndOfWordDetector>[0]): number | null {
  const detector = new EndOfWordDetector(options)
  let time = 0
  for (const [rms, durationMs] of levels) {
    for (let step = 0; step < durationMs; step += 50) {
      if (detector.feed(rms, time)) return time
      time += 50
    }
  }
  return null
}

describe('end-of-word detector', () => {
  it('stops after a word followed by trailing silence', () => {
    const stoppedAt = run([
      [0.002, 300], // background
      [0.08, 400], // the word
      [0.002, 1500], // silence
    ])
    expect(stoppedAt).not.toBeNull()
    expect(stoppedAt!).toBeGreaterThanOrEqual(900)
    expect(stoppedAt!).toBeLessThanOrEqual(1400)
  })

  it('never stops before the minimum duration or without speech', () => {
    expect(run([[0.001, 5000]])).toBeNull()
    expect(run([[0.08, 200], [0.001, 300]], { minimumDurationMs: 900 })).toBeNull()
  })

  it('ignores a short pause inside a word and short clicks', () => {
    const stoppedAt = run([
      [0.002, 300],
      [0.08, 250],
      [0.003, 300], // hesitation shorter than the trailing silence
      [0.08, 300],
      [0.002, 1500],
    ])
    expect(stoppedAt!).toBeGreaterThanOrEqual(300 + 250 + 300 + 300 + 600)
    expect(run([[0.002, 300], [0.3, 50], [0.002, 3000]])).toBeNull()
  })

  it('scales the speech threshold with a noisy background', () => {
    const noisy = run([
      [0.02, 300], // loud background, above the absolute floor
      [0.03, 400], // barely louder than the background: not speech
      [0.02, 2000],
    ])
    expect(noisy).toBeNull()
  })
})
