# Recording history

The Progress tab shows the newest 12 attempts initially and appends another
12 as the learner scrolls. A **Load older attempts** button also works without
IntersectionObserver. Switching tabs retains the expanded count; reopening the
app starts with the newest batch again. Audio is read only when Replay is pressed.

Each entry includes its word, result, timestamp, recognized text when available,
and replay control. Missing or unplayable audio produces a message beside that
entry. Playback is cancelled when leaving the tab, starting a new recording, or
backgrounding the app; a delayed storage read cannot start stale playback.

## Retention and limitations

- New saves no longer automatically remove audio after 60 takes or summaries
  after 200 attempts. Existing saved data uses the same storage keys and format;
  there is no destructive migration.
- Full summaries and audio links are retained. Detailed acoustic arrays are kept
  only for the newest 200 attempts, preserving the recent calibration window
  without repeatedly expanding the Preferences JSON with older waveforms.
- Summaries still load from Preferences as a single metadata array. Rendering
  is incremental, not database-cursor pagination. Audio remains in IndexedDB.
- Local storage is finite. Failed saves show a warning and do not deliberately
  evict earlier recordings. If IndexedDB is absent, the in-memory fallback is
  explicitly labeled as session-only. Browser eviction, clearing app data, and
  uninstalling can still remove recordings. There is no cloud recording backup.
- Older builds already deleted audio beyond 60 takes and summaries beyond 200;
  those deleted items cannot be restored by this update. Entries whose audio is
  missing remain visible with a clear explanation.
- Listening-exam history remains capped at 200 results; this change concerns
  pronunciation recording history only.

## Verification and release boundary

`npm run check`: lint, 153 tests across 19 files, TypeScript and production PWA
build passed. Tests cover paging, duplicate/stale observer callbacks, four UI
locales, retention beyond both old limits, quota failure, missing playback,
playback URL cleanup, and cancellation during a pending storage read.

An isolated local browser origin stored 205 synthetic WAV takes and 205 summaries
through the real persistence functions. After reloading, scrolling reached all
205 and the oldest audio played through completion. Missing-audio messages were
checked at 320px and 390px; all four UI languages and the manual-load fallback
were exercised. Synthetic tone playback validates storage/replay, not microphone
capture or pronunciation accuracy. Private evidence: `.runtime/history-20260926/`.

This is a web release. Shared source is ready for a later native build, but the
Mac Catalyst 1.0.0 (1) submission and existing iOS/watchOS/Android store binaries
are unchanged. Native apps will retain their previous behavior until updated.
