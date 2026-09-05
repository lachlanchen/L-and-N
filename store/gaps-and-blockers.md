# Store publication status

Updated: 2026-09-05

## Verified locally

- Web lint, unit tests, TypeScript build, and PWA generation pass.
- The API-36 Android release APK and AAB build with R8/resource shrinking and the private upload key.
- The signed release APK installs and launches on an API-36.1 emulator; direct N selection changes the paired exercise from “light” to “night.”
- Xcode 26.3 builds the combined iOS + embedded watchOS companion project.
- The combined build installs and launches on an iPhone 17 Pro and Apple Watch Series 11 simulator, and Xcode validates the embedded watch binary relationship.
- Privacy and support pages are packaged in both native wrappers.

## Google Play

- App record created as `L & N: Speech Practice` for `art.lazying.landn`.
- Production release `1.0.0 (1)` targets 177 countries/regions and uses a full rollout.
- The signed AAB, store listing, privacy/content declarations, advertising-ID declaration, and release were sent to Google for review on 2026-09-05.
- Play Console currently reports **Changes in review**. Approval and public availability are not yet claimed.

## Apple work still required

- Restore the expired App Store Connect session in the project-owned browser.
- Verify or create the Apple bundle identifiers `art.lazying.landn` and `art.lazying.landn.watchkitapp`.
- Obtain Apple distribution signing identity and provisioning profiles, then archive and validate the exact App Store IPA.
- Create the App Store Connect app/version record, upload the validated archive, finish age rating/privacy/export-compliance forms, and submit once.

The first Google Play production release must use a full rollout; staged rollout is reserved for later updates. The App Store version is configured for manual release after approval.
