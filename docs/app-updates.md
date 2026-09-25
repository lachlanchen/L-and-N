# Update reminders

L & N offers an optional, dismissible update reminder in each interface language.
It stays hidden/inert while microphone startup, recording, scoring, saved-take
playback or a listening exercise is active. There is no automatic store redirect,
mandatory upgrade, downloaded native executable code, or blocking version check.

## Native iOS and Android

The installed version comes from Capacitor App. A small first-party
`https://l-and-n.lazying.art/app-updates.json` response lists verified **public**
store versions, separately for iOS and Android. Compare dotted version numbers
numerically (1.0.10 is newer than 1.0.9); never prompt a beta user to downgrade to
an older public release. The main app ID is checked, so the separate Pro package
is not inadvertently routed to the free listing. The submitted Mac build is not
changed and Mac prompts are excluded from this implementation.

Checks use [Capacitor's native HTTP API](https://capacitorjs.com/docs/apis/http),
not a relaxation of WebView CORS or the site's security policy. No audio,
transcripts, installed version, device identifier or account information is
included in the request. Offline, malformed or failed checks are silent. Checks
run on opening/returning online or foreground, at most once per five minutes in
a mounted app. “Later” suppresses that native version for 24 hours. Store URLs
are hardcoded, never accepted from the update metadata.

Maintainers: change the manifest only after verifying public store availability,
not on upload, TestFlight/internal publication, submission, or approval alone.
Keep each platform independent and preserve other platform versions. These new
native builds can receive later reminders; older binaries without this feature
cannot be remotely made to show it. TestFlight/Play manage their own beta updates.

## PWA

The service worker uses the [prompt update strategy](https://vite-pwa-org.netlify.app/guide/prompt-for-update).
First installation does not display an update. A waiting worker offers
**Update and refresh**; only that tap sends `SKIP_WAITING`. An update activated by
another tab also asks before this page reloads. A failed/offline check never
blocks practice. “Later” keeps the current page until the next app opening.
Native builds do not register a service worker. The store-version manifest is
excluded from the precache so store metadata cannot be frozen inside an old app.

Refreshing/updating in place does not clear saved history or recordings. Do not
advise learners to uninstall or clear storage as an update step. Already evicted
recordings cannot be recovered; finite browser/device storage still applies.
