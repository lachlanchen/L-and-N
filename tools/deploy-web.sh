#!/usr/bin/env bash
# Build the PWA and publish it as a new immutable release on the web host.
#
#   tools/deploy-web.sh            # build, upload, verify, switch, smoke-test
#   tools/deploy-web.sh --dry-run  # build and upload only; print the switch commands
#
# Layout on the host (see store/publishing-runbook.md):
#   /opt/l-and-n-web/releases/<tarball sha256>/{dist,ops,dist-manifest.sha256,release-manifest.json}
#   /opt/l-and-n-web/current -> the live release; Caddy serves current/dist,
#   the gateway unit runs current/ops/landn_gateway.py.
# The signed Android APKs under dist/downloads are not in Git; they are copied
# forward from the live release so first-party download links keep working.
set -euo pipefail

HOST="${LANDN_WEB_HOST:-sshem-admin}"
ROOT=/opt/l-and-n-web
REPO="$(cd "$(dirname "$0")/.." && pwd)"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

cd "$REPO"
[[ -z "$(git status --porcelain)" ]] || { echo "working tree is not clean; commit first" >&2; exit 1; }
SOURCE_COMMIT="$(git rev-parse HEAD)"

echo "== build"
npm run check >/dev/null
(cd dist && find . -type f | LC_ALL=C sort | xargs sha256sum) > dist-manifest.sha256
MAIN_ASSET="$(basename "$(ls dist/assets/index-*.js | head -1)")"

echo "== package"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
python3 - "$SOURCE_COMMIT" "$MAIN_ASSET" > "$STAGE/release-manifest.json" <<'PY'
import datetime, json, subprocess, sys
print(json.dumps({
    "sourceCommit": sys.argv[1],
    "builtAt": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
    "mainAsset": f"assets/{sys.argv[2]}",
    "distManifest": "dist-manifest.sha256",
}, indent=2))
PY
tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner -czf "$STAGE/release.tar.gz" \
  -C "$REPO" dist dist-manifest.sha256 ops/landn_gateway.py -C "$STAGE" release-manifest.json
RELEASE="$(sha256sum "$STAGE/release.tar.gz" | cut -d' ' -f1)"
echo "release id $RELEASE (source $SOURCE_COMMIT, $MAIN_ASSET)"

echo "== upload"
scp -q "$STAGE/release.tar.gz" "$HOST:/tmp/landn-$RELEASE.tar.gz"
ssh "$HOST" "set -e
  sudo -n mkdir -p $ROOT/releases/$RELEASE
  sudo -n tar -xzf /tmp/landn-$RELEASE.tar.gz -C $ROOT/releases/$RELEASE
  rm -f /tmp/landn-$RELEASE.tar.gz
  if [ -d $ROOT/current/dist/downloads ]; then sudo -n mkdir -p $ROOT/releases/$RELEASE/dist/downloads; sudo -n cp -a $ROOT/current/dist/downloads/. $ROOT/releases/$RELEASE/dist/downloads/; fi
  sudo -n chown -R root:root $ROOT/releases/$RELEASE
  sudo -n chmod -R a+rX $ROOT/releases/$RELEASE
  cd $ROOT/releases/$RELEASE/dist && LC_ALL=C sha256sum --quiet -c ../dist-manifest.sha256
  readlink -f $ROOT/current 2>/dev/null | sudo -n tee $ROOT/releases/$RELEASE/.previous >/dev/null || true
  echo uploaded and verified"

if [[ $DRY_RUN == 1 ]]; then
  echo "dry run: to switch, run on $HOST:"
  echo "  sudo -n ln -sfn $ROOT/releases/$RELEASE $ROOT/current.tmp && sudo -n mv -Tf $ROOT/current.tmp $ROOT/current && sudo -n systemctl restart l-and-n-gateway.service"
  exit 0
fi

echo "== switch"
ssh "$HOST" "set -e
  sudo -n ln -sfn $ROOT/releases/$RELEASE $ROOT/current.tmp
  sudo -n mv -Tf $ROOT/current.tmp $ROOT/current
  sudo -n systemctl restart l-and-n-gateway.service
  sleep 1
  systemctl is-active l-and-n-gateway.service"

echo "== smoke test"
curl -fsS -o /dev/null -w 'PWA %{http_code}\n' https://l-and-n.lazying.art/
curl -fsS https://l-and-n.lazying.art/ | grep -q "$MAIN_ASSET" && echo "live index references $MAIN_ASSET"
curl -fsS -o /dev/null -w 'APK %{http_code}\n' https://l-and-n.lazying.art/downloads/L-and-N-1.0-build3-test.apk
curl -fsS -o /dev/null -w 'lesson %{http_code}\n' https://l-and-n.lazying.art/lessons/light-vs-night/
echo "rollback: sudo -n ln -sfn \$(cat $ROOT/releases/$RELEASE/.previous) $ROOT/current.tmp && sudo -n mv -Tf $ROOT/current.tmp $ROOT/current && sudo -n systemctl restart l-and-n-gateway.service"
