#!/bin/sh
set -e

echo "[entrypoint] Applying additive database schema..."
node /app/scripts/init-db.mjs
echo "[entrypoint] Database schema is ready."

exec node /app/dist/server/entry.mjs
