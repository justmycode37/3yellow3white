#!/usr/bin/env bash
# Isolated lifecycle test: no production data, env files, ports, or Compose project.
set -Eeuo pipefail
image=${1:?Usage: smoke-container.sh IMAGE COMMIT_SHA}
revision=${2:?Usage: smoke-container.sh IMAGE COMMIT_SHA}
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
if docker info >/dev/null 2>&1; then engine=(docker); else engine=(sudo -n docker); fi
work=$(mktemp -d)
project="aha-check-$(id -u)-${work##*.}"
project=${project,,}
export AHA_IMAGE="$image" AHA_REVISION="$revision" AHA_UID AHA_GID
AHA_UID=$(id -u); AHA_GID=$(id -g)
export AHA_VIDEO_DATA_DIR="$work/videos" AHA_NARRATION_DATA_DIR="$work/narration"
export AHA_RUNTIME_ENV="$work/runtime.env" AHA_BIND_ADDRESS=127.0.0.1 AHA_PORT=0 AHA_RESTART_POLICY=unless-stopped AHA_VIDEO_DB_NAME=videos.sqlite
mkdir "$work/videos" "$work/narration"
# Keep literal dollars/quotes to verify that secrets are not interpolated.
# shellcheck disable=SC2016
printf '%s\n' 'CONTAINER_LITERAL=literal-$value-with-"quotes"' > "$work/runtime.env"
# Pass settings in a file: sudo correctly strips exported shell variables.
cat > "$work/compose.env" <<SETTINGS
AHA_IMAGE=$AHA_IMAGE
AHA_REVISION=$AHA_REVISION
AHA_UID=$AHA_UID
AHA_GID=$AHA_GID
AHA_VIDEO_DATA_DIR=$AHA_VIDEO_DATA_DIR
AHA_NARRATION_DATA_DIR=$AHA_NARRATION_DATA_DIR
AHA_RUNTIME_ENV=$AHA_RUNTIME_ENV
AHA_BIND_ADDRESS=127.0.0.1
AHA_PORT=0
AHA_RESTART_POLICY=unless-stopped
AHA_VIDEO_DB_NAME=videos.sqlite
SETTINGS
compose=("${engine[@]}" compose --project-name "$project" --env-file "$work/compose.env" --file "$root/compose.yaml")
cleanup() {
  local result=$?
  trap - EXIT
  if (( result != 0 )); then "${compose[@]}" logs --tail 80 || true; fi
  "${compose[@]}" down --timeout 30 || result=1
  rm -rf -- "$work"
  exit "$result"
}
trap cleanup EXIT
"${compose[@]}" config --quiet
"${compose[@]}" run --rm --no-deps app scripts/smoke-release.ts
"${compose[@]}" up --detach --wait --wait-timeout 60
container=$("${compose[@]}" ps --quiet app)
wait_healthy() {
  local minimum_restarts=${1:-0} attempt running health restarts
  for ((attempt=0; attempt<60; attempt++)); do
    read -r running health restarts <<< "$("${engine[@]}" inspect --format '{{.State.Running}} {{.State.Health.Status}} {{.RestartCount}}' "$container")"
    if [[ "$running" == true && "$health" == healthy ]] && (( restarts >= minimum_restarts )); then return 0; fi
    sleep 1
  done
  echo 'Container did not reach the expected healthy state' >&2
  return 1
}
url="http://$("${compose[@]}" port app 8080)"
python3 "$root/scripts/check-container-http.py" "$url" "$revision" create "$work/job"
# shellcheck disable=SC2016
"${compose[@]}" exec -T app bun -e 'if (process.getuid() === 0 || process.env.CONTAINER_LITERAL !== `literal-$value-with-"quotes"`) process.exit(1); try { await Bun.write("/app/readonly-check", "fail"); process.exit(1); } catch (e) { if (e.code !== "EROFS" && e.code !== "EACCES") throw e; }'
# Exercise writable narration storage without invoking a paid speech provider.
"${compose[@]}" exec -T app bun -e 'await Bun.write("/data/narration/container-check", "persistent");'
# Stop with a job still in progress; the replacement must resume it.
python3 "$root/scripts/check-container-http.py" "$url" "$revision" interrupt "$work/job"
"${compose[@]}" stop --timeout 30
[[ $("${engine[@]}" inspect --format '{{.State.Status}} {{.State.ExitCode}}' "$container") == 'exited 0' ]]
# Compose 2.30 supports raw env files, but start --wait requires a newer version.
"${compose[@]}" start
wait_healthy
python3 "$root/scripts/check-container-http.py" "http://$("${compose[@]}" port app 8080)" "$revision" verify "$work/job"
# Crash Bun from inside the container, without Docker marking it manually stopped.
# shellcheck disable=SC2016
"${compose[@]}" exec -T app bun -e 'import { readdirSync, readFileSync } from "node:fs"; const pid = readdirSync("/proc").filter(p => /^\d+$/.test(p)).find(p => { try { return readFileSync(`/proc/${p}/cmdline`, "utf8").split("\0")[1] === "backend/src/index.ts"; } catch { return false; } }); if (!pid) process.exit(1); process.kill(Number(pid), "SIGKILL");'
wait_healthy 1
python3 "$root/scripts/check-container-http.py" "http://$("${compose[@]}" port app 8080)" "$revision" verify "$work/job"
"${compose[@]}" down --timeout 30
"${compose[@]}" up --detach --wait --wait-timeout 60
python3 "$root/scripts/check-container-http.py" "http://$("${compose[@]}" port app 8080)" "$revision" verify "$work/job"
"${compose[@]}" exec -T app bun -e 'if (await Bun.file("/data/narration/container-check").text() !== "persistent") process.exit(1);'
printf 'Container health, routes, assets, jobs, audio, stop/start, crash recovery, and recreation passed: %s\n' "$revision"
