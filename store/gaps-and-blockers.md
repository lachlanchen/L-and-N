# Store publication status

Updated: 2026-09-17

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
- Apple's approval email includes the standard reminder to check Agreements, Tax, and Banking; that page requires a browser login and was not re-verified during the API release.
- Availability is currently 146 countries or regions. EU/EEA storefronts remain excluded until the account-level Digital Services Act trader status is verified.
- TestFlight build `1.0 (2)` is **Testing** in the internal group.
- TestFlight build `1.0 (2)` is also **Testing** in the external group at https://testflight.apple.com/join/CpkT8m9C; automatic tester notification was enabled.

The first Google Play production release uses a full rollout; staged rollout is reserved for later updates. The App Store price was changed to USD 0.99 on 2026-09-18 through the API; whether the Paid Applications agreement is in effect could not be verified without a browser login, and the public lookup still reported Free at the time. Google Play cannot switch this package from free to paid.

Both formal releases are now published. Remaining external items are the App Store page propagation window and the optional EU/EEA trader-status step.
