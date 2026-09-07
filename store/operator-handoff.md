# Store publication handoff

Updated: 2026-09-07

This is the secret-free, durable handoff. The live local noVNC URL, process ownership, browser targets, private artifact delivery receipt, and shared-profile caveats are recorded in the ignored file `.runtime/store/handoff.md`.

## L & N

- Healthy working copy: `/home/lachlan/ProjectsLFS/L-And-N`
- Recovery checkout retained from the disk repair: `/home/lachlan/L-And-N-audio-repair`
- PWA: https://l-and-n.lazying.art/
- Free pronunciation lesson: https://l-and-n.lazying.art/lessons/light-vs-night/
- Signed Android test APK: https://l-and-n.lazying.art/downloads/L-and-N-1.0-build3-test.apk
- APK SHA-256: `89867c73d2ae3f3023a1e402e7c7fd21dd4337a409262aff3832f3c30efd1fb7`
- Google package: `art.lazying.landn`
- Apple ID: `6808872450`
- iOS bundle: `art.lazying.landn`
- watchOS bundle: `art.lazying.landn.watchkitapp`
- Apple team: `Q8M2S2FY77`

Formal submission state:

- Google Play Production `1.0 (3)`: **Changes in review** after restarting the review to replace build 1 with the microphone-fixed build 3. This is the initial full release, not a staged rollout.
- Apple App Store iOS/watchOS `1.0 (2)`: **Waiting for Review**. Build 1 was removed from review and replaced after the microphone/transcription repair. The first release is manual, so approval must be followed by one explicit release action.

Testing state:

- Google Play internal `1.0 (3)`: **Available to internal testers** at https://play.google.com/apps/internaltest/4701251861700553150.
- TestFlight internal: build `1.0 (2)` is **Testing** in `L & N Internal Testers`.
- TestFlight public beta: https://testflight.apple.com/join/CpkT8m9C, build `1.0 (2)` is **Testing**; automatic tester notification was enabled. Build 1 remains in the group as rollback history.

Release evidence and exact hashes are in `store/artifacts/`. Store declarations and provider outcomes are in the platform submission documents. The signed APK is available through the first-party URL above; Android signing material, Apple profiles, exported binaries, browser cookies, and private email-recipient details are intentionally excluded from Git.

The iOS/watchOS archive was built on the Mac reached through the local SSH alias `echomind-kvm-macos`. The current reproducible artifacts there are:

- `/Users/lachlanchen/Projects/L-And-N/release/LAndN-1.0.0-2.xcarchive`
- `/Users/lachlanchen/Projects/L-And-N/release/export-1.0.0-2/App.ipa`

Build 2 IPA SHA-256: `eb2106916ab7b70ae0e800e5bafd2e87b66074450168b88e2690a413ef998da9`. The embedded iOS and watchOS bundles both report build 2, deep/strict code-sign verification passed, Apple server validation passed, and upload delivery UUID `513ceb87-254e-4585-98aa-ee428f01e2b1` succeeded.

## Web and audio repair operations

- The live PWA/download release is `/opt/l-and-n-web/releases/978c0b7a1c14a129dc2a1ce6e83612257f869b33c20bed62fab2bddf850a778e` on `sshem`. Its rollback is `970e7d97616fec213d52d0de957829225fd9c0f5811c816db6dcfe28ee009841`. It was built from commit `7b969e618bb870ab2f09fd4390215f092934ce32` and serves `assets/index-DmEEpL1Y.js`.
- The same release publishes the project-owned **Light or night?** lesson at https://l-and-n.lazying.art/lessons/light-vs-night/. The public HTML, CSS, illustration, audio, caption, and 19.37-second video were verified by exact hash and content type; byte-range video delivery also passed.
- Caddy's L & N route now checks `{path}/index.html` before the SPA fallback so nested static lessons resolve normally. The live site-config SHA-256 is `92b099d2983987a45a7b231876984604de01eae8cb3de34048be12ce2d8c426d`; the owner-only rollback copy retains SHA-256 `20e52aa45d3d6d143dad43924860cd56d861c09042d8d52810934bf3f49d2381`. The gateway stayed available during validation and the other imported sites passed post-reload probes.
- The private transient speech service is the enabled user unit `landn-speech-api.service`, listening only on `127.0.0.1:18063`. Its immutable source is LocalLLM commit `210cee1db473d77cad4de9f132f6ae2afe1b5f45`; it reuses the existing offline `faster-whisper-small` cache and deletes each inflight file after transcription.
- Only LazyEdge service `local-llm-speech` targets that port. Protected live configuration is under `~/.config/lazyedge/`; the secret-free rollback location is described by the private operator state, not committed here.
- Live browser evidence proved one microphone stream, a moving and retained waveform, recognized text, and a non-placeholder score. An empty transcript now produces no score and saves no progress.
- Android build 3 additionally fixes the minified release permission crash and the non-resolving recorder Stop path. API-36.1 release-emulator evidence shows the live waveform and a clean no-score result for silence.
- No L & N noVNC stack is live after the workstation reboot. Relaunch one project-owned stack on demand and record it in the private runtime handoff; never reuse the personal browser.

## EchoMind reference

- Sanitized repository: `/home/lachlan/ProjectsLFS/EchoMindSanitized/EchoMind`
- TestFlight public beta: https://testflight.apple.com/join/bKGrC3Jn
- Google Play open test: https://play.google.com/apps/testing/art.lazying.echomind
- Google Play internal test: https://play.google.com/apps/internaltest/4701510550966449647

EchoMind's formal store release remains `NOT_READY`; its own release facts and approval ledger must be used before changing Production or App Store state. Do not infer that L & N approval authorizes an EchoMind formal release.

The long-running EchoMind display `:94` / noVNC `6194` / CDP `9294` is currently owned by an Alibaba administration runtime, not a store-publishing browser. Do not repurpose or stop it. Use the single L & N store stack in the private runtime handoff for the current review, and create a separately checked EchoMind store stack only when EchoMind's release procedure calls for it.

## Next provider actions

1. Monitor Google Production build 3 until the review result is terminal; verify the public listing before claiming it is live.
2. Test build 2 on a physical iPhone from the internal or public TestFlight group, specifically microphone permission, live waveform motion, retained waveform after Stop, and recognized text before scoring.
3. Monitor Apple App Review. When the version becomes approved/pending developer release, use the manual release control once, then verify the storefront.
4. Update `store/release.yaml`, the two submission notes, evidence, and artifact manifests after every provider transition.
