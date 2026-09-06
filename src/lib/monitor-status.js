import { readFile as readFileFromDisk } from 'node:fs/promises'

export const MONITOR_STATUS_FILE = '/var/lib/clod-monitor/status.json'
const CHECK_NAMES = Object.freeze(['health', 'tls', 'disk', 'memory', 'containers', 'backup'])
const STALE_AFTER_MS = 10 * 60_000
const MAX_DETAIL_LENGTH = 120
const UNAVAILABLE = Object.freeze({ available: false })

function safeCheck(value) {
  if (value === null || typeof value !== 'object' || !CHECK_NAMES.includes(value.name) || typeof value.ok !== 'boolean') return undefined
  const detail = typeof value.detail === 'string' ? [...value.detail.replace(/[\p{Cc}\p{Cf}]/gu, '')].slice(0, MAX_DETAIL_LENGTH).join('') : ''
  return Object.freeze({ name: value.name, ok: value.ok, detail })
}

/**
 * Reads the status file written by scripts/monitor.sh on the Docker host and reduces it to a
 * browser-safe summary; the host is the only writer, but the shape is still validated because
 * the dashboard renders it to every administrator.
 */
export async function readMonitorStatus({ path = MONITOR_STATUS_FILE, now = new Date(), readFile = readFileFromDisk } = {}) {
  let parsed
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return UNAVAILABLE
  }
  const checkedAt = typeof parsed?.checkedAt === 'string' ? Date.parse(parsed.checkedAt) : Number.NaN
  if (!Number.isFinite(checkedAt) || !Array.isArray(parsed.checks)) return UNAVAILABLE
  const checks = Object.freeze(parsed.checks.map(safeCheck).filter(Boolean))
  return Object.freeze({ available: true, checkedAt: new Date(checkedAt).toISOString(), stale: now.getTime() - checkedAt > STALE_AFTER_MS, checks, failing: Object.freeze(checks.filter((check) => !check.ok)) })
}
