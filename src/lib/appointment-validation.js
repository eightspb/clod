const QUERY_KEYS = Object.freeze(['doctor', 'from', 'days'])
const BOOKING_KEYS = Object.freeze(['doctorSlug', 'intentId', 'dtStart', 'dtEnd', 'patient', 'comment', 'consent'])
const PATIENT_KEYS = Object.freeze(['firstName', 'lastName', 'secondName', 'phone', 'birthday'])
const BOOKING_OPTIONS_KEYS = Object.freeze(['now'])
const SAFE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/
const NAME_PATTERN = /^\p{L}[\p{L}\p{M}]*(?:[ '\u2019-]\p{L}[\p{L}\p{M}]*)*$/u
const NAME_CONTROL = /[\p{Cc}\p{Cf}]/u
const UNICODE_HYPHEN_PATTERN = /[\u2010-\u2015\u2212]/gu
const PHONE_PATTERN = /^(?:\+7|8)(?:[ \u00a0-]*(?:\([ \u00a0]*\d{3}[ \u00a0]*\)|\d{3}))[ \u00a0-]*\d{3}[ \u00a0-]*\d{2}[ \u00a0-]*\d{2}$/
const RUSSIAN_NUMBER_PREFIX = /^[3489]/
const MIN_APPOINTMENT_MS = 5 * 60 * 1000
const MAX_APPOINTMENT_MS = 4 * 60 * 60 * 1000
const MAX_SLUG_LENGTH = 100
const MAX_NAME_LENGTH = 100
const MAX_COMMENT_LENGTH = 300

function validationFailure(fields) {
  const safeFields = copyDataRecord(Object.entries(fields))
  const error = Object.freeze({ code: 'VALIDATION_ERROR', fields: safeFields })
  return Object.freeze({ valid: false, error })
}

function validationSuccess(value) {
  return Object.freeze({ valid: true, value: Object.freeze(value) })
}

function copyDataRecord(entries) {
  const record = Object.create(null)
  for (const [key, value] of entries) {
    Object.defineProperty(record, key, { enumerable: true, value })
  }
  return Object.freeze(record)
}

function readDataRecord(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return { valid: false }
  const prototype = Object.getPrototypeOf(input)
  if (prototype !== Object.prototype && prototype !== null) return { valid: false }
  const entries = []
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string') return { valid: false }
    const descriptor = Object.getOwnPropertyDescriptor(input, key)
    if (!descriptor || 'get' in descriptor || 'set' in descriptor) return { valid: false }
    entries.push([key, descriptor.value])
  }
  return { valid: true, value: copyDataRecord(entries) }
}

function hasOnlyKeys(value, allowed) {
  return Reflect.ownKeys(value).every((key) => typeof key === 'string' && allowed.includes(key))
}

function readQuery(input) {
  if (input instanceof URLSearchParams) {
    const entries = [...input.entries()]
    const names = entries.map(([name]) => name)
    if (new Set(names).size !== names.length) return { valid: false, duplicate: true }
    return { valid: true, value: copyDataRecord(entries) }
  }
  const record = readDataRecord(input)
  if (!record.valid) return { valid: false, duplicate: false }
  return { valid: true, value: record.value }
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year, month) {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return days[month - 1] || 0
}

function parseDate(value) {
  if (typeof value !== 'string') return { valid: false, code: 'INVALID_DATE' }
  const match = DATE_PATTERN.exec(value)
  if (!match) return { valid: false, code: 'INVALID_DATE' }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return { valid: false, code: 'INVALID_DATE' }
  return Object.freeze({ valid: true, code: '', value, year, month, day })
}

function normalizeDays(value) {
  if (Number.isInteger(value) && value >= 1 && value <= 14) return { valid: true, code: '', value }
  if (typeof value === 'string' && /^(?:[1-9]|1[0-4])$/.test(value)) return { valid: true, code: '', value: Number(value) }
  return { valid: false, code: 'OUT_OF_RANGE' }
}

function validateSlug(value) {
  if (typeof value !== 'string' || !value) return { valid: false, code: 'REQUIRED' }
  if (value.length > MAX_SLUG_LENGTH || !SAFE_SLUG_PATTERN.test(value)) return { valid: false, code: 'INVALID_FORMAT' }
  return { valid: true, code: '', value }
}

function fieldError(field, code) {
  if (!code) return {}
  return { [field]: code }
}

function mergeFields(parts) {
  return copyDataRecord(parts.flatMap((part) => Object.entries(part)))
}

function validateSchedule(input) {
  const query = readQuery(input)
  if (!query.valid && query.duplicate) return validationFailure({ query: 'DUPLICATE_FIELDS' })
  if (!query.valid) return validationFailure({ query: 'INVALID_OBJECT' })
  if (!hasOnlyKeys(query.value, QUERY_KEYS)) return validationFailure({ query: 'UNKNOWN_FIELDS' })
  const doctor = validateSlug(query.value.doctor)
  const from = parseDate(query.value.from)
  const days = normalizeDays(query.value.days)
  const fields = mergeFields([
    fieldError('doctor', doctor.code),
    fieldError('from', from.code),
    fieldError('days', days.code),
  ])
  if (Object.keys(fields).length) return validationFailure(fields)
  return validationSuccess({ doctor: doctor.value, from: from.value, days: days.value })
}

function validateTimezone(value) {
  if (value === 'Z') return true
  const hours = Number(value.slice(1, 3))
  const minutes = Number(value.slice(4, 6))
  return hours <= 14 && minutes <= 59 && (hours < 14 || minutes === 0)
}

function parseTimestamp(value) {
  if (typeof value !== 'string') return { valid: false, code: 'INVALID_TIMESTAMP' }
  const match = TIMESTAMP_PATTERN.exec(value)
  if (!match) return { valid: false, code: 'INVALID_TIMESTAMP' }
  const date = parseDate(`${match[1]}-${match[2]}-${match[3]}`)
  const hours = Number(match[4])
  const minutes = Number(match[5])
  const seconds = match[6] === undefined ? 0 : Number(match[6])
  const timezone = match[8]
  if (!date.valid || hours > 23 || minutes > 59 || seconds > 59 || !validateTimezone(timezone)) return { valid: false, code: 'INVALID_TIMESTAMP' }
  const milliseconds = Date.parse(value)
  if (!Number.isFinite(milliseconds)) return { valid: false, code: 'INVALID_TIMESTAMP' }
  return Object.freeze({ valid: true, code: '', milliseconds, value: new Date(milliseconds).toISOString() })
}

function validateTimestamps(dtStart, dtEnd, now) {
  const start = parseTimestamp(dtStart)
  const end = parseTimestamp(dtEnd)
  const errors = []
  if (!start.valid) errors.push(fieldError('dtStart', start.code))
  if (!end.valid) errors.push(fieldError('dtEnd', end.code))
  if (!start.valid || !end.valid) return { fields: mergeFields(errors), start, end }
  if (start.milliseconds <= now.getTime()) errors.push(fieldError('dtStart', 'NOT_FUTURE'))
  if (end.milliseconds <= start.milliseconds) errors.push(fieldError('dtEnd', 'NOT_AFTER_START'))
  const duration = end.milliseconds - start.milliseconds
  if (duration > 0 && (duration < MIN_APPOINTMENT_MS || duration > MAX_APPOINTMENT_MS)) errors.push(fieldError('dtEnd', 'INVALID_DURATION'))
  return { fields: mergeFields(errors), start, end }
}

function normalizeName(value, required) {
  if (value === undefined && !required) return { valid: true, code: '', value: '' }
  if (typeof value !== 'string') return { valid: false, code: required ? 'REQUIRED' : 'INVALID_FORMAT' }
  if (NAME_CONTROL.test(value)) return { valid: false, code: 'INVALID_FORMAT' }
  const normalized = value.normalize('NFC').replace(UNICODE_HYPHEN_PATTERN, '-').trim().replace(/\s+/gu, ' ')
  if (!normalized) return required ? { valid: false, code: 'REQUIRED' } : { valid: true, code: '', value: '' }
  if ([...normalized].length > MAX_NAME_LENGTH) return { valid: false, code: 'TOO_LONG' }
  if (!NAME_PATTERN.test(normalized)) return { valid: false, code: 'INVALID_FORMAT' }
  return { valid: true, code: '', value: normalized }
}

function normalizePhone(value) {
  if (typeof value !== 'string' || !PHONE_PATTERN.test(value.trim())) return { valid: false, code: 'INVALID_FORMAT' }
  const digits = value.replace(/\D/g, '')
  const national = digits.slice(1)
  if (digits.length !== 11 || !RUSSIAN_NUMBER_PREFIX.test(national)) return { valid: false, code: 'INVALID_FORMAT' }
  return { valid: true, code: '', value: `7${national}` }
}

function normalizeBirthday(value, now) {
  const birthday = parseDate(value)
  if (!birthday.valid) return birthday
  const today = now.toISOString().slice(0, 10)
  if (birthday.value >= today) return { valid: false, code: 'NOT_PAST' }
  return { valid: true, code: '', value: birthday.value }
}

function normalizeComment(value) {
  if (value === undefined) return { valid: true, code: '', value: '' }
  if (typeof value !== 'string') return { valid: false, code: 'INVALID_FORMAT' }
  const normalized = value.trim()
  if ([...normalized].length > MAX_COMMENT_LENGTH) return { valid: false, code: 'TOO_LONG' }
  return { valid: true, code: '', value: normalized }
}

function validatePatient(patient, now) {
  const record = readDataRecord(patient)
  if (!record.valid) return { fields: Object.freeze({ patient: 'INVALID_OBJECT' }) }
  if (!hasOnlyKeys(record.value, PATIENT_KEYS)) return { fields: Object.freeze({ patient: 'UNKNOWN_FIELDS' }) }
  const firstName = normalizeName(record.value.firstName, true)
  const lastName = normalizeName(record.value.lastName, true)
  const secondName = normalizeName(record.value.secondName, false)
  const phone = normalizePhone(record.value.phone)
  const birthday = normalizeBirthday(record.value.birthday, now)
  const fields = mergeFields([
    fieldError('patient.firstName', firstName.code),
    fieldError('patient.lastName', lastName.code),
    fieldError('patient.secondName', secondName.code),
    fieldError('patient.phone', phone.code),
    fieldError('patient.birthday', birthday.code),
  ])
  if (Object.keys(fields).length) return { fields }
  const value = Object.freeze({
    firstName: firstName.value,
    lastName: lastName.value,
    secondName: secondName.value,
    phone: phone.value,
    birthday: birthday.value,
  })
  return { fields, value }
}

function normalizeIntentId(value) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) return { valid: false, code: 'INVALID_FORMAT' }
  return { valid: true, code: '', value: value.toLowerCase() }
}

function resolveNow(options) {
  const record = readDataRecord(options)
  if (!record.valid) throw new TypeError('Booking validation options must be a plain object')
  if (!hasOnlyKeys(record.value, BOOKING_OPTIONS_KEYS)) throw new TypeError('Booking validation options contain unknown keys')
  const now = record.value.now === undefined ? new Date() : record.value.now
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new TypeError('Booking validation now must be a valid Date')
  return now
}

function validateBooking(input, now) {
  const record = readDataRecord(input)
  if (!record.valid) return validationFailure({ booking: 'INVALID_OBJECT' })
  if (!hasOnlyKeys(record.value, BOOKING_KEYS)) return validationFailure({ booking: 'UNKNOWN_FIELDS' })
  const patient = validatePatient(record.value.patient, now)
  if (patient.fields.patient) return validationFailure(patient.fields)
  const timestamps = validateTimestamps(record.value.dtStart, record.value.dtEnd, now)
  const doctor = validateSlug(record.value.doctorSlug)
  const intentId = normalizeIntentId(record.value.intentId)
  const comment = normalizeComment(record.value.comment)
  const fields = mergeFields([
    fieldError('doctorSlug', doctor.code),
    fieldError('intentId', intentId.code),
    timestamps.fields,
    patient.fields,
    fieldError('comment', comment.code),
    fieldError('consent', record.value.consent === true ? '' : 'REQUIRED_TRUE'),
  ])
  if (Object.keys(fields).length) return validationFailure(fields)
  return validationSuccess({
    doctorSlug: doctor.value,
    intentId: intentId.value,
    dtStart: timestamps.start.value,
    dtEnd: timestamps.end.value,
    patient: patient.value,
    comment: comment.value,
    consent: true,
  })
}

/**
 * Validates and normalizes an appointment schedule query.
 */
export function validateScheduleQuery(input) {
  return validateSchedule(input)
}

/**
 * Validates and normalizes a browser booking payload without reflecting patient data.
 */
export function validateBookingPayload(input, options = {}) {
  return validateBooking(input, resolveNow(options))
}
