# Listening-pair interruption recovery

The reported regression on iPhone build 18 was intermittent: play pair 1,
pair 2, then pair 1 again, and later taps could become silent or unavailable.
Force-closing the app temporarily restored playback. No physical-phone logs
were available, so the exact cause on that phone is not yet established.

## Identified gaps and fixes

- Downloads, response bodies, decoding, media metadata and `play()` promises
  could wait indefinitely. They now have deadlines and permit retry.
- Stop previously had no handle to cancel while playback was still loading.
  An abort signal now covers startup, word transitions and active playback.
- An old media request could affect the element used by a later pair. Each
  fallback sequence now owns its gesture-primed element and cleans up on exit.
- Web Audio's `running` state alone does not prove its clock is advancing.
  A bounded clock probe now selects the fallback when output is frozen.
  Stalls during playback become recoverable errors, not apparent success.
- A final 15-second preview deadline releases the UI even if an unexpected
  platform failure prevents completion. Existing answers are preserved.

WebKit's [running-but-frozen AudioContext report](https://bugs.webkit.org/show_bug.cgi?id=263627)
describes a related platform failure. It supports checking the output clock,
but does not prove that particular bug caused this user's incident.

## Qualification

Automated coverage includes hung fetch/decode/metadata/play, second-word
failure, cancellation before the handle exists, late completion after retry,
frozen output clocks, repeated pair 1/2/1/1 and UI recovery. The shared suite
currently passes 216 tests, lint, TypeScript and the production build.

Browser checks exercise actual clip completion through both playback routes;
the explicitly injected stalled-play test must recover before normal replay.
Native Debug-only checks verify both audio-ended events for repeated pairs in
English, Mandarin and Cantonese, plus stop and tab-change recovery.

The virtual Mac has no audio output device: its timer-only historical checks
are not evidence of audible playback. Stricter output checks exposed this
limitation. Native output qualification is being moved to an existing physical
Mac with an iOS simulator and a real output device. This remains simulator QA,
not a physical-iPhone or real-microphone accuracy test.

Build 19 is a candidate until its signed artifact and publication receipt are
recorded. Build 18 does not receive these bundled-code changes automatically.
