# Google Play Data safety declaration draft

## Collection and sharing

- Does the app collect or share required user data types? Yes, declare transient audio processing conservatively.
- Data shared with other companies or organizations: No for advertising, analytics, or independent third-party use.
- Data type: Audio files → Voice or sound recordings.
- Collected: Yes.
- Shared: No.
- Processing: Ephemeral.
- Required or optional: Optional; only after the user taps Record and grants microphone permission.
- Purpose: App functionality.
- Account creation: Not supported.
- Data deletion request: Local practice data can be removed by clearing app storage or uninstalling. L & N does not retain raw audio on its servers.
- Encryption in transit: Yes when the installed speech service uses network recognition.

Reasoning: the Android app invokes the user’s installed operating-system speech recognition service. Depending on device and service settings, recognition may occur locally or the service may process a short audio request. This conservative form answer includes ephemeral processing even though L & N receives only recognition text and does not retain the recording.

Reconfirm every answer against the exact Play Console questionnaire and submitted AAB immediately before rollout.
