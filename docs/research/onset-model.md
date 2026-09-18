# The on-device L/N onset model

Written 2026-09-18, when the hand-tuned acoustic scorer was replaced.

## Why the first scorer was wrong

The launch version judged /l/ versus /n/ by comparing seven spectral
measurements of the word onset (low-band energy ratio, spectral tilt, an
A1–P0 nasal proxy, F1/F2 spacing, centroid, mid-band ratio, F1 bandwidth)
against hand-written reference centroids. Those centroids assumed a lateral
onset carries almost no energy below 450 Hz. Real voiced speech always does:
the fundamental and second harmonic of any voice sit there. Measured on the
app's own 26 studio recordings, the classifier called all 26 words nasal, and
on 300 real lecture words it was right 43 % of the time, worse than a coin.
Meanwhile the word recognizer (Apple, Google, or the private Whisper service)
was usually right, so a learner could see "light" recognized, a score of 80,
and "detected /n/" on the same card.

## What ships now

1. **The recognizer decides the detected sound.** If the transcript names the
   target word (or a homophone character for Chinese), the detected sound is
   the target. If it names the paired word, the detected sound is the pair,
   the word score is capped at 30, and the overall score at 45, with an
   explanation ("the recognizer heard 'night'"). Only when the transcript
   names neither word does the acoustic judge decide alone.
2. **A trained onset network shades the score.** A two-layer 1-D
   convolutional network (`src/lib/onset-model.ts`, weights in
   `src/lib/onset-model.json`, about nine thousand parameters) reads a
   28-frame × 40-band mean-normalised log-mel spectrogram of the 300 ms
   starting 40 ms before the detected onset and returns the probability that
   the onset is nasal. It runs in plain TypeScript in a few milliseconds on a
   phone. The old centroids contribute 15 % of the acoustic evidence and any
   personal calibration still applies on top.
3. **The onset window includes the nasal murmur.** The onset detector used a
   14 % of-peak threshold (−17 dB), which skipped the quiet murmur and
   measured the vowel instead. It now starts at 5 % of the peak (−26 dB).
4. **Recording ends when the word ends.** An energy-based end-of-word detector
   stops the recording after 650 ms of trailing silence (never before 900 ms,
   never without confirmed speech), so a short word scores in about a second
   instead of after the five-second cap.

## Training data and results

| Item | Value |
| --- | --- |
| Source | 21 Leonard Susskind lecture recordings already on the workstation (one per course) |
| Labelling | Whisper large-v3-turbo word timestamps; spelling gives the label (`l…` lateral, `n…`/`kn…` nasal) |
| Tokens | 11,105 (5,490 lateral, 5,615 nasal) after probability, duration, and level filters |
| Onset alignment | Whisper start refined by the same 5 % of-peak energy rule the app uses |
| Augmentation | ±50 ms onset jitter, additive noise at random level, pre-onset context faded on half of the tokens to imitate an isolated word |
| Held-out | 4 whole lectures (2,062 tokens) never seen in training |
| Accuracy on held-out lectures | 89.0 % (lateral recall 87.2 %, nasal recall 90.6 %) |
| Accuracy on held-out tokens preceded by ≥150 ms silence | 73–76 % (about 200 tokens; see limits) |
| Old centroid heuristic on 300 real tokens | 43 % |

Reproduce with the commands in `tools/onset-model/README.md`; the exact
figures for the shipped weights are in the `training` block of the JSON.

## Limits, stated plainly

- **One speaker dominates the corpus.** Nearly all tokens are one lecturer's
  voice with lecture-hall microphones. The held-out split separates
  recordings, not speakers, so 89 % is an optimistic estimate for a new
  speaker on a phone microphone. Mean normalisation and noise augmentation
  help, but real learner recordings are the missing validation set.
- **English only.** Mandarin and Cantonese words use the same network because
  the lateral-versus-nasal contrast is the same acoustic phenomenon, but no
  Chinese speech was available to train or test it (YouTube downloads from
  the workstation were refused during this work). The recognizer remains the
  primary judge for those languages.
- **Isolated words score lower in the lecture test.** Tokens after a pause in
  a lecture are often utterance starts with breath noise and looser Whisper
  timing, and there are few of them, so that figure is noisy. The app's own
  energy-based onset detector is more precise than a Whisper timestamp.
- **Not a clinical instrument.** The network reports a probability that the
  onset resembles the nasal class in its training data; it does not measure
  tongue position or velar opening. The app keeps saying so.

## Next steps that would raise accuracy

1. Record a small labelled set of real learner attempts through the app
   (both sounds, several speakers, phone microphones) and report accuracy on
   it before any further tuning.
2. Add Mandarin and Cantonese lecture or news audio; label with `pypinyin`
   and `pycantonese` initials.
3. Train on more speakers (any English talk with clear speech works; the
   pipeline is speaker-agnostic).
4. Try a slightly larger network or a 400 ms window once multi-speaker data
   exists; on the current corpus the extra capacity only overfits.
