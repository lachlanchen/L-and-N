import AVFoundation
import Foundation
import WatchKit

struct WatchDrill: Identifiable {
    let id: String
    let word: String
    let sound: String
    let pair: String
    let language: String
}

@MainActor
final class DrillModel: ObservableObject {
    @Published private(set) var drillIndex = 0
    @Published private(set) var feedback = "Listen, then choose the first sound."
    @Published private(set) var answered = false
    @Published private(set) var correct = false
    @Published private(set) var attempts = 0
    @Published private(set) var correctCount = 0

    private let synthesizer = AVSpeechSynthesizer()

    let drills = [
        WatchDrill(id: "light", word: "light", sound: "L", pair: "night", language: "en-US"),
        WatchDrill(id: "night", word: "night", sound: "N", pair: "light", language: "en-US"),
        WatchDrill(id: "low", word: "low", sound: "L", pair: "no", language: "en-US"),
        WatchDrill(id: "no", word: "no", sound: "N", pair: "low", language: "en-US"),
        WatchDrill(id: "lan", word: "蓝", sound: "L", pair: "南", language: "zh-CN"),
        WatchDrill(id: "nan", word: "南", sound: "N", pair: "蓝", language: "zh-CN"),
    ]

    var current: WatchDrill { drills[drillIndex] }
    var accuracy: Int { attempts == 0 ? 0 : Int((Double(correctCount) / Double(attempts) * 100).rounded()) }

    func listen() {
        let utterance = AVSpeechUtterance(string: current.word)
        utterance.voice = AVSpeechSynthesisVoice(language: current.language)
        utterance.rate = 0.38
        synthesizer.stopSpeaking(at: .immediate)
        synthesizer.speak(utterance)
    }

    func choose(_ sound: String) {
        guard !answered else { return }
        attempts += 1
        answered = true
        correct = sound == current.sound
        if correct {
            correctCount += 1
            feedback = "Yes — \(current.word) begins with /\(current.sound.lowercased())/."
            WKInterfaceDevice.current().play(.success)
        } else {
            feedback = "It was /\(current.sound.lowercased())/. Compare \(current.word) with \(current.pair)."
            WKInterfaceDevice.current().play(.retry)
        }
    }

    func next() {
        drillIndex = (drillIndex + 1) % drills.count
        answered = false
        correct = false
        feedback = "Listen, then choose the first sound."
    }
}
