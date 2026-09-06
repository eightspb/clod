const MOSCOW_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' })
const MOSCOW_OFFSET_MS = 3 * 60 * 60_000
const WEEKDAY_HOURS = Object.freeze({ open: 9, close: 20 })
const WEEKEND_HOURS = Object.freeze({ open: 10, close: 18 })
const DEFAULT_THRESHOLD_HOURS = 4

function moscowParts(value) {
  return Object.fromEntries(MOSCOW_FORMAT.formatToParts(value).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
}

function moscowInstant(year, month, day, hour) {
  return Date.UTC(Number(year), Number(month) - 1, Number(day), hour) - MOSCOW_OFFSET_MS
}

/**
 * Decides whether the MANGO webhook stream has gone silent for suspiciously long during
 * clinic hours: a changed API Realtime IP or a broken callback URL shows up as silence, not as an error.
 */
export function telephonySilence({ lastEventAt, now, thresholdHours = DEFAULT_THRESHOLD_HOURS }) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new TypeError('Telephony silence check requires a valid current Date')
  if (typeof thresholdHours !== 'number' || !(thresholdHours > 0)) throw new TypeError('Telephony silence threshold must be a positive number of hours')
  const lastEvent = lastEventAt === null || lastEventAt === undefined ? undefined : Date.parse(lastEventAt)
  if (lastEvent !== undefined && !Number.isFinite(lastEvent)) throw new TypeError('Telephony last event timestamp is invalid')
  const parts = moscowParts(now)
  const hours = ['Sat', 'Sun'].includes(parts.weekday) ? WEEKEND_HOURS : WEEKDAY_HOURS
  const opening = moscowInstant(parts.year, parts.month, parts.day, hours.open)
  const closing = moscowInstant(parts.year, parts.month, parts.day, hours.close)
  const reference = Math.max(lastEvent ?? 0, opening)
  const stale = now.getTime() >= opening && now.getTime() < closing && now.getTime() - reference > thresholdHours * 60 * 60_000
  return Object.freeze({ stale, sinceAt: new Date(reference).toISOString() })
}
