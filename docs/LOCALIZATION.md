# Interface languages, not practice languages

The React interface used by the PWA and Capacitor iOS/Android/Mac targets supports
English, Arabic, Spanish, French, Japanese, Korean, Vietnamese, Simplified Chinese,
Traditional Chinese, German and Russian, plus the existing Cantonese interface.
That is **12 UI languages**. The compact SwiftUI watch companion is separate;
this change does not claim to add these languages to its native screens.

The three practice languages remain English, Mandarin and Cantonese. Selecting a
UI language never changes the selected practice language, word, IPA, studio clip,
recognition locale, score model, purchase entitlement or recording history.

## Coverage and safeguards

- Every UI leaf has a translation: navigation, Learn principles and model labels,
  waveform description, recording states, listening rounds, score feedback,
  history, storage failures, online-recognition disclosure and purchase messages.
- All 118 exercises have localized meanings. The existing English, Chinese and
  Cantonese word-specific cues are retained. The eight added languages use
  localized core L/N airflow guidance plus applicable nasal endings, silent k,
  Mandarin/Cantonese tone guidance and the Cantonese variation note. These are
  concise teaching cues, not purported literal translations of every old cue.
- Target words, Han characters, IPA and recording/model inputs are never translated.
- Arabic uses right-to-left UI text; words, IPA, L/N selectors and signal/model
  coordinates retain their intended orientation. Mixed-script values are isolated.
- Parameterized strings must preserve every placeholder. Missing UI keys or word
  meanings fail tests instead of silently falling back to another language.
- Locale selection follows a saved preference, then the device language, then
  English. A browser denying local storage can still select a language.

## Validation and release scope

`src/i18n.test.ts` verifies the locale set, complete key/placeholder coverage,
exercise coverage and immutable practice data. `src/App.test.tsx` checks switching
across all four tabs without changing practice language or words.

The source UI and any deployed web release can precede native store binaries.
Do not infer a new TestFlight or production release from this document. Check
the versioned store receipts for actual native availability.
