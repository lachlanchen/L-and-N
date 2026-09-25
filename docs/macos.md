# L & N for macOS

The Mac Catalyst target shares L & N's lessons, listening exercises, progress,
word recognition and acoustic analysis with the Apple app. It uses the same
`art.lazying.landn` bundle and existing App Store record. The Mac version is
independently numbered **1.0.0 (1)**; iOS and watchOS remain **1.0.6 (16)**.
Store submission and availability are recorded separately in release evidence.

The minimum deployment target is macOS 12. A universal release includes Intel
and Apple silicon. Recording uses AVAudioEngine and Apple's Speech framework;
it does not send audio to an L & N transcription server. Microphone and speech
permissions are requested only for recording. Progress and practice recordings
remain in the app's local storage. There is no login or advertising.

## Mac controls

Command-1 through Command-4 select Practice, Listen, Learn and Progress.
Command-R activates the same Record/Stop control as a click and respects its
busy state. Wide Mac windows place the word beside the waveform so recording
remains visible. Smaller windows retain the compact vertical layout.

The Learn view falls back to its explanatory text and sound controls when the
graphics driver cannot initialize WebGL or loses its context. A renderer error
must not blank the rest of the app.

## Build and checks

Use the existing Node installation and Xcode host; do not duplicate SDKs.

```sh
npm ci
npm run check
npx cap copy ios
cd native/apple-audio && swift test --jobs 2
```

On the Mac, from the repository root:

```sh
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -configuration Debug -destination 'platform=macOS,variant=Mac Catalyst' \
  -derivedDataPath /private/artifact/path/Debug -jobs 2 \
  CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual PROVISIONING_PROFILE_SPECIFIER= build
```

Debug builds contain an opt-in `--landn-smoke-test` harness. It uses visible UI
controls in the actual bundled WebKit view, captures screenshots and writes
`LAndN-Mac-QA/result.json` inside the app sandbox's temporary directory, then
exits. Release builds exclude this harness. The optional
`--landn-recording-test` checks repeated denied/unavailable/silent input recovery
on a quiet test host; it does not establish real spoken-word accuracy.

`native/apple-audio` tests the exact PCM conversion and waveform/meter code
compiled into the app, including silence, non-finite input and sample retention
when meter updates are throttled. Fixture tests are not microphone hardware QA.

For distribution, `tools/build-macos.sh` requires an existing signing keychain,
private password file, Mac Catalyst App Store profile and absolute artifact
output directory through its documented environment variables. It archives both
architectures, exports the signed installer and checks signatures. The export
settings belong to this developer team; other developers must supply their own.
It neither creates/replaces a keychain nor revokes identities. Do not commit
profiles, passwords, packages, DerivedData or raw operational logs.

## Shared hosts

Check current ownership before using a desktop or signing keychain. Use one
L & N app instance, stop it after evidence capture, and preserve other projects'
simulators, remote desktops and tunnels. Host-specific paths, test limitations
and coordination belong in the ignored runtime handoff.
