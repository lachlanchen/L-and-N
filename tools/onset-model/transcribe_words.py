#!/usr/bin/env python3
"""Transcribe lecture media with word timestamps for the L/N onset dataset.

usage: transcribe_words.py OUT_DIR MEDIA [MEDIA ...]

For every media file this writes OUT_DIR/<stem>.wav (16 kHz mono) and
OUT_DIR/<stem>.words.json with [{"start","end","word","probability"}].
Existing outputs are skipped so the job can be resumed.
"""
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path


def slug(path: Path) -> str:
    match = re.search(r"\[([A-Za-z0-9_-]{11})\]", path.stem)
    return match.group(1) if match else re.sub(r"[^A-Za-z0-9]+", "-", path.stem)[:40]


def main() -> None:
    out_dir = Path(sys.argv[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    media = [Path(p) for p in sys.argv[2:]]
    import whisper  # noqa: WPS433 (heavy import kept local)

    model = None
    for path in media:
        stem = slug(path)
        wav = out_dir / f"{stem}.wav"
        words_path = out_dir / f"{stem}.words.json"
        if words_path.exists():
            print(f"skip {stem}", flush=True)
            continue
        if not wav.exists():
            subprocess.run(
                ["ffmpeg", "-v", "error", "-y", "-i", str(path), "-vn", "-ac", "1", "-ar", "16000", str(wav)],
                check=True,
            )
        if model is None:
            model = whisper.load_model(os.environ.get("WHISPER_MODEL", "large-v3-turbo"), device="cuda")
        started = time.time()
        result = model.transcribe(
            str(wav),
            language=os.environ.get("WHISPER_LANGUAGE", "en"),
            word_timestamps=True,
            fp16=True,
            beam_size=1,
            temperature=0,
            condition_on_previous_text=False,
        )
        words = [
            {
                "start": round(word["start"], 3),
                "end": round(word["end"], 3),
                "word": word["word"],
                "probability": round(word.get("probability", 0), 3),
            }
            for segment in result["segments"]
            for word in segment.get("words", [])
        ]
        words_path.write_text(json.dumps({"source": str(path), "words": words}, ensure_ascii=False))
        print(f"{stem}: {len(words)} words in {time.time() - started:.0f}s", flush=True)


if __name__ == "__main__":
    main()
