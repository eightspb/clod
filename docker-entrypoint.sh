#!/bin/sh
set -e

echo "[entrypoint] Checking runtime environment..."
node /app/scripts/check-required-env.mjs

if [ "${SKIP_DB_INIT:-}" = "true" ]; then
  echo "[entrypoint] WARNING: SKIP_DB_INIT=true — schema initialisation skipped by operator request; the app may fail on a stale schema"
else
  echo "[entrypoint] Applying additive database schema..."
  node /app/scripts/init-db.mjs
  echo "[entrypoint] Database schema is ready."
fi

exec node /app/scripts/server.mjs
