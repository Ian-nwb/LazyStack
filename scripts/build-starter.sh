#!/usr/bin/env bash
# Scaffold one framework as a single-app native project and build its Dockerfile.
#   scripts/build-starter.sh <techId> [work-dir]
# Exits non-zero if scaffolding or `docker build` fails. Used by the weekly "build every
# starter" workflow and for local verification. Expects `npm run build:cli` to have run.
set -euo pipefail

tech="${1:?usage: build-starter.sh <techId> [work-dir]}"
root="$(cd "$(dirname "$0")/.." && pwd)"
work="${2:-$(mktemp -d)}"
mkdir -p "$work/out"

meta="$(node "$root/bin/lazystack.js" list --json | node -e '
  const id = process.argv[1]; let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
    const t = JSON.parse(s).frameworks.find(f => f.id === id)
    if (!t) { console.error(`unknown tech ${id}`); process.exit(2) }
    console.log([t.role, t.defaultPort || 8080, t.hostOnly].join(" "))
  })' "$tech")"
read -r role port hostOnly <<<"$meta"
if [ "$hostOnly" = "true" ]; then
  echo "skip $tech: host-only (no Docker image)"
  exit 0
fi

runMode=docker
cat > "$work/app.json" <<JSON
{
  "projectName": "build-$tech",
  "parentDir": "$work/out",
  "apps": [{ "id": "a1", "folderName": "app", "role": "$role", "techId": "$tech", "port": $port, "runMode": "$runMode", "routePrefix": "/" }],
  "databases": [],
  "proxy": { "type": "none", "httpPort": 0 },
  "useUnifiedWorkspace": false
}
JSON

node "$root/bin/lazystack.js" scaffold --config "$work/app.json" --out "$work/out" --skip-port-check >/dev/null
app="$(dirname "$(find "$work/out/build-$tech" -name Dockerfile -not -path '*/node_modules/*' | head -1)")"
if [ -z "$app" ] || [ ! -f "$app/Dockerfile" ]; then
  echo "FAIL $tech: no Dockerfile generated"
  exit 1
fi

echo "build $tech ($app)"
# LAZYSTACK_BUILDER selects a buildx builder (e.g. one configured with a Docker Hub mirror).
log="$work/build.log"
if [ -n "${LAZYSTACK_BUILDER:-}" ]; then
  build=(docker buildx build --builder "$LAZYSTACK_BUILDER" --load)
else
  build=(docker build)
fi
if ! "${build[@]}" --progress=plain -t "lazystack-starter-$tech" "$app" >"$log" 2>&1; then
  echo "FAIL $tech: docker build failed; last lines of $log:"
  tail -n 40 "$log"
  exit 1
fi
echo "OK $tech"
