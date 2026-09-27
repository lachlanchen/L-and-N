"""Offline, synthetic-reference comparison. Never reads or uploads user recordings.

Use the existing faster-whisper environment/model; no downloads or live writes.
Reference clips are teaching examples, NOT an accuracy estimate for real speakers.
"""
import argparse
import json
import time
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', type=Path, required=True)
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--cpu-threads', type=int, default=4)
    parser.add_argument('--current-only', action='store_true')
    parser.add_argument('--clips', nargs='+', help='Explicit reference clip names without .mp3')
    args = parser.parse_args()
    from faster_whisper import WhisperModel

    root = Path(__file__).resolve().parents[2]
    clips = sorted((root / 'public/audio/clips').glob('*.mp3'))
    if args.limit:
        clips = clips[:args.limit]
    if args.clips:
        clips = [root / 'public/audio/clips' / (name + '.mp3') for name in args.clips]
        if any(not clip.is_file() or clip.parent != root / 'public/audio/clips' for clip in clips):
            parser.error('Use existing reference clip names only')
    model = WhisperModel(str(args.model), device='cpu', compute_type='int8', cpu_threads=args.cpu_threads, local_files_only=True)
    profiles = {
        'current': {'beam_size': 5, 'best_of': 5},
        'bounded': {'beam_size': 1, 'best_of': 1, 'temperature': 0, 'max_new_tokens': 16},
    }
    if args.current_only:
        profiles.pop('bounded')
    for clip in clips:
        row = {'clip': clip.stem}
        language = clip.stem.split('-')[0]
        for name, options in profiles.items():
            start = time.perf_counter()
            try:
                segments, _ = model.transcribe(str(clip), language=language, vad_filter=True,
                    condition_on_previous_text=False, word_timestamps=False, **options)
                segments = list(segments)
                row[name] = {'text': ' '.join(s.text.strip() for s in segments).strip(),
                    'seconds': round(time.perf_counter() - start, 3),
                    'log_probability': [round(s.avg_logprob, 3) for s in segments]}
            except Exception as error:
                row[name] = {'error': type(error).__name__}
        print(json.dumps(row, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
