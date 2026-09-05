import AVFoundation
import Capacitor
import Speech

@objc(NativeAudioRecorderPlugin)
final class NativeAudioRecorderPlugin: CAPPlugin, CAPBridgedPlugin {
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
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2, execute: deadline)
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
        let session = AVAudioSession.sharedInstance()

        do {
            try session.setCategory(.record, mode: .measurement, options: [])
            try session.setPreferredSampleRate(48_000)
            try session.setPreferredIOBufferDuration(0.01)
            try session.setActive(true, options: .notifyOthersOnDeactivation)

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
               let recognizer = SFSpeechRecognizer(locale: Locale(identifier: language)),
               recognizer.isAvailable {
                let request = SFSpeechAudioBufferRecognitionRequest()
                request.shouldReportPartialResults = true
                request.taskHint = .confirmation
                request.contextualStrings = contextualStrings
                if recognizer.supportsOnDeviceRecognition {
                    request.requiresOnDeviceRecognition = true
                }
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
            call.reject("The iOS audio engine could not start.", "AUDIO_ENGINE_START_FAILED", error)
        }
    }

    private func consume(_ buffer: AVAudioPCMBuffer) {
        guard let channel = buffer.floatChannelData?[0] else { return }
        let count = Int(buffer.frameLength)
        guard count > 0 else { return }

        var encoded = [Int16](repeating: 0, count: count)
        var sumSquares = 0.0
        for index in 0..<count {
            let sample = max(-1.0, min(1.0, Double(channel[index])))
            sumSquares += sample * sample
            encoded[index] = Int16((sample * Double(Int16.max)).rounded())
        }
        let chunk = encoded.withUnsafeBytes { Data($0) }
        sampleLock.lock()
        pcm16Data.append(chunk)
        sampleLock.unlock()

        // Feed every captured buffer to speech recognition. Meter rendering is
        // intentionally throttled below, but recognition must receive the full
        // continuous stream.
        recognitionRequest?.append(buffer)

        meterCounter += 1
        guard meterCounter % 4 == 0 else { return }
        let pointCount = min(96, count)
        let stride = max(1, count / pointCount)
        var waveform: [Double] = []
        waveform.reserveCapacity(pointCount)
        var index = 0
        while index < count && waveform.count < pointCount {
            waveform.append(Double(channel[index]))
            index += stride
        }
        let rms = sqrt(sumSquares / Double(count))
        DispatchQueue.main.async { [weak self] in
            self?.notifyListeners("meter", data: ["rms": rms, "waveform": waveform])
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
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
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
    }
}
