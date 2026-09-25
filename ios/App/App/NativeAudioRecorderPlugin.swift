import AVFoundation
import Capacitor
import Speech
import WebKit

@objc(NativeAudioRecorderPlugin)
final class NativeAudioRecorderPlugin: CAPPlugin, CAPBridgedPlugin {
    /// The speech recognizer for a practice language.
    ///
    /// Apple has no `yue-HK` locale: its Cantonese dictation is `zh-HK`, and
    /// `SFSpeechRecognizer(locale:)` simply returns nil for an identifier it
    /// does not know, which left Cantonese attempts with no recognizer and an
    /// empty transcript. Each language therefore offers several identifiers
    /// and the first one the device actually supports is used.
    static func speechRecognizer(for language: String) -> SFSpeechRecognizer? {
        let candidates: [String]
        switch language {
        case "yue-HK":
            candidates = ["zh-HK", "yue-Hant-HK", "yue-HK", "zh-Hant-HK"]
        case "zh-CN":
            candidates = ["zh-CN", "zh-Hans-CN", "zh-Hans"]
        default:
            candidates = [language, "en-US"]
        }
        let supported = SFSpeechRecognizer.supportedLocales().map { $0.identifier }
        for identifier in candidates {
            let normalized = identifier.replacingOccurrences(of: "-", with: "_")
            guard supported.contains(identifier) || supported.contains(normalized) else { continue }
            if let recognizer = SFSpeechRecognizer(locale: Locale(identifier: identifier)) {
                return recognizer
            }
        }
        // Nothing matched the supported list; try the identifiers anyway, since
        // the list and the initializer have disagreed across iOS versions.
        return candidates.compactMap { SFSpeechRecognizer(locale: Locale(identifier: $0)) }.first
    }

    let identifier = "NativeAudioRecorderPlugin"
    let jsName = "NativeAudioRecorder"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]

    private let sampleLock = NSLock()
    private var audioEngine: AVAudioEngine?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var pcm16Data = Data()
    private var sampleRate = 0.0
    private var latestTranscript = ""
    private var recognitionFinished = true
    private var hasCapture = false
    private var isRecording = false
    private var pendingStopCall: CAPPluginCall?
    private var stopDeadline: DispatchWorkItem?
    private var maximumDuration: DispatchWorkItem?
    private var meterCounter = 0

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            guard !self.isRecording && !self.hasCapture && self.pendingStopCall == nil else {
                call.reject("A recording is already active.", "RECORDING_ACTIVE")
                return
            }
            #if targetEnvironment(macCatalyst)
            guard AVCaptureDevice.default(for: .audio) != nil else {
                call.reject("Connect an audio input device and try again.", "AUDIO_INPUT_UNAVAILABLE")
                return
            }
            #endif

            self.requestMicrophonePermission { granted in
                guard granted else {
                    call.reject("Microphone permission was not granted.", "MICROPHONE_PERMISSION_DENIED")
                    return
                }
                self.requestSpeechPermission { speechAuthorized in
                    self.beginCapture(call, speechAuthorized: speechAuthorized)
                }
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            guard self.isRecording || self.hasCapture else {
                call.reject("There is no active recording.", "NO_RECORDING")
                return
            }
            guard self.pendingStopCall == nil else {
                call.reject("The recording is already stopping.", "RECORDING_STOPPING")
                return
            }

            self.pendingStopCall = call
            self.stopCaptureEngine()
            if self.recognitionFinished {
                self.resolveStoppedCapture()
                return
            }

            let deadline = DispatchWorkItem { [weak self] in
                self?.resolveStoppedCapture()
            }
            self.stopDeadline = deadline
            // Network-backed system recognition can need longer than the
            // on-device path to emit its final (or latest partial) result.
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.8, execute: deadline)
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            if let pendingStopCall = self.pendingStopCall {
                pendingStopCall.reject("The recording was cancelled.", "RECORDING_CANCELLED")
            }
            self.pendingStopCall = nil
            self.stopCaptureEngine()
            self.resetCapture()
            call.resolve()
        }
    }

    private func requestMicrophonePermission(_ completion: @escaping (Bool) -> Void) {
        #if targetEnvironment(macCatalyst)
        // macOS owns input-device selection and microphone privacy separately
        // from iPhone's shared playback/recording audio session.
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized:
            completion(true)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .audio) { granted in
                DispatchQueue.main.async { completion(granted) }
            }
        default:
            completion(false)
        }
        #else
        let session = AVAudioSession.sharedInstance()
        switch session.recordPermission {
        case .granted:
            completion(true)
        case .denied:
            completion(false)
        case .undetermined:
            session.requestRecordPermission { granted in
                DispatchQueue.main.async { completion(granted) }
            }
        @unknown default:
            completion(false)
        }
        #endif
    }

    private func requestSpeechPermission(_ completion: @escaping (Bool) -> Void) {
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized:
            completion(true)
        case .notDetermined:
            SFSpeechRecognizer.requestAuthorization { status in
                DispatchQueue.main.async { completion(status == .authorized) }
            }
        case .denied, .restricted:
            // Speech recognition improves the score, but microphone recording
            // and acoustic analysis remain usable without it.
            completion(false)
        @unknown default:
            completion(false)
        }
    }

    private func beginCapture(_ call: CAPPluginCall, speechAuthorized: Bool) {
        let language = call.getString("language") ?? "en-US"
        let contextualStrings = call.getArray("contextualStrings", String.self) ?? []
        let maximumDurationMs = min(max(call.getInt("maximumDurationMs") ?? 6000, 1000), 8000)
        do {
            #if targetEnvironment(macCatalyst)
            // Avoid asking AVAudioEngine for an input node when a Mac has no
            // audio device; the engine can raise an Objective-C exception.
            guard AVCaptureDevice.default(for: .audio) != nil else {
                throw RecorderFailure.invalidInputFormat
            }
            #else
            let session = AVAudioSession.sharedInstance()
            // Record-only would leave the shared session with no playback
            // route, which silences the web view's own audio (studio models,
            // the listening exam) after the first recording. Keep playback
            // possible and send it to the speaker rather than the earpiece.
            try session.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker])
            try session.setPreferredSampleRate(48_000)
            try session.setPreferredIOBufferDuration(0.01)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
            #endif

            let engine = AVAudioEngine()
            let inputNode = engine.inputNode
            let format = inputNode.outputFormat(forBus: 0)
            guard format.sampleRate > 0, format.channelCount > 0 else {
                throw RecorderFailure.invalidInputFormat
            }

            sampleLock.lock()
            pcm16Data.removeAll(keepingCapacity: true)
            sampleLock.unlock()
            sampleRate = format.sampleRate
            latestTranscript = ""
            recognitionFinished = true
            hasCapture = true
            meterCounter = 0
            audioEngine = engine

            if speechAuthorized,
               let recognizer = Self.speechRecognizer(for: language),
               recognizer.isAvailable {
                let request = SFSpeechAudioBufferRecognitionRequest()
                request.shouldReportPartialResults = true
                request.taskHint = .confirmation
                request.contextualStrings = contextualStrings
                // Let SFSpeechRecognizer choose on-device or Apple-hosted
                // recognition. Requiring an uninstalled on-device language
                // model produced empty transcripts on otherwise valid audio.
                recognitionRequest = request
                recognitionFinished = false
                recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
                    DispatchQueue.main.async {
                        guard let self else { return }
                        if let result {
                            self.latestTranscript = result.bestTranscription.formattedString
                            if result.isFinal {
                                self.recognitionFinished = true
                            }
                        }
                        if error != nil {
                            self.recognitionFinished = true
                        }
                        if self.recognitionFinished && self.pendingStopCall != nil {
                            self.resolveStoppedCapture()
                        }
                    }
                }
            }

            inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
                self?.consume(buffer)
            }
            engine.prepare()
            try engine.start()
            isRecording = true

            let duration = DispatchWorkItem { [weak self] in
                guard let self, self.isRecording else { return }
                self.stopCaptureEngine()
                self.notifyListeners("captureState", data: ["state": "maximumDurationReached"])
            }
            maximumDuration = duration
            DispatchQueue.main.asyncAfter(
                deadline: .now() + .milliseconds(maximumDurationMs),
                execute: duration
            )

            call.resolve([
                "sampleRate": sampleRate,
                "speechRecognitionAvailable": recognitionRequest != nil
            ])
        } catch {
            stopCaptureEngine()
            resetCapture()
            call.reject("The audio engine could not start. Check that an input device is connected.", "AUDIO_ENGINE_START_FAILED", error)
        }
    }

    private func consume(_ buffer: AVAudioPCMBuffer) {
        guard let channel = buffer.floatChannelData?[0] else { return }
        let count = Int(buffer.frameLength)
        guard count > 0 else { return }

        meterCounter += 1
        let frame = PCMFrame(samples: UnsafeBufferPointer(start: channel, count: count),
                             includeWaveform: meterCounter % 4 == 0)
        sampleLock.lock()
        pcm16Data.append(frame.pcm16)
        sampleLock.unlock()

        // Feed every captured buffer to speech recognition. Meter rendering is
        // intentionally throttled below, but recognition must receive the full
        // continuous stream.
        recognitionRequest?.append(buffer)

        guard meterCounter % 4 == 0 else { return }
        DispatchQueue.main.async { [weak self] in
            self?.notifyListeners("meter", data: ["rms": frame.rms, "waveform": frame.waveform])
        }

    }

    private func stopCaptureEngine() {
        maximumDuration?.cancel()
        maximumDuration = nil
        guard let engine = audioEngine else { return }
        if isRecording {
            engine.inputNode.removeTap(onBus: 0)
            engine.stop()
        }
        isRecording = false
        recognitionRequest?.endAudio()
        #if !targetEnvironment(macCatalyst)
        let session = AVAudioSession.sharedInstance()
        try? session.setActive(false, options: .notifyOthersOnDeactivation)
        // Hand the session back in a playback category so WKWebView audio
        // works again once recording is over.
        try? session.setCategory(.playback, mode: .default, options: [])
        #endif
    }

    private func resolveStoppedCapture() {
        guard let call = pendingStopCall else { return }
        pendingStopCall = nil
        stopDeadline?.cancel()
        stopDeadline = nil

        sampleLock.lock()
        let data = pcm16Data
        sampleLock.unlock()
        let capturedSampleRate = sampleRate
        let durationMs = capturedSampleRate > 0
            ? (Double(data.count / MemoryLayout<Int16>.size) / capturedSampleRate) * 1000
            : 0
        let transcript = latestTranscript
        resetCapture()
        call.resolve([
            "pcm16Base64": data.base64EncodedString(),
            "sampleRate": capturedSampleRate,
            "transcript": transcript,
            "durationMs": durationMs
        ])
    }

    private func resetCapture() {
        stopDeadline?.cancel()
        stopDeadline = nil
        maximumDuration?.cancel()
        maximumDuration = nil
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil
        audioEngine = nil
        sampleRate = 0
        isRecording = false
        recognitionFinished = true
        hasCapture = false
        latestTranscript = ""
        sampleLock.lock()
        pcm16Data.removeAll(keepingCapacity: false)
        sampleLock.unlock()
    }

    private enum RecorderFailure: Error {
        case invalidInputFormat
    }
}

final class LAndNBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(NativeAudioRecorderPlugin())
        #if targetEnvironment(macCatalyst)
        webView?.configuration.userContentController.addUserScript(WKUserScript(
            source: "document.documentElement.dataset.nativePlatform = 'macos'",
            injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        #endif
        #if DEBUG && targetEnvironment(macCatalyst)
        if CommandLine.arguments.contains("--landn-smoke-test"), let webView {
            Task { @MainActor in await MacSmokeTests(webView: webView).run() }
        }
        #endif
    }

    #if targetEnvironment(macCatalyst)
    override var keyCommands: [UIKeyCommand]? {
        [
            UIKeyCommand(title: "Practice", action: #selector(selectPracticeTab(_:)), input: "1", modifierFlags: .command),
            UIKeyCommand(title: "Listen", action: #selector(selectPracticeTab(_:)), input: "2", modifierFlags: .command),
            UIKeyCommand(title: "Learn", action: #selector(selectPracticeTab(_:)), input: "3", modifierFlags: .command),
            UIKeyCommand(title: "Progress", action: #selector(selectPracticeTab(_:)), input: "4", modifierFlags: .command),
            UIKeyCommand(title: "Record / Stop", action: #selector(togglePracticeRecording), input: "r", modifierFlags: .command)
        ]
    }

    @objc private func selectPracticeTab(_ command: UIKeyCommand) {
        guard let input = command.input, let index = Int(input), (1...4).contains(index) else { return }
        // Use the same visible controls and their busy-state guards as a click.
        webView?.evaluateJavaScript("document.querySelector('.bottom-nav button:nth-child(\(index)):not(:disabled)')?.click()")
    }

    @objc private func togglePracticeRecording() {
        webView?.evaluateJavaScript("document.querySelector('.record-button:not(:disabled)')?.click()")
    }
    #endif
}
