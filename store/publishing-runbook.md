# Store publishing runbook (autonomous)

Updated: 2026-09-17. Curated from the Codex session that built and published L & N (2026-09-04 to 2026-09-09) and from the 2026-09-17 App Store release. Secrets, key files, cookies, and live ports live only in the ignored `.runtime/store/handoff.md`; this file records the procedure.

The exhaustive command-level narrative (with rollout line markers) is private: `~/.codex/handoffs/l-and-n-publishing-mechanics.md`.

## 0. Ground rules

- One noVNC/CDP stack per project. Inventory first: `ss -ltnp | grep -E ':(59|61|9[2-4])[0-9]{2} '` and `ps -eo pid,etime,args | grep -E 'Xvfb|x11vnc|websockify|remote-debugging-port'`. Never stop another project's stack; the personal browser on `:0` is off limits.
- Code and screenshots before provider mutations. Every store upload uses the exact artifact whose hash is recorded under `store/artifacts/`.
- After every provider transition update `store/release.yaml`, `store/operator-handoff.md`, `store/gaps-and-blockers.md`, the per-store `submission.md`, README links, and the private runtime handoff; commit and push.
- Never paste credentials into chat. Login and 2FA are the only steps that need the account holder, and they happen inside noVNC.

## 1. Visible browser stack (Xvfb + x11vnc + noVNC + Chrome CDP)

```
Xvfb :164 -screen 0 1600x1000x24 -ac -nolisten tcp &
x11vnc -display :164 -localhost -nopw -forever -nevershared -rfbport 5964 -o ~/.cache/<project>/x11vnc.log &
websockify --web=/usr/share/novnc --heartbeat=30 127.0.0.1:6164 127.0.0.1:5964 &
DISPLAY=:164 google-chrome --user-data-dir=<store profile> \
  --remote-debugging-address=127.0.0.1 --remote-debugging-port=9484 \
  --remote-allow-origins=http://127.0.0.1:9484 \
  --window-position=0,0 --window-size=1600,1000 --disable-dev-shm-usage \
  --no-first-run --no-default-browser-check --restore-last-session 'https://play.google.com/console' &
```

- `--remote-allow-origins` is mandatory; without it the CDP websocket handshake returns 403.
- Human URL: `http://127.0.0.1:<novnc>/vnc.html?host=127.0.0.1&port=<novnc>&autoconnect=1&resize=scale&view_only=0&shared=0&reconnect=0`. To bring it to the user's screen: `DISPLAY=:0 XAUTHORITY=/run/user/1000/gdm/Xauthority xdg-open '<url>'`.
- The store profile holds the Google (Play Console, Gmail, Drive) and Apple sessions. Google sessions last weeks; the App Store Connect web session expires within days and needs Apple ID + 2FA in noVNC.

## 2. Driving pages through CDP

Python `websocket-client` against `http://127.0.0.1:<cdp>/json` (list), `PUT /json/new?<url>`, `/json/activate/<id>`. Pick targets by URL substring; ids change on restart. Core calls:

- `Runtime.evaluate` with `returnByValue` (and `userGesture: true` when the page needs a gesture, e.g. Web Audio).
- Read state: `document.body.innerText`; find controls by visible text: `[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Save').click()`.
- React-controlled inputs: `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, v)` then dispatch `input` and `change`. Rich text: focus, `Input.insertText`.
- Uploads: `DOM.getDocument` (pierce) + `DOM.querySelector` + `DOM.setFileInputFiles` on the hidden `input[type=file]`; dispatch `change` afterwards for Play.
- Evidence: `Page.captureScreenshot` into the private evidence folder.
- Some Play Console confirm dialogs and the Apple "Create"/profile download only react to real pointer input: compute `getBoundingClientRect()` and `DISPLAY=:164 xdotool mousemove --sync X Y click 1`.

A minimal helper lives in the private handoff area (`cdp.py`: `tabs | shot | eval | nav | new | activate`); EchoMind keeps a stricter form controller at `~/.config/echomind/private/store-cdp.py`.

## 3. Google Play (Play Console via CDP)

1. Build: `npx cap sync android` from the repo root, then `cd android && ./gradlew --no-daemon :app:testReleaseUnitTest :app:lintRelease :app:assembleRelease :app:bundleRelease` with the `LANDN_ANDROID_*` keystore variables from the private config. Verify with `apksigner verify --print-certs` and record SHA-256 in `store/artifacts/`.
2. Every track needs its own `versionCode`; a build tied to a pending Production review cannot be reused on Internal.
3. New app: Create app form (name, package, App, Free, both declarations). Dashboard tasks are `div[role=button][aria-label=...]`: privacy policy URL, app access, ads, IARC questionnaire, target audience, data safety, government/finance/health, category and tags, contact email, store listing (512 icon, 1024x500 feature graphic, four 1080x1920 phone screenshots, AI-edited flag where applicable), countries (Select all rows). The advertising-ID declaration is a blocking quick check.
4. Release: upload the AAB on the track's prepare page, set release name, `<en-US>...</en-US>` notes, Save, then Publishing overview -> "Send changes for review". Internal track publishes immediately; opt-in URL is under Testers.
5. Replace a build under review: publish it on Internal first, then "Promote release" -> Production -> confirm "Restart review".
6. State names: "Changes in review" -> published (track "Active", latest release `N (version)`). Public listing: `https://play.google.com/store/apps/details?id=<package>`.
7. No human step was needed for Play in this account; a Play Console notice about Android developer verification (deadline 2026-09-30) already shows all apps registered.

## 4. Apple (Mac build host + App Store Connect)

1. Sync the repo to the Mac (`rsync -az` or `tar | ssh`, never macOS rsync with Linux xattrs); run `npx cap sync ios` on Linux and ship `ios/App/App/public/`. CocoaPods runs from user gems.
2. Signing: distribution certificate + App Store profiles in a dedicated keychain; Release config Manual with distinct iPhone and Watch profiles. Unlock, `set-key-partition-list`, and `xcodebuild` must run in the same SSH session or codesign fails with `errSecInternalComponent`.
3. Archive and export:
   `xcodebuild -workspace App.xcworkspace -scheme App -configuration Release -destination generic/platform=iOS -archivePath release/<name>.xcarchive archive` then `xcodebuild -exportArchive -exportOptionsPlist ios/App/ExportOptions.plist` (method app-store-connect, manual signing, team, profile map).
4. Validate and upload with the API key, no browser: `API_PRIVATE_KEYS_DIR=<dir> xcrun altool --validate-app --type ios --file App.ipa --apiKey <key id> --apiIssuer <issuer>` then `--upload-app`. Record the delivery UUID.
5. App Store Connect web (CDP): New App (platform, name, locale, bundle id, SKU), version metadata fields by id, App Information (category, age rating, content rights), screenshots per device tab from `xcrun simctl io <udid> screenshot`, App Privacy, pricing, availability, Add Build (radio value equals delivery UUID), Add for Review -> Submit for Review. TestFlight: internal group, external group with beta review info -> public link.
6. Replacing a build in review: remove from review ("Developer Rejected"), delete the old build from the version, Add Build, Save, resubmit.
7. Approval and release without the browser (App Store Connect API, ES256 JWT with pyjwt, `/usr/bin/python3`):
   - `GET /v1/apps/<app id>/appStoreVersions?filter[platform]=IOS` -> watch `appVersionState` (`WAITING_FOR_REVIEW`, `IN_REVIEW`, `PENDING_DEVELOPER_RELEASE`, `READY_FOR_DISTRIBUTION`).
   - `GET /v1/appStoreVersions/<id>/build` to confirm the attached build number.
   - Manual release: `POST /v1/appStoreVersionReleaseRequests` with the version relationship. Verified 2026-09-17: the state flipped to `READY_FOR_SALE` within seconds. The public page can take up to 24 hours.
8. Still browser-only: Agreements, Tax, and Banking; the Digital Services Act trader status (EU/EEA storefronts stay excluded until it is provided); physical-iPhone microphone testing.

## 5. Email and provider notifications

Gmail is authenticated in the store profile. Read provider mail through CDP: open `https://mail.google.com/mail/u/0/#search/<query>`, list `tr.zA` rows, click a row, read `div.a3s`. Send through the compose UI with `Input.insertText` and poll for "Message sent". Gmail blocks APK attachments; link the first-party download instead.

## 6. Web release

`npm run check`, deterministic tarball of `dist` + `ops/landn_gateway.py`, `scp` to the admin host, extract into `/opt/l-and-n-web/releases/<sha>` (root, `a+rX`), atomic `current` symlink swap, restart `l-and-n-gateway.service`. Caddy site `/etc/lazyedge/l-and-n.caddy`: `caddy validate` then reload. Keep current + one rollback release.

## Lesson 2026-09-22: a version's build must carry the same marketing version

App Store Connect marks a version **Invalid Binary** (review item REJECTED, submission UNRESOLVED_ISSUES) when the attached build's `CFBundleShortVersionString` differs from the version string. 1.0.5 was created on build 10, which had been built as 1.0.4. Before creating a new App Store version, bump `MARKETING_VERSION` in `ios/App/App.xcodeproj/project.pbxproj` together with `CURRENT_PROJECT_VERSION`, archive and upload, and only then create the version with that build. A build uploaded for TestFlight under the previous marketing version cannot be reused for the next App Store version.
