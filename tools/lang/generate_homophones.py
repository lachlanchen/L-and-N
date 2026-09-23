#!/usr/bin/env python3
"""Build the homophone table the scorer uses for Mandarin and Cantonese.

A recognizer asked for 南 often returns 男: same syllable, different character.
Judging by character marks that attempt wrong, so the app judges by sound. For
every Mandarin and Cantonese word in the curriculum this writes the set of Han
characters that share the word's syllable, ignoring tone, because tone is scored
separately and because two characters that differ only in tone still share the
l/n initial this app teaches.

Cantonese readings come from pycantonese with pinyin as a cross-check: the
colloquial dictionary sometimes records the Hong Kong n/l merger, and a merged
entry would otherwise drop an n- character into an l- set.

    python3 tools/lang/generate_homophones.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CURRICULUM = ROOT / "src" / "data" / "curriculum.ts"
OUT = ROOT / "src" / "data" / "han-homophones.json"
SCAN = range(0x4E00, 0x9FA6)
MAX_PER_SYLLABLE = 80
# Standard readings where the pycantonese dictionary lists the merged form.
JYUTPING_OVERRIDES = {"粒": "nap1", "凹": "nap1", "零": "ling4"}


def curriculum_words() -> dict[str, set[str]]:
    words: dict[str, set[str]] = {"zh-CN": set(), "yue-HK": set()}
    text = CURRICULUM.read_text()
    for block in re.split(r"\n  \{", text):
        language = re.search(r"language: '([^']+)'", block)
        if not language or language.group(1) not in words:
            continue
        for field in ("word", "pair"):
            found = re.search(rf"{field}: '([^']+)'", block)
            if found:
                words[language.group(1)].add(found.group(1))
    return words


def mandarin_syllable(char: str) -> str | None:
    from pypinyin import Style, lazy_pinyin

    reading = (lazy_pinyin(char, style=Style.NORMAL) or [""])[0]
    return reading or None


def cantonese_syllable(char: str) -> str | None:
    import pycantonese

    reading = JYUTPING_OVERRIDES.get(char)
    if not reading:
        found = pycantonese.characters_to_jyutping(char)
        reading = (found[0][1] if found else None) or ""
    reading = re.sub(r"\d", "", reading)
    return reading or None


def main() -> None:
    words = curriculum_words()
    table: dict[str, dict[str, list[str]]] = {"zh-CN": {}, "yue-HK": {}}
    syllable_of = {"zh-CN": mandarin_syllable, "yue-HK": cantonese_syllable}

    for language, entries in words.items():
        wanted: dict[str, str] = {}
        for entry in entries:
            char = entry.split(" ")[0][:1]
            syllable = syllable_of[language](char)
            if not syllable:
                print(f"no reading for {char!r} ({language})", file=sys.stderr)
                continue
            wanted[syllable] = char
        for syllable, char in sorted(wanted.items()):
            table[language][syllable] = [char]
        for code in SCAN:
            candidate = chr(code)
            syllable = syllable_of[language](candidate)
            if syllable not in table[language]:
                continue
            bucket = table[language][syllable]
            if candidate in bucket or len(bucket) >= MAX_PER_SYLLABLE:
                continue
            if language == "yue-HK":
                # Reject a character whose Mandarin initial disagrees: that is
                # the signature of a merged dictionary entry, not a homophone.
                mandarin = mandarin_syllable(candidate) or ""
                if mandarin and mandarin[0] in "ln" and mandarin[0] != syllable[0]:
                    continue
            bucket.append(candidate)

    OUT.write_text(json.dumps(table, ensure_ascii=False, indent=1, sort_keys=True) + "\n")
    for language, groups in table.items():
        print(language, len(groups), "syllables,", sum(len(v) for v in groups.values()), "characters")
    print("wrote", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
