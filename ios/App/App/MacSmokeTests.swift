#if DEBUG && (targetEnvironment(macCatalyst) || targetEnvironment(simulator))
import AVFoundation
import UIKit
import WebKit

/// Explicit, Debug-only UI checks. No production API, fabricated scores or
/// permission bypasses. All app actions use the learner's visible controls.
@MainActor
final class MacSmokeTests {
    private let webView: WKWebView
    private let output = FileManager.default.temporaryDirectory.appendingPathComponent("LAndN-Mac-QA", isDirectory: true)
    private var checks: [String] = []
    init(webView: WKWebView) { self.webView = webView }

    private func js(_ source: String) async throws -> Any? {
        try await webView.evaluateJavaScript(source)
    }
    private func wait(_ expression: String, timeout: TimeInterval = 30) async throws {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if let value = try? await js("Boolean(\(expression))"), value as? Bool == true { return }
            try await Task.sleep(nanoseconds: 300_000_000)
        }
        let body = (try? await js("document.body.innerText.slice(0,2500)")) ?? "no document"
        throw NSError(domain: "LAndNQA", code: 1, userInfo: [NSLocalizedDescriptionKey: "Timed out: \(expression)\n\(body)"])
    }
    private func click(_ selector: String) async throws {
        try await wait("document.querySelector('\(selector)') && !document.querySelector('\(selector)').disabled")
        _ = try await js("document.querySelector('\(selector)').click()")
        try await Task.sleep(nanoseconds: 350_000_000)
    }
    private func screenshot(_ name: String) async throws {
        let config = WKSnapshotConfiguration()
        config.snapshotWidth = 1280
        let image = try await webView.takeSnapshot(configuration: config)
        guard let png = image.pngData() else { throw URLError(.cannotDecodeContentData) }
        try png.write(to: output.appendingPathComponent(name + ".png"))
        print("LANDN_QA image \(name) \(image.size)")
    }
    private func check(_ name: String) { checks.append(name); print("LANDN_QA PASS: \(name)"); fflush(stdout) }

    /// Explicit synthetic capture fixture to exercise the real scoring/save UI
    /// and WebKit database. Never described as microphone/recognition accuracy.
    private func storageChecks() async throws {
        let rate = 48_000.0
        let samples = (0..<48_000).map { Float(sin(Double($0) * 220 * 2 * .pi / rate) * 0.24) }
        let pcm = samples.withUnsafeBufferPointer { PCMFrame(samples: $0, includeWaveform: false).pcm16 }
        let replay = try ReplayAudio.encode(pcm16: pcm, sampleRate: rate)
        let fixture: [String: Any] = ["pcm16Base64": pcm.base64EncodedString(), "sampleRate": rate,
            "transcript": "light", "durationMs": 1000, "replayBase64": replay.base64EncodedString(), "replayMimeType": "audio/mp4"]
        let encoded = String(decoding: try JSONSerialization.data(withJSONObject: fixture), as: UTF8.self)
        _ = try await js("""
        window.__storageFixture=\(encoded);
        window.__originalNativePromise=Capacitor.nativePromise;
        Capacitor.nativePromise=function(plugin,method,options){
          if(plugin==='NativeAudioRecorder' && method==='start')return Promise.resolve({sampleRate:48000,speechRecognitionAvailable:true});
          if(plugin==='NativeAudioRecorder' && method==='stop')return new Promise(r=>setTimeout(()=>r(window.__storageFixture),400));
          return window.__originalNativePromise.call(this,plugin,method,options);
        };
        window.__takeRead=()=>new Promise((resolve,reject)=>{
          const open=indexedDB.open('landn-takes',1);
          open.onerror=()=>reject(open.error);
          open.onsuccess=()=>{const db=open.result,tx=db.transaction('takes'),r=tx.objectStore('takes').getAll();
            tx.oncomplete=()=>{db.close();resolve(r.result.map(t=>({id:t.id,bytes:t.audioBytes?.byteLength,mime:t.mimeType}))) };
            tx.onerror=()=>{db.close();reject(tx.error)};
          };
        });true;
        """)
        try await click("[data-testid=practice-language-en-US]")
        try await click("[data-testid=practice-sound-l]")
        _ = try await js("window.__recordRect=JSON.stringify(document.querySelector('[data-testid=practice-record]').getBoundingClientRect().toJSON());true")
        for _ in 0..<3 {
            try await click("[data-testid=practice-record]")
            try await wait("document.querySelector('.practice-page').dataset.capturePhase==='recording'")
            try await click("[data-testid=practice-record]")
            try await wait("document.querySelector('.practice-page').dataset.capturePhase==='idle' && document.querySelector('[data-testid=take-replay]') && !document.querySelector('.storage-warning')")
            try await wait("JSON.stringify(document.querySelector('[data-testid=practice-record]').getBoundingClientRect().toJSON())===window.__recordRect")
        }
        _ = try await js("window.__takeRead().then(r=>window.__durableCount=r.filter(t=>t.mime==='audio/mp4' && t.bytes>0).length);true")
        try await wait("window.__durableCount>=3")
        check("synthetic native capture: three real UI scoring/storage cycles keep geometry and commit AAC bytes in WKWebView")
        print("LANDN_QA replay storage: PCM=\(pcm.count) AAC=\(replay.count) bytes; synthetic fixture")
        try await screenshot("05-storage-result")
        // Restore the native bridge before reloading; the app must find history
        // and committed audio again with its ordinary production code.
        _ = try await js("Capacitor.nativePromise=window.__originalNativePromise;location.reload();true")
        try await wait("document.querySelector('[data-testid=app-root]')")
        try await click(".bottom-nav button:nth-child(4)")
        try await wait("document.querySelectorAll('[data-testid=history-play]').length>=3")
        _ = try await js("""
        window.__replayLoaded=false;
        const create=URL.createObjectURL;
        URL.createObjectURL=function(blob){if(blob.type==='audio/mp4' && blob.size>0)window.__replayLoaded=true;return create.call(this,blob)};
        true;
        """)
        try await click("[data-testid=history-play]")
        try await wait("window.__replayLoaded")
        check("WKWebView reload retains history and reconstructs saved AAC for the real replay control")
        try await click(".bottom-nav button:nth-child(1)")
    }

    func run() async {
        var passed = false
        var failure = ""
        do {
            try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
            try await wait("document.querySelector('[data-testid=app-root]') && document.querySelector('.word-area h2')")
            try await wait("window.Capacitor?.isNativePlatform() && window.Capacitor?.isPluginAvailable('NativeAudioRecorder')")
            check("bundled Apple UI and native audio bridge loaded")
            if CommandLine.arguments.contains("--landn-storage-test") {
                _ = try await js("var picker=document.querySelector('[data-testid=ui-language-picker]');picker.value='en';picker.dispatchEvent(new Event('change',{bubbles:true}))")
                try await storageChecks()
            }
            if CommandLine.arguments.contains("--landn-playback-test") {
                _ = try await js("""
                window.__modelQA=[];
                const qaMediaPlay=HTMLMediaElement.prototype.play;
                HTMLMediaElement.prototype.play=function(...args){
                  if(this.src.includes('/audio/models/')) {
                    __modelQA.push('start '+this.src);
                    for(const event of ['playing','ended','error','stalled','waiting','pause'])this.addEventListener(event,()=>__modelQA.push(event+' time='+this.currentTime+' ready='+this.readyState+' error='+this.error?.message));
                  }
                  return qaMediaPlay.apply(this,args).catch(e=>{__modelQA.push('rejected '+e);throw e});
                };
                true;
                """)
            }
            // Change language only through the actual UI; leave previous data intact.
            _ = try await js("var picker=document.querySelector('[data-testid=ui-language-picker]');picker.value='en';picker.dispatchEvent(new Event('change',{bubbles:true}))")
            try await click("[data-testid=practice-language-en-US]")
            try await click("[data-testid=practice-sound-l]")
            try await click(".drill-topline > button:last-child")
            try await wait("document.querySelector('.word-area h2').textContent === 'low' && document.querySelector('[data-testid=practice-sound-l]').getAttribute('aria-pressed') === 'true'")
            try await click(".drill-topline > button:first-child")
            try await wait("document.querySelector('.word-area h2').textContent === 'light'")
            check("practice arrows advance words while keeping L selected")
            if CommandLine.arguments.contains("--landn-playback-test") {
                try await click("[data-testid=practice-model]")
                try await wait("document.querySelector('[data-testid=practice-model]').disabled && document.querySelector('.record-button').disabled")
                _ = try await js("document.querySelector('[data-testid=practice-model]').click()")
                try await wait("!document.querySelector('[data-testid=practice-model]').disabled", timeout: 35)
                try await wait("!document.querySelector('.error-message')")
                check("full native studio model finishes and repeat taps do not restart it")
            }
            try await screenshot("01-practice")
            try await click("[data-testid=practice-sound-n]")
            try await wait("document.querySelector('[data-testid=practice-sound-n]').getAttribute('aria-pressed') === 'true'")
            check("direct L/N selection")
            for language in ["zh-CN", "yue-HK", "en-US"] {
                try await click("[data-testid=practice-language-\(language)]")
                try await wait("document.querySelector('[data-testid=app-root]').dataset.practiceLanguage === '\(language)'")
            }
            check("English, Mandarin and Cantonese practice selectors")
            for language in ["zh-Hans", "zh-Hant", "yue", "en"] {
                _ = try await js("var picker=document.querySelector('[data-testid=ui-language-picker]');picker.value='\(language)';picker.dispatchEvent(new Event('change',{bubbles:true}))")
                try await wait("document.querySelector('[data-testid=app-root]').dataset.uiLanguage === '\(language)'")
                try await wait("document.querySelector('[data-testid=app-root]').dataset.practiceLanguage === 'en-US'")
            }
            check("UI language independent from practice language")
            if CommandLine.arguments.contains("--landn-playback-test") {
                _ = try await js("""
                window.__playbackQA=[];
                const originalFetch=window.fetch;
                window.fetch=(...args)=>{__playbackQA.push('fetch '+args[0]);return originalFetch(...args).then(r=>{__playbackQA.push('response '+r.status+' '+args[0]);return r},e=>{__playbackQA.push('fetch error '+e);throw e})};
                const originalDecode=AudioContext.prototype.decodeAudioData;
                AudioContext.prototype.decodeAudioData=function(...args){__playbackQA.push('decode '+args[0].byteLength+' state='+this.state);return originalDecode.apply(this,args).then(b=>{__playbackQA.push('decoded '+b.duration);return b},e=>{__playbackQA.push('decode error '+e);throw e})};
                window.__pairEnded=0;
                const originalStart=AudioBufferSourceNode.prototype.start;
                AudioBufferSourceNode.prototype.start=function(...args){this.addEventListener('ended',()=>{window.__pairEnded++},{once:true});return originalStart.apply(this,args)};
                const originalMediaPlay=HTMLMediaElement.prototype.play;
                HTMLMediaElement.prototype.play=function(...args){if(this.src.includes('/audio/clips/'))this.addEventListener('ended',()=>{window.__pairEnded++},{once:true});return originalMediaPlay.apply(this,args)};
                true;
                """)
                if CommandLine.arguments.contains("--landn-element-test") {
                    _ = try await js("window.AudioContext=undefined;window.webkitAudioContext=undefined;true")
                    check("test-only forced media-element fallback; actual bundled audio retained")
                }
            }
            try await click(".bottom-nav button:nth-child(2)")
            try await wait("document.querySelector('.listen-shell')")
            if CommandLine.arguments.contains("--landn-playback-test") {
                for language in ["en-US", "zh-CN", "yue-HK"] {
                    try await click("[data-testid=practice-language-\(language)]")
                    for index in [1, 2, 1, 1] {
                        let ended = (try await js("window.__pairEnded") as? Int) ?? 0
                        try await click("[aria-label=\"Word pair\"] button:nth-child(\(index))")
                        try await wait("document.querySelector('[data-testid=exam-preview-stop]') && document.querySelector('[data-testid=exam-play]').disabled && !document.querySelector('[data-testid=exam-answers]')")
                        try await wait("!document.querySelector('[data-testid=exam-preview-stop]')", timeout: 20)
                        try await wait("!document.querySelector('.error-message') && !document.querySelector('[data-testid=exam-play]').disabled")
                        try await wait("window.__pairEnded === \(ended + 2)")
                    }
                    check("native \(language) pair 1 -> pair 2 -> pair 1 -> pair 1 completes both audio sources every time")
                }
                try await click("[data-testid=practice-language-en-US]")
                try await click("[data-testid^=exam-pair-]")
                try await click("[data-testid=exam-preview-stop]")
                try await wait("!document.querySelector('[data-testid=exam-preview-stop]') && !document.querySelector('[data-testid=exam-play]').disabled")
                try await click("[data-testid^=exam-pair-]")
                try await click(".bottom-nav button:nth-child(1)")
                try await click(".bottom-nav button:nth-child(2)")
                try await click("[data-testid^=exam-pair-]")
                try await wait("!document.querySelector('[data-testid=exam-preview-stop]')", timeout: 20)
                try await wait("!document.querySelector('.error-message') && !document.querySelector('[data-testid=exam-play]').disabled")
                check("native stop and tab-change cancellation permit immediate pair replay")
            }
            try await screenshot("02-listen")
            check("listening lessons render")
            try await click(".bottom-nav button:nth-child(3)")
            try await wait("document.querySelector('.mouth-model-canvas canvas') || document.querySelector('[data-testid=mouth-model-fallback]')")
            try await click("[data-testid=model-sound-n]")
            try await wait("document.querySelector('[data-testid=mouth-model]').dataset.sound === 'N'")
            try await click("[data-testid=model-sound-l]")
            try await Task.sleep(nanoseconds: 1_000_000_000)
            try await screenshot("03-learn")
            check("mouth model and direct L/N articulation controls")
            try await click(".bottom-nav button:nth-child(4)")
            try await wait("document.querySelector('.progress-page')")
            try await wait("document.querySelector('.progress-page').innerText.includes('Recording history')")
            try await screenshot("04-progress")
            check("progress and privacy links render")
            try await click(".bottom-nav button:nth-child(1)")
            print("LANDN_QA audio input: \(AVCaptureDevice.default(for: .audio)?.localizedName ?? "none")")
            if AVCaptureDevice.default(for: .audio) == nil || CommandLine.arguments.contains("--landn-recording-test") {
                for _ in 0..<2 {
                    try await click(".record-button")
                    try await wait("document.querySelector('.error-message') && !document.querySelector('.record-button').disabled && !document.querySelector('.score-card')", timeout: 120)
                }
                check("unavailable or silent input recovers twice with no invented score or stuck recording")
            }
            try await wait("!document.querySelector('[data-testid=mobile-store-prompt]')")
            check("native app omits web store promotion")
            passed = true
        } catch {
            failure = String(describing: error)
            if let diagnostics = try? await js("JSON.stringify(window.__playbackQA || [])") { print("LANDN_QA playback diagnostics: \(diagnostics)") }
            if let diagnostics = try? await js("JSON.stringify(window.__modelQA || [])") { print("LANDN_QA model diagnostics: \(diagnostics)") }
            try? await screenshot("failure")
        }
        let report: [String: Any] = ["passed": passed, "checks": checks, "error": failure,
            "system": ProcessInfo.processInfo.operatingSystemVersionString,
            "microphoneHardwareTested": false, "output": output.path]
        try? JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys]).write(to: output.appendingPathComponent("result.json"))
        print("LANDN_QA \(passed ? "COMPLETE" : "FAILED") \(output.path) \(failure)")
        fflush(stdout)
        exit(passed ? 0 : 1)
    }
}
#endif
