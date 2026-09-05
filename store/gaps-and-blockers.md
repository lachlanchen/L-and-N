# Store publication status

Updated: 2026-09-05

## Verified locally

- Web lint, unit tests, TypeScript build, and PWA generation pass.
- The API-36 Android release APK and AAB build with R8/resource shrinking and the private upload key.
- The signed release APK installs and launches on an API-36.1 emulator; direct N selection changes the paired exercise from “light” to “night.”
- Xcode 26.3 builds the combined iOS + embedded watchOS companion project.
- The combined build installs and launches on an iPhone 17 Pro and Apple Watch Series 11 simulator, and Xcode validates the embedded watch binary relationship.
- Privacy and support pages are packaged in both native wrappers.

## External provider work still required

- Verify or create the Apple bundle identifiers `art.lazying.landn` and `art.lazying.landn.watchkitapp`.
- Obtain Apple distribution signing identity and provisioning profiles, then archive and validate the exact App Store IPA.
- Verify or create the App Store Connect app/version record, upload the validated archive, finish age rating/privacy/export-compliance forms, and submit once.
- Verify or create the Google Play app record, enroll in Play App Signing, upload the exact signed AAB, finish content/data-safety/app-access/ads declarations, and submit the production release once.
- Provider review outcomes cannot be claimed until each console reports them.

The first Google Play production release must use a full rollout; staged rollout is reserved for later updates. The App Store version is configured for manual release after approval.
