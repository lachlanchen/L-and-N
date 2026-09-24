# Google Play Data safety declaration — Android 1.0.9

## Collection and sharing

- Does the app collect or share required user data types? Yes, declare transient audio processing conservatively.
- Data shared with other companies or organizations: No for advertising, analytics, or independent third-party use.
- Data type: Audio files → Voice or sound recordings.
- Collected: Yes.
- Shared: No.
- Processing: Ephemeral.
- Required or optional: Optional; only after the user explicitly enables online word recognition, taps Record and grants microphone permission. Consent is revocable in the practice screen; listening exercises and lessons do not require it.
- Purpose: App functionality.
- Account creation: Not supported.
- Data deletion request: Local practice data can be removed by clearing app storage or uninstalling. L & N does not retain raw audio on its servers.
- Encryption in transit: Yes; recordings use HTTPS to the first-party transcription endpoint.

Reasoning: Android 1.0.9 uses one microphone recording for waveform, replay and opt-in first-party transcription, avoiding competing OEM speech services. Audio is processed transiently for app functionality, discarded after processing, and never used for training. The saved take library stays on the device. Local diagnostic messages contain status codes only, not audio or transcripts. Older Android versions used the operating-system recognizer.

Reconfirm every answer against the exact Play Console questionnaire and submitted AAB immediately before rollout.
