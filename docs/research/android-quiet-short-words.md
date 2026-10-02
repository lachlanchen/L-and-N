# Android quiet, short-word capture correction

The next source update fixes false silence/short-word failures without changing
the recognizer, cloud consent, L/N model or iOS native recording path.

Capture validity previously used RMS from a Hann-windowed onset. That is useful
for onset acoustics but inappropriate for deciding whether the whole recording
contains speech: a correct nasal onset may be much quieter than its vowel.
`speechRms` now measures unwindowed AC energy across the active word; old history
entries without this optional field retain the RMS fallback.

Active-word voicing continuity no longer counts trailing pause padding as failed
speech. Quiet-onset and pitch availability floors are lower, and a natural
240 ms word can receive full duration-quality credit instead of requiring 700 ms.
Clearly recognized short “low/no” attempts no longer ask the learner to stretch
the word. A very brief unresolved take may still request another attempt.

Regression checks cover weak onsets followed by a clear vowel, short words,
padding invariance, missing/invalid audio, DC and legacy features. All 318 tests,
lint and the web build pass. This is a reproduced software correction, not a new
measured Honor Magic 7 Pro accuracy percentage. The source change is not an
assertion that a store binary or live PWA already contains it.
