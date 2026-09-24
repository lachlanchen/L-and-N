# Android empty-recognition repair (1.0.9 / 18)

## Report and verified code path

An Honor Magic 7 Pro learner reported clear English L words classified as N;
the recognized-text field was **empty**, not “night” or “no”. Device logs from
that phone were not available. This is not evidence that its recognizer
transcribed L as N.

Android 1.0.8 opened WebView media capture and an independent native speech
recognizer. Native unavailability/errors/timeouts produced an empty transcript
and prohibited the private transcription fallback. The scorer then accepted
the empty result and classified the onset acoustically. That English-trained
heuristic is not a validated substitute for recognition across phones, speakers
or Chinese languages. Earlier release notes claiming a working Android server
fallback overstated the actual native call path.

Android documents microphone-input arbitration: a competing consumer can
receive silence. Its API 33 recorded-audio input is optional and unsupported
recognizers may still open the microphone. Neither mechanism is a reliable
cross-OEM repair without device-specific qualification.

Sources: [audio-input sharing](https://developer.android.com/media/platform/sharing-audio-input),
[recorded recognizer input](https://developer.android.com/reference/android/speech/RecognizerIntent#EXTRA_AUDIO_SOURCE).

## Repair boundaries

- Android uses one WebView recording for waveform, analysis, replay and online
  word recognition. No competing native recognizer is started; call-oriented
  noise suppression/gain processing is not requested on Android.
- Online recognition is **off until explicit consent**, disclosed in all four
  UI languages and revocable in Practice. The user-started clip is sent over
  HTTPS to the existing first-party service and discarded after processing.
  No target word or expected answer is sent to bias transcription.
- The microphone closes before decoding/network work. Cancelling aborts the
  transcription; failed HTTP requests are not retried as language problems.
- Empty/punctuation-only Android recognition leaves the waveform visible but
  produces **no L/N judgment, score, history entry or calibration sample**.
- iOS recording/recognition and its native UI are unchanged. This repair does
  not certify iOS as perfect. PWA scoring behavior is not changed by the
  Android-only guard.
- Gateway rate limits accommodate a normal short-word drill (24 requests per
  minute per client); the request-size and one-upstream concurrency guards
  remain in force. Busy/unavailable recognition is never a pronunciation grade.

## Qualification scope

Regression coverage includes consent, cancellation, one microphone, release
before upload, unchanged iOS routing, blank-result abstention, and L/N
transcripts preserved without target-word substitution. Existing acoustic,
curriculum, purchase and UI tests remain required.

The public endpoint returned the correct identities for the bundled studio
clips **light, night, low and no**, using the Android WebView origin. These
are reference-clip checks, not a representative human/accent accuracy study or
a physical Honor test. Keep exact package hashes, emulator results and provider
submission receipts in the release record/private evidence. Real Honor
confirmation remains valuable after the update.
