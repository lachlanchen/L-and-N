#if canImport(AVFoundation)
import AVFoundation
import Foundation

/// A compact replay copy only. Recognition and scoring still consume the
/// untouched full-rate PCM. Encoding failure must never lose that recording.
enum ReplayAudio {
    static func encode(pcm16: Data, sampleRate: Double) throws -> Data {
        let count = pcm16.count / MemoryLayout<Int16>.size
        guard count > 0, count <= 384_000 * 8, sampleRate.isFinite,
              (8_000...192_000).contains(sampleRate),
              let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1),
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(count)),
              let channel = buffer.floatChannelData?[0] else {
            throw CocoaError(.fileReadCorruptFile)
        }
        buffer.frameLength = AVAudioFrameCount(count)
        pcm16.withUnsafeBytes { (bytes: UnsafeRawBufferPointer) in
            for index in 0..<count {
                let value = UInt16(bytes[index * 2]) | UInt16(bytes[index * 2 + 1]) << 8
                channel[index] = Float(Int16(bitPattern: value)) / 32768
            }
        }
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("landn-replay-\(UUID().uuidString).m4a")
        defer { try? FileManager.default.removeItem(at: url) }
        // The file must close/finalize before reading its MPEG-4 container.
        try autoreleasepool {
            let file = try AVAudioFile(forWriting: url, settings: [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: sampleRate,
                AVNumberOfChannelsKey: 1,
                AVEncoderBitRateKey: sampleRate <= 12_000 ? 16_000 : sampleRate <= 24_000 ? 32_000 : 64_000
            ], commonFormat: .pcmFormatFloat32, interleaved: false)
            try file.write(from: buffer)
        }
        let result = try Data(contentsOf: url)
        guard !result.isEmpty else { throw CocoaError(.fileReadCorruptFile) }
        return result
    }
}
#endif
