# Roadmap and sibling-app notes

Recorded 2026-09-18 from the maintainer's requests, so later sessions build the same way.

## L & N (this app)

- Keep the recognizer as the primary judge of which word was said; the on-device onset network shades the score and explains the cue. Never let a hand-tuned acoustic heuristic overrule a clear recognizer result.
- Retrain the onset network whenever new labelled speech is available (`tools/onset-model/`), and add Mandarin and Cantonese lecture audio when a YouTube download route works again from the workstation; the current model is trained on English lectures only.
- Cut the fixed five-second recording short as soon as the word is over (energy-based end-of-word detection) to make scoring feel immediate.
- Offer an on-device Whisper option for the PWA (transformers.js `whisper-tiny`/`base` with WebGPU, cached after the first download) so browsers that lack the Web Speech API do not depend on the private transcription service. Native iOS and Android already use the operating-system recognizers, which run on-device when a language pack is installed.

## Sibling apps the maintainer wants later

Each one is "download lesson videos from YouTube, cut the target words with Whisper word timestamps, train the same onset network on the new contrast, and ship the same app shell with a new curriculum":

1. **R vs L for Japanese learners** (English /r/–/l/, and Japanese ら行 flap versus English liquids).
2. **H vs F** (for speakers whose first language merges them, e.g. some Mandarin and Cantonese varieties, and Japanese ふ).
3. Any other minimal-pair contrast the same pipeline can label from spelling or from a pinyin/jyutping lookup.

Reusable pieces: `tools/onset-model/` (transcription, dataset, training, parity fixture), `src/lib/onset-model.ts` (feature extraction and inference), the recognizer-anchored scorer in `src/lib/scoring.ts`, the curriculum plus `curriculum-i18n.ts` structure, and `store/publishing-runbook.md` for shipping to both stores.

## Pricing

- Google Play will not let a published free app become paid; monetising the existing package means a one-time in-app product, which first needs a Google Payments merchant account.
- Apple allows switching to paid once the Paid Applications agreement is signed in Agreements, Tax, and Banking. Apple's USD 0.99 tier maps to CNY 8 and HKD 8.
