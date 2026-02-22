#!/bin/sh
set -e

if [ ! -f /data/db.sqlite ]; then
  echo "[entrypoint] First run: initializing database schema..."
  node /app/scripts/init-db.mjs
  echo "[entrypoint] Database initialized."
fi

exec node /app/dist/server/entry.mjs
