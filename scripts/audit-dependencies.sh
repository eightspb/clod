#!/bin/sh
# Blocking dependency audit for CI: fails on high or critical advisories except the ones
# documented in docs/dependency-exposure.md (one GHSA id per line in docs/dependency-exposure.ignore).
set -eu
root_dir="$(cd "$(dirname "$0")/.." && pwd)"
ignore_file="${root_dir}/docs/dependency-exposure.ignore"
ignores=""
if [ -f "${ignore_file}" ]; then
  ignores="$(grep -E '^GHSA-[A-Za-z0-9-]+' "${ignore_file}" | sed 's/[[:space:]].*//' | sed 's/^/--ignore /' | tr '\n' ' ')"
fi
# shellcheck disable=SC2086
bun audit --audit-level=high ${ignores}
