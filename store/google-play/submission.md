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
- Production submission: sent for review on 2026-09-18 after Play's quick checks passed; Google approved it the same afternoon and the production track shows **Available on Google Play, released Sep 18 16:25 HKT**, latest release `4 (1.0.1)`, 177 countries/regions.

## Production release 13 (1.0.4), 2026-09-21 — free app

- Release 11 (1.0.3) was approved and went live on 2026-09-21. Production release 13 (bundle `19fc7921…`, the same build as the internal track) was created from the artifact library with release notes and sent for review; Play forwards it once its quick checks pass. L & N Pro still waits for its first review (build 10); its release 11 and listing text stay saved.

## Internal build 13 (1.0.4), 2026-09-21 — hear-each-word buttons

- Test channels only, at the user's request: internal track `13 (1.0.4)` on the free app and on L & N Pro (free bundle SHA-256 `19fc7921f222408118eb16f70a5f968a02461b0d681cc0ca2ee15d8c38acf961`, Pro `7b043797de30be2ac245ebed5734efb8d5b4448aa9351ded4f50c9e651f08ae8`), APK https://l-and-n.lazying.art/downloads/L-and-N-1.0.4-build13-test.apk. Adds two buttons under the Listen exam answers that play each word of the pair on its own (commit `c02d05f`). Production still holds until the pending reviews finish; release 13 is what will go to production then.

## Update 1.0.4 (build 12), 2026-09-21 — every Mandarin and Cantonese final

- 28 new same-tone minimal pairs (commit `467ed3a`): Mandarin now covers 22 finals and Cantonese 21, 59 pairs in total, each word with a verified studio clip. Free bundle SHA-256 `a67bd86a78f1ecca702c3a4624e5c828e273087bf1f320873de6b500b537f884`, Pro bundle `5c35eab29dd82dc5df7acdf575e8cf62ad329d33fe3522d296961a1e53053cd4`. Internal track shows `12 (1.0.4)` on both apps; APK https://l-and-n.lazying.art/downloads/L-and-N-1.0.4-build12-test.apk. Production was left alone: the free app's release 11 and the Pro listing's first review (build 10) are still in review and Play would restart them, so release 12 goes to production after those reviews complete. The Pro listing's short and full descriptions now say 59 pairs (saved with the pending changes) and the free app's `full_access` product is named "Full curriculum: all 59 pairs".

## Update 1.0.3 (build 11), 2026-09-20 — kept takes

- Every scored attempt's audio is now kept on the device with replay and a studio-then-me comparison (commit `44a23ff`). Free bundle SHA-256 `7c061e98918b670c43c37487f77bc1b08be6b14421fb05f41a7f61350b165884`, Pro bundle `ccea9a44913e4696ddc7cc4d3ebcc4f3b539bac350e7b7eb61febe6517b0ae2d`. Internal track shows `11 (1.0.3)`; APK https://l-and-n.lazying.art/downloads/L-and-N-1.0.3-build11-test.apk. Free app: production release 11 sent for review (Changes in review; Play forwards it once its quick checks pass), superseding the approved build 10. L & N Pro: production release 11 is saved but **not sent**, because the Pro listing's first review (build 10) is still in progress and Play warned that sending now would cancel and restart that review; send it from Publishing overview after the build 10 review completes.

## L & N Pro (art.lazying.landn.pro), 2026-09-20 — new paid listing

- A second Play app for the paid edition: `L & N Pro: Speech Practice`, package `art.lazying.landn.pro` (console app id `4976381008764842239`), created as a **paid** app at the USD 0.99 base price for all 172 targeted countries. It is the `pro` product flavor of the same code (commit `72ccac3`): the billing plugin reports everything as owned for the `.pro` package, so nothing is gated and no product exists.
- Setup completed through the console: privacy policy, no ads, no restricted access, IARC content rating (Everyone / PEGI 3), target audience 18+, data safety (ephemeral voice recordings for app functionality, encrypted in transit, no account, not shared), no government/financial/health features, category Education, contact details, store listing (descriptions from this file's Pro text, icon, feature graphic, phone and tablet screenshots from `store/assets`), pricing.
- Production release `10 (1.0.2)` uploaded (bundle SHA-256 `29def28594723d3008705ef4ba929b18a49c84a14843cea0ac8126920424ac09`), countries added, release saved, and all 10 changes **sent for review** on 2026-09-20 (Google quotes up to 7 days). The quick checks first demanded the advertising-ID declaration, answered No.

## Production 1.0.2 (build 10), 2026-09-20 — in review, in-app purchase

- Production release `10 (1.0.2)` (Billing Library 8, `full_access` unlock) was created from the library bundle with a 100 % rollout and sent for review on 2026-09-20, superseding the queued build 8 submission. The purchase sheet was reached on a device and showed the live price; an end-to-end purchase had not been completed before submission.

## Monetization: one-time in-app purchase, 2026-09-20

- Play does not allow a published free app to become paid, so Android charges through a **one-time product**: `full_access` (purchase option `full-access`, name "Full curriculum: all 31 pairs"), base price USD 0.99 applied to all regions (Play converted it, e.g. EUR 0.99, HKD 8.00, JPY 170), active. The first three pairs of each language stay free; the product unlocks the rest in Practice and Listen. Web stays free; iOS stays paid up front.
- Financial/onboarding operations and tester configuration are retained only in the ignored, access-restricted `.runtime/store/handoff.md`; they are not release evidence.
- Build 10 (Billing Library 8.0.0) is available on the internal track. Build 9 with Billing Library 7.1.1 was refused by the console (minimum version 8.0.0) and discarded. On 2026-09-20 a device installed build 10 from Play and reached the purchase sheet with the live price; end-to-end purchase verification remains incomplete.

## Production 1.0.2 (build 8), 2026-09-20 — in review

- Production release `8 (1.0.2)` was created from the library bundle (Production > Create new release > Add from library, checkbox on the `App bundle 8` row, Add to release), release notes entered, rollout left at 100 %, saved, then sent from Publishing overview with **Submit 1 change for review** and the **Send changes for review** confirmation (trusted click at the dialog button). Publishing overview shows **Changes in review**; Google sends it once its quick checks finish. Production keeps serving `4 (1.0.1)` until approval.

## Update 1.0.2 (build 8), 2026-09-20 — internal testing, 18 more pairs

- Adds six minimal pairs each for English, Mandarin and Cantonese (31 pairs in total), makes the practice-tab studio example say the word twice with no sentence, and regenerates every recording with one Microsoft neural voice per language, verified by Whisper and the onset model (60 of 62 clear). Built from commit `3b2a169` (feature `29ac574`); bundle SHA-256 `1c19178f14864e52d9bf515d81cd9990ecab727e5e4cb7722f439bcef8bd92cf`; internal track shows `8 (1.0.2)`; APK https://l-and-n.lazying.art/downloads/L-and-N-1.0.2-build8-test.apk (`d9e822fb7af4f5a9d5dd7213fef1c69e68319a9e8eecba158fff489b08d2e8b4`). Production still `4 (1.0.1)`.

## Update 1.0.2 (build 7), 2026-09-19 — internal testing, exam lengths

- Listening exam offers 3, 5 or 7 words and leaves a longer pause before a repeated word, so "night night" is heard as two words; the media-element fallback reloads every clip. Built from commit `142f875` (feature commit `6861d2e`); bundle SHA-256 `24bad69c71ae52474c84f4cfa97f5b28dcae78512e1fd1625c2bed78efb438e1`; internal track shows `7 (1.0.2)`; APK https://l-and-n.lazying.art/downloads/L-and-N-1.0.2-build7-test.apk (`fdbf2bf917cbda1c358ac14b69a4f3cc03826e7de326b7af9f6ffcd02b7163cb`). Production still `4 (1.0.1)`.

## Update 1.0.2 (build 6), 2026-09-19 — internal testing, playback fix

- Fixes listening playback on devices that refuse Web Audio and stops relying on media seeking (standalone word clips). Bundle SHA-256 `444361d025b9bdf3d49f9488ced5efee5c505bd09a056a55121dea996db265be`; internal track shows `6 (1.0.2)`; APK https://l-and-n.lazying.art/downloads/L-and-N-1.0.2-build6-test.apk (`823090f75da7f985adbd9e7dd56cbe5f88819b17788c2773749434c54052aa93`). Production still `4 (1.0.1)`.

## Update 1.0.2 (build 5), 2026-09-19 — internal testing

- Adds the Listen tab (ear training). Built from commit `8f2652b`; bundle SHA-256 `a8891d8c0edf5341d61a044abd119e6095a44254790a02af40d980da817303e3`, unit tests and release lint passed.
- Internal testing: **Available to internal testers** as `5 (1.0.2)`, published 2026-09-19 through the console.
- Direct APK: https://l-and-n.lazying.art/downloads/L-and-N-1.0.2-build5-test.apk, SHA-256 `b6379bc09fe0e48052fe9259f85ad780cfcd7511272688a65cfb4eb32ea15ff2`.
- Production is untouched and still serves `4 (1.0.1)`; promote build 5 only after the internal round.

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
