# Why L-and-N scores sound this way

L-and-N is designed as transparent coaching, not a pronunciation oracle. Its score separates what the recognizer heard, whether the minimal-pair contrast survived, what the target onset looked like acoustically, Chinese tone shape, recording quality, and confidence.

## What research changed

The important information is concentrated around the target consonant and its release into the vowel. Controlled L/N research identifies nasal-coupling and formant measures—including A1–P0, early-vowel F1 bandwidth, H4–H2kHz, and F2–F1 spacing—but also finds that useful cue weights differ across English, Mandarin varieties, Cantonese, speakers, and following vowels. [Cheng, Jongman & Sereno](https://kuppl.ku.edu/sites/kuppl/files/documents/publications/Cheng%20et%20al.%20LangSp%202022%20merger%20in%20Fuzhou%20Min.pdf), [Soo, Babel & Johnson](https://doi.org/10.1177/00238309241280182), [Wang et al.](https://doi.org/10.1177/00238309261453016)

That leads to five product rules:

1. Analyze the detected onset and early transition, not one FFT averaged over the whole word.
2. Compare L-like and N-like evidence using a profile for the selected language.
3. Personalize cautiously from repeated, high-quality attempts instead of treating one global threshold as truth.
4. Score Mandarin/Cantonese pitch shape separately from consonant identity. [Yuan & Liberman](https://www.isca-archive.org/interspeech_2016/yuan16b_interspeech.html)
5. Show low confidence and ask for another recording when alignment or signal quality is weak.

The current offline scorer implements onset detection, signal-quality gating, low-band nasal energy, an A1–P0 proxy, F1/F2 spacing, mid-frequency tilt, delivery stability, a separate tone contour score, and private on-device calibration. These browser estimates are useful for practice, but they are not a substitute for a trained phone-posterior model or expert judgment.

## Why the waveform is not the score

The live waveform makes silence, clipping, onset timing, and recording state visible. Correctness comes from word/phone alignment and several acoustic cues, not waveform height. The app therefore explains its evidence behind a disclosure instead of decorating the screen with an unexplained spectrogram. This follows visual-acoustic biofeedback guidance to connect a display with a reference and one actionable articulatory cue. [Hitchcock et al.](https://doi.org/10.1044/2022_AJSLP-22-00142)

## What the 3D mouth can and cannot show

The interactive cutaway shows the target model: a narrower tongue contact and side airflow for initial light L, or a wider oral closure with nasal airflow for N. It does **not** claim to show the learner's real tongue. Acoustic-to-articulatory inversion is many-to-one, so a microphone cannot uniquely recover physical tongue position. [Ghosh & Narayanan](https://pubmed.ncbi.nlm.nih.gov/20968386/)

Sensor-driven tongue avatars have shown promising short-term learning effects, but the available study was tiny and used electromagnetic tongue sensors—not phone audio. [Katz & Mehta](https://doi.org/10.3389/fnhum.2015.00612)

## Cantonese is a choice, not a defect label

Word-initial /n/→[l] is widespread and variable in Hong Kong Cantonese, with differences by speaker, word, and speaking context. L-and-N presents its Cantonese items as optional conservative/dictionary contrast training for clarity; it does not call common Hong Kong usage “lazy” or universally wrong. [Cheng, Babel & Yao](https://doi.org/10.16995/labphon.6461), [Soo, Babel & Johnson](https://doi.org/10.1177/00238309241280182)

## What is needed for real production accuracy

The server roadmap uses the known prompt with phone-level CTC/GOP contrast scoring, Whisper as a word-level cross-check, independent Chinese tone modeling, device/language calibration, and an abstain state. Modern research improves on forced alignment, but even strong published systems do not agree perfectly with people; one recent CTC-GOP study reported only moderate correlation with human ratings. [Witt & Young](https://doi.org/10.1016/S0167-6393(99)00044-8), [Xu et al.](https://www.isca-archive.org/interspeech_2021/xu21k_interspeech.pdf), [Parikh et al.](https://www.isca-archive.org/interspeech_2025/parikh25_interspeech.pdf)

Before claiming measured accuracy, L-and-N needs an expert-rated learner corpus across English, Mandarin regions, Hong Kong Cantonese, phones, and microphones. The release should publish held-out precision, recall, calibration error, and how often it declines to score.
