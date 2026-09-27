# Local recognition: what runs where

Updated 2026-09-27. This is an engineering assessment, not a claim that offline
word transcription has shipped.

## Already on the device

The waveform, acoustic features, L/N onset neural network, score, calibration
and saved practice history run locally. The onset model is bundled TypeScript;
there is no model download for those parts. Word transcription is separate:
native iOS uses Apple's speech APIs, while Android currently transcribes the
single captured recording through the consented L & N cloud route. Apple's
API is not a guarantee of offline recognition for every language/device.

The September 27 local speed change stops pitch analysis after the 36 contour
points the scorer actually uses. It does not resample the sound or change score
weights. A before/after comparison of the complete feature objects was identical
for synthetic 0.6-, 2- and 6-second signals at 16 and 48 kHz. One desktop run
reduced the 6-second/48-kHz calculation from 1,027 ms to 380 ms; this is not an
Honor hardware benchmark or an end-to-end recording latency claim.

## Offline transcription feasibility

A small Whisper model can run on-device through native whisper.cpp or an ONNX
browser worker. It needs a model package, memory, initialization and CPU/GPU
time; a smaller model is not automatically as accurate as the cloud model.
For example, the published quantized tiny-English ONNX encoder and merged
decoder total about 120 MB before the runtime and other model files.

A preliminary test of the already-cached multilingual tiny model correctly
recognized the synthetic references low, no, light, night and let, but returned
"Lab" for lap and "Now" for nap. A greedy bounded decode also turned lap into
"Let's go!". These are seven reference clips, not real-speaker evaluation and
not a phone benchmark. They do not justify replacing the working cloud route.
An experiment with the existing small model's decoder likewise changed let
to let's without a consistent latency benefit, so no live decoder settings
were changed.

Reproduce a finite screen with `tools/audio/benchmark_short_words.py` using an
existing local faster-whisper model and environment. The script reads only
the bundled studio clips; it does not access or upload user recordings. Its
`current` profile matches the existing beam/best-of settings and its `bounded`
profile is experimental, not deployed. `--current-only` skips the latter.

## Safe next implementation boundary

Owner decision: wait until English, Mandarin and Cantonese are all qualified;
do not release an English-only offline mode. Keep cloud transcription and iOS's
working native capture unchanged in the meantime. Any future offline pack must
be explicitly optional, not an automatic switch for everyone.
The Android recorder must still capture only once; the offline engine consumes
that recording after the microphone closes. Do not start a second speech-service
microphone or feed the expected answer to the recognizer.

Before enabling it:

- Pin the runtime, model revision and hashes; verify rights and downloaded bytes.
- Show download size/progress, cancellation and removal; never prefetch a model
  silently or bundle it into the ordinary PWA cache.
- Run inference in a worker/native queue with cancellation and a hard deadline.
- Show whether the result is local or cloud. A local-only choice must never
  silently upload audio; cloud fallback still requires existing explicit consent.
- Test actual Honor startup, warm latency, memory, airplane-mode operation,
  cancellation and repeated recordings, plus genuine learner speech across all
  English pairs. Browser/desktop tests cannot stand in for phone results.
- Qualify all three practice languages before exposing any offline mode.

SenseVoice via sherpa-onnx is another candidate worth benchmarking: its official
runtime documentation lists Chinese, English and Cantonese together, Android
support and a quantized model. That establishes a possible integration route,
not L/N accuracy or Honor latency. No SenseVoice runtime or model has been
added to the shipped app.

## Short-word guard and practice guidance

The cloud-result guard rejects sentence-like or mixed-word output before scoring
or calibration. It accepts a single word, a single Han character or romanized
syllable, and up to three identical repeats. It does not turn an unrelated word
into the displayed answer. A rejected result keeps the waveform and asks for
another word-only attempt, optionally repeating the word with a short pause.
This catches one class of hallucination, not every incorrectly recognized word.
The native iOS and successful browser recognition paths are unchanged.

Sentence practice is not added to the existing scorer: its onset analysis
assumes the target word starts the utterance. A carrier sentence requires
word-time alignment, then scoring just the target segment. Scoring a whole
sentence with the current onset window could judge the wrong consonant.

## Primary references

- [Transformers.js pipeline and browser caching](https://huggingface.co/docs/transformers.js/en/pipelines)
- [Tiny-English ONNX model files](https://huggingface.co/onnx-community/whisper-tiny.en-ONNX/tree/main/onnx)
- [faster-whisper decoding implementation](https://github.com/SYSTRAN/faster-whisper/blob/master/faster_whisper/transcribe.py)
- [whisper.cpp mobile examples](https://github.com/ggml-org/whisper.cpp/tree/master/examples)
- [sherpa-onnx SenseVoice languages and platforms](https://k2-fsa.github.io/sherpa/onnx/sense-voice/index.html)
