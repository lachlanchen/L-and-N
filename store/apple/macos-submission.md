# Mac submission — 2026-09-25

L & N **1.0.0 (1)** was submitted at **15:54 UTC**. App Store Connect confirmed
**Waiting for Review** for the exact processed universal Mac Catalyst build.
It is not yet an approved or publicly released native Mac app. Release is manual
after approval. The existing internal TestFlight group has the build in beta
testing; external Mac beta review has not been submitted.

The Mac version uses the existing L & N listing and bundle, supports Intel and
Apple silicon, and targets macOS 12 or later. No pricing, territory or account
changes were made. Existing iOS/watchOS and Google Play releases were preserved.

## What changed

- Desktop practice layout keeps the word, waveform and Record button together.
- Mac microphone permission handling and native audio engine integration.
- Command-1/2/3/4 tab shortcuts and Command-R Record/Stop.
- A GPU initialization/context-loss fallback prevents a blank Learn screen.
- Native PCM conversion, meter and waveform regression tests.

## Verification and limits

140 web tests and 7 native audio tests passed, along with lint, TypeScript,
production build, universal archive/export, app/installer signatures and Apple
validation. Actual Debug Mac Catalyst UI checks passed on an Intel virtual Mac.
Three genuine 1280×800 app screenshots reached Apple's COMPLETE delivery state.

Live microphone accuracy remains unverified: that host has no working audio
input. Repeated denied microphone requests recovered without a fake score or
stuck recording. The virtual GPU required the tested text fallback; real Mac 3D
rendering and Apple silicon runtime behavior were not verified. The second Mac's
intermittent connection prevented its test transfer. These are limitations, not
physical-device passes. Internal TestFlight notes ask testers to exercise real
recording, repeated attempts, recognized words, waveform and replay.

The App Store-signed archive was validated but macOS refused direct launch
outside store installation. Runtime screenshots and checks used the Debug build
of the same application source. No shipping test harness or synthetic scores
were included in Release.

Build/review IDs, hashes and source commits are in the
[artifact record](../artifacts/macos-release-1.0.0.json).
See [Mac build instructions](../../docs/macos.md). Private provider receipts and
shared-host coordination remain in ignored runtime storage. Test app and build
processes were stopped; shared desktop, tunnel and signing services were preserved.
