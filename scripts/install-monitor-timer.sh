#!/bin/sh
# Installs the self-hosted monitor timer on the Docker host. Run as root from /srv/clod.
set -eu
root_dir="$(cd "$(dirname "$0")/.." && pwd)"

install -d -m 755 /var/lib/clod-monitor
[ -f /etc/clod-monitor.env ] || install -m 600 /dev/null /etc/clod-monitor.env
install -m 644 "${root_dir}/deploy/systemd/clod-monitor.service" /etc/systemd/system/clod-monitor.service
install -m 644 "${root_dir}/deploy/systemd/clod-monitor.timer" /etc/systemd/system/clod-monitor.timer
systemctl daemon-reload
systemctl enable --now clod-monitor.timer
systemctl start clod-monitor.service
systemctl list-timers clod-monitor.timer --no-pager
cat /var/lib/clod-monitor/status.json
