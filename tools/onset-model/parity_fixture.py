#!/usr/bin/env python3
"""Write a fixture that pins the TypeScript feature and network code to the
Python reference. The forward pass here is written in plain numpy so it also
checks the exported JSON independently of PyTorch.

usage: parity_fixture.py MODEL.json OUT.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from features import SAMPLE_RATE, WINDOW_SAMPLES, log_mel  # noqa: E402


def numpy_forward(model: dict, features: np.ndarray) -> float:
    def conv(x: np.ndarray, layer: dict) -> np.ndarray:  # x: (frames, in)
        weight = np.asarray(layer["weight"])  # (out, in, k)
        bias = np.asarray(layer["bias"])
        kernel = weight.shape[2]
        pad = kernel // 2
        padded = np.pad(x, ((pad, pad), (0, 0)))
        out = np.zeros((x.shape[0], weight.shape[0]))
        for t in range(x.shape[0]):
            patch = padded[t : t + kernel]  # (k, in)
            out[t] = np.einsum("oik,ki->o", weight, patch) + bias
        return np.maximum(out, 0)

    hidden = conv(conv(features, model["conv1"]), model["conv2"])
    pooled = np.concatenate([hidden.mean(axis=0), hidden.max(axis=0)])
    h1 = np.maximum(np.asarray(model["fc1"]["weight"]) @ pooled + np.asarray(model["fc1"]["bias"]), 0)
    logit = float(np.asarray(model["fc2"]["weight"]) @ h1 + np.asarray(model["fc2"]["bias"]))
    return 1 / (1 + np.exp(-logit))


def main() -> None:
    model = json.loads(Path(sys.argv[1]).read_text())
    rng = np.random.default_rng(2026)
    t = np.arange(WINDOW_SAMPLES) / SAMPLE_RATE
    # A nasal-murmur-like start (low harmonics, quiet) followed by a louder vowel-like segment.
    signal = 0.05 * np.sin(2 * np.pi * 130 * t) + 0.02 * np.sin(2 * np.pi * 260 * t)
    vowel = (t >= 0.09) * (0.25 * np.sin(2 * np.pi * 140 * t) + 0.12 * np.sin(2 * np.pi * 700 * t) + 0.08 * np.sin(2 * np.pi * 1250 * t))
    samples = (signal + vowel + rng.normal(0, 0.004, t.shape)).astype(np.float32)
    features = log_mel(samples)
    fixture = {
        "samples": np.round(samples, 6).tolist(),
        "features": np.round(features, 5).tolist(),
        "nasalProbability": round(numpy_forward(model, features.astype(np.float64)), 6),
        "modelVersion": model["version"],
    }
    Path(sys.argv[2]).write_text(json.dumps(fixture, separators=(",", ":")))
    print(f"fixture written: probability={fixture['nasalProbability']}")


if __name__ == "__main__":
    main()
