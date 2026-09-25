import Foundation

/// One real audio-engine buffer, encoded for the shared pronunciation analyser.
/// Also compiled directly into the Apple app so tests exercise the shipping code.
struct PCMFrame {
    let pcm16: Data
    let rms: Double
    let waveform: [Double]

    init(samples: UnsafeBufferPointer<Float>, includeWaveform: Bool = true) {
        guard !samples.isEmpty else {
            pcm16 = Data()
            rms = 0
            waveform = []
            return
        }
        var encoded = [Int16](repeating: 0, count: samples.count)
        var sumSquares = 0.0
        var points: [Double] = []
        let stride = max(1, samples.count / 96)
        if includeWaveform { points.reserveCapacity(min(96, samples.count)) }
        for index in samples.indices {
            let raw = Double(samples[index])
            let sample = raw.isFinite ? max(-1, min(1, raw)) : 0
            sumSquares += sample * sample
            encoded[index] = Int16((sample * Double(Int16.max)).rounded()).littleEndian
            if includeWaveform && index % stride == 0 && points.count < 96 {
                points.append(sample)
            }
        }
        pcm16 = encoded.withUnsafeBytes { Data($0) }
        rms = sqrt(sumSquares / Double(samples.count))
        waveform = points
    }
}
