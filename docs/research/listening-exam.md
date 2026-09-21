# The listening exam

Added 2026-09-19.

Producing the contrast is only half the skill: many learners cannot yet hear
it. The Listen tab plays a random run of one minimal pair, for example
"light night light light night", and the learner taps the word heard at each
position. Nothing is graded until the whole answer is submitted, so the test
measures perception across the sequence rather than memory of the last word.

## How a sequence is built

- One minimal pair per exam, chosen by the learner; five words by default, or three or seven. Longer runs were dropped because they test memory more than hearing.
- Positions are independent coin flips, so repeats happen; telling "light light" from "light night" is the point.
- Two guards keep a sequence usable: both words always appear, and no word repeats more than three times in a row. Words are separated by 0.8 s of silence, plus 0.35 s more before a repeat of the same word, so "night night" is heard as two words rather than one long one.
- The answer sheet is ordered. Tapping a word appends it, undo removes the last, and submit is enabled only when every position has an answer.
- Scoring is per position, with the played word, the chosen word, and a replay button for each row. Results feed a listening accuracy figure on the Progress tab and count towards the practice streak.

## Studio recordings and why a few words stay out of the exam

Updated 2026-09-20. Every exercise ships two synthesized files, built and
verified by `tools/audio/synthesize_word_clips.py`:

- `public/audio/clips/<key>.mp3`: the isolated word, played by the exam
  (words are concatenated at playback time, so no phrase is synthesized live);
- `public/audio/models/<key>.mp3`: the practice-tab "Hear studio model"
  file, which is now the word twice with a 0.6 s pause. The earlier carrier
  phrase ("The practice word is light. Light.") was dropped at the
  maintainer's request so the learner hears only the pronunciation.

The voice is one Microsoft neural voice per language through `edge-tts`
(`en-US-JennyNeural`, `zh-CN-XiaoxiaoNeural`, `zh-HK-HiuGaaiNeural`), a
native speaker for each language. One voice per language matters: if the two
words of a pair came from different voices, the exam could be answered by
timbre instead of by the consonant. The first recordings came from the local
GPT-SoVITS server; that voice (a Mandarin reference) mangled Cantonese
completely (老 came out as "hello", 男 as "lam") and nasalized several
English laterals (lead as "read", let as "wet"), so it is kept only as the
`--engine sovits` option.

Each clip passes four checks before it is `clear`:

1. Whisper (large-v3-turbo) transcribes the isolated clip and its first
   consonant must be the expected lateral or nasal.
2. The app's own onset network scores the clip as the app would (English
   decides with it; for Chinese it is advisory, since it was trained on
   English speech).
3. Whisper transcribes the finished word-twice file and must hear the word
   itself, or
4. Whisper transcribes the same voice saying the carrier phrase and must hear
   the word, or at least the right l/n initial, twice, while the word-twice
   file still starts with the right consonant.

Whisper is unreliable on a lone Chinese syllable (it wrote 拿 for 南 and
"NAM" for 男), which is why the carrier phrase is still synthesized for
verification even though it is no longer shipped.

| Verdict | Words |
| --- | --- |
| clear, used in the exam | 107 of 118 |
| weak, practice tab only | 蘭 laan4, 農 nung4, 廉 lim4, 亂 lyun6, 嫩 nyun6, 腍 nam4, 諾 nok6, 捺 naat6, 溺 nik6, 聶 nip6, 尿 niào |

For the weak words Whisper either hears the opposite initial in context (難
for 蘭, 弄 for 農), which is the Hong Kong n/l merger showing up in the
recognizer rather than a fault in the voice, or cannot settle on a word at
all for a lone checked-tone syllable (聶, 捺, 溺, 諾). The pipeline cannot
prove those clips, so their pairs are left out of ear training but stay in
the practice tab; the isolated clip still starts with the right consonant in
every case. One Cantonese pair, 笠 lap1 / 粒 nap1, was dropped altogether
because the neural voice itself says 粒 with the merged l- initial, and a
studio model must not teach the merger. Rerunning the generator with a
different voice or recognizer is all that is needed to bring the weak words
in.

The curriculum has 59 pairs: 16 English, 22 Mandarin and 21 Cantonese
(`src/data/curriculum.ts`). The 2026-09-21 additions cover every remaining
final (韵母) that takes both l- and n- with a same-tone pair. Mandarin now
has a, e, ai, ei, ao, an, ang, eng, ong, i, ie, iao, iu, ian, in, iang, ing,
u, uo, uan, ü and üe (辣/纳, 乐/讷, 赖/耐, 类/内, 狼/囊, 棱/能, 裂/镍,
料/尿, 林/您, 凉/娘, 零/宁, 落/诺, 卵/暖, 略/虐 …); ou has no common
same-tone n- word (耨 nòu) and en/un have no l- syllable, so they are left
out. Cantonese now has aam, aan, aap, aat, ai, am, ei, eoi, im, in, ing, ip,
ik, iu, o, oi-less ou, ok, ong, oeng, ung and yun (犁/泥, 林/腍, 廉/黏,
靈/寧, 獵/聶, 料/尿, 羅/挪, 落/諾, 郎/囊, 亂/嫩, 立/納, 辣/捺, 力/溺,
良/娘 …); finals such as aa, au, oi and eon only pair across different
tones, which would let a learner answer by tone instead of by consonant, so
they are not used.

## Playback

Each verified word is shipped as its own small file under
`public/audio/clips/` (118 files, about 1 MB in total), written by the
generator. Nothing seeks inside a recording at runtime: a
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
