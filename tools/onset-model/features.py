"""Log-mel onset features shared by the dataset builder, the trainer, and the
parity fixture for the TypeScript implementation in `src/lib/onset-model.ts`.

Every constant here is mirrored in the TypeScript module. Change both or the
shipped weights stop matching the features computed on the phone.
"""
from __future__ import annotations

import numpy as np

SAMPLE_RATE = 16_000
WINDOW_SAMPLES = 4_800  # 300 ms analysed per token
LEAD_SAMPLES = 640  # the window starts 40 ms before the detected onset
JITTER_MAX = 800  # ±50 ms of onset slack stored around every training clip
FRAME_SIZE = 400  # 25 ms
HOP_SIZE = 160  # 10 ms
FFT_SIZE = 512
MEL_BANDS = 40
MEL_MAX_HZ = 8_000.0
LOG_FLOOR = 1e-5
N_FRAMES = (WINDOW_SAMPLES - FRAME_SIZE) // HOP_SIZE + 1  # 28


def hz_to_mel(hz: float) -> float:
    return 2595.0 * np.log10(1.0 + hz / 700.0)


def mel_to_hz(mel: float) -> float:
    return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)


def mel_filterbank() -> np.ndarray:
    """HTK-style triangular filters over the 257 power-spectrum bins."""
    bins = FFT_SIZE // 2 + 1
    points = np.array([mel_to_hz(m) for m in np.linspace(0.0, hz_to_mel(MEL_MAX_HZ), MEL_BANDS + 2)])
    bin_hz = np.arange(bins) * SAMPLE_RATE / FFT_SIZE
    bank = np.zeros((MEL_BANDS, bins), dtype=np.float64)
    for band in range(MEL_BANDS):
        lower, centre, upper = points[band], points[band + 1], points[band + 2]
        rising = (bin_hz - lower) / max(centre - lower, 1e-9)
        falling = (upper - bin_hz) / max(upper - centre, 1e-9)
        bank[band] = np.clip(np.minimum(rising, falling), 0.0, None)
    return bank


_BANK = mel_filterbank()
_WINDOW = 0.5 - 0.5 * np.cos(2.0 * np.pi * np.arange(FRAME_SIZE) / FRAME_SIZE)


def log_mel(samples: np.ndarray) -> np.ndarray:
    """Return the (N_FRAMES, MEL_BANDS) mean-normalised log-mel matrix."""
    audio = np.zeros(WINDOW_SAMPLES, dtype=np.float64)
    clip = np.asarray(samples, dtype=np.float64)[:WINDOW_SAMPLES]
    audio[: clip.size] = clip
    frames = np.stack(
        [audio[start : start + FRAME_SIZE] * _WINDOW for start in range(0, WINDOW_SAMPLES - FRAME_SIZE + 1, HOP_SIZE)]
    )
    spectrum = np.fft.rfft(frames, n=FFT_SIZE, axis=1)
    power = spectrum.real**2 + spectrum.imag**2
    mel = np.log(power @ _BANK.T + LOG_FLOOR)
    return (mel - mel.mean(axis=0, keepdims=True)).astype(np.float32)


def token_window(audio: np.ndarray, onset_sample: int) -> np.ndarray:
    """Cut the analysis window for a token whose onset is at `onset_sample`."""
    start = onset_sample - LEAD_SAMPLES
    window = np.zeros(WINDOW_SAMPLES, dtype=np.float32)
    source_start = max(0, start)
    source_end = min(audio.size, start + WINDOW_SAMPLES)
    if source_end > source_start:
        window[source_start - start : source_end - start] = audio[source_start:source_end]
    return window
