#!/usr/bin/env bash
# Run over SSH as the existing deploy user, which needs passwordless sudo.
set -Eeuo pipefail
archive=$(realpath -- "${1:?Usage: deploy-release.sh ARCHIVE COMMIT_SHA [--check]}")
revision=${2:?Usage: deploy-release.sh ARCHIVE COMMIT_SHA [--check]}
mode=${3:-deploy}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] || { echo 'Expected a full commit SHA' >&2; exit 1; }
[[ "$mode" == deploy || "$mode" == --check ]] || { echo 'Unknown deployment mode' >&2; exit 1; }
[[ $(id -un) == deploy ]] || { echo 'Run this script as deploy' >&2; exit 1; }
[[ $(uname -s) == Linux && $(uname -m) == x86_64 ]] || { echo 'This release requires Linux x86_64' >&2; exit 1; }
base=/srv/apps/3yellow3white-actions
unit=/etc/systemd/system/3yellow3white.service
mkdir -p "$base/releases" "$base/data"
exec 9>"$base/deploy.lock"
flock -w 120 9
release=$(mktemp -d "$base/releases/$revision.XXXXXX")
activated=false
complete=false
had_unit=false
cleanup() {
  local result=$?
  trap - EXIT
  if [[ "$activated" == true && "$complete" != true ]]; then
    echo 'New release failed; restoring the previous service.' >&2
    if [[ "$had_unit" == true ]]; then
      sudo -n install -m 644 "$release/previous.service" "$unit"
      sudo -n systemctl daemon-reload
      sudo -n systemctl restart 3yellow3white
    else
      sudo -n systemctl stop 3yellow3white || true
      sudo -n systemctl disable 3yellow3white || true
      sudo -n rm -f "$unit"
      sudo -n systemctl daemon-reload
    fi
  fi
  if [[ "$complete" != true ]]; then rm -rf -- "$release"; fi
  exit "$result"
}
trap cleanup EXIT
tar --extract --gzip --file "$archive" --directory "$release" --no-same-owner
[[ $(cat "$release/REVISION") == "$revision" ]] || { echo 'Archive revision mismatch' >&2; exit 1; }
(cd "$release" && APP_REVISION="$revision" ./bin/bun scripts/smoke-release.ts)
cat > "$release/app.service" <<EOF
[Unit]
Description=3yellow3white Bun application
After=network.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=$release
Environment=NODE_ENV=production
Environment=HOST=0.0.0.0
Environment=PORT=8080
Environment=APP_REVISION=$revision
Environment=VIDEO_DB_PATH=$base/data/videos.sqlite
EnvironmentFile=-/srv/apps/3yellow3white/.env
EnvironmentFile=-/etc/3yellow3white/environment
ExecStart=$release/bin/bun backend/src/index.ts
Restart=on-failure
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
systemd-analyze verify "$release/app.service"
if [[ "$mode" == --check ]]; then
  echo 'Candidate verified; the running service was not changed.'
  exit 0
fi
sudo -n true
if sudo -n test -f "$unit"; then
  had_unit=true
  sudo -n cat "$unit" > "$release/previous.service"
fi

activated=true
sudo -n install -m 644 "$release/app.service" "$unit"
sudo -n systemctl daemon-reload
sudo -n systemctl restart 3yellow3white
healthy=false
for attempt in {1..30}; do
  if curl --fail --silent --show-error --max-time 2 http://127.0.0.1:8080/healthz > "$release/health.json" &&
    python3 -c 'import json,sys; h=json.load(open(sys.argv[1])); sys.exit(0 if h.get("ok") is True and h.get("revision")==sys.argv[2] else 1)' "$release/health.json" "$revision" &&
    systemctl is-active --quiet 3yellow3white; then
    healthy=true
    break
  fi
  sleep 1
done
[[ "$healthy" == true ]] || { echo 'New revision did not become healthy' >&2; exit 1; }
sudo -n systemctl enable 3yellow3white
ln -sfn "$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
complete=true
printf 'Deployed and verified %s\n' "$revision"
