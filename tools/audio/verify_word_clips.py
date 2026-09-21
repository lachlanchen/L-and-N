#!/usr/bin/env python3
"""Choose and verify the isolated-word clip used by the listening exam.

Each bundled recording in `public/audio/models/` is a carrier phrase followed
by the practice word on its own ("The practice word is light. Light."). Some
of the synthesized repeats are not clearly the target sound, and a listening
test built on an ambiguous clip would teach the wrong contrast. This script
therefore considers every occurrence of the word in the file, cuts a clip
around each one, and judges the candidates with two independent checks:

1. Whisper transcribes the isolated clip; its first consonant must be the
   expected lateral or nasal.
2. The app's own trained onset network (`src/lib/onset-model.json`) scores the
   clip exactly as the app would, including the same energy-based onset
   detection.

The best candidate per word is written to `src/data/word-clips.json` together
with the evidence and a verdict. `createListeningExam` only offers pairs whose
two clips are both `clear`.

The chosen clip is also written out as its own small file under
`public/audio/clips/<key>.mp3`, so the app never has to seek inside the
carrier recording (media elements cannot seek without HTTP range support,
which native asset handlers and simple static servers may not provide).

usage: python3 tools/audio/verify_word_clips.py [--model large-v3-turbo]
       python3 tools/audio/verify_word_clips.py --cut-only   # regenerate clip files from the JSON
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "onset-model"))
from features import LEAD_SAMPLES, SAMPLE_RATE, WINDOW_SAMPLES, log_mel  # noqa: E402
from parity_fixture import numpy_forward  # noqa: E402

AUDIO_DIR = ROOT / "public" / "audio" / "models"
OUT_PATH = ROOT / "src" / "data" / "word-clips.json"
CLIP_DIR = ROOT / "public" / "audio" / "clips"
MODEL_PATH = ROOT / "src" / "lib" / "onset-model.json"
FRAME = SAMPLE_RATE // 100
LEAD_PAD = 0.08
TAIL_PAD = 0.12
CONFIDENT_LOW = 0.35
CONFIDENT_HIGH = 0.65
KANA_INITIALS = {"ね": "n", "な": "n", "の": "n", "に": "n", "ぬ": "n", "ら": "l", "り": "l", "れ": "l", "ろ": "l", "る": "l"}


def decode(path: Path, start: float | None = None, end: float | None = None) -> np.ndarray:
    command = ["ffmpeg", "-v", "error"]
    if start is not None:
        command += ["-ss", f"{start:.3f}"]
    if end is not None:
        command += ["-to", f"{end:.3f}"]
    command += ["-i", str(path), "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(command, check=True, capture_output=True).stdout, dtype=np.float32)


def energy_segments(samples: np.ndarray) -> list[tuple[float, float]]:
    count = len(samples) // FRAME
    energy = np.sqrt((samples[: count * FRAME].reshape(count, FRAME) ** 2).mean(axis=1))
    threshold = max(0.008, float(energy.max()) * 0.08)
    spans: list[list[int]] = []
    start = -1
    for index in range(count + 1):
        loud = index < count and energy[index] >= threshold
        if loud and start < 0:
            start = index
        if not loud and start >= 0:
            spans.append([start, index])
            start = -1
    merged: list[list[int]] = []
    for span in spans:
        if merged and span[0] - merged[-1][1] < 9:
            merged[-1][1] = span[1]
        else:
            merged.append(span)
    return [(a * FRAME / SAMPLE_RATE, b * FRAME / SAMPLE_RATE) for a, b in merged if b - a >= 12]


# Standard readings where the pycantonese dictionary lists the colloquial n/l-merged form.
JYUTPING_OVERRIDES = {"粒": "nap1", "凹": "nap1", "零": "ling4"}


def initial_sound(text: str, language: str) -> str | None:
    """Lateral or nasal initial of a transcription, or None when undecidable."""
    cleaned = text.strip().strip(".,!?;:\"'“”‘’()[]…。，！？").strip()
    if not cleaned:
        return None
    head = cleaned[0]
    if head in KANA_INITIALS:
        return KANA_INITIALS[head].upper()
    if re.match(r"[一-鿿]", head):
        try:
            jyutping = ""
            if language == "yue":
                import pycantonese

                jyutping = JYUTPING_OVERRIDES.get(head) or pycantonese.characters_to_jyutping(cleaned)[0][1] or ""
            if not jyutping:
                # Jyutping and pinyin agree on the l/n initial for these
                # characters, so pinyin covers anything the Cantonese
                # dictionary does not list.
                from pypinyin import Style, lazy_pinyin

                jyutping = (lazy_pinyin(cleaned, style=Style.NORMAL) or [""])[0]
        except Exception:  # noqa: BLE001 - romanization is best effort
            return None
        if jyutping.startswith("l"):
            return "L"
        if jyutping.startswith("n"):
            return "N"
        return None
    lowered = cleaned.lower()
    if lowered.startswith("kn") or lowered.startswith("n"):
        return "N"
    if lowered.startswith("l"):
        return "L"
    return None


def onset_probability(samples: np.ndarray, model: dict) -> float:
    """Nasal probability using the same onset detection as the app."""
    count = max(1, len(samples) // FRAME)
    energy = np.sqrt((samples[: count * FRAME].reshape(count, FRAME) ** 2).mean(axis=1))
    threshold = max(0.003, float(np.median(energy[:4])) * 2.8, float(energy.max()) * 0.05)
    onset = 0
    for index in range(count - 1):
        if energy[index] >= threshold and energy[index + 1] >= threshold:
            onset = index * FRAME
            break
    window = np.zeros(WINDOW_SAMPLES, dtype=np.float32)
    start = max(0, onset - LEAD_SAMPLES)
    stop = min(len(samples), start + WINDOW_SAMPLES)
    window[: stop - start] = samples[start:stop]
    return float(numpy_forward(model, log_mel(window).astype(np.float64)))


def verdict_for(expected: str, probability: float, heard: str | None, language: str) -> str:
    model_says = "N" if probability >= 0.5 else "L"
    confident = probability <= CONFIDENT_LOW or probability >= CONFIDENT_HIGH
    if language in {"zh", "yue"}:
        # The onset network was trained on English speech only, so the
        # recognizer decides for Mandarin and Cantonese.
        if heard == expected:
            return "clear"
        return "weak" if heard is None and model_says == expected else "bad"
    if heard is not None and heard != expected:
        return "bad"
    if model_says != expected:
        return "bad" if confident else "weak"
    if heard == expected:
        return "clear"
    return "clear" if confident else "weak"


RANK = {"clear": 0, "weak": 1, "bad": 2}


def cut_clip_files(clips: dict[str, dict]) -> None:
    """Write each chosen clip as a standalone mp3 (re-encoded, so the cut is exact)."""
    CLIP_DIR.mkdir(parents=True, exist_ok=True)
    for key, clip in clips.items():
        source = AUDIO_DIR / f"{key}.mp3"
        target = CLIP_DIR / f"{key}.mp3"
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-ss", f"{clip['start']:.3f}", "-to", f"{clip['end']:.3f}", "-i", str(source),
             "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-q:a", "3", "-map_metadata", "-1", str(target)],
            check=True,
        )
    total = sum(path.stat().st_size for path in CLIP_DIR.glob("*.mp3"))
    print(f"wrote {len(clips)} clip files to {CLIP_DIR.relative_to(ROOT)} ({total / 1024:.0f} KB)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="large-v3-turbo")
    parser.add_argument("--cut-only", action="store_true", help="only regenerate public/audio/clips from the JSON")
    args = parser.parse_args()
    if args.cut_only:
        cut_clip_files(json.loads(OUT_PATH.read_text())["clips"])
        return
    import whisper

    onset_model = json.loads(MODEL_PATH.read_text())
    asr = whisper.load_model(args.model, device="cuda")
    clips: dict[str, dict] = {}

    for path in sorted(AUDIO_DIR.glob("*.mp3")):
        key = path.stem
        language, word = key.split("-", 1)
        expected = "N" if word.startswith(("n", "kn")) else "L"
        asr_language = "en" if language == "en" else "zh"
        samples = decode(path)
        duration = len(samples) / SAMPLE_RATE
        transcription = asr.transcribe(
            str(path), language=asr_language, word_timestamps=True, fp16=True, beam_size=1, temperature=0
        )
        spoken = [w for segment in transcription["segments"] for w in segment.get("words", [])]

        # Only the trailing repeat is usable: it is surrounded by silence, so a
        # clip cannot pick up a neighbouring word. Word timestamps inside the
        # carrier phrase were tried and rejected, because continuous speech
        # leaks the previous word into the clip ("is lever" transcribed as
        # "clever"). The recognizer output is still used below as one of the
        # two checks on the chosen clip.
        spans = energy_segments(samples)
        if len(spans) < 2:
            raise SystemExit(f"{key}: expected a carrier phrase and an isolated repeat")
        last = spans[-1]
        candidates = [
            (last[0], last[1], "final-segment"),
            (last[0], min(duration, last[1] + 0.1), "final-segment-long"),
        ]
        _ = spoken

        evaluated = []
        for start, end, origin in candidates:
            clip_start = max(0.0, start - LEAD_PAD)
            clip_end = min(duration, end + TAIL_PAD)
            if clip_end - clip_start < 0.18:
                continue
            clip = decode(path, clip_start, clip_end)
            probability = onset_probability(clip, onset_model)
            with tempfile.NamedTemporaryFile(suffix=".wav") as handle:
                subprocess.run(
                    ["ffmpeg", "-v", "error", "-y", "-ss", f"{clip_start:.3f}", "-to", f"{clip_end:.3f}",
                     "-i", str(path), "-ac", "1", "-ar", str(SAMPLE_RATE), handle.name],
                    check=True,
                )
                text = asr.transcribe(handle.name, language=asr_language, fp16=True, beam_size=1, temperature=0)["text"].strip()
            heard = initial_sound(text, language)
            state = verdict_for(expected, probability, heard, language)
            evaluated.append({
                "start": round(clip_start, 3),
                "end": round(clip_end, 3),
                "origin": origin,
                "nasalProbability": round(probability, 3),
                "heardAs": text,
                "heardInitial": heard,
                "verdict": state,
            })

        if not evaluated:
            raise SystemExit(f"{key}: no usable candidate clip")
        confidence = (lambda c: abs(c["nasalProbability"] - 0.5))
        best = sorted(evaluated, key=lambda c: (RANK[c["verdict"]], -confidence(c)))[0]
        clips[key] = {
            "start": best["start"],
            "end": best["end"],
            "expected": expected,
            "verdict": best["verdict"],
            "evidence": {
                "origin": best["origin"],
                "nasalProbability": best["nasalProbability"],
                "recognizedAs": best["heardAs"],
            },
        }
        print(f"{key:12s} {best['verdict']:5s} {best['start']:.2f}-{best['end']:.2f} "
              f"p={best['nasalProbability']:.3f} heard={best['heardAs']!r} ({best['origin']}, "
              f"{len(evaluated)} candidates)", flush=True)

    payload = {
        "note": "Isolated-word clips inside public/audio/models/<key>.mp3, chosen and verified by tools/audio/verify_word_clips.py",
        "verifiedWith": {"recognizer": args.model, "onsetModel": json.loads(MODEL_PATH.read_text())["version"]},
        "clips": clips,
    }
    OUT_PATH.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    cut_clip_files(clips)
    counts: dict[str, int] = {}
    for clip in clips.values():
        counts[clip["verdict"]] = counts.get(clip["verdict"], 0) + 1
    print(f"wrote {OUT_PATH.relative_to(ROOT)}: {counts}")


if __name__ == "__main__":
    main()
