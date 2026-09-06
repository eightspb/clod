#!/bin/sh
# Self-hosted availability monitor for the clinic stack. Runs on the Docker host as root every two
# minutes (systemd timer clod-monitor.timer) because no external uptime service is allowed yet.
# Writes a JSON status file the admin dashboard renders, logs state changes to the journal, optionally
# forwards them to ALERT_COMMAND, and restarts a persistently unhealthy app container.
# Configuration: /etc/clod-monitor.env
#   SITE_DOMAIN                     defaults to SITE_DOMAIN from /srv/clod/.env
#   STATUS_DIR                      status.json and state live here (default /var/lib/clod-monitor)
#   TLS_WARN_DAYS                   alert when the certificate expires sooner (default 21)
#   DISK_WARN_PERCENT               alert when the Docker filesystem is fuller (default 80)
#   MEMORY_MIN_AVAILABLE_MB         alert when MemAvailable drops below this (default 150)
#   BACKUP_MAX_AGE_HOURS            alert when the newest daily archive is older (default 26)
#   HEALTH_FAILURES_BEFORE_RESTART  consecutive failed /api/health probes before `docker compose restart app` (default 3)
#   RESTART_COOLDOWN_SECONDS        minimum spacing between automatic restarts (default 3600)
#   ALERT_COMMAND                   optional shell command; receives the alert text as $1 (future Telegram hook)
set -eu

CONFIG_FILE="${CONFIG_FILE:-/etc/clod-monitor.env}"
[ -f "${CONFIG_FILE}" ] && . "${CONFIG_FILE}"

COMPOSE_DIR="${COMPOSE_DIR:-/srv/clod}"
STATUS_DIR="${STATUS_DIR:-/var/lib/clod-monitor}"
BACKUP_DIR="${BACKUP_DIR:-/srv/backups/clod/daily}"
TLS_WARN_DAYS="${TLS_WARN_DAYS:-21}"
DISK_WARN_PERCENT="${DISK_WARN_PERCENT:-80}"
MEMORY_MIN_AVAILABLE_MB="${MEMORY_MIN_AVAILABLE_MB:-150}"
BACKUP_MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-26}"
HEALTH_FAILURES_BEFORE_RESTART="${HEALTH_FAILURES_BEFORE_RESTART:-3}"
RESTART_COOLDOWN_SECONDS="${RESTART_COOLDOWN_SECONDS:-3600}"
if [ -z "${SITE_DOMAIN:-}" ] && [ -f "${COMPOSE_DIR}/.env" ]; then
  SITE_DOMAIN="$(sed -n 's/^SITE_DOMAIN=//p' "${COMPOSE_DIR}/.env" | tr -d '\r"' | tail -1)"
fi
[ -n "${SITE_DOMAIN:-}" ] || { echo "monitor: SITE_DOMAIN is not set" >&2; exit 1; }

mkdir -p "${STATUS_DIR}"
STATE_FILE="${STATUS_DIR}/state"
STATUS_FILE="${STATUS_DIR}/status.json"
[ -f "${STATE_FILE}" ] || : > "${STATE_FILE}"
now_epoch="$(date -u +%s)"
results=""

record() {
  results="${results}$1|$2|$3
"
}

state_get() {
  sed -n "s/^$1=//p" "${STATE_FILE}" | tail -1
}

state_set() {
  { grep -v "^$1=" "${STATE_FILE}" 2>/dev/null || true; printf '%s=%s\n' "$1" "$2"; } > "${STATE_FILE}.tmp"
  mv "${STATE_FILE}.tmp" "${STATE_FILE}"
}

check_health() {
  code="$(curl -sS -o /dev/null -w '%{http_code}' -m 15 "https://${SITE_DOMAIN}/api/health" 2>/dev/null || echo 000)"
  if [ "${code}" = "200" ]; then record health ok "200"; else record health fail "HTTP ${code}"; fi
}

check_tls() {
  end_date="$(printf '' | openssl s_client -servername "${SITE_DOMAIN}" -connect "${SITE_DOMAIN}:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | sed 's/^notAfter=//')"
  if [ -z "${end_date}" ]; then record tls fail "сертификат не прочитан"; return; fi
  end_epoch="$(date -u -d "${end_date}" +%s 2>/dev/null || echo 0)"
  days=$(( (end_epoch - now_epoch) / 86400 ))
  if [ "${days}" -lt "${TLS_WARN_DAYS}" ]; then record tls fail "истекает через ${days} дн."; else record tls ok "${days} дн."; fi
}

check_disk() {
  used="$(df -P /var/lib/docker 2>/dev/null | awk 'NR==2 {gsub("%", "", $5); print $5}')"
  [ -n "${used}" ] || used="$(df -P / | awk 'NR==2 {gsub("%", "", $5); print $5}')"
  if [ "${used}" -ge "${DISK_WARN_PERCENT}" ]; then record disk fail "${used}%"; else record disk ok "${used}%"; fi
}

check_memory() {
  available="$(awk '/MemAvailable/ {print int($2 / 1024)}' /proc/meminfo)"
  if [ "${available}" -lt "${MEMORY_MIN_AVAILABLE_MB}" ]; then record memory fail "свободно ${available} МБ"; else record memory ok "свободно ${available} МБ"; fi
}

check_containers() {
  listing="$(cd "${COMPOSE_DIR}" && docker compose ps --format '{{.Name}} {{.State}} {{.Health}}' 2>/dev/null || true)"
  if [ -z "${listing}" ]; then record containers fail "docker compose недоступен"; return; fi
  bad="$(printf '%s\n' "${listing}" | awk '$2 != "running" || $3 == "unhealthy" {print $1}' | tr '\n' ' ')"
  total="$(printf '%s\n' "${listing}" | grep -c . || true)"
  if [ -n "${bad}" ]; then record containers fail "проблема: ${bad}"; elif [ "${total}" -lt 3 ]; then record containers fail "запущено ${total} из 3"; else record containers ok "${total} запущены"; fi
}

check_backup() {
  newest="$(ls -1t "${BACKUP_DIR}"/clod-*.tar.gz* 2>/dev/null | grep -v '\.sha256$' | head -1 || true)"
  if [ -z "${newest}" ]; then record backup fail "архивов нет"; return; fi
  age_hours=$(( (now_epoch - $(stat -c %Y "${newest}")) / 3600 ))
  if [ "${age_hours}" -gt "${BACKUP_MAX_AGE_HOURS}" ]; then record backup fail "последний ${age_hours} ч назад"; else record backup ok "${age_hours} ч назад"; fi
}

check_health
check_tls
check_disk
check_memory
check_containers
check_backup

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

checks_json="$(printf '%s' "${results}" | awk -F'|' 'NF == 3 { ok = ($2 == "ok") ? "true" : "false"; gsub(/\\/, "\\\\", $3); gsub(/"/, "\\\"", $3); printf "%s{\"name\":\"%s\",\"ok\":%s,\"detail\":\"%s\"}", (n++ ? "," : ""), $1, ok, $3 }')"
printf '{"checkedAt":"%s","checks":[%s]}\n' "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" "${checks_json}" > "${STATUS_FILE}.tmp"
chmod 644 "${STATUS_FILE}.tmp"
mv "${STATUS_FILE}.tmp" "${STATUS_FILE}"

failing_now="$(printf '%s' "${results}" | awk -F'|' '$2 == "fail" {print $1}' | sort | tr '\n' ' ')"
failing_before="$(state_get failing)"
if [ "${failing_now}" != "${failing_before}" ]; then
  if [ -n "${failing_now}" ]; then
    message="clod ${SITE_DOMAIN}: сбой проверок — $(printf '%s' "${results}" | awk -F'|' '$2 == "fail" {printf "%s (%s); ", $1, $3}')"
    logger -t clod-monitor -p user.err "${message}" || true
  else
    message="clod ${SITE_DOMAIN}: все проверки снова в норме"
    logger -t clod-monitor -p user.notice "${message}" || true
  fi
  if [ -n "${ALERT_COMMAND:-}" ]; then sh -c "${ALERT_COMMAND} \"\$1\"" alert "${message}" || logger -t clod-monitor -p user.warning "ALERT_COMMAND failed" || true; fi
  state_set failing "${failing_now}"
fi

health_failures="$(state_get health_failures)"
health_failures="${health_failures:-0}"
case " ${failing_now} " in
  *" health "*) health_failures=$((health_failures + 1)) ;;
  *) health_failures=0 ;;
esac
state_set health_failures "${health_failures}"
last_restart="$(state_get last_restart)"
last_restart="${last_restart:-0}"
if [ "${health_failures}" -ge "${HEALTH_FAILURES_BEFORE_RESTART}" ] && [ $((now_epoch - last_restart)) -ge "${RESTART_COOLDOWN_SECONDS}" ]; then
  logger -t clod-monitor -p user.err "clod ${SITE_DOMAIN}: /api/health failed ${health_failures} times in a row, restarting app container" || true
  (cd "${COMPOSE_DIR}" && docker compose restart app) || logger -t clod-monitor -p user.err "docker compose restart app failed" || true
  state_set last_restart "${now_epoch}"
  state_set health_failures 0
fi
printf '%s' "${results}"
