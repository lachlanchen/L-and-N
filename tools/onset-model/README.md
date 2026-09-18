# On-device L/N onset model

Everything needed to rebuild `src/lib/onset-model.json`, the tiny convolutional
network the app runs on the phone to judge whether a word started with a
lateral /l/ or a nasal /n/.

## Pipeline

```bash
# 1. Word-timestamped transcripts (GPU, openai-whisper large-v3-turbo)
python3 tools/onset-model/transcribe_words.py WORK/words LECTURE.mp4 [...]

# 2. Cut labelled onset clips (label = spelling: l… → L, n…/kn… → N)
python3 tools/onset-model/build_dataset.py WORK/words WORK/dataset.npz

# 3. Train, evaluate on held-out lectures, export the weights
python3 tools/onset-model/train.py WORK/dataset.npz src/lib/onset-model.json --epochs 40

# 4. Pin the TypeScript port to the Python reference
python3 tools/onset-model/parity_fixture.py src/lib/onset-model.json src/lib/__fixtures__/onset-model-parity.json
npx vitest run src/lib/onset-model.test.ts
```

`features.py` and `src/lib/onset-model.ts` implement the same 300 ms,
28-frame, 40-band mean-normalised log-mel front end; change them together.

## Data used for the shipped model

See the `training` block inside `src/lib/onset-model.json` for token counts,
held-out lectures, and accuracy. The corpus is the Leonard Susskind lecture
archive already present on the workstation under
`YoutubeDownloader/downloads/PLERGeJGfknBTR_nXt5QL88xJF5LhDZBnG`; the
download route for new YouTube sources is in `store/publishing-runbook.md`
and `docs/roadmap.md`. Lecture media never enters this repository.

## Why this design

- Whisper word timestamps give thousands of real /l/ and /n/ onsets from
  ordinary speech for free; spelling is the label.
- Per-token mean normalisation removes microphone and gain differences, and
  ±50 ms onset jitter plus additive noise during training make the network
  tolerant of the app's simple energy-based onset detector.
- About nine thousand parameters run in plain TypeScript in a few
  milliseconds, so scoring needs no network, no WebAssembly, and no model
  download.
- The recognizer still decides which word was said; the network shades the
  score and explains the cue. A trained onset judge replaces the hand-tuned
  spectral centroids that labelled every real recording as nasal.
