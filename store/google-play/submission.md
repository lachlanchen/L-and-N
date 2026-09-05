# Google Play submission

Submitted: 2026-09-05; corrected production binary submitted 2026-09-06

- App: `L & N: Speech Practice`
- Package: `art.lazying.landn`
- Production release: `1.0 (3)`
- Artifact: `android/app/build/outputs/bundle/release/app-release.aab`
- Artifact SHA-256: `cba75721242b3f20b9e5e861bfc20e23cec7b5228ace3a8b6afea6dafb38f319`
- Availability: 177 countries/regions, full rollout after approval
- Play Console state: **Changes in review**; the quick checks completed and the restarted review is active
- Submitted changes: production release, availability, default store listing, content rating, target audience, privacy policy, ads, data safety, health, category, plus sign-in/access, advertising ID, government, and financial declarations

The four phone screenshots use an AI-generated abstract backdrop around verified app captures. They were individually marked as created or edited with AI in Play Console. The app icon and feature graphic were not marked as AI-generated.

Build 3 replaces build 1 in the production submission. The review was deliberately restarted because build 1 could crash while requesting microphone permission in an R8-minified build and could remain on “Analysing” after Stop. Build 3 preserves Capacitor permission annotations, checks permission before requesting it, and does not await the Android plugin's non-resolving stop command. The same signed bundle was first exercised through the internal track and an API-36.1 release emulator.

Approval and public availability remain provider-controlled and must be verified in Play Console before they are claimed.

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
