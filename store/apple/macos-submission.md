# Mac submissions

## September 28 — qualified build 2; existing build 1 review preserved

Mac Catalyst **1.0.0 (2)** contains the latest Practice and Listen layout fixes,
pair hold-to-repeat/Stop, recording-history improvements and more resilient,
space-efficient replay storage. It is built for Intel and Apple silicon from
the same functional app source as the new iOS/Android test releases, with an
independent Mac build number. Apple server validation and upload passed; build2
is VALID and available in the existing internal TestFlight group.

12 actual Debug Catalyst checks passed on the Intel virtual Mac, including
three synthetic capture/storage cycles, reload/replay, fixed control geometry,
language/lesson navigation and repeated denied/silent-capture recovery. There
is no physical microphone, audible-output or Apple silicon runtime claim.
The signed App Store archive was validated, not directly installed as a store
download. Existing recordings and shared host services were preserved.

The original **1.0.0 (1)** review is still **In Review**, unchanged. Replacing it
would restart the queue; the owner's explicit queue choice is pending. Do not
call build 2 a formal submission. See the
[current artifact and provider state](../artifacts/formal-release-20260928.json).

## September 25 — first submission

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
