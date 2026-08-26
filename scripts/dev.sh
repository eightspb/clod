#!/bin/sh
set -eu

port="${PORT:-4321}"

find_listening_pids() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null | sort -u
    return
  fi

  if command -v fuser >/dev/null 2>&1; then
    fuser "${port}/tcp" 2>/dev/null | tr ' ' '\n' | sed '/^$/d' | sort -u
    return
  fi
}

occupying_pids="$(find_listening_pids || true)"

if [ -n "${occupying_pids}" ]; then
  echo "Port ${port} is occupied. Stopping existing process(es):"
  echo "${occupying_pids}" | while IFS= read -r pid; do
    [ -n "${pid}" ] || continue
    echo "  - PID ${pid}"
    kill "${pid}" 2>/dev/null || true
  done

  sleep 1

  stubborn_pids="$(find_listening_pids || true)"
  if [ -n "${stubborn_pids}" ]; then
    echo "${stubborn_pids}" | while IFS= read -r pid; do
      [ -n "${pid}" ] || continue
      echo "Force killing PID ${pid}"
      kill -9 "${pid}" 2>/dev/null || true
    done
    sleep 1
  fi
fi

if [ -f .env ]; then
  exec bun --env-file=.env run astro dev --port "${port}"
fi

exec bunx astro dev --port "${port}"
