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
  echo "[entrypoint] Applying analytics and call retention..."
  node /app/scripts/prune-analytics.mjs || echo "[entrypoint] WARNING: analytics retention failed; the server still starts"
  node /app/scripts/prune-calls.mjs || echo "[entrypoint] WARNING: call retention failed; the server still starts"
fi

exec node /app/scripts/server.mjs
