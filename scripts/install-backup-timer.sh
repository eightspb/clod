#!/bin/sh
# Installs backup prerequisites and the systemd timer on the Docker host. Run as root from /srv/clod.
set -eu
root_dir="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v sqlite3 >/dev/null 2>&1 || ! command -v age >/dev/null 2>&1; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends sqlite3 age
fi

install -d -m 700 /srv/backups/clod/daily /srv/backups/clod/weekly
[ -f /etc/clod-backup.env ] || install -m 600 /dev/null /etc/clod-backup.env
install -m 644 "${root_dir}/deploy/systemd/clod-backup.service" /etc/systemd/system/clod-backup.service
install -m 644 "${root_dir}/deploy/systemd/clod-backup.timer" /etc/systemd/system/clod-backup.timer
systemctl daemon-reload
systemctl enable --now clod-backup.timer
systemctl list-timers clod-backup.timer --no-pager
