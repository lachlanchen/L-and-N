#!/usr/bin/env python3
"""Cut L/N onset tokens from word-timestamped transcripts.

usage: build_dataset.py WORDS_DIR OUT.npz

Words are labelled by spelling: an initial `l` is a lateral onset, an initial
`n` or silent-k `kn` is a nasal onset. Each token stores a 400 ms audio clip
(the 300 ms analysis window plus 100 ms of slack for onset jitter during
training), the lecture it came from, the preceding silence, and the word.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

from features import JITTER_MAX, LEAD_SAMPLES, SAMPLE_RATE, WINDOW_SAMPLES

JITTER_SAMPLES = JITTER_MAX
CLIP_SAMPLES = WINDOW_SAMPLES + 2 * JITTER_SAMPLES
MIN_PROBABILITY = 0.6
MIN_DURATION = 0.12
MAX_DURATION = 1.4
WORD_PATTERN = re.compile(r"^[a-z']+$")


def refine_onset(audio: np.ndarray, onset: int) -> int:
    """Move a Whisper word start to the first energetic 10 ms frame nearby.

    Whisper timestamps after a pause often begin inside the silence. The app
    finds the onset with an energy threshold (5 % of the peak, above the
    noise floor), so training clips are aligned the same way within a
    −80 ms … +200 ms search range around the Whisper start.
    """
    frame = SAMPLE_RATE // 100
    lo = max(0, onset - 8 * frame)
    hi = min(audio.size - frame, onset + 20 * frame)
    if hi <= lo:
        return onset
    frames = [float(np.sqrt(np.mean(audio[i : i + frame] ** 2))) for i in range(lo, hi, frame)]
    peak = max(frames)
    noise = float(np.median(frames[:4])) if len(frames) >= 4 else 0.0
    threshold = max(0.003, noise * 2.8, peak * 0.05)
    for index in range(len(frames) - 1):
        if frames[index] >= threshold and frames[index + 1] >= threshold:
            return lo + index * frame
    return onset


def label_for(word: str) -> int | None:
    if word.startswith("kn") or word.startswith("n"):
        return 1
    if word.startswith("l"):
        return 0
    return None


def main() -> None:
    words_dir = Path(sys.argv[1])
    out_path = Path(sys.argv[2])
    clips: list[np.ndarray] = []
    labels: list[int] = []
    lectures: list[str] = []
    gaps: list[float] = []
    words: list[str] = []
    for words_path in sorted(words_dir.glob("*.words.json")):
        stem = words_path.name.replace(".words.json", "")
        audio, rate = sf.read(words_dir / f"{stem}.wav", dtype="float32")
        assert rate == SAMPLE_RATE, rate
        entries = json.loads(words_path.read_text())["words"]
        kept = 0
        for index, entry in enumerate(entries):
            word = entry["word"].strip().lower().strip(".,!?;:\"“”’'()-")
            if not WORD_PATTERN.match(word) or len(word) < 2:
                continue
            label = label_for(word)
            if label is None or entry["probability"] < MIN_PROBABILITY:
                continue
            duration = entry["end"] - entry["start"]
            if not MIN_DURATION <= duration <= MAX_DURATION:
                continue
            onset = refine_onset(audio, int(round(entry["start"] * SAMPLE_RATE)))
            start = onset - LEAD_SAMPLES - JITTER_SAMPLES
            if start < 0 or start + CLIP_SAMPLES > audio.size:
                continue
            clip = audio[start : start + CLIP_SAMPLES]
            if np.abs(clip).max() < 0.01:
                continue
            previous_end = entries[index - 1]["end"] if index else 0.0
            clips.append(clip.astype(np.float16))
            labels.append(label)
            lectures.append(stem)
            gaps.append(round(entry["start"] - previous_end, 3))
            words.append(word)
            kept += 1
        print(f"{stem}: {kept} tokens", flush=True)
    np.savez_compressed(
        out_path,
        clips=np.stack(clips),
        labels=np.array(labels, dtype=np.int8),
        lectures=np.array(lectures),
        gaps=np.array(gaps, dtype=np.float32),
        words=np.array(words),
    )
    counts = np.bincount(np.array(labels), minlength=2)
    print(f"saved {len(labels)} tokens (L={counts[0]}, N={counts[1]}) to {out_path}")


if __name__ == "__main__":
    main()
