import XCTest
@testable import LAndNAudio

final class PCMFrameTests: XCTestCase {
    private func frame(_ samples: [Float], waveform: Bool = true) -> PCMFrame {
        samples.withUnsafeBufferPointer { PCMFrame(samples: $0, includeWaveform: waveform) }
    }

    func testPCMIsSignedLittleEndianAndKeepsEverySample() {
        let result = frame([0, 1, -1, 0.5, -0.5])
        XCTAssertEqual(Array(result.pcm16), [0, 0, 255, 127, 1, 128, 0, 64, 0, 192])
    }

    func testMeterMeasuresRealSignalEnergy() {
        let result = frame([0.25, -0.25, 0.25, -0.25])
        XCTAssertEqual(result.rms, 0.25, accuracy: 0.000001)
        XCTAssertEqual(result.waveform, [0.25, -0.25, 0.25, -0.25])
    }

    func testSilenceIsZeroNotASyntheticWaveform() {
        let result = frame(Array(repeating: 0, count: 1024))
        XCTAssertEqual(result.rms, 0)
        XCTAssertTrue(result.waveform.allSatisfy { $0 == 0 })
        XCTAssertEqual(result.pcm16.count, 2048)
    }

    func testEmptyBufferIsSafe() {
        let result = frame([])
        XCTAssertTrue(result.pcm16.isEmpty)
        XCTAssertEqual(result.rms, 0)
        XCTAssertTrue(result.waveform.isEmpty)
    }

    func testNonFiniteInputDoesNotCrashOrPoisonTheMeter() {
        let result = frame([.nan, .infinity, -.infinity, 0.5])
        XCTAssertEqual(result.waveform, [0, 0, 0, 0.5])
        XCTAssertEqual(result.rms, 0.25, accuracy: 0.000001)
    }

    func testClippingIsBounded() {
        let result = frame([2, -3])
        XCTAssertEqual(result.waveform, [1, -1])
        XCTAssertEqual(result.rms, 1)
        XCTAssertEqual(Array(result.pcm16), [255, 127, 1, 128])
    }

    func testMeterThrottlingNeverDropsRecordedSamples() {
        let samples = (0..<2048).map { Float(sin(Double($0) * 0.07) * 0.2) }
        let visible = frame(samples)
        let throttled = frame(samples, waveform: false)
        XCTAssertEqual(visible.pcm16, throttled.pcm16)
        XCTAssertEqual(visible.rms, throttled.rms)
        XCTAssertEqual(visible.waveform.count, 96)
        XCTAssertTrue(throttled.waveform.isEmpty)
        XCTAssertGreaterThan(visible.rms, 0.1)
    }
}
