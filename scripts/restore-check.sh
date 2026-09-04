#!/bin/sh
# Restores one backup archive into a scratch directory and verifies integrity and row counts.
# Usage: sh scripts/restore-check.sh /srv/backups/clod/daily/clod-<stamp>.tar.gz[.age] [/path/to/age-private-key]
set -eu

archive="${1:?usage: restore-check.sh <archive> [age-identity-file]}"
identity="${2:-}"
scratch="$(mktemp -d /tmp/clod-restore.XXXXXX)"
trap 'rm -rf "${scratch}"' EXIT INT TERM
started="$(date +%s)"

sha256sum -c "${archive}.sha256" >/dev/null
case "${archive}" in
  *.age) [ -n "${identity}" ] || { echo "restore-check: encrypted archive needs the age identity file as the second argument" >&2; exit 2; }
         age -d -i "${identity}" "${archive}" | tar -xzf - -C "${scratch}" ;;
  *) tar -xzf "${archive}" -C "${scratch}" ;;
esac

integrity="$(sqlite3 "${scratch}/db.sqlite" 'PRAGMA integrity_check')"
patients="$(sqlite3 "${scratch}/db.sqlite" 'SELECT count(*) FROM Patient')"
visits="$(sqlite3 "${scratch}/db.sqlite" 'SELECT count(*) FROM HistoricalVisit')"
uploads="$(tar -tzf "${scratch}/uploads.tgz" | wc -l | tr -d ' ')"
elapsed="$(( $(date +%s) - started ))"

cat "${scratch}/MANIFEST"
printf 'restored_integrity=%s\nrestored_patients=%s\nrestored_visits=%s\nuploads_entries=%s\nrestore_seconds=%s\n' "${integrity}" "${patients}" "${visits}" "${uploads}" "${elapsed}"
[ "${integrity}" = "ok" ]
