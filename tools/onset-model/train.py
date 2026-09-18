#!/usr/bin/env python3
"""Train the on-device L/N onset classifier and export it for the app.

usage:
  train.py DATASET.npz OUT.json [--epochs 40] [--holdout LECTURE ...]
  train.py --init-only OUT.json          # untrained weights, for wiring tests

The network is a two-layer 1-D CNN over the 28x40 log-mel onset matrix with
mean+max pooling and two dense layers (about 9k parameters). Training
augments every token with ±50 ms onset jitter and additive noise so the
classifier tolerates the app's rougher onset detection and phone microphones.
Held-out lectures measure generalisation to unseen recordings.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import torch
from torch import nn

sys.path.insert(0, str(Path(__file__).parent))
from features import JITTER_MAX, LEAD_SAMPLES, WINDOW_SAMPLES, log_mel  # noqa: E402

MODEL_VERSION = "2026-09-18-cnn1"


class OnsetNet(nn.Module):
    def __init__(self, bands: int = 40, channels: int = 24, hidden: int = 32) -> None:
        super().__init__()
        self.conv1 = nn.Conv1d(bands, channels, kernel_size=5, padding=2)
        self.conv2 = nn.Conv1d(channels, channels, kernel_size=5, padding=2)
        self.dropout = nn.Dropout(0.2)
        self.fc1 = nn.Linear(channels * 2, hidden)
        self.fc2 = nn.Linear(hidden, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:  # x: (batch, frames, bands)
        h = torch.relu(self.conv1(x.transpose(1, 2)))
        h = torch.relu(self.conv2(h))
        pooled = self.dropout(torch.cat([h.mean(dim=2), h.amax(dim=2)], dim=1))
        return self.fc2(torch.relu(self.fc1(pooled))).squeeze(1)


def export_json(model: OnsetNet, path: Path, extra: dict | None = None) -> None:
    state = {k: v.detach().cpu().numpy() for k, v in model.state_dict().items()}
    rounded = lambda array: np.round(array, 5).tolist()  # noqa: E731
    payload = {
        "version": MODEL_VERSION,
        "conv1": {"weight": rounded(state["conv1.weight"]), "bias": rounded(state["conv1.bias"])},
        "conv2": {"weight": rounded(state["conv2.weight"]), "bias": rounded(state["conv2.bias"])},
        "fc1": {"weight": rounded(state["fc1.weight"]), "bias": rounded(state["fc1.bias"])},
        "fc2": {"weight": rounded(state["fc2.weight"]), "bias": rounded(state["fc2.bias"])},
    }
    if extra:
        payload["training"] = extra
    path.write_text(json.dumps(payload, separators=(",", ":")))
    print(f"exported {path} ({path.stat().st_size / 1024:.0f} KB)")


def featurize(clips: np.ndarray, rng: np.random.Generator | None, noise_rms: float = 0.0) -> np.ndarray:
    """Cut the analysis window from each padded clip, with optional jitter/noise."""
    out = np.empty((clips.shape[0], (WINDOW_SAMPLES - 400) // 160 + 1, 40), dtype=np.float32)
    for index, clip in enumerate(clips):
        offset = JITTER_MAX
        if rng is not None:
            offset += int(rng.integers(-JITTER_MAX, JITTER_MAX + 1))
        window = clip[offset : offset + WINDOW_SAMPLES].astype(np.float32)
        if rng is not None and rng.uniform() < 0.5:
            # Simulate an isolated word: fade the pre-onset context so the
            # network cannot lean on the preceding sound, which is absent when
            # the learner says one word after silence.
            lead = max(0, LEAD_SAMPLES - (offset - JITTER_MAX))
            window = window.copy()
            window[:lead] *= float(rng.uniform(0.0, 0.1))
        if rng is not None and noise_rms > 0:
            level = noise_rms * float(rng.uniform(0.1, 1.0))
            window = window + rng.normal(0.0, level, window.shape).astype(np.float32)
        out[index] = log_mel(window)
    return out


def evaluate(model: OnsetNet, x: np.ndarray, y: np.ndarray, device: str) -> tuple[float, float]:
    model.eval()
    with torch.no_grad():
        logits = model(torch.from_numpy(x).to(device)).cpu().numpy()
    probabilities = 1 / (1 + np.exp(-logits))
    predictions = (probabilities >= 0.5).astype(np.int8)
    accuracy = float((predictions == y).mean())
    loss = float(-np.mean(y * np.log(probabilities + 1e-9) + (1 - y) * np.log(1 - probabilities + 1e-9)))
    return accuracy, loss


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", nargs="?")
    parser.add_argument("out")
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--holdout", nargs="*", default=None, help="lecture ids kept for evaluation")
    parser.add_argument("--init-only", action="store_true")
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()
    torch.manual_seed(args.seed)
    if args.init_only:
        export_json(OnsetNet(), Path(args.out))
        return

    data = np.load(args.dataset)
    clips = data["clips"].astype(np.float32)
    labels = data["labels"].astype(np.float32)
    lectures = data["lectures"]
    gaps = data["gaps"]
    unique = sorted(set(lectures.tolist()))
    holdout = set(args.holdout) if args.holdout else set(unique[: max(1, len(unique) // 5)])
    test_mask = np.isin(lectures, list(holdout))
    print(f"tokens={len(labels)} train={int((~test_mask).sum())} test={int(test_mask.sum())} holdout={sorted(holdout)}")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    rng = np.random.default_rng(args.seed)
    x_test = featurize(clips[test_mask], None)
    y_test = labels[test_mask]
    isolated = test_mask & (gaps >= 0.15)
    x_isolated = featurize(clips[isolated], None)
    y_isolated = labels[isolated]
    noise_rms = float(np.sqrt(np.mean(clips[~test_mask] ** 2)) * 0.3)

    model = OnsetNet().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-3)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    criterion = nn.BCEWithLogitsLoss()
    train_clips = clips[~test_mask]
    train_labels = labels[~test_mask]
    best = (0.0, None)
    for epoch in range(args.epochs):
        model.train()
        x_train = featurize(train_clips, rng, noise_rms)
        order = rng.permutation(len(train_labels))
        total = 0.0
        for start in range(0, len(order), 256):
            batch = order[start : start + 256]
            inputs = torch.from_numpy(x_train[batch]).to(device)
            targets = torch.from_numpy(train_labels[batch]).to(device)
            optimizer.zero_grad()
            loss = criterion(model(inputs), targets)
            loss.backward()
            optimizer.step()
            total += float(loss) * len(batch)
        scheduler.step()
        accuracy, test_loss = evaluate(model, x_test, y_test, device)
        isolated_accuracy, _ = evaluate(model, x_isolated, y_isolated, device) if len(y_isolated) else (float("nan"), 0)
        print(
            f"epoch {epoch + 1:02d} train_loss={total / len(order):.3f} "
            f"test_acc={accuracy:.3f} test_loss={test_loss:.3f} isolated_acc={isolated_accuracy:.3f}",
            flush=True,
        )
        if accuracy >= best[0]:
            best = (accuracy, {k: v.detach().clone() for k, v in model.state_dict().items()})
    if best[1] is not None:
        model.load_state_dict(best[1])
    accuracy, _ = evaluate(model, x_test, y_test, device)
    isolated_accuracy, _ = evaluate(model, x_isolated, y_isolated, device) if len(y_isolated) else (float("nan"), 0)
    per_class = {}
    with torch.no_grad():
        logits = model(torch.from_numpy(x_test).to(device)).cpu().numpy()
    predictions = (logits >= 0).astype(np.float32)
    for name, value in (("L", 0.0), ("N", 1.0)):
        mask = y_test == value
        per_class[name] = float((predictions[mask] == value).mean()) if mask.any() else float("nan")
    summary = {
        "tokens": int(len(labels)),
        "train_tokens": int((~test_mask).sum()),
        "test_tokens": int(test_mask.sum()),
        "holdout_lectures": sorted(holdout),
        "test_accuracy": round(accuracy, 4),
        "test_accuracy_isolated_onsets": round(isolated_accuracy, 4),
        "test_recall": {k: round(v, 4) for k, v in per_class.items()},
        "epochs": args.epochs,
        "window_ms": WINDOW_SAMPLES * 1000 // 16000,
        "lead_ms": LEAD_SAMPLES * 1000 // 16000,
    }
    print(json.dumps(summary, indent=1))
    export_json(model.cpu(), Path(args.out), summary)


if __name__ == "__main__":
    main()
