# The listening exam

Added 2026-09-19.

Producing the contrast is only half the skill: many learners cannot yet hear
it. The Listen tab plays a random run of one minimal pair, for example
"light night light light night", and the learner taps the word heard at each
position. Nothing is graded until the whole answer is submitted, so the test
measures perception across the sequence rather than memory of the last word.

## How a sequence is built

- One minimal pair per exam, chosen by the learner; five words by default, or eight or twelve.
- Positions are independent coin flips, so repeats happen; telling "light light" from "light night" is the point.
- Two guards keep a sequence usable: both words always appear, and no word repeats more than three times in a row.
- The answer sheet is ordered. Tapping a word appends it, undo removes the last, and submit is enabled only when every position has an answer.
- Scoring is per position, with the played word, the chosen word, and a replay button for each row. Results feed a listening accuracy figure on the Progress tab and count towards the practice streak.

## Why some words are missing from the exam

The prompts are the bundled studio recordings, which are carrier phrases
("The practice word is light. Light."). Only the trailing repeat is usable,
because it is surrounded by silence; a clip cut from inside the carrier picks
up the previous word, and Whisper transcribed such clips as "clever" for
*lever* and "It's nice" for *nice*.

`tools/audio/verify_word_clips.py` therefore cuts the trailing repeat from
every recording and grades it with two independent checks: Whisper must
transcribe it with the expected lateral or nasal initial, and the app's own
trained onset network must agree. For Mandarin and Cantonese the recognizer
decides, because the onset network was trained on English speech only.

| Verdict | Words |
| --- | --- |
| clear, used in the exam | 23 of 26 |
| bad, excluded | *lead*, *low* |
| weak, excluded | *loon* |

Both checks agree that the synthesized repeats of *low* and *lead* are nasal:
Whisper hears "No" and "me", and the onset network gives them 0.98 and 0.92
nasal probability. *Loon* sits on the fence at 0.52. A listening test built
on those clips would train the wrong contrast, so the pairs low/no,
need/lead, and loon/noon are left out of ear training. They still appear in
the practice tab, where the carrier phrase supplies context.

Regenerating those three recordings with a better voice would return them to
the exam; the offsets and verdicts are data, so rerunning the verifier is the
only step needed afterwards.

## Playback

Each verified word is shipped as its own small file under
`public/audio/clips/` (26 files, about 150 KB in total), cut by the verifier
from the studio recording. Nothing seeks inside a recording at runtime: a
media element cannot seek without HTTP range support, and neither the
preview server nor every native asset handler provides it, which is exactly
how the first version of the exam ended up playing the whole carrier phrase
on a phone.

Two routes play those files. Web Audio decodes them once and schedules them
on the audio clock, so the gaps between words are exact and a repeated word
is fetched only once. If the audio context cannot start within 1.2 seconds
(iOS after the native recorder held the audio session, a web view with no
gesture, or a browser without Web Audio), the same sequence plays through
one `<audio>` element that was primed with a silent clip inside the tap. If
both routes fail, the screen shows the localized error with the technical
reason underneath so it can be reported. On iOS the native recorder now
leaves the audio session in a playback-capable category, which was the
original cause of the refusal.
