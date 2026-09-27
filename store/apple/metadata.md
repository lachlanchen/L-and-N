# App Store metadata

## Copy status — September 27, 2026

This file is the iOS English (U.S.) copy source, not a bulk-upload payload.
The promotional text below was saved to iOS 1.0.8 (19) and verified by provider
readback on September 27. During the owner-requested normal 1.0.9 (20) release,
the description below and version-specific release notes were saved and verified
in that new version. This is not yet public availability. The optional subtitle
remains staged; no release was created solely for copy changes.
See the [applied/staged receipt](../artifacts/store-copy-20260927.json).
Names, keywords, commercial settings, URLs and privacy declarations are unchanged.

## Primary locale — English (U.S.)

- Name: `L & N: Speech Practice`
- Subtitle: `Clearer sounds, one word`
- Proposed subtitle (staged): `Hear and practise L and N`
- Primary category: Education
- Secondary category: Health & Fitness
- Price: Paid up front; use the current regional App Store price. The US storefront was verified at USD 0.99 on September 27, 2026. This is a source correction, not a pricing change.
- Privacy policy: https://l-and-n.lazying.art/privacy.html
- Support URL: https://l-and-n.lazying.art/support.html
- Marketing URL: https://l-and-n.lazying.art
- Copyright: `2026 LazyingArt LLC`
- Release after approval: Manual

### Promotional text

Light or night? Train your ear with short listening rounds, practise one word, then replay your take beside the model. English, Mandarin and Cantonese.

### Keywords

`pronunciation,speech,English,Mandarin,Cantonese,L,N,minimal pairs,language,phonetics`

### Description — saved for iOS 1.0.9 (20)

Do light and night sound too similar? L & N gives you a small place to practise the difference, one pair at a time.

START BY LISTENING

Choose a pair and a round of 3, 5 or 7 words. Tap what you heard in order, then check each answer. Hear the two words again before trying another round.

TRY SAYING IT

Listen to the model, record one word and see what the recognizer heard. The feedback shows the sound cues behind the result, with a waveform to help you spot silence or recording problems.

HEAR YOUR OWN PROGRESS

Replay a saved take on its own or after the model. Your practice history stays on your device, so you can return to earlier attempts. Available storage still matters; clearing app data removes saved takes.

THREE PRACTICE LANGUAGES

Practise English, Mandarin or Cantonese. Choose your interface separately: English, Simplified Chinese, Traditional Chinese or Cantonese. Explore a 3D mouth cutaway for tongue placement and airflow, or use the compact Apple Watch listening drill.

Audio examples use synthetic voices. No account, ads or advertising trackers. Speech recognition uses Apple's speech services; whether it runs locally depends on the device and its settings.

L & N is a practice tool, not a clinical assessment. The feedback and mouth model help you explore a sound; they do not measure or diagnose your speech.

### What’s new in 1.0 — historical, not current release notes

The first release includes multilingual L/N drills, explainable acoustic scoring, waveform and onset-spectrum views, an interactive 3D mouth model, local progress, PWA support, and an Apple Watch companion drill.

## App Review notes

No account or login is required. To test scoring, select a practice language, tap Record, allow microphone and speech-recognition access, say the displayed word, and stop. If the simulator has no microphone input, all navigation, bundled model audio, the 3D Learn view, and the watch identification drill remain testable.

The native app invokes the operating system speech-recognition service and does not send audio to an L & N server. The privacy policy separately describes the hosted PWA fallback; that browser-only route is not used by the native binary.

The watchOS app is embedded as a companion with bundle ID `art.lazying.landn.watchkitapp` and provides a listen-and-identify drill without microphone access.
