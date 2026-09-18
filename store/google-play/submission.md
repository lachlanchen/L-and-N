# Google Play submission

Submitted: 2026-09-05; corrected production binary submitted 2026-09-06

- App: `L & N: Speech Practice`
- Package: `art.lazying.landn`
- Production release: `1.0 (3)`
- Artifact: `android/app/build/outputs/bundle/release/app-release.aab`
- Artifact SHA-256: `cba75721242b3f20b9e5e861bfc20e23cec7b5228ace3a8b6afea6dafb38f319`
- Availability: 177 countries/regions, full rollout after approval
- Play Console state: **Live**; the production track is Active with latest release `3 (1.0)` in 177 countries/regions, and the publishing overview records the update as published on 2026-09-09
- Public listing: https://play.google.com/store/apps/details?id=art.lazying.landn
- Submitted changes: production release, availability, default store listing, content rating, target audience, privacy policy, ads, data safety, health, category, plus sign-in/access, advertising ID, government, and financial declarations

The four phone screenshots use an AI-generated abstract backdrop around verified app captures. They were individually marked as created or edited with AI in Play Console. The app icon and feature graphic were not marked as AI-generated.

Build 3 replaces build 1 in the production submission. The review was deliberately restarted because build 1 could crash while requesting microphone permission in an R8-minified build and could remain on “Analysing” after Stop. Build 3 preserves Capacitor permission annotations, checks permission before requesting it, and does not await the Android plugin's non-resolving stop command. The same signed bundle was first exercised through the internal track and an API-36.1 release emulator.

Google approved the restarted review and published the full rollout on 2026-09-09. The state was re-verified in Play Console on 2026-09-17 (production track Active, 0 installs so far, no crashes or ANRs reported).

## Update 1.0.1 (build 4), 2026-09-18

- Bundle: `android/app/build/outputs/bundle/release/app-release.aab`, SHA-256 `1eccfbc47b8b9563f1568dfd91f0c24f2aa9fe7aaf861e326107ddee978eb298`, built from commit `c68bd8a` with the trained onset network, recognizer-anchored scoring, end-of-word auto-stop, and interface-language practice copy. Unit tests and release lint passed; it was not run on an emulator (no native code changed since build 3).
- Internal testing: **Available to internal testers** as `4 (1.0.1)` since 2026-09-18 14:50 HKT (same opt-in URL as below).
- Direct APK: https://l-and-n.lazying.art/downloads/L-and-N-1.0.1-build4-test.apk, SHA-256 `b6a82b8cd3b12d07e7b624c81d9a2c5df8cf3b768b47dfc3d471de8fdf7583c4`.
- Production: release `4 (1.0.1)` created from the library bundle with a 100 % rollout and saved; see the line below for the review submission result.
- Production submission: sent for review on 2026-09-18 after Play's quick checks passed; Publishing overview shows **Your changes are now in review**. Build 3 stays live until Google approves build 4.

## Internal testing

- Track ID: `4701251861700553150`
- Test URL: https://play.google.com/apps/internaltest/4701251861700553150
- Release: `1.0 (3)`
- State: **Available to internal testers**
- Released: 2026-09-06 at 2:17 AM HKT
- Testers: the existing `EchoMind Internal Testers` email list (3 users)
- Direct signed APK: https://l-and-n.lazying.art/downloads/L-and-N-1.0-build3-test.apk
- APK SHA-256: `89867c73d2ae3f3023a1e402e7c7fd21dd4337a409262aff3832f3c30efd1fb7`

Build 3 is the current internal test and production-review binary. Build 2 remains only as release history and rollback evidence. In the release emulator, build 3 displayed a moving waveform while recording, returned from Stop, showed the silence/unclear-word retry message, saved no score for silence, and produced no fatal exception.
