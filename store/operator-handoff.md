# Store publication handoff

Updated: 2026-09-05

This is the secret-free, durable handoff. The live local noVNC URL, process ownership, browser targets, private artifact delivery receipt, and shared-profile caveats are recorded in the ignored file `.runtime/store/handoff.md`.

## L & N

- Repository: `/home/lachlan/ProjectsLFS/L-And-N`
- PWA: https://l-and-n.lazying.art/
- Signed Android test APK: https://l-and-n.lazying.art/downloads/L-and-N-1.0-build2-test.apk
- APK SHA-256: `9b018d62df3c2e0ca1dc3004bd8c0b30fc08459e12b83fe96a395467c4839934`
- Google package: `art.lazying.landn`
- Apple ID: `6808872450`
- iOS bundle: `art.lazying.landn`
- watchOS bundle: `art.lazying.landn.watchkitapp`
- Apple team: `Q8M2S2FY77`

Formal submission state:

- Google Play Production `1.0.0 (1)`: **Changes in review**. This is the initial full release, not a staged rollout.
- Apple App Store iOS/watchOS `1.0 (1)`: **Waiting for Review**. The first release is manual, so approval must be followed by one explicit release action.

Testing state:

- Google Play internal `1.0 (2)`: **Available to internal testers** at https://play.google.com/apps/internaltest/4701251861700553150.
- TestFlight internal: build `1.0 (1)` is assigned to `L & N Internal Testers`; the account holder is invited.
- TestFlight public beta: https://testflight.apple.com/join/CpkT8m9C, build **Waiting for Review**, limit 100. The URL will not admit testers before Beta App Review approval.

Release evidence and exact hashes are in `store/artifacts/`. Store declarations and provider outcomes are in the platform submission documents. The signed APK is available through the first-party URL above; Android signing material, Apple profiles, exported binaries, browser cookies, and private email-recipient details are intentionally excluded from Git.

The iOS/watchOS archive was built on the Mac reached through the local SSH alias `echomind-kvm-macos`. The current reproducible artifacts there are:

- `/Users/lachlanchen/Projects/L-And-N/release/LAndN-1.0.0-1.xcarchive`
- `/Users/lachlanchen/Projects/L-And-N/release/export-1.0.0-1/App.ipa`

## EchoMind reference

- Sanitized repository: `/home/lachlan/ProjectsLFS/EchoMindSanitized/EchoMind`
- TestFlight public beta: https://testflight.apple.com/join/bKGrC3Jn
- Google Play open test: https://play.google.com/apps/testing/art.lazying.echomind
- Google Play internal test: https://play.google.com/apps/internaltest/4701510550966449647

EchoMind's formal store release remains `NOT_READY`; its own release facts and approval ledger must be used before changing Production or App Store state. Do not infer that L & N approval authorizes an EchoMind formal release.

The long-running EchoMind display `:94` / noVNC `6194` / CDP `9294` is currently owned by an Alibaba administration runtime, not a store-publishing browser. Do not repurpose or stop it. Use the single L & N store stack in the private runtime handoff for the current review, and create a separately checked EchoMind store stack only when EchoMind's release procedure calls for it.

## Next provider actions

1. Monitor Google Production until the review result is terminal; verify the public listing before claiming it is live.
2. Monitor TestFlight Beta App Review; after approval, verify the public link from a tester account.
3. Monitor Apple App Review. When the version becomes approved/pending developer release, use the manual release control once, then verify the storefront.
4. Update `store/release.yaml`, the two submission notes, evidence, and artifact manifests after every provider transition.
