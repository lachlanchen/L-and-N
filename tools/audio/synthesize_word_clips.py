#!/usr/bin/env python3
"""Synthesize, verify and package the studio word recordings.

Every exercise in `src/data/curriculum.ts` needs two bundled files:

* `public/audio/clips/<key>.mp3`  - the isolated word, used by the listening
  exam and concatenated at playback time;
* `public/audio/models/<key>.mp3` - the "Hear studio model" file for the
  practice tab: the same word twice with a short pause, nothing else.

A candidate is only `clear` when Whisper also hears the word itself (or the
same syllable, for Chinese) in that finished word-twice file: a clip with the
right initial but the wrong word ("read" for *lead*) is marked `weak` and the
exam skips it. Existing clips are re-checked the same way before being kept.

Two engines are supported. The default, `edge`, uses one Microsoft neural
voice per language (through the `edge-tts` package): a native speaker for
each of English, Mandarin and Cantonese, which matters because a learner must
not be able to tell "light" from "night" by the voice. It speaks the word on
its own, and retries with a carrier phrase and a slower rate. The `sovits`
engine is the local GPT-SoVITS server used for the first recordings; it
speaks a carrier phrase ("The practice word is line. Line.") and only the
trailing isolated repeat is kept, with seeds and phrases retried.

Each candidate is judged the way `verify_word_clips.py` does: Whisper must
hear the expected lateral or nasal initial, and (for English) the app's own
onset network must agree. Attempts continue until a candidate is `clear`; the
best candidate is kept either way and its verdict is recorded in
`src/data/word-clips.json`, so the exam can skip anything that did not verify.

Keys whose current clip is already `clear` are left alone unless `--force`
is given; their model file is still rebuilt from the clip.

usage: python3 tools/audio/synthesize_word_clips.py            # fill in what is missing or unverified
       python3 tools/audio/synthesize_word_clips.py --only en-low,en-lead
       python3 tools/audio/synthesize_word_clips.py --force    # regenerate everything
       python3 tools/audio/synthesize_word_clips.py --engine sovits --force
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.request import Request, urlopen

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from verify_word_clips import (  # noqa: E402
    CLIP_DIR,
    JYUTPING_OVERRIDES,
    LEAD_PAD,
    MODEL_PATH,
    OUT_PATH,
    RANK,
    ROOT,
    SAMPLE_RATE,
    TAIL_PAD,
    decode,
    energy_segments,
    initial_sound,
    onset_probability,
    verdict_for,
)

AUDIO_DIR = ROOT / "public" / "audio" / "models"
CURRICULUM = ROOT / "src" / "data" / "curriculum.ts"
WORK_DIR = ROOT / ".work" / "tts-candidates"
ENDPOINT = "http://127.0.0.1:9880/tts"
EDGE_VOICES = {"en": "en-US-JennyNeural", "zh": "zh-CN-XiaoxiaoNeural", "yue": "zh-HK-HiuGaaiNeural"}
# (how the text is framed, speaking rate); tried in order until a candidate is clear.
EDGE_ATTEMPTS = [("word", "+0%"), ("carrier", "+0%"), ("word", "-15%"), ("carrier", "-15%"), ("word", "-30%")]
REFERENCE = "/home/lachlan/ProjectsLFS/GPT-SoVITS/DATA/reference_last9p5s.wav"
SEEDS = [42, 7, 123, 2024, 31, 99, 5, 77]
PHRASES = {
    "en": ["The practice word is {w}. {w}.", "Now say {w}. {w}."],
    "zh": ["这个词是{w}。{w}。", "练习词是{w}。{w}。"],
    "yue": ["練習詞係{w}。{w}。", "呢個詞係{w}。{w}。", "{w}。{w}。{w}。"],
}
# Spellings Whisper uses for a correctly pronounced word (homophones, digits).
ENGLISH_ALIASES = {
    "nine": {"9", "nein"}, "night": {"knight", "nite"}, "light": {"lite"}, "no": {"know"},
    "noon": {"nun"}, "loon": {"lune"}, "need": {"knead"}, "nice": {"niece"}, "lock": {"loch"},
    "knock": {"nock"}, "lever": {"leaver"}, "not": {"knot"}, "net": {"nett"}, "knit": {"nit"},
    "low": {"lo"}, "lead": {"leed"},
}
WHISPER_LANGUAGE = {"en": "en", "zh": "zh", "yue": "yue"}
MODEL_GAP_SECONDS = 0.6


def curriculum_words() -> dict[str, tuple[str, str]]:
    """`{clip key: (word, language)}` from the curriculum source."""
    words: dict[str, tuple[str, str]] = {}
    for block in re.split(r"\n  \{", CURRICULUM.read_text()):
        id_match = re.search(r"id: '([^']+)'", block)
        word_match = re.search(r"word: '([^']+)'", block)
        if not id_match or not word_match:
            continue
        language, word_key = id_match.group(1).split("-")[:2]
        words[f"{language}-{word_key}"] = (word_match.group(1).split(" ")[0], language)
    return words


def synthesize(text: str, language: str, seed: int, destination: Path) -> None:
    payload = {
        "text": text,
        "text_lang": language,
        "ref_audio_path": REFERENCE,
        "prompt_text": "",
        "prompt_lang": "zh",
        "text_split_method": "cut0",
        "batch_size": 1,
        "media_type": "wav",
        "streaming_mode": False,
        "seed": seed,
        "top_k": 5,
        "top_p": 1,
        "temperature": 0.8,
        "repetition_penalty": 1.35,
    }
    request = Request(
        ENDPOINT,
        data=json.dumps(payload, ensure_ascii=False).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=240) as response:
        destination.write_bytes(response.read())


def synthesize_edge(text: str, language: str, rate: str, destination: Path) -> None:
    import asyncio

    import edge_tts

    partial = destination.with_suffix(".part")

    async def run() -> None:
        await edge_tts.Communicate(text, EDGE_VOICES[language], rate=rate).save(str(partial))

    for attempt in range(4):
        try:
            asyncio.run(run())
            if partial.stat().st_size < 2000:
                raise RuntimeError("empty synthesis result")
            partial.replace(destination)
            return
        except Exception as error:  # noqa: BLE001 - transient DNS/network failures are common
            if attempt == 3:
                raise
            print(f"  retrying {destination.name} after {type(error).__name__}", flush=True)
            time.sleep(5 * (attempt + 1))


def word_only(word: str, language: str) -> str:
    return f"{word}." if language == "en" else f"{word}。"


def syllable(char: str, language: str) -> str | None:
    """Toneless romanization of one Chinese character, or None when unknown."""
    if not re.match(r"[一-鿿]", char):
        return None
    try:
        if language == "yue":
            import pycantonese

            jyutping = JYUTPING_OVERRIDES.get(char) or pycantonese.characters_to_jyutping(char)[0][1]
            if jyutping:
                return re.sub(r"\d", "", jyutping)
        from pypinyin import Style, lazy_pinyin

        return (lazy_pinyin(char, style=Style.NORMAL) or [None])[0]
    except Exception:  # noqa: BLE001 - romanization is best effort
        return None


def count_word(text: str, word: str, language: str) -> int:
    """How many times a transcription contains the word itself (or its syllable, for Chinese)."""
    if language == "en":
        tokens = re.findall(r"[a-z9]+", text.lower().replace("99", " 9 9 "))
        accepted = {word} | ENGLISH_ALIASES.get(word, set())
        return sum(token in accepted for token in tokens)
    target = syllable(word, language)
    if target is None:
        return text.count(word)
    return sum(syllable(char, language) == target for char in text)


def count_initial(text: str, expected: str, language: str) -> int:
    """How many words (or characters) of a transcription start with the expected l or n."""
    if language == "en":
        return sum(initial_sound(token, language) == expected for token in re.findall(r"[a-z]+", text.lower()))
    return sum(initial_sound(char, language) == expected for char in text if re.match(r"[一-鿿]", char))


def hears_word(text: str, word: str, language: str) -> bool:
    """True when the transcription of the word-twice file contains the word itself."""
    return count_word(text, word, language) >= 1


def final_verdict(candidate: dict, expected: str, language: str, word: str, carrier_ok: bool) -> str:
    """Combine the clip checks with the two context checks.

    Whisper is unreliable on a lone syllable, so the word is confirmed either
    by hearing it in the word-twice file, or by hearing it (or at least the
    right l/n initial, which is the contrast being taught) twice in the carrier
    phrase (same voice, same text) while the isolated word still starts with
    the right consonant. Without one of those the clip cannot be `clear`.
    """
    base = candidate["verdict"]
    model_text = candidate["modelHeardAs"]
    model_initial = initial_sound(model_text, language)
    isolated_ok = model_initial == expected or (model_initial is None and candidate["heardInitial"] == expected)
    word_ok = hears_word(model_text, word, language) or (carrier_ok and isolated_ok)
    if not word_ok:
        return "weak" if base == "clear" else base
    if language == "en":
        probability = candidate["nasalProbability"]
        model_says = "N" if probability >= 0.5 else "L"
        confident = probability <= 0.35 or probability >= 0.65
        if candidate["heardInitial"] == expected and not (confident and model_says != expected):
            # Two independent hearings of the word outweigh an unsure onset network.
            return "clear"
    return base


def transcribe(asr, path: Path, language: str) -> str:
    result = asr.transcribe(str(path), language=WHISPER_LANGUAGE[language], fp16=True, beam_size=1, temperature=0)
    return result["text"].strip()


def judge(asr, onset_model: dict, source: Path, start: float, end: float, expected: str, language: str) -> dict:
    clip = decode(source, start, end)
    probability = onset_probability(clip, onset_model)
    with tempfile.NamedTemporaryFile(suffix=".wav") as handle:
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", str(source),
             "-ac", "1", "-ar", str(SAMPLE_RATE), handle.name],
            check=True,
        )
        heard_text = transcribe(asr, Path(handle.name), language)
    heard = initial_sound(heard_text, language)
    return {
        "start": round(start, 3),
        "end": round(end, 3),
        "nasalProbability": round(probability, 3),
        "heardAs": heard_text,
        "heardInitial": heard,
        "verdict": verdict_for(expected, probability, heard, language),
    }


def isolated_repeat(samples: np.ndarray) -> tuple[float, float] | None:
    """The trailing repeat of a carrier phrase, padded a little."""
    spans = energy_segments(samples)
    if len(spans) < 2:
        return None
    duration = len(samples) / SAMPLE_RATE
    start, end = spans[-1]
    return max(0.0, start - LEAD_PAD), min(duration, end + TAIL_PAD)


def whole_word(samples: np.ndarray) -> tuple[float, float] | None:
    """A recording that contains only the word: everything between the first and last sound."""
    spans = energy_segments(samples)
    if not spans:
        return None
    duration = len(samples) / SAMPLE_RATE
    return max(0.0, spans[0][0] - LEAD_PAD), min(duration, spans[-1][1] + TAIL_PAD)


def write_clip(source: Path, start: float, end: float, target: Path) -> None:
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", str(source),
         "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-q:a", "3", "-map_metadata", "-1", str(target)],
        check=True,
    )


def write_model(clip: Path, target: Path) -> None:
    """The practice-tab file: the word, a short pause, the word again."""
    gap = f"aevalsrc=0:d={MODEL_GAP_SECONDS}:s=44100:c=mono"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(clip), "-i", str(clip),
         "-filter_complex", f"{gap}[g];[0:a][g][1:a]concat=n=3:v=0:a=1[out]",
         "-map", "[out]", "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-q:a", "3", "-map_metadata", "-1", str(target)],
        check=True,
    )


def clip_seconds(path: Path) -> float:
    return len(decode(path)) / SAMPLE_RATE


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="large-v3-turbo")
    parser.add_argument("--only", default="", help="comma-separated clip keys to (re)generate")
    parser.add_argument("--force", action="store_true", help="regenerate even clips that are already clear")
    parser.add_argument("--seeds", default=",".join(map(str, SEEDS)), help="sovits engine only")
    parser.add_argument("--engine", choices=["edge", "sovits"], default="edge")
    args = parser.parse_args()
    seeds = [int(seed) for seed in args.seeds.split(",") if seed]

    import whisper

    onset_model = json.loads(MODEL_PATH.read_text())
    asr = whisper.load_model(args.model, device="cuda")
    words = curriculum_words()
    failures: list[str] = []
    existing = json.loads(OUT_PATH.read_text())["clips"] if OUT_PATH.exists() else {}
    only = {key for key in args.only.split(",") if key}
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    CLIP_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    clips: dict[str, dict] = {}
    for key, (word, language) in sorted(words.items()):
        expected = "N" if (language == "en" and word.startswith(("n", "kn"))) else None
        if expected is None:
            # Chinese entries carry the target in the romanization of the key.
            expected = "N" if key.split("-", 1)[1].startswith("n") else "L"
        clip_path = CLIP_DIR / f"{key}.mp3"
        model_path = AUDIO_DIR / f"{key}.mp3"
        current = existing.get(key)
        keep = (
            current is not None and current.get("verdict") == "clear" and clip_path.exists()
            and not args.force and (not only or key not in only)
        )
        if only and key not in only and not keep:
            continue
        if keep:
            write_model(clip_path, model_path)
            model_heard = transcribe(asr, model_path, language)
            if hears_word(model_heard, word, language):
                clips[key] = dict(current)
                clips[key]["seconds"] = round(clip_seconds(clip_path), 3)
                clips[key].setdefault("evidence", {})["modelRecognizedAs"] = model_heard
                print(f"{key:12s} kept  ({clips[key]['seconds']:.2f}s) model={model_heard!r}", flush=True)
                continue
            print(f"{key:12s} redo  existing clip heard as {model_heard!r}", flush=True)

        carrier_ok = False
        carrier_text = ""
        if args.engine == "edge":
            carrier_file = WORK_DIR / f"{key}-edge-carrier-r0.mp3"
            if not carrier_file.exists():
                synthesize_edge(PHRASES[language][0].format(w=word), language, "+0%", carrier_file)
            carrier_text = transcribe(asr, carrier_file, language)
            carrier_ok = count_word(carrier_text, word, language) >= 2 or count_initial(carrier_text, expected, language) >= 2

        evaluated: list[dict] = []
        best: dict | None = None
        max_seconds = 1.6 if language == "en" else 1.0
        if args.engine == "edge":
            attempts = [
                (f"{key}-edge-{mode}-r{rate.strip('+%').replace('-', 'm')}.mp3", mode, rate, None)
                for mode, rate in EDGE_ATTEMPTS
            ]
        else:
            attempts = [
                (f"{key}-p{phrase_index}-s{seed}.wav", "carrier", None, (phrase_index, seed))
                for phrase_index in range(len(PHRASES[language]))
                for seed in seeds
            ]
        for file_name, mode, rate, sovits in attempts:
            source = WORK_DIR / file_name
            if not source.exists():
                if args.engine == "edge":
                    text = word_only(word, language) if mode == "word" else PHRASES[language][0].format(w=word)
                    try:
                        synthesize_edge(text, language, rate, source)
                    except Exception as error:  # noqa: BLE001 - a voice that yields no audio for a rare character
                        print(f"  {file_name}: no synthesis ({type(error).__name__}), trying the next framing", flush=True)
                        evaluated.append({"source": file_name, "verdict": "unusable"})
                        continue
                else:
                    synthesize(PHRASES[language][sovits[0]].format(w=word), language, sovits[1], source)
            samples = decode(source)
            span = whole_word(samples) if mode == "word" else isolated_repeat(samples)
            if span is None or span[1] - span[0] < 0.18 or span[1] - span[0] > max_seconds:
                evaluated.append({"source": file_name, "verdict": "unusable"})
                continue
            candidate = judge(asr, onset_model, source, span[0], span[1], expected, language)
            with tempfile.TemporaryDirectory() as folder:
                trial_clip = Path(folder) / "clip.mp3"
                trial_model = Path(folder) / "model.mp3"
                write_clip(source, candidate["start"], candidate["end"], trial_clip)
                write_model(trial_clip, trial_model)
                candidate["modelHeardAs"] = transcribe(asr, trial_model, language)
            candidate["heardWord"] = hears_word(candidate["modelHeardAs"], word, language)
            candidate["verdict"] = final_verdict(candidate, expected, language, word, carrier_ok)
            candidate.update({"source": file_name, "mode": mode})
            evaluated.append(candidate)
            confidence = abs(candidate["nasalProbability"] - 0.5)
            if best is None or (RANK[candidate["verdict"]], -confidence) < (RANK[best["verdict"]], -abs(best["nasalProbability"] - 0.5)):
                best = candidate
            if candidate["verdict"] == "clear" and (language != "en" or confidence >= 0.3):
                break

        if best is None:
            print(f"{key:<12} bad   no usable candidate from {len(evaluated)} attempts; the word keeps its practice entry without studio audio", flush=True)
            failures.append(key)
            continue
        write_clip(WORK_DIR / best["source"], best["start"], best["end"], clip_path)
        write_model(clip_path, model_path)
        model_heard = best["modelHeardAs"]
        clips[key] = {
            "seconds": round(clip_seconds(clip_path), 3),
            "expected": expected,
            "verdict": best["verdict"],
            "evidence": {
                "origin": args.engine,
                "voice": EDGE_VOICES[language] if args.engine == "edge" else "gpt-sovits reference",
                "source": best["source"],
                "nasalProbability": best["nasalProbability"],
                "recognizedAs": best["heardAs"],
                "modelRecognizedAs": model_heard,
                "heardWord": best["heardWord"],
                "carrierRecognizedAs": carrier_text,
                "carrierOk": carrier_ok,
                "attempts": len(evaluated),
            },
        }
        print(f"{key:12s} {best['verdict']:5s} p={best['nasalProbability']:.3f} heard={best['heardAs']!r} "
              f"model={model_heard!r} ({best['source']}, {len(evaluated)} attempts)", flush=True)

    merged = {**existing, **clips}
    for key in list(merged):
        if key not in words:
            del merged[key]
    payload = {
        "note": "Isolated-word clips in public/audio/clips/<key>.mp3 and word-twice model files in public/audio/models/<key>.mp3, synthesized and verified by tools/audio/synthesize_word_clips.py (see evidence.origin and evidence.voice per clip)",
        "verifiedWith": {"recognizer": args.model, "onsetModel": onset_model["version"]},
        "clips": merged,
    }
    OUT_PATH.write_text(json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n")
    counts: dict[str, int] = {}
    for clip in merged.values():
        counts[clip["verdict"]] = counts.get(clip["verdict"], 0) + 1
    if failures:
        print("no studio audio for:", ", ".join(failures), flush=True)
    print(f"wrote {OUT_PATH.relative_to(ROOT)}: {counts}")


if __name__ == "__main__":
    main()
