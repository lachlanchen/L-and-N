# Apple App Store submission

Resubmitted: 2026-09-06; 1.0 approved and released 2026-09-17; 1.0.1 approved and auto-released 2026-09-19

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
- App Store version 1.0.1 (build 3) was submitted on 2026-09-18, then approved and auto-released on 2026-09-19 at USD 0.99. The price was temporarily reverted to Free on 2026-09-18 before USD 0.99 was re-applied. Account onboarding details are retained only in the ignored, access-restricted `.runtime/store/handoff.md`.

## App Store 1.0.5 (build 10), 2026-09-21 — new screenshots, Waiting for Review

- 1.0.4 (build 9) was approved the same day it was submitted and is live. Because Apple locks screenshots on a submitted version, the refreshed listing went out as version 1.0.5 on build 10 (hear-each-word buttons, WebGL fallback): 7 iPhone 6.5" and 7 iPad 13" screenshots uploaded through the API (`store/assets/`), What's New set, review submission `639729e6-b9e4-4118-801d-d3fd6038c9fa` was submitted, then Apple flagged the version **Invalid Binary** on 2026-09-22 because build 10 carries marketing version 1.0.4 while the version is 1.0.5. Fix in progress: iOS bumped to 1.0.5 build 11 (`release/build11.sh`), to be attached to 1.0.5 and resubmitted.

## TestFlight build 10 (1.0.4), 2026-09-21 — hear-each-word buttons

- Test channel only, at the user's request. IPA SHA-256 `234384c809709e27c3a04fe5d92c6cbcd70e83ba1228754d87ce2a7e90793bba`, delivery `81bcab6a-069f-4dfe-85ed-853004b04e62`, processed `VALID`, internal group, added to `L & N Public Beta` with beta review submitted. The App Store 1.0.4 review submission keeps build 9; build 10 (or a later one) goes to the App Store with the next submission.

## App Store 1.0.4 (build 9), 2026-09-21 — Waiting for Review, every Mandarin and Cantonese final

- Build 9 (marketing version 1.0.4) ships the 28 new same-tone pairs with verified studio audio (59 pairs). IPA SHA-256 `b028a0381ef148cd1d35c82739d5494942524bad5f46646c63fa6b8f4adaa44e`, delivery/build id `6922c99f-4900-4570-8317-d9db6b63a1bd`, processed `VALID`, in the internal group, added to `L & N Public Beta` with beta review submitted. App Store version 1.0.4 (`d3e42041-09c1-480f-8ba9-c91834c62705`) created with build 9 and What's New in en-US; review submission `72749e0c-d8c7-4cdb-ae29-51c6754cf7d3` **WAITING_FOR_REVIEW**, automatic release. 1.0.3 was already live, so nothing was displaced.

## App Store 1.0.3 (build 8), 2026-09-20 — approved 2026-09-21, kept takes

- 2026-09-21: App Review approved; the API reports `READY_FOR_SALE` / review submission `COMPLETE`, so 1.0.3 is live on the App Store.

- Build 8 (marketing version 1.0.3) adds kept takes with replay; the native recorder's PCM is packaged as WAV for playback. Uploaded from the Mac, processed `VALID`, notes set, in the internal group, added to `L & N Public Beta` (beta review waiting). App Store version 1.0.3 (`7c199d8c-4994-4ee3-9937-1550c7bec37b`) created with build 8, What's New in en-US, review submission `e4064880-a3c9-45e4-a9c1-d39c177fef30` **WAITING_FOR_REVIEW**, automatic release. 1.0.2 had already been approved and is live, so nothing was displaced.

## App Store 1.0.2 (build 7), 2026-09-20 — approved the same day

- Version 1.0.2 (`6090c35d-b0fe-449b-a983-5e8dad5b6220`, release type AFTER_APPROVAL) was created through the API, build 7 attached, the en-US What's New set (Listen tab, 18 more pairs, word-twice studio examples, auto-stop), and review submission `ecefffc1-f8f6-4ba9-9ea3-c85ff24361b7` submitted: **WAITING_FOR_REVIEW**. Nothing was queued ahead of it (1.0.1's submission `d749d4ae…` is COMPLETE and 1.0.1 is Ready for Distribution), so no wait was needed before submitting.

## Update 1.0.2 (build 7), 2026-09-20 — TestFlight internal, 18 more pairs

- Six more minimal pairs per language, word-twice studio examples, all recordings regenerated with native neural voices and verified (commit `3b2a169`, feature `29ac574`). IPA SHA-256 `fd6d763064afbc8a6775b3234a3561ec20c0784c46bfc4bccdeea4f12ddc15aa`, `altool` validate and upload from the Mac. Delivery UUID `11b98708-bc9b-4576-894c-53e5eb31d7bd`, processed `VALID`, internal state `IN_BETA_TESTING`, notes set. Build 4's beta review had cleared (`BETA_APPROVED`), so build 7 was added to `L & N Public Beta`, submitted for beta review and approved the same day; the public TestFlight link now serves build 7.
- Build note: a repo sync with `--delete` had removed the Mac-only Xcode workspace definition, the App scheme and `Podfile.lock`; all three are now tracked in Git (`ios/App/App.xcworkspace/contents.xcworkspacedata`, `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme`, `ios/App/Podfile.lock`).

## Update 1.0.2 (build 6), 2026-09-19 — TestFlight internal, exam lengths

- Listening exam lengths 3/5/7 and a longer pause before a repeated word (commit `142f875`, feature `6861d2e`). IPA SHA-256 `f0fad75b5dcb5a3838e588ec25a9b72a9d5516cc9eba98045061dd5da2c2ee16`, `altool` validate and upload succeeded, delivery UUID `ca832a05-213c-4c71-a73f-738f4c12fc7f`. Processed `VALID`, internal state `IN_BETA_TESTING`, notes set; added to `L & N Public Beta`, beta review refused again ("another build in the same train is already in beta review"). Beta review for the public link stays queued behind build 4.

## Update 1.0.2 (build 5), 2026-09-19 — TestFlight internal, playback fix

- The native recorder now uses the play-and-record session category through the speaker and hands the session back as playback, which was why the Listen tab reported an audio error on iPhone. IPA SHA-256 `9e54ed08df4b9889962b5c52c25206837b3049e98776296f7751d712ad1accb9`, delivery UUID `ebd710fb-ea04-488c-85ea-0f6cd7266707`, processed `VALID`, internal state `IN_BETA_TESTING`, notes set.
- The account holder accepted the internal invitation (tester state `INSTALLED`), so internal builds now reach their device directly.
- Build 5 was added to `L & N Public Beta`; Apple refused a second beta review while build 4 of the same train is still in review. Resubmit build 5 for beta review once build 4 clears.

## Update 1.0.2 (build 4), 2026-09-19 — TestFlight internal

- Adds the Listen tab. Archive `LAndN-1.0.2-4.xcarchive`, IPA SHA-256 `803b73d1105e1397a6eb1d97cb7db32ae3e1790bdd978d9711a36a3ae1bd91f4`, `altool --validate-app` clean, delivery UUID `64b63788-30c4-4d6c-b9b7-840233f3fe4e`, processing state `VALID`.
- `L & N Internal Testers` has access to every build, so build 4 reached `IN_BETA_TESTING` there immediately; the What's New text was set through `PATCH /v1/betaBuildLocalizations`.
- The account holder's internal tester record was still `INVITED`, never accepted, so their device was following the public link and kept showing build 3. The invitation was resent (`POST /v1/betaTesterInvitations`), and build 4 was also added to `L & N Public Beta` and submitted for Beta App Review on 2026-09-19 (`WAITING_FOR_BETA_REVIEW`). Internal testing needs no review; the public link updates once Apple approves the beta.

## TestFlight

- Internal group: `L & N Internal Testers`
- Internal state: build `1.0 (2)` is **Testing**
- External group: `L & N Public Beta`
- Public link: https://testflight.apple.com/join/CpkT8m9C
- Public limit: 100 testers
- External build state: build `1.0 (2)` is **Testing**; automatic tester notification was enabled

The public link is active. Build 1 remains in the public group as rollback history; build 2 is the corrected current test build. Internal testers receive the build through TestFlight, and Apple automatically notifies the external tester because that option was enabled when build 2 was added.
