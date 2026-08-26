const OPTION_KEYS = Object.freeze(['loadPage', 'booking', 'slot'])
const BOOKING_KEYS = Object.freeze(['doctorSlug', 'appointmentType', 'intentId', 'dtStart', 'dtEnd', 'patient', 'comment', 'consent'])
const PATIENT_KEYS = Object.freeze(['firstName', 'lastName', 'secondName', 'phone', 'birthday'])
const SLOT_KEYS = Object.freeze(['valid', 'doctorId', 'lpuId', 'specialityId', 'price', 'dtStart', 'dtEnd'])
const PAGE_KEYS = Object.freeze(['data', 'count', 'num_pages'])
const ROW_KEYS = Object.freeze(['id', 'uuid', 'date', 'time_start', 'time_end', 'price', 'canceled', 'lpu', 'doctor', 'patient'])
const LPU_KEYS = Object.freeze(['id', 'name', 'address'])
const DOCTOR_KEYS = Object.freeze(['id', 'fio', 'speciality_id', 'speciality_name'])
const HISTORY_PATIENT_KEYS = Object.freeze(['mobile_phone', 'first_name', 'second_name', 'last_name', 'birthday'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/
const UTC_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/
const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/
const MAX_PAGES = 4
const PAGE_SIZE = 50
const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000

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
  const values = new Array(descriptor.value)
  const indexes = new Set(Array.from({ length: descriptor.value }, (_value, index) => String(index)))
  if (!Reflect.ownKeys(input).every((key) => key === 'length' || (typeof key === 'string' && indexes.has(key)))) throw new TypeError(`${scope} contains unexpected fields`)
  for (let index = 0; index < descriptor.value; index += 1) {
    const item = Object.getOwnPropertyDescriptor(input, String(index))
    if (!item || !Object.hasOwn(item, 'value')) throw new TypeError(`${scope} must be a dense data array`)
    values[index] = item.value
  }
  return values
}

function positiveInteger(value, scope) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${scope} must be a positive integer`)
  return value
}

function nonnegativeInteger(value, scope) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${scope} must be a nonnegative integer`)
  return value
}

function price(value, scope) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new TypeError(`${scope} must be a finite nonnegative number`)
  return Object.is(value, -0) ? 0 : value
}

function text(value, scope, maximum, empty = false) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must be bounded text`)
  const normalized = value.normalize('NFC').trim().replace(/\s+/gu, ' ')
  if ((!empty && !normalized) || [...normalized].length > maximum) throw new TypeError(`${scope} must be bounded text`)
  return normalized
}

function uuid(value, scope) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new TypeError(`${scope} must be a UUID`)
  return value.toLowerCase()
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year, month) {
  const values = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return values[month - 1] || 0
}

function date(value, scope) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must be a real date`)
  const match = DATE_PATTERN.exec(value)
  if (!match) throw new TypeError(`${scope} must be a real date`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || year > 9_999 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) throw new TypeError(`${scope} must be a real date`)
  return value
}

function time(value, scope) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must be a minute-aligned time`)
  const match = TIME_PATTERN.exec(value)
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || (match[3] !== undefined && match[3] !== '00')) throw new TypeError(`${scope} must be a minute-aligned time`)
  return `${match[1]}:${match[2]}`
}

function utcTimestamp(value, scope) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must be a canonical UTC timestamp`)
  const match = UTC_PATTERN.exec(value)
  if (!match) throw new TypeError(`${scope} must be a canonical UTC timestamp`)
  date(`${match[1]}-${match[2]}-${match[3]}`, scope)
  if (Number(match[4]) > 23 || Number(match[5]) > 59 || Number(match[6]) > 59) throw new TypeError(`${scope} must be a canonical UTC timestamp`)
  const milliseconds = Date.parse(value)
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) throw new TypeError(`${scope} must be a canonical UTC timestamp`)
  return milliseconds
}

function localTimestamp(value, scope) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must use YYYY-MM-DD HH:mm`)
  const match = LOCAL_PATTERN.exec(value)
  if (!match) throw new TypeError(`${scope} must use YYYY-MM-DD HH:mm`)
  const localDate = date(`${match[1]}-${match[2]}-${match[3]}`, scope)
  const localTime = time(`${match[4]}:${match[5]}`, scope)
  const instant = Date.parse(`${localDate}T${localTime}:00.000Z`) - MOSCOW_OFFSET_MS
  return Object.freeze({ date: localDate, time: localTime, instant })
}

function normalizedPatient(input, keys, scope) {
  const patient = readRecord(input, keys, keys, scope)
  const phone = keys === PATIENT_KEYS ? patient.phone : patient.mobile_phone
  if (typeof phone !== 'string' || !/^7\d{10,12}$/.test(phone)) throw new TypeError(`${scope} phone must use the normalized format`)
  return Object.freeze({
    firstName: text(keys === PATIENT_KEYS ? patient.firstName : patient.first_name, `${scope} first name`, 100),
    lastName: text(keys === PATIENT_KEYS ? patient.lastName : patient.last_name, `${scope} last name`, 100),
    secondName: text(keys === PATIENT_KEYS ? patient.secondName : patient.second_name, `${scope} second name`, 100, true),
    phone,
    birthday: date(patient.birthday, `${scope} birthday`),
  })
}

function normalizedBooking(input) {
  const booking = readRecord(input, BOOKING_KEYS, BOOKING_KEYS, 'Appointment history booking')
  if (booking.consent !== true) throw new TypeError('Appointment history booking consent must be affirmative')
  return Object.freeze({ start: utcTimestamp(booking.dtStart, 'Appointment history booking start'), end: utcTimestamp(booking.dtEnd, 'Appointment history booking end'), patient: normalizedPatient(booking.patient, PATIENT_KEYS, 'Appointment history booking patient') })
}

function normalizedSlot(input, booking) {
  const slot = readRecord(input, SLOT_KEYS, SLOT_KEYS, 'Appointment history trusted slot')
  if (slot.valid !== true) throw new TypeError('Appointment history slot must be verified')
  const start = localTimestamp(slot.dtStart, 'Appointment history slot start')
  const end = localTimestamp(slot.dtEnd, 'Appointment history slot end')
  if (start.instant !== booking.start || end.instant !== booking.end || end.instant <= start.instant) throw new TypeError('Appointment history slot must match the booking interval')
  return Object.freeze({ doctorId: positiveInteger(slot.doctorId, 'Appointment history doctor ID'), lpuId: positiveInteger(slot.lpuId, 'Appointment history LPU ID'), specialityId: positiveInteger(slot.specialityId, 'Appointment history speciality ID'), price: price(slot.price, 'Appointment history trusted price'), start, end })
}

function normalizedRow(input) {
  const row = readRecord(input, ROW_KEYS, ROW_KEYS, 'Medflex appointment history row')
  const lpu = readRecord(row.lpu, LPU_KEYS, LPU_KEYS, 'Medflex appointment history LPU')
  const doctor = readRecord(row.doctor, DOCTOR_KEYS, DOCTOR_KEYS, 'Medflex appointment history doctor')
  if (typeof row.canceled !== 'boolean') throw new TypeError('Medflex appointment history cancellation flag must be boolean')
  text(lpu.name, 'Medflex appointment history LPU name', 160)
  text(lpu.address, 'Medflex appointment history LPU address', 240)
  text(doctor.fio, 'Medflex appointment history doctor name', 160)
  text(doctor.speciality_name, 'Medflex appointment history speciality name', 120)
  return Object.freeze({
    id: positiveInteger(row.id, 'Medflex appointment history row ID'),
    claimId: uuid(row.uuid, 'Medflex appointment history UUID'),
    date: date(row.date, 'Medflex appointment history date'),
    start: time(row.time_start, 'Medflex appointment history start'),
    end: time(row.time_end, 'Medflex appointment history end'),
    price: price(row.price, 'Medflex appointment history price'),
    canceled: row.canceled,
    lpuId: positiveInteger(lpu.id, 'Medflex appointment history LPU ID'),
    doctorId: positiveInteger(doctor.id, 'Medflex appointment history doctor ID'),
    specialityId: positiveInteger(doctor.speciality_id, 'Medflex appointment history speciality ID'),
    patient: normalizedPatient(row.patient, HISTORY_PATIENT_KEYS, 'Medflex appointment history patient'),
  })
}

function envelope(input, number, expected) {
  const page = readRecord(input, PAGE_KEYS, PAGE_KEYS, 'Medflex appointment history page')
  const data = readArray(page.data, PAGE_SIZE, 'Medflex appointment history page data')
  const count = nonnegativeInteger(page.count, 'Medflex appointment history count')
  const pages = nonnegativeInteger(page.num_pages, 'Medflex appointment history page count')
  const calculated = count === 0 ? 0 : Math.ceil(count / PAGE_SIZE)
  if (pages !== calculated || pages > MAX_PAGES || count > MAX_PAGES * PAGE_SIZE) throw new TypeError('Medflex appointment history pagination exceeds its safe bounds')
  if (expected && (count !== expected.count || pages !== expected.pages)) throw new TypeError('Medflex appointment history pagination changed during reconciliation')
  const remaining = count - (number - 1) * PAGE_SIZE
  const length = Math.max(0, Math.min(PAGE_SIZE, remaining))
  if ((pages === 0 && number !== 1) || data.length !== length) throw new TypeError('Medflex appointment history page length is inconsistent')
  return Object.freeze({ data, count, pages })
}

function matches(row, booking, slot) {
  const patient = booking.patient
  return row.date === slot.start.date && row.start === slot.start.time && row.end === slot.end.time && row.price === slot.price && row.lpuId === slot.lpuId && row.doctorId === slot.doctorId && row.specialityId === slot.specialityId && row.patient.phone === patient.phone && row.patient.birthday === patient.birthday && row.patient.firstName === patient.firstName && row.patient.lastName === patient.lastName && row.patient.secondName === patient.secondName
}

async function loadRows(loadPage) {
  const first = envelope(await loadPage(1), 1)
  const rows = first.data.map(normalizedRow)
  for (let number = 2; number <= first.pages; number += 1) {
    const next = envelope(await loadPage(number), number, first)
    rows.push(...next.data.map(normalizedRow))
  }
  if (rows.length !== first.count) throw new TypeError('Medflex appointment history is incomplete')
  const ids = new Set(rows.map((row) => row.id))
  const claims = new Set(rows.map((row) => row.claimId))
  if (ids.size !== rows.length || claims.size !== rows.length) throw new TypeError('Medflex appointment history contains duplicate identity')
  return Object.freeze(rows)
}

/**
 * Scans a bounded stable Medflex history and returns only an exact active claim.
 */
export async function findAppointmentHistory(input) {
  const options = readRecord(input, OPTION_KEYS, OPTION_KEYS, 'Appointment history options')
  if (typeof options.loadPage !== 'function') throw new TypeError('Appointment history page source must be a function')
  const booking = normalizedBooking(options.booking)
  const slot = normalizedSlot(options.slot, booking)
  const rows = await loadRows(options.loadPage)
  const matchesAll = rows.filter((row) => matches(row, booking, slot))
  const active = matchesAll.filter((row) => !row.canceled)
  if (matchesAll.some((row) => row.canceled) || active.length > 1) throw new TypeError('Appointment history exact match is ambiguous')
  if (active.length === 0) return Object.freeze({ found: false })
  return Object.freeze({ found: true, claimId: active[0].claimId })
}
