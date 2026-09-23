# Store publication handoff

Updated: 2026-09-19

This is the secret-free, durable handoff. The live local noVNC URL, process ownership, browser targets, private artifact delivery receipt, and shared-profile caveats are recorded in the ignored file `.runtime/store/handoff.md`.

## L & N

- Healthy working copy: `/home/lachlan/ProjectsLFS/L-And-N`
- Recovery checkout retained from the disk repair: `/home/lachlan/L-And-N-audio-repair`
- PWA: https://l-and-n.lazying.art/
- Free pronunciation lesson: https://l-and-n.lazying.art/lessons/light-vs-night/
- Custom tutor lesson: https://l-and-n.lazying.art/for-tutors/
- Signed Android test APK: https://l-and-n.lazying.art/downloads/L-and-N-1.0-build3-test.apk
- APK SHA-256: `89867c73d2ae3f3023a1e402e7c7fd21dd4337a409262aff3832f3c30efd1fb7`
- Google package: `art.lazying.landn`
- Apple ID: `6808872450`
- iOS bundle: `art.lazying.landn`
- watchOS bundle: `art.lazying.landn.watchkitapp`
- Apple team: `Q8M2S2FY77`

Formal submission state:

- Google Play Production `1.0 (3)`: **Live**. Play Console shows the production track as Active with latest release 3 (1.0) in 177 countries/regions; the console's publishing overview records the app update as published on 2026-09-09. Public listing: https://play.google.com/store/apps/details?id=art.lazying.landn
- Apple App Store iOS/watchOS `1.0.1 (3)`: **Ready for Sale**, approved and auto-released 2026-09-19, priced at USD 0.99. (Previous: `1.0 (2)` released 2026-09-17.) App Review approved the submission on 2026-09-17 (submission `68f4fd67-9bda-407e-bb0d-e5cf20c6ccb8`, build 2, delivery UUID `513ceb87-254e-4585-98aa-ee428f01e2b1`). The manual release was performed the same day through the App Store Connect API (`POST /v1/appStoreVersionReleaseRequests` for version `e48189a2-f0c7-4e65-9359-9fd4f3413f89`), after which the API reported `READY_FOR_SALE` / `READY_FOR_DISTRIBUTION`. Apple states the public page can take up to 24 hours: https://apps.apple.com/app/l-n-speech-practice/id6808872450

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

- Current web release (2026-09-20): `c4af6e092888e8cc4fded4d73a4e3f5610d0d6daae1d4239b3265e02cb5412c6`, source `cfe8efe169acd18da13f0c6908eedbaab4496d76`, entry `assets/index-zHLbJcBO.js`. Progress now offers localized links to the existing App Store and Google Play listings in the browser only; native rendering excludes them. All 76 tests and live browser checks in four locales at 320/390/1280px passed. Audio, static pages, downloads and gateway code are unchanged. Rollback: `14fff03ea1cf54a7c5ae1861834f1f3c56cf1ab4875492abeb173c7049f9dea2`. Exact evidence: `store/artifacts/pwa-store-links-release.json`. Earlier release entries below are history.
- The live PWA/download release is `/opt/l-and-n-web/releases/e8370f68864f773c92135669b80dbf298135eab65cba611f6e94b139d0b289b3` on `sshem`, published 2026-09-19 with `tools/deploy-web.sh` from commit `8f2652bd7e99ac3c16819c904d7e4d9d43908902`; it serves `assets/index-BwxGR9ZI.js` and adds the listening exam on top of the trained onset network, recognizer-anchored scoring, end-of-word auto-stop, and interface-language practice copy. Its rollback is the 2026-09-18 release `71699f6d…` (`assets/index-C5ww45p3.js`, commit `c68bd8a`). Its rollback is `95a8270571886f0431fad4be8f44358468f07da6545d30680f7ccd64a7c004b6` (commit `72ded99`, `assets/index-DmEEpL1Y.js`); the rollback path is recorded in the release's `.previous` file and printed by the deploy script.
- Historical pricing/release update (2026-09-18–19): the App Store price was temporarily reverted to Free on 2026-09-18, then set to USD 0.99; iOS/watchOS 1.0.1 (build 3) was approved and auto-released on 2026-09-19. Google Play 4 (1.0.1) was published on 2026-09-18; the existing Android package remains free to install. Account onboarding and payment operations are retained only in `.runtime/store/handoff.md`.
- The same release publishes the project-owned **Light or night?** lesson at https://l-and-n.lazying.art/lessons/light-vs-night/. The public HTML, CSS, illustration, audio, caption, and 19.37-second video were verified by exact hash and content type; byte-range video delivery also passed.
- The sample now leads interested tutors to a separate USD 250 custom bilingual pronunciation mini-lesson at https://l-and-n.lazying.art/for-tutors/. The live page uses the project-owned sample before one encrypted fit check at https://lazying.art/pronunciation-mini-lesson/fit-check/, retains email as a fallback, requires written scope acceptance before payment, and makes no clinical or certified-translation claim.
- Caddy's L & N route now checks `{path}/index.html` before the SPA fallback so nested static lessons resolve normally. The live site-config SHA-256 is `92b099d2983987a45a7b231876984604de01eae8cb3de34048be12ce2d8c426d`; the owner-only rollback copy retains SHA-256 `20e52aa45d3d6d143dad43924860cd56d861c09042d8d52810934bf3f49d2381`. The gateway stayed available during validation and the other imported sites passed post-reload probes.
- The private transient speech service is the enabled user unit `landn-speech-api.service`, listening only on `127.0.0.1:18063`. Its immutable source is LocalLLM commit `210cee1db473d77cad4de9f132f6ae2afe1b5f45`; it reuses the existing offline `faster-whisper-small` cache and deletes each inflight file after transcription.
- Only LazyEdge service `local-llm-speech` targets that port. Protected live configuration is under `~/.config/lazyedge/`; the secret-free rollback location is described by the private operator state, not committed here.
- Live browser evidence proved one microphone stream, a moving and retained waveform, recognized text, and a non-placeholder score. An empty transcript now produces no score and saves no progress.
- Android build 3 additionally fixes the minified release permission crash and the non-resolving recorder Stop path. API-36.1 release-emulator evidence shows the live waveform and a clean no-score result for silence.
- Recognition reach (2026-09-23, latest): the packaged apps call the public transcription endpoint (`ops/landn_gateway.py` allows the WebView origins), so Android has word recognition for the first time; iOS asks Apple for `zh-HK`. Play internal 17 on both apps, TestFlight build 16.
- Chinese scoring (2026-09-23): syllable matching from `src/data/han-homophones.json` (built by `tools/lang/generate_homophones.py`), romanized transcripts, acoustic-only scoring when nothing is recognized, and the iOS `zh-HK` locale fix. Web live; Play internal 16 on both apps; TestFlight builds 14 and 15.
- Screenshots refresh (2026-09-21): seven new listing screenshots per store under `store/assets/` (tools in `tools/store/`); App Store 1.0.5 (build 10) submitted with them after 1.0.4 went live; both Play listings updated and saved, pending their reviews. Learn tab now degrades gracefully without WebGL (web release `002a36c8…`).
- Hear-word test builds (2026-09-21): Android internal 13 (both Play apps) and iOS TestFlight build 10 carry the hear-each-word buttons (commit `c02d05f`); free-app production 13 sent for review on 2026-09-21 (11 is live); Pro production and the App Store submission stay on 11 / build 9 until their reviews finish.
- All finals 1.0.4 (2026-09-21): web release `78dbab94…` (commit `c02d05f`, adds hear-each-word buttons under the exam answers; native builds 12/9 are at `09aaec6` without them), Android internal `12 (1.0.4)` on both Play apps (production held until the pending reviews finish), iOS build 9 in TestFlight and App Store 1.0.4 waiting for review. 59 pairs; the unverified (weak) words are listed in `docs/research/listening-exam.md`.
- Kept takes 1.0.3 (2026-09-20): web release `eac4139f…` (commit `1eeb10a`), Android internal `11 (1.0.3)`, free app production 11 in review, Pro production 11 saved until the Pro first review (build 10) completes, iOS build 8 in TestFlight and App Store 1.0.3 waiting for review. Takes live in IndexedDB on the device only (`src/lib/takes.ts`).
- Pro listing (2026-09-20): `L & N Pro: Speech Practice` (`art.lazying.landn.pro`) is a second, paid (USD 0.99) Play app built from the `pro` flavor; all declarations, listing, pricing and a production release 10 (1.0.2) are in place; see `store/google-play/submission.md`. Free app production build 10 (with the unlock) was sent for review the same day.
- In-app purchase (2026-09-20): Android internal `10 (1.0.2)` carries the `full_access` one-time product (USD 0.99, active). Public release and product evidence: `store/google-play/submission.md` and `store/artifacts/native-release-1.0.2.json` (`iapRelease`). Account setup and tester configuration belong only in the ignored private handoff.
- Production submissions (2026-09-20): App Store 1.0.2 with build 7 is Waiting for Review (auto-release); Google Play production `8 (1.0.2)` is in review after quick checks. Watch Gmail in the store browser for both verdicts, then update these records.
- More pairs (2026-09-20, latest): web release `14fff03e…` (commit `3b2a169`), Android internal `8 (1.0.2)`, iOS build 7 in both TestFlight groups (beta approved, public link updated); see `store/artifacts/native-release-1.0.2.json` `pairsRelease`. Studio audio now comes from `tools/audio/synthesize_word_clips.py` (Microsoft neural voices via `edge-tts`, verified with Whisper + onset model); the practice-tab file is the word twice.
- Exam lengths (2026-09-19, later): web release `428b118f…` (commit `142f875`), Android internal `7 (1.0.2)`, iOS build 6 in the internal group (delivery `ca832a05-213c-4c71-a73f-738f4c12fc7f`, VALID); hashes in `store/artifacts/native-release-1.0.2.json` `lengthsRelease`. Public beta still waits on build 4's review.
- Playback fix (2026-09-19, later): web release `b131aa7b…` (commit `775ebc1`), Android internal `6 (1.0.2)`, iOS build 5 in the internal group; build 4 still in public beta review, build 5 queued behind it. Standalone word clips live under `public/audio/clips/`.
- Native update 1.0.2 (2026-09-19): Android build 5 and iOS build 4 are in internal testing on both stores only (Play internal track `5 (1.0.2)`; TestFlight internal group sees build 4). Production and App Store review are untouched. Hashes: `store/artifacts/native-release-1.0.2.json`.
- Native update 1.0.1 (2026-09-18): Android build 4 is available to internal testers and its production release is in Google review; iOS build 3 is processed, in the internal TestFlight group, and waiting for Beta App Review in the public group. App Store version 1.0.1 with build 3 is Waiting for Review (automatic release after approval). Details and hashes: `store/artifacts/native-release-1.0.1.json`.
- No L & N noVNC stack is live after the workstation reboot. Relaunch one project-owned stack on demand and record it in the private runtime handoff; never reuse the personal browser.

## EchoMind reference

- Sanitized repository: `/home/lachlan/ProjectsLFS/EchoMindSanitized/EchoMind`
- TestFlight public beta: https://testflight.apple.com/join/bKGrC3Jn
- Google Play open test: https://play.google.com/apps/testing/art.lazying.echomind
- Google Play internal test: https://play.google.com/apps/internaltest/4701510550966449647

EchoMind's formal store release remains `NOT_READY`; its own release facts and approval ledger must be used before changing Production or App Store state. Do not infer that L & N approval authorizes an EchoMind formal release.

The long-running EchoMind display `:94` / noVNC `6194` / CDP `9294` is currently owned by an Alibaba administration runtime, not a store-publishing browser. Do not repurpose or stop it. Use the single L & N store stack in the private runtime handoff for the current review, and create a separately checked EchoMind store stack only when EchoMind's release procedure calls for it.

## Next provider actions

1. Confirm the public App Store page resolves (HTTP 200) within 24 hours of the 2026-09-17 release, then replace the README TestFlight link with the App Store link.
2. Test build 2 on a physical iPhone from the internal or public TestFlight group, specifically microphone permission, live waveform motion, retained waveform after Stop, and recognized text before scoring.
3. Consult the ignored private handoff for owner-only account prerequisites; this public release record does not authorize account changes.
4. Provide the account-level Digital Services Act trader status when EU/EEA availability is wanted; those storefronts stay excluded until then.
5. Update `store/release.yaml`, the two submission notes, evidence, and artifact manifests after every provider transition.
