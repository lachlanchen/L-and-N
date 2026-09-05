# Store publication status

Updated: 2026-09-05

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
- Production release `1.0.0 (1)` targets 177 countries/regions and uses a full rollout.
- The signed AAB, store listing, privacy/content declarations, advertising-ID declaration, and release were sent to Google for review on 2026-09-05.
- Play Console currently reports **Changes in review**. Approval and public availability are not yet claimed.
- A separate `1.0 (2)` release is **Available to internal testers** at https://play.google.com/apps/internaltest/4701251861700553150. It differs from the production candidate only by Android build number.

## Apple App Store

- App record `6808872450` and the iOS/watchOS identifiers are registered.
- Version `1.0 (1)` was signed, validated, uploaded once, and submitted to App Review on 2026-09-05.
- The iPhone, iPad, and Apple Watch screenshot sets, listing, review information, privacy response, age rating, content rights, medical-device response, pricing, and availability are complete.
- App Store Connect currently reports **Waiting for Review**. Approval is not yet claimed.
- Manual release is selected. After approval, public availability requires one explicit release action in App Store Connect.
- Availability is currently 146 countries or regions. EU/EEA storefronts remain excluded until the account-level Digital Services Act trader status is verified.
- TestFlight build `1.0 (1)` is assigned to the internal group and the account holder has been invited.
- The external TestFlight group and public link are configured, but the build is **Waiting for Review**; the link will not admit testers until Apple approves the beta.

The first Google Play production release uses a full rollout; staged rollout is reserved for later updates. Both provider reviews are now external dependencies.
