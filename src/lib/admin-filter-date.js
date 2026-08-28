const MOSCOW_OFFSET = '+03:00'
const DAY_MS = 24 * 60 * 60_000
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function start(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) throw new TypeError('Admin filter date is invalid')
  const date = new Date(`${value}T00:00:00${MOSCOW_OFFSET}`)
  if (!Number.isFinite(date.getTime()) || date.toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' }) !== value) throw new TypeError('Admin filter date is invalid')
  return date
}

/** Returns an inclusive Moscow calendar-date boundary as UTC. */
export function moscowFilterStart(value) {
  return start(value).toISOString()
}

/** Returns the exclusive boundary after a Moscow calendar date as UTC. */
export function moscowFilterEnd(value) {
  return new Date(start(value).getTime() + DAY_MS).toISOString()
}
