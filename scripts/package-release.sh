#!/usr/bin/env bash
set -euo pipefail
revision=${1:?Usage: package-release.sh COMMIT_SHA OUTPUT_DIRECTORY}
output=${2:?Usage: package-release.sh COMMIT_SHA OUTPUT_DIRECTORY}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] || { echo 'Expected a full commit SHA' >&2; exit 1; }
[[ $(uname -s) == Linux && $(uname -m) == x86_64 ]] || { echo 'Build releases on Linux x86_64' >&2; exit 1; }
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
mkdir -p -- "$output"
output=$(cd -- "$output" && pwd)
staging=$(mktemp -d)
trap 'rm -rf -- "$staging"' EXIT
cd -- "$root"
mkdir -p "$staging/backend" "$staging/shared/animlib" "$staging/frontend" "$staging/bin" "$staging/scripts"
cp package.json package-lock.json "$staging/"
cp backend/package.json "$staging/backend/"
cp -R backend/src "$staging/backend/"
cp -R backend/prompts "$staging/backend/"
cp shared/animlib/package.json "$staging/shared/animlib/"
cp -R shared/animlib/dist "$staging/shared/animlib/"
# The standalone demo is not needed by the app runtime.
rm -rf "$staging/shared/animlib/dist/demo"
cp -R frontend/site "$staging/frontend/"
cp -L node_modules/.bin/bun "$staging/bin/bun"
chmod 755 "$staging/bin/bun"
cp scripts/smoke-release.ts "$staging/scripts/"
printf '%s\n' "$revision" > "$staging/REVISION"
(cd "$staging" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund)
(cd "$staging" && APP_REVISION="$revision" ./bin/bun scripts/smoke-release.ts)
tar -czf "$output/release.tar.gz" -C "$staging" .
(cd "$output" && sha256sum release.tar.gz > release.sha256)
printf 'Packaged revision %s\n' "$revision"
