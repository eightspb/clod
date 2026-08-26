import { resolveMedflexAppointmentType, resolveMedflexDoctor } from './medflex-doctors.js'

const MOSCOW_OFFSET_MINUTES = 180
const DAY_MILLISECONDS = 86_400_000
const MAX_SCHEDULE_ROWS = 1
const MAX_SPECIALITIES = 100
const MAX_TYPE_METADATA = 100
/** Caps a two-week schedule well above one slot per ten minutes. */
const MAX_SCHEDULE_CELLS = 2_000
const SAFE_LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/
const SAFE_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(Z|[+-]\d{2}:\d{2})$/
const SAFE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const NORMALIZER_KEYS = Object.freeze(['doctorSlug', 'page', 'from', 'days', 'now'])
const VERIFIER_KEYS = Object.freeze(['doctorSlug', 'appointmentType', 'page', 'dtStart', 'dtEnd', 'birthday', 'from', 'days', 'now'])
const PAGE_KEYS = Object.freeze(['data', 'count', 'num_pages'])
const ROW_KEYS = Object.freeze(['doctor_id', 'lpu_id', 'specialities', 'prices', 'allowed_age', 'cells'])
const PRICE_KEYS = Object.freeze(['speciality_id', 'price'])
const AGE_KEYS = Object.freeze(['speciality_id', 'min', 'max'])
const CELL_KEYS = Object.freeze(['dt_start', 'dt_end'])
const EMPTY = Object.freeze([])
const DOCTOR_UNAVAILABLE = Object.freeze({ valid: false, reason: 'DOCTOR_UNAVAILABLE' })
const TYPE_UNAVAILABLE = Object.freeze({ valid: false, reason: 'APPOINTMENT_TYPE_UNAVAILABLE' })
const SLOT_UNAVAILABLE = Object.freeze({ valid: false, reason: 'SLOT_UNAVAILABLE' })
const AGE_NOT_ALLOWED = Object.freeze({ valid: false, reason: 'AGE_NOT_ALLOWED' })
const PUBLIC_DOCTOR_UNAVAILABLE = Object.freeze({ available: false, reason: 'DOCTOR_UNAVAILABLE', appointmentTypes: EMPTY, dates: EMPTY })

function readRecord(input, allowed, required, scope) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`${scope} must be a plain data object`)
  const prototype = Object.getPrototypeOf(input)
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${scope} must be a plain data object`)
  const value = Object.create(null)
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !allowed.includes(key)) throw new TypeError(`${scope} contains unknown fields`)
    const descriptor = Object.getOwnPropertyDescriptor(input, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError(`${scope} must contain data fields only`)
    Object.defineProperty(value, key, { enumerable: true, value: descriptor.value })
  }
  if (!required.every((key) => Object.hasOwn(value, key))) throw new TypeError(`${scope} is missing required fields`)
  return value
}

function readArray(input, maximum, scope) {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) throw new TypeError(`${scope} must be a dense data array`)
  const descriptor = Object.getOwnPropertyDescriptor(input, 'length')
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || !Number.isSafeInteger(descriptor.value) || descriptor.value < 0 || descriptor.value > maximum) throw new TypeError(`${scope} must be a bounded dense data array`)
  const length = descriptor.value
  const indexes = new Set(Array.from({ length }, (_value, index) => String(index)))
  if (!Reflect.ownKeys(input).every((key) => key === 'length' || (typeof key === 'string' && indexes.has(key)))) throw new TypeError(`${scope} contains unexpected fields`)
  const values = new Array(length)
  for (let index = 0; index < length; index += 1) {
    const item = Object.getOwnPropertyDescriptor(input, String(index))
    if (!item || !Object.hasOwn(item, 'value')) throw new TypeError(`${scope} must be a dense data array`)
    values[index] = item.value
  }
  return values
}

function normalizePositiveInteger(value, scope) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${scope} must be a positive integer`)
  return value
}

function normalizeNonnegativeInteger(value, scope) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${scope} must be a nonnegative integer`)
  return value
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year, month) {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return days[month - 1] || 0
}

function civilMilliseconds(year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0) {
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(hour, minute, second, millisecond)
  return date.getTime()
}

function parseDate(value, scope) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must be a real YYYY-MM-DD date`)
  const match = SAFE_DATE.exec(value)
  if (!match) throw new TypeError(`${scope} must be a real YYYY-MM-DD date`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) throw new TypeError(`${scope} must be a real YYYY-MM-DD date`)
  return Object.freeze({ value, year, month, day, milliseconds: civilMilliseconds(year, month, day) })
}

function pad(value, length) {
  return String(value).padStart(length, '0')
}

function formatDate(date) {
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`
}

function addDays(date, days) {
  const result = new Date(date.milliseconds + days * DAY_MILLISECONDS)
  const year = result.getUTCFullYear()
  if (year < 1 || year > 9_999) throw new TypeError('Appointment schedule window exceeds the supported calendar')
  return Object.freeze({ value: formatDate(result), milliseconds: result.getTime() })
}

function normalizeWindow(from, days) {
  const start = parseDate(from, 'Appointment schedule start')
  if (!Number.isSafeInteger(days) || days < 1 || days > 14) throw new TypeError('Appointment schedule days must be an integer from 1 through 14')
  return Object.freeze({ start, end: addDays(start, days) })
}

function normalizeNow(value) {
  if (!(value instanceof Date)) throw new TypeError('Appointment schedule now must be a valid Date')
  const milliseconds = Date.prototype.getTime.call(value)
  if (!Number.isFinite(milliseconds)) throw new TypeError('Appointment schedule now must be a valid Date')
  return milliseconds
}

function parseLocalDateTime(value, scope) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must use exact YYYY-MM-DD HH:mm format`)
  const match = SAFE_LOCAL_DATETIME.exec(value)
  if (!match) throw new TypeError(`${scope} must use exact YYYY-MM-DD HH:mm format`)
  const date = parseDate(`${match[1]}-${match[2]}-${match[3]}`, scope)
  const hour = Number(match[4])
  const minute = Number(match[5])
  if (hour > 23 || minute > 59) throw new TypeError(`${scope} must contain a real local time`)
  const localMilliseconds = civilMilliseconds(date.year, date.month, date.day, hour, minute)
  return Object.freeze({ raw: value, date: date.value, time: `${match[4]}:${match[5]}`, hour, minute, localMilliseconds, instantMilliseconds: localMilliseconds - MOSCOW_OFFSET_MINUTES * 60_000, display: `${date.value}T${match[4]}:${match[5]}:00+03:00` })
}

function parseTimestamp(value, scope) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must be a normalized timestamp`)
  const match = SAFE_TIMESTAMP.exec(value)
  if (!match) throw new TypeError(`${scope} must be a normalized timestamp`)
  const date = parseDate(`${match[1]}-${match[2]}-${match[3]}`, scope)
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const millisecond = match[7] === undefined ? 0 : Number(match[7])
  if (hour > 23 || minute > 59 || second > 59) throw new TypeError(`${scope} must be a normalized timestamp`)
  const timezone = match[8]
  const offsetHours = timezone === 'Z' ? 0 : Number(timezone.slice(1, 3))
  const offsetMinutes = timezone === 'Z' ? 0 : Number(timezone.slice(4, 6))
  if (offsetHours > 14 || offsetMinutes > 59 || (offsetHours === 14 && offsetMinutes !== 0)) throw new TypeError(`${scope} must have a real timezone offset`)
  const direction = timezone === 'Z' || timezone[0] === '+' ? 1 : -1
  const offset = direction * (offsetHours * 60 + offsetMinutes)
  return civilMilliseconds(date.year, date.month, date.day, hour, minute, second, millisecond) - offset * 60_000
}

function parseCell(input) {
  const cell = readRecord(input, CELL_KEYS, CELL_KEYS, 'Medflex schedule cell')
  const start = parseLocalDateTime(cell.dt_start, 'Medflex schedule cell start')
  const end = parseLocalDateTime(cell.dt_end, 'Medflex schedule cell end')
  if (end.instantMilliseconds <= start.instantMilliseconds) throw new TypeError('Medflex schedule cell end must follow its start')
  return Object.freeze({ start, end })
}

function parsePrices(input) {
  const records = readArray(input, MAX_TYPE_METADATA, 'Medflex schedule prices')
  const prices = new Map()
  for (const inputPrice of records) {
    const price = readRecord(inputPrice, PRICE_KEYS, PRICE_KEYS, 'Medflex schedule price')
    const specialityId = normalizePositiveInteger(price.speciality_id, 'Medflex schedule price speciality ID')
    if (prices.has(specialityId)) throw new TypeError('Medflex schedule contains duplicate price metadata')
    prices.set(specialityId, normalizePrice(price.price))
  }
  return prices
}

function parseAges(input) {
  const records = readArray(input, MAX_TYPE_METADATA, 'Medflex schedule ages')
  const ages = new Map()
  for (const inputAge of records) {
    const age = readRecord(inputAge, AGE_KEYS, AGE_KEYS, 'Medflex schedule age')
    const specialityId = normalizePositiveInteger(age.speciality_id, 'Medflex schedule age speciality ID')
    if (ages.has(specialityId)) throw new TypeError('Medflex schedule contains duplicate age metadata')
    ages.set(specialityId, normalizeAge(age))
  }
  return ages
}

function parseSpecialities(input) {
  const identifiers = readArray(input, MAX_SPECIALITIES, 'Medflex schedule specialities').map((value) => normalizePositiveInteger(value, 'Medflex schedule speciality ID'))
  if (new Set(identifiers).size !== identifiers.length) throw new TypeError('Medflex schedule contains duplicate speciality identifiers')
  return new Set(identifiers)
}

function parseCells(input) {
  const records = readArray(input, MAX_SCHEDULE_CELLS, 'Medflex schedule cells')
  const starts = new Map()
  const cells = []
  for (const record of records) {
    const cell = parseCell(record)
    const previous = starts.get(cell.start.instantMilliseconds)
    if (previous && previous.end.instantMilliseconds !== cell.end.instantMilliseconds) throw new TypeError('Medflex schedule contains an ambiguous cell start')
    if (!previous) {
      starts.set(cell.start.instantMilliseconds, cell)
      cells.push(cell)
    }
  }
  return cells
}

function parseRow(input, doctor) {
  const row = readRecord(input, ROW_KEYS, ROW_KEYS, 'Medflex schedule row')
  const doctorId = normalizePositiveInteger(row.doctor_id, 'Medflex schedule doctor ID')
  const lpuId = normalizePositiveInteger(row.lpu_id, 'Medflex schedule LPU ID')
  if (doctorId !== doctor.doctorId || lpuId !== doctor.lpuId) throw new TypeError('Medflex schedule row does not match the approved doctor and LPU')
  return Object.freeze({ specialities: parseSpecialities(row.specialities), prices: parsePrices(row.prices), ages: parseAges(row.allowed_age), cells: Object.freeze(parseCells(row.cells)) })
}

function parsePage(input, doctor) {
  const page = readRecord(input, PAGE_KEYS, PAGE_KEYS, 'Medflex schedule page')
  const data = readArray(page.data, MAX_SCHEDULE_ROWS, 'Medflex schedule page data')
  const count = normalizeNonnegativeInteger(page.count, 'Medflex schedule count')
  const pages = normalizeNonnegativeInteger(page.num_pages, 'Medflex schedule page count')
  const expectedPages = data.length === 0 ? 0 : 1
  if (count !== data.length || pages !== expectedPages) throw new TypeError('Medflex schedule page contains inconsistent metadata')
  if (data.length === 0) return Object.freeze({ available: false })
  return Object.freeze({ available: true, row: parseRow(data[0], doctor) })
}

function normalizeAge(input) {
  if (!Number.isSafeInteger(input.min) || input.min < 0) throw new TypeError('Medflex schedule minimum age must be a nonnegative integer')
  if (input.max !== null && (!Number.isSafeInteger(input.max) || input.max < input.min)) throw new TypeError('Medflex schedule maximum age must be null or an integer at least the minimum')
  return Object.freeze({ minAge: input.min, maxAge: input.max })
}

function normalizePrice(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new TypeError('Medflex schedule price must be a finite nonnegative number')
  return value
}

function liveTypes(doctor, row) {
  const types = []
  for (const configured of doctor.appointmentTypes) {
    if (!row.specialities.has(configured.specialityId)) continue
    if (!row.prices.has(configured.specialityId)) continue
    if (!row.ages.has(configured.specialityId)) continue
    const age = row.ages.get(configured.specialityId)
    types.push(Object.freeze({ key: configured.key, label: configured.label, specialityId: configured.specialityId, price: row.prices.get(configured.specialityId), minAge: age.minAge, maxAge: age.maxAge }))
  }
  return Object.freeze(types)
}

function filterCells(cells, window, now) {
  return Object.freeze(cells.filter((cell) => cell.start.instantMilliseconds > now && cell.start.localMilliseconds >= window.start.milliseconds && cell.start.localMilliseconds < window.end.milliseconds && cell.end.localMilliseconds <= window.end.milliseconds).sort((left, right) => left.start.instantMilliseconds - right.start.instantMilliseconds))
}

function period(cell) {
  if (cell.start.hour < 11) return 'morning'
  if (cell.start.hour < 17) return 'day'
  return 'evening'
}

function publicTypes(types) {
  return Object.freeze(types.map((type) => Object.freeze({ key: type.key, label: type.label, price: type.price, minAge: type.minAge, maxAge: type.maxAge })))
}

function publicDates(cells) {
  const dates = new Map()
  for (const cell of cells) {
    if (!dates.has(cell.start.date)) dates.set(cell.start.date, [])
    dates.get(cell.start.date).push(Object.freeze({ startsAt: cell.start.display, endsAt: cell.end.display, time: cell.start.time, period: period(cell) }))
  }
  return Object.freeze([...dates.entries()].map(([date, slots]) => Object.freeze({ date, count: slots.length, slots: Object.freeze(slots) })))
}

function publicDoctor(doctor) {
  return Object.freeze({ slug: doctor.slug, name: doctor.name, location: doctor.location, timeZone: doctor.timeZone })
}

function publicResult(available, reason, doctor, types, dates) {
  return Object.freeze({ available, reason, doctor: publicDoctor(doctor), appointmentTypes: types, dates })
}

function liveSchedule(doctor, page, window, now) {
  const schedule = parsePage(page, doctor)
  if (!schedule.available) return Object.freeze({ available: false, reason: 'NO_SCHEDULE', types: EMPTY, cells: EMPTY })
  const types = liveTypes(doctor, schedule.row)
  if (types.length === 0) return Object.freeze({ available: false, reason: 'NO_APPOINTMENT_TYPES', types, cells: EMPTY })
  const cells = filterCells(schedule.row.cells, window, now)
  if (cells.length === 0) return Object.freeze({ available: false, reason: 'NO_SLOTS', types, cells })
  return Object.freeze({ available: true, reason: 'AVAILABLE', types, cells })
}

function localToday(now) {
  const date = new Date(now + MOSCOW_OFFSET_MINUTES * 60_000)
  return Object.freeze({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), milliseconds: civilMilliseconds(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()) })
}

function normalizeBirthday(value, now) {
  const birthday = parseDate(value, 'Appointment patient birthday')
  if (birthday.milliseconds >= localToday(now).milliseconds) throw new TypeError('Appointment patient birthday must be a real past date')
  return birthday
}

function ageAt(birthday, appointment) {
  const beforeBirthday = appointment.month < birthday.month || (appointment.month === birthday.month && appointment.day < birthday.day)
  return appointment.year - birthday.year - (beforeBirthday ? 1 : 0)
}

function matchingType(types, key) {
  return types.find((type) => type.key === key)
}

function matchingCell(cells, start, end) {
  return cells.find((cell) => cell.start.instantMilliseconds === start && cell.end.instantMilliseconds === end)
}

/**
 * Converts one trusted Medflex schedule page into a deeply frozen browser-safe model.
 */
export function normalizeAppointmentSchedule(input) {
  const options = readRecord(input, NORMALIZER_KEYS, NORMALIZER_KEYS, 'Appointment schedule options')
  const window = normalizeWindow(options.from, options.days)
  const now = normalizeNow(options.now)
  const doctor = resolveMedflexDoctor(options.doctorSlug)
  if (!doctor.available) return PUBLIC_DOCTOR_UNAVAILABLE
  const schedule = liveSchedule(doctor, options.page, window, now)
  if (schedule.reason === 'NO_SCHEDULE') return publicResult(false, schedule.reason, doctor, EMPTY, EMPTY)
  const types = publicTypes(schedule.types)
  if (!schedule.available) return publicResult(false, schedule.reason, doctor, types, EMPTY)
  return publicResult(true, schedule.reason, doctor, types, publicDates(schedule.cells))
}

/**
 * Revalidates a selected browser slot against the current trusted Medflex schedule.
 */
export function verifyAppointmentSlot(input) {
  const options = readRecord(input, VERIFIER_KEYS, VERIFIER_KEYS, 'Appointment slot verification options')
  const window = normalizeWindow(options.from, options.days)
  const now = normalizeNow(options.now)
  const selectedStart = parseTimestamp(options.dtStart, 'Selected appointment start')
  const selectedEnd = parseTimestamp(options.dtEnd, 'Selected appointment end')
  const birthday = normalizeBirthday(options.birthday, now)
  const identity = resolveMedflexAppointmentType(options.doctorSlug, options.appointmentType)
  if (!identity.available) return identity.reason === 'DOCTOR_UNAVAILABLE' ? DOCTOR_UNAVAILABLE : TYPE_UNAVAILABLE
  const doctor = resolveMedflexDoctor(options.doctorSlug)
  const schedule = liveSchedule(doctor, options.page, window, now)
  const type = matchingType(schedule.types, options.appointmentType)
  if (!type) return TYPE_UNAVAILABLE
  const cell = matchingCell(schedule.cells, selectedStart, selectedEnd)
  if (!cell) return SLOT_UNAVAILABLE
  const appointmentDate = parseDate(cell.start.date, 'Appointment clinic-local date')
  const age = ageAt(birthday, appointmentDate)
  if (age < type.minAge || (type.maxAge !== null && age > type.maxAge)) return AGE_NOT_ALLOWED
  return Object.freeze({ valid: true, doctorId: identity.doctorId, lpuId: identity.lpuId, specialityId: identity.specialityId, price: type.price, dtStart: cell.start.raw, dtEnd: cell.end.raw })
}
