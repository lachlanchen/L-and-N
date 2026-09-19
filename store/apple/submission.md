# Apple App Store submission

Resubmitted: 2026-09-06; approved and released: 2026-09-17

- App: `L & N: Speech Practice`
- Apple ID: `6808872450`
- iOS bundle: `art.lazying.landn`
- Embedded watchOS bundle: `art.lazying.landn.watchkitapp`
- Version/build: `1.0 (2)`
- Exact IPA SHA-256: `eb2106916ab7b70ae0e800e5bafd2e87b66074450168b88e2690a413ef998da9`
- Upload delivery UUID: `513ceb87-254e-4585-98aa-ee428f01e2b1`
- App Store Connect state: **Ready for Distribution** (`READY_FOR_SALE`)
- Release setting: manual release after approval; released on 2026-09-17 via `POST /v1/appStoreVersionReleaseRequests`
- Review outcome: approved 2026-09-17, submission ID `68f4fd67-9bda-407e-bb0d-e5cf20c6ccb8`
- Public page: https://apps.apple.com/app/l-n-speech-practice/id6808872450

The distribution-signed iOS archive contains the embedded Watch app, and both bundles report build 2. Apple server validation and the build 2 upload completed without errors. Build 1 was removed from review and build 2 was selected before resubmission. The submitted product page contains one verified simulator screenshot for each required iPhone, iPad, and Apple Watch set.

Availability update 2026-09-18: the Digital Services Act trader declaration is **Active** (27 EU countries; address, +1 phone, and contact@lazying.art verified by the account holder), and the 29 previously excluded EU/EEA storefronts were enabled through the API, so the app is now offered in all 175 territories at the 0.99 USD tier (automatic local prices).

The App Store declarations record a 4+ age rating, no third-party content, no regulated medical-device claim, and no non-exempt encryption. App Privacy is published as **Data Not Collected** under Apple's retention-based definition: attempts and progress stay on the device, and speech recognition uses operating-system services without app-controlled retention.

The free app is configured for 146 countries or regions. EU/EEA storefronts were excluded from this submission because the account's Digital Services Act trader status has not been verified; they can be enabled after that account-level requirement is complete.

Apple approved the review on 2026-09-17 ("Welcome to the App Store" and "Review of your submission is complete" emails, both received 09:50 HKT). Because manual release was selected, the approved version was released once through the App Store Connect API with the project's existing API key; the API then reported `appStoreState: READY_FOR_SALE` and `appVersionState: READY_FOR_DISTRIBUTION` with build 2 attached. Apple's public page can take up to 24 hours after release.

## Update 1.0.1 (build 3), 2026-09-18

- Archive `LAndN-1.0.1-3.xcarchive` and IPA `export-1.0.1-3/App.ipa` (SHA-256 `f29c1081efb9e7b5469679d0d3f8a6da7ec8961a72df5527c478d43748888009`) were built on the Mac from commit `c68bd8a`, passed `altool --validate-app`, and uploaded with delivery UUID `3f0d54ee-ecd1-429a-9c37-aca1173ea93d`; App Store Connect reports the build as processed (`VALID`).
- TestFlight: the internal group sees every build, so build 3 is available there; build 3 was added to `L & N Public Beta` and its Beta App Review submission is **Waiting for Review**. Test notes were set through the API.
- App Store version 1.0.1 (`6770f065-063a-4b4c-9613-9bc7680fc8c1`) was created through the API once the price was set back to Free (the pending paid price without a signed Paid Apps Agreement was the "current state" that blocked new versions). Build 3 is attached, What's New is set, and review submission `d749d4ae-4cba-43ae-a1ba-a4d2f19f9f39` is **Waiting for Review** with automatic release after approval.

## Update 1.0.2 (build 4), 2026-09-19 — TestFlight internal

- Adds the Listen tab. Archive `LAndN-1.0.2-4.xcarchive`, IPA SHA-256 `803b73d1105e1397a6eb1d97cb7db32ae3e1790bdd978d9711a36a3ae1bd91f4`, `altool --validate-app` clean, delivery UUID `64b63788-30c4-4d6c-b9b7-840233f3fe4e`, processing state `VALID`.
- `L & N Internal Testers` has access to every build, so build 4 is already installable there; the What's New text was set through `PATCH /v1/betaBuildLocalizations`.
- The public beta group still holds build 3, and App Store version 1.0.1 with build 3 remains **Waiting for Review**; this upload does not disturb it.

## TestFlight

- Internal group: `L & N Internal Testers`
- Internal state: build `1.0 (2)` is **Testing**
- External group: `L & N Public Beta`
- Public link: https://testflight.apple.com/join/CpkT8m9C
- Public limit: 100 testers
- External build state: build `1.0 (2)` is **Testing**; automatic tester notification was enabled

The public link is active. Build 1 remains in the public group as rollback history; build 2 is the corrected current test build. Internal testers receive the build through TestFlight, and Apple automatically notifies the external tester because that option was enabled when build 2 was added.
