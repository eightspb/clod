const MOSCOW_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })

function calendarParts(value) {
  return Object.fromEntries(MOSCOW_FORMAT.formatToParts(value).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]))
}

function moscowUtcDate(year, month, day) {
  const target = Date.UTC(year, month - 1, day)
  let candidate = target
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const current = calendarParts(new Date(candidate))
    const represented = Date.UTC(current.year, current.month - 1, current.day, current.hour, current.minute, current.second)
    candidate += target - represented
  }
  return new Date(candidate)
}

/**
 * Returns the half-open UTC interval for the calendar day visible in Moscow.
 */
export function moscowDayBounds(value) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new TypeError('Clinic time requires a valid Date')
  const current = calendarParts(value)
  const nextCalendarDay = new Date(Date.UTC(current.year, current.month - 1, current.day + 1))
  return Object.freeze({ start: moscowUtcDate(current.year, current.month, current.day).toISOString(), end: moscowUtcDate(nextCalendarDay.getUTCFullYear(), nextCalendarDay.getUTCMonth() + 1, nextCalendarDay.getUTCDate()).toISOString() })
}
