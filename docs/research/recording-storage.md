# Recording storage and stable practice controls

The generic “cannot save” message was not evidence that a phone was full.
Database availability, serialization, transaction failure and storage quota are
separate failure modes. The app does not impose a persistent recording-count
limit and must not delete earlier takes to make a new one fit.

## Saved audio

- Convert the replay Blob to bytes **before** opening an IndexedDB transaction.
  New records use `audioBytes` (ArrayBuffer); old Blob records remain readable
  without a destructive migration or a database-version change.
- Observe transaction completion before issuing requests. Request success alone
  is not proof that the transaction committed. Database open/transaction waits
  are bounded; a late connection after timeout is closed.
- A failed persistent write keeps the new take replayable in memory, with an
  explicit session-only warning. Only `QuotaExceededError` reports full storage.
  Temporary audio is bounded to 32 MiB; hitting that limit never evicts earlier
  takes. Closing the app loses session-only audio, not successfully stored takes.
- iOS creates a compact AAC/M4A **replay copy** on a background queue using
  [AVAudioFile](https://developer.apple.com/documentation/avfaudio/avaudiofile).
  Bitrate adapts to the captured sample rate. Encoding failure, or a compressed
  container larger than a very short recording, falls back to the original PCM
  WAV. Full-rate PCM remains the input to waveform/features
  and scoring; system speech recognition continues to receive the original
  microphone stream. Existing recordings are not recompressed.
- No additional upload, model, account or cloud service is introduced. This is
  not an offline-recognition feature. Browser/OS storage remains subject to
  platform limits and data removal; do not uninstall to troubleshoot a save.

## Practice geometry

Word controls, waveform and fixed-height Record/Stop action precede changing
status, guidance, permission disclosure, errors and results. The feedback region
retains its greatest height for the current exercise so clearing a score cannot
shrink the document and clamp a scrolled viewport. Changing exercise resets this
reservation. No forced scroll-to-top or result autofocus is used. Update and
store prompts are below the practice controls.

## Regression coverage

Tests cover new-byte and legacy-Blob reads, committed transactions, aborted
writes, quota/clone/unknown errors, blocked/hung opens, late connection cleanup,
session replay, original PCM feature equality and WAV fallback. Apple audio
tests decode the compact file and verify duration, signal and reduced size at
16/44.1/48 kHz. Synthetic audio verifies mechanics, not pronunciation accuracy.

Browser geometry checks exercise repeated captures across four UI languages,
three practice languages and narrow/desktop widths, including scrolled retry,
storage failure and reload. Debug-only Apple smoke tests exercise the real UI
and WKWebView persistence with an explicitly synthetic native-capture fixture;
this is not a physical microphone or free-space measurement.
