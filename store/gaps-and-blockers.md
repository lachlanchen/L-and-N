# Store publication status

Updated: 2026-09-24

## Current Android follow-up

- Android 1.0.9/build 18: internal testing available; production update in review,
  with initial quick checks finished. Approval/public rollout remains external.
- Google reported a privacy-policy DNS warning. Independent Google/Cloudflare
  resolution and direct HTTPS checks passed; the provider-supported incorrect-
  check review route was used. Monitor the review outcome, not just the upload.
- Physical Honor Magic 7 Pro confirmation remains pending. The device was not
  connected; studio-fixture browser pipeline tests and signed-APK emulator UI/
  silence tests are not labelled as physical-device pronunciation validation.
- iOS/watchOS and Google Pro were not changed by this update. Older platform
  observations below are historical, not a current provider check.

See [Android 1.0.9 evidence](artifacts/android-release-1.0.9.json).

## Historical publication evidence

## Verified locally

- Web lint, unit tests, TypeScript build, and PWA generation pass.
- The API-36 Android release APK and AAB build with R8/resource shrinking and the private upload key.
- The signed release APK installs and launches on an API-36.1 emulator; direct N selection changes the paired exercise from “light” to “night.”
- Xcode 26.3 builds the combined iOS + embedded watchOS companion project.
- The combined build installs and launches on an iPhone 17 Pro and Apple Watch Series 11 simulator, and Xcode validates the embedded watch binary relationship.
- The distribution-signed archive and exported IPA pass deep/strict signature checks and App Store server validation; the same release was also launched on an iPad Pro 13 simulator.
- Privacy and support pages are packaged in both native wrappers.

## Google Play

- App record created as `L & N: Speech Practice` for `art.lazying.landn`.
- Production release `1.0 (3)` targets 177 countries/regions and uses a full rollout after approval.
- The microphone-fixed build 3 AAB replaced build 1 and restarted the Google review on 2026-09-06. The store listing, privacy/content declarations, advertising-ID declaration, and release remain in the same submission.
- Play Console now reports the production track as **Active**, latest release `3 (1.0)`, 177 countries/regions, and records the app update as published on 2026-09-09. The public listing is https://play.google.com/store/apps/details?id=art.lazying.landn.
- Play Console's Android developer verification notice reports all apps as successfully registered ahead of the 2026-09-30 deadline.
- The same `1.0 (3)` release is **Available to internal testers** at https://play.google.com/apps/internaltest/4701251861700553150. The signed APK is also available at https://l-and-n.lazying.art/downloads/L-and-N-1.0-build3-test.apk.

## Apple App Store

- App record `6808872450` and the iOS/watchOS identifiers are registered.
- Version `1.0 (2)` was signed, validated, uploaded once, and submitted to App Review on 2026-09-06 after replacing build 1 to include the microphone/transcription repair.
- The iPhone, iPad, and Apple Watch screenshot sets, listing, review information, privacy response, age rating, content rights, medical-device response, pricing, and availability are complete.
- App Review approved version 1.0 (build 2) on 2026-09-17 and the manual release was executed the same day via the App Store Connect API; the version now reports **Ready for Distribution**. The public page may take up to 24 hours to appear.
- Owner-only account prerequisites and operational follow-up are retained in the ignored, access-restricted `.runtime/store/handoff.md`.
- Availability is currently 146 countries or regions. EU/EEA storefronts remain excluded until the account-level Digital Services Act trader status is verified.
- TestFlight build `1.0 (2)` is **Testing** in the internal group.
- TestFlight build `1.0 (2)` is also **Testing** in the external group at https://testflight.apple.com/join/CpkT8m9C; automatic tester notification was enabled.

The first Google Play production release uses a full rollout; the initial App Store release was manually released after approval. Historical pricing/release update: the App Store price was temporarily reverted to Free on 2026-09-18, then set to USD 0.99 (CNY 8, HKD 8). Version 1.0.1 (build 3) was approved and auto-released on 2026-09-19. Google published 1.0.1 (build 4) to production on 2026-09-18; the existing Android package stays free to install. Account onboarding details are retained only in the ignored private handoff.

Both formal releases are now published. Remaining external items are the App Store page propagation window and the optional EU/EEA trader-status step.
