#!/bin/sh
# Post-deploy smoke gate, executed on the Docker host from the repository directory.
# Waits for /api/health, then checks that the public pages render and the admin API still guards itself.
# Exits non-zero (and prints the app log tail) on the first mismatch so the deploy can roll back.
#   SMOKE_BASE_URL      base URL to probe (default https://$SITE_DOMAIN from .env)
#   SMOKE_WAIT_SECONDS  how long to wait for /api/health before giving up (default 60)
set -eu

wait_seconds="${SMOKE_WAIT_SECONDS:-60}"
if [ -z "${SMOKE_BASE_URL:-}" ]; then
  domain="$(sed -n 's/^SITE_DOMAIN=//p' .env | tr -d '\r"' | tail -1)"
  [ -n "${domain}" ] || { echo "smoke: SITE_DOMAIN is not set in .env and SMOKE_BASE_URL is empty" >&2; exit 1; }
  base_url="https://${domain}"
else
  base_url="${SMOKE_BASE_URL}"
fi

status_of() {
  curl -sS -o /dev/null -w '%{http_code}' -m 15 "${base_url}$1" 2>/dev/null || echo "000"
}

fail() {
  echo "smoke: $1" >&2
  echo "--- docker compose logs --tail 40 app ---" >&2
  docker compose logs --tail 40 app >&2 || true
  exit 1
}

waited=0
until [ "$(status_of /api/health)" = "200" ]; do
  [ "${waited}" -lt "${wait_seconds}" ] || fail "/api/health did not answer 200 within ${wait_seconds}s"
  sleep 3
  waited=$((waited + 3))
done
echo "    /api/health -> 200 after ${waited}s"

check() {
  code="$(status_of "$1")"
  [ "${code}" = "$2" ] || fail "$1 -> ${code}, expected $2"
  echo "    $1 -> ${code}"
}

check / 200
check /doctors 200
check /api/admin/stats 401
echo "    smoke ok: ${base_url}"
