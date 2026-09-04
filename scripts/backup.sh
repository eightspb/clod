#!/bin/sh
# Consistent, verified backup of the clinic database and Docker volumes with retention and optional off-host copy.
# Runs on the Docker host as root (systemd timer clod-backup.timer). Configuration: /etc/clod-backup.env
#   BACKUP_DIR            local archive root (default /srv/backups/clod)
#   BACKUP_AGE_RECIPIENT  age public key; the matching private key must NOT live on this host
#   BACKUP_REMOTE         rclone destination such as s3:clinic-backups/clod (optional but strongly recommended)
#   DB_PATH               SQLite file inside the db-data volume
set -eu

CONFIG_FILE="${CONFIG_FILE:-/etc/clod-backup.env}"
[ -f "${CONFIG_FILE}" ] && . "${CONFIG_FILE}"

BACKUP_DIR="${BACKUP_DIR:-/srv/backups/clod}"
DB_PATH="${DB_PATH:-/var/lib/docker/volumes/clod_db-data/_data/db.sqlite}"
UPLOADS_PATH="${UPLOADS_PATH:-/var/lib/docker/volumes/clod_uploads/_data}"
CERTS_PATH="${CERTS_PATH:-/var/lib/docker/volumes/clod_certbot-certs/_data}"
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

log() { printf '[backup %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
fail() { log "ERROR: $*" >&2; exit 1; }

command -v sqlite3 >/dev/null 2>&1 || fail "sqlite3 is not installed (apt-get install sqlite3)"
[ -f "${DB_PATH}" ] || fail "database not found at ${DB_PATH}"
[ -d "${UPLOADS_PATH}" ] || fail "uploads volume not found at ${UPLOADS_PATH}"

work="$(mktemp -d "${BACKUP_DIR}/.work.XXXXXX" 2>/dev/null || mktemp -d)"
trap 'rm -rf "${work}"' EXIT INT TERM
umask 077
mkdir -p "${BACKUP_DIR}/daily" "${BACKUP_DIR}/weekly"

log "snapshot ${DB_PATH} via sqlite backup API"
sqlite3 "${DB_PATH}" ".backup '${work}/db.sqlite'"
integrity="$(sqlite3 "${work}/db.sqlite" 'PRAGMA integrity_check')"
[ "${integrity}" = "ok" ] || fail "snapshot integrity_check returned: ${integrity}"
patients="$(sqlite3 "${work}/db.sqlite" 'SELECT count(*) FROM Patient')"
visits="$(sqlite3 "${work}/db.sqlite" 'SELECT count(*) FROM HistoricalVisit')"
log "snapshot ok: Patient=${patients} HistoricalVisit=${visits}"

tar -C "${UPLOADS_PATH}" -czf "${work}/uploads.tgz" .
if [ -d "${CERTS_PATH}" ]; then tar -C "${CERTS_PATH}" -czf "${work}/certs.tgz" .; else : > "${work}/certs.tgz"; fi
printf 'created=%s\npatients=%s\nvisits=%s\nintegrity=%s\n' "${STAMP}" "${patients}" "${visits}" "${integrity}" > "${work}/MANIFEST"

if [ -n "${BACKUP_AGE_RECIPIENT:-}" ]; then
  command -v age >/dev/null 2>&1 || fail "age is not installed but BACKUP_AGE_RECIPIENT is set"
  archive="${BACKUP_DIR}/daily/clod-${STAMP}.tar.gz.age"
  tar -C "${work}" -cf - MANIFEST db.sqlite uploads.tgz certs.tgz | gzip -6 | age -r "${BACKUP_AGE_RECIPIENT}" -o "${archive}"
else
  archive="${BACKUP_DIR}/daily/clod-${STAMP}.tar.gz"
  tar -C "${work}" -cf - MANIFEST db.sqlite uploads.tgz certs.tgz | gzip -6 > "${archive}"
  log "WARNING: BACKUP_AGE_RECIPIENT is not set — archive is NOT encrypted; anyone with this file can read the ciphertext next to the host that stores the key"
fi
sha256sum "${archive}" > "${archive}.sha256"
log "wrote ${archive} ($(du -h "${archive}" | cut -f1))"

if [ "$(date -u +%u)" = "7" ]; then
  cp -p "${archive}" "${archive}.sha256" "${BACKUP_DIR}/weekly/"
  log "weekly copy stored"
fi

prune() {
  dir="$1"; keep="$2"
  ls -1t "${dir}"/clod-*.tar.gz* 2>/dev/null | grep -v '\.sha256$' | tail -n +"$((keep + 1))" | while read -r old; do
    rm -f "${old}" "${old}.sha256"
    log "pruned $(basename "${old}")"
  done
}
prune "${BACKUP_DIR}/daily" "${KEEP_DAILY}"
prune "${BACKUP_DIR}/weekly" "${KEEP_WEEKLY}"

if [ -n "${BACKUP_REMOTE:-}" ]; then
  command -v rclone >/dev/null 2>&1 || fail "rclone is not installed but BACKUP_REMOTE is set"
  rclone copy --quiet "${archive}" "${BACKUP_REMOTE}/daily/"
  rclone copy --quiet "${archive}.sha256" "${BACKUP_REMOTE}/daily/"
  rclone delete --quiet --min-age "$((KEEP_DAILY + 1))d" "${BACKUP_REMOTE}/daily/" || true
  log "off-host copy stored in ${BACKUP_REMOTE}/daily/"
else
  log "WARNING: BACKUP_REMOTE is not set — the only copy of this backup is on the same host as the database"
fi

log "done"
