#if canImport(AVFoundation)
import AVFoundation
import XCTest
@testable import LAndNAudio

final class ReplayAudioTests: XCTestCase {
    func testCompactReplayPreservesDurationAndAudibleSignal() throws {
        for rate in [16_000.0, 44_100.0, 48_000.0] {
            let samples = (0..<Int(rate * 3)).map { Float(sin(Double($0) * 220 * 2 * .pi / rate) * 0.3) }
            let pcm = samples.withUnsafeBufferPointer { PCMFrame(samples: $0, includeWaveform: false).pcm16 }
            let original = pcm
            let encoded = try ReplayAudio.encode(pcm16: pcm, sampleRate: rate)
            XCTAssertEqual(pcm, original)
            XCTAssertLessThan(encoded.count, pcm.count / 2)
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("landn-replay-test-\(UUID().uuidString).m4a")
            defer { try? FileManager.default.removeItem(at: url) }
            try encoded.write(to: url)
            let file = try AVAudioFile(forReading: url)
            XCTAssertEqual(Double(file.length) / file.processingFormat.sampleRate, 3, accuracy: 0.1)
            let buffer = try XCTUnwrap(AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length)))
            try file.read(into: buffer)
            let channel = try XCTUnwrap(buffer.floatChannelData?[0])
            let peak = (0..<Int(buffer.frameLength)).map { abs(channel[$0]) }.max() ?? 0
            XCTAssertGreaterThan(peak, 0.2)
            XCTAssertLessThan(peak, 0.5)
        }
    }

    func testRejectsInvalidInput() {
        XCTAssertThrowsError(try ReplayAudio.encode(pcm16: Data(), sampleRate: 48_000))
        XCTAssertThrowsError(try ReplayAudio.encode(pcm16: Data([0, 1]), sampleRate: .nan))
    }
}
#endif
