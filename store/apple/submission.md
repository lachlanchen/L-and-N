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

The App Store declarations record a 4+ age rating, no third-party content, no regulated medical-device claim, and no non-exempt encryption. App Privacy is published as **Data Not Collected** under Apple's retention-based definition: attempts and progress stay on the device, and speech recognition uses operating-system services without app-controlled retention.

The free app is configured for 146 countries or regions. EU/EEA storefronts were excluded from this submission because the account's Digital Services Act trader status has not been verified; they can be enabled after that account-level requirement is complete.

Apple approved the review on 2026-09-17 ("Welcome to the App Store" and "Review of your submission is complete" emails, both received 09:50 HKT). Because manual release was selected, the approved version was released once through the App Store Connect API with the project's existing API key; the API then reported `appStoreState: READY_FOR_SALE` and `appVersionState: READY_FOR_DISTRIBUTION` with build 2 attached. Apple's public page can take up to 24 hours after release.

## TestFlight

- Internal group: `L & N Internal Testers`
- Internal state: build `1.0 (2)` is **Testing**
- External group: `L & N Public Beta`
- Public link: https://testflight.apple.com/join/CpkT8m9C
- Public limit: 100 testers
- External build state: build `1.0 (2)` is **Testing**; automatic tester notification was enabled

The public link is active. Build 1 remains in the public group as rollback history; build 2 is the corrected current test build. Internal testers receive the build through TestFlight, and Apple automatically notifies the external tester because that option was enabled when build 2 was added.
