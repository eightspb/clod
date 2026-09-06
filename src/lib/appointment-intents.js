import { createHmac, randomUUID } from 'node:crypto'

const FACTORY_KEYS = Object.freeze(['client', 'secret', 'clock', 'uuid', 'pendingTtlMs'])
const FINGERPRINT_KEYS = Object.freeze(['booking', 'slot'])
const ACQUIRE_KEYS = FINGERPRINT_KEYS
const RESUME_KEYS = Object.freeze(['booking'])
const BOOKING_KEYS = Object.freeze(['doctorSlug', 'appointmentType', 'intentId', 'dtStart', 'dtEnd', 'patient', 'comment', 'consent'])
const PATIENT_KEYS = Object.freeze(['firstName', 'lastName', 'secondName', 'phone', 'birthday'])
const SLOT_KEYS = Object.freeze(['valid', 'doctorId', 'lpuId', 'specialityId', 'price', 'dtStart', 'dtEnd'])
const CAPABILITY_KEYS = Object.freeze(['capability'])
const CONFIRM_KEYS = Object.freeze(['capability', 'claimId'])
const FAIL_KEYS = Object.freeze(['capability', 'failureCode'])
const RECONCILE_KEYS = Object.freeze(['capability', 'history'])
const HISTORY_KEYS = Object.freeze(['found', 'claimId'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const FINGERPRINT_PATTERN = /^v1:[0-9a-f]{64}$/
const KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const UTC_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/
const MEDFLEX_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/
const RESERVED_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype'])
const STATUSES = Object.freeze(['pending', 'confirmed', 'uncertain', 'failed'])
const FAILURE_CODES = Object.freeze(['SLOT_UNAVAILABLE', 'PATIENT_REJECTED', 'UPSTREAM_REJECTED', 'UPSTREAM_UNAVAILABLE_BEFORE_DISPATCH', 'UPSTREAM_NOT_ACCEPTED', 'LOCAL_PERSISTENCE_FAILED'])
const RETRYABLE_FAILURE_CODES = new Set(['SLOT_UNAVAILABLE', 'UPSTREAM_UNAVAILABLE_BEFORE_DISPATCH', 'UPSTREAM_NOT_ACCEPTED', 'LOCAL_PERSISTENCE_FAILED'])
const DEFAULT_PENDING_TTL_MS = 120_000
const MAX_RESUME_CANDIDATES = 32
const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000
const FINGERPRINT_DOMAIN = 'clod.booking-intent'
const FINGERPRINT_VERSION = 'v1'
const FENCE_DOMAIN = 'clod.booking-intent.fence.v1'
const FENCE_VERSION = 'v1'
const ROW_COLUMNS = Object.freeze([
  'id',
  'requestFingerprint',
  'status',
  'fencingToken',
  'doctorSlug',
  'appointmentType',
  'doctorId',
  'lpuId',
  'specialityId',
  'startsAt',
  'endsAt',
  'price',
  'medflexClaimId',
  'failureCode',
  'createdAt',
  'updatedAt',
  'pendingUntil',
])
const SELECT_COLUMNS = ROW_COLUMNS.join(', ')
const CAPABILITIES = new WeakMap()
const ERROR_MESSAGES = Object.freeze({
  BOOKING_INTENT_COLLISION: 'Booking intent identity resolves to inconsistent records',
  BOOKING_INTENT_INVARIANT: 'Booking intent storage contains an invalid record',
})

/**
 * Represents a safe booking-intent invariant failure without request data.
 */
export class BookingIntentError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(ERROR_MESSAGES, code) ? code : 'BOOKING_INTENT_INVARIANT'
    super(ERROR_MESSAGES[safeCode])
    this.name = 'BookingIntentError'
    this.code = safeCode
    Object.freeze(this)
  }
}

function invariant(code = 'BOOKING_INTENT_INVARIANT') {
  return new BookingIntentError(code)
}

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

function normalizeUuid(value, scope) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new TypeError(`${scope} must be a UUID`)
  return value.toLowerCase()
}

function normalizeKey(value, scope, maximum = 100) {
  if (typeof value !== 'string' || value.length > maximum || !KEY_PATTERN.test(value) || RESERVED_KEYS.includes(value)) throw new TypeError(`${scope} must be a safe local key`)
  return value
}

function normalizeText(value, scope, maximum, allowEmpty) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must be bounded text`)
  const normalized = value.normalize('NFC')
  const length = [...normalized].length
  if ((!allowEmpty && length === 0) || length > maximum) throw new TypeError(`${scope} must be bounded text`)
  return normalized
}

function normalizePositiveInteger(value, scope) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${scope} must be a positive integer`)
  return value
}

function normalizePrice(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new TypeError('Booking intent price must be a finite nonnegative number')
  return Object.is(value, -0) ? 0 : value
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year, month) {
  const values = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return values[month - 1] || 0
}

function civilMilliseconds(year, month, day, hour, minute, second, millisecond) {
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(hour, minute, second, millisecond)
  return date.getTime()
}

function validateDateParts(year, month, day, scope) {
  if (year < 1 || year > 9_999 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) throw new TypeError(`${scope} must contain a real date`)
}

function normalizeDate(value, scope) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must be a real YYYY-MM-DD date`)
  const match = DATE_PATTERN.exec(value)
  if (!match) throw new TypeError(`${scope} must be a real YYYY-MM-DD date`)
  validateDateParts(Number(match[1]), Number(match[2]), Number(match[3]), scope)
  return value
}

function normalizeUtcTimestamp(value, scope) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must be a canonical UTC timestamp`)
  const match = UTC_TIMESTAMP_PATTERN.exec(value)
  if (!match) throw new TypeError(`${scope} must be a canonical UTC timestamp`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const millisecond = Number(match[7])
  validateDateParts(year, month, day, scope)
  if (hour > 23 || minute > 59 || second > 59) throw new TypeError(`${scope} must be a canonical UTC timestamp`)
  const milliseconds = civilMilliseconds(year, month, day, hour, minute, second, millisecond)
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) throw new TypeError(`${scope} must be a canonical UTC timestamp`)
  return Object.freeze({ value, milliseconds })
}

function normalizeMedflexTimestamp(value, scope) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must use exact YYYY-MM-DD HH:mm format`)
  const match = MEDFLEX_TIMESTAMP_PATTERN.exec(value)
  if (!match) throw new TypeError(`${scope} must use exact YYYY-MM-DD HH:mm format`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  validateDateParts(year, month, day, scope)
  if (hour > 23 || minute > 59) throw new TypeError(`${scope} must contain a real time`)
  const milliseconds = civilMilliseconds(year, month, day, hour, minute, 0, 0) - MOSCOW_OFFSET_MS
  return Object.freeze({ value, milliseconds })
}

function normalizePatient(input) {
  const patient = readRecord(input, PATIENT_KEYS, PATIENT_KEYS, 'Booking intent patient')
  const phone = patient.phone
  if (typeof phone !== 'string' || !/^7\d{10,12}$/.test(phone)) throw new TypeError('Booking intent patient phone must use the normalized format')
  return Object.freeze({
    firstName: normalizeText(patient.firstName, 'Booking intent patient first name', 100, false),
    lastName: normalizeText(patient.lastName, 'Booking intent patient last name', 100, false),
    secondName: normalizeText(patient.secondName, 'Booking intent patient second name', 100, true),
    phone,
    birthday: normalizeDate(patient.birthday, 'Booking intent patient birthday'),
  })
}

function normalizeBooking(input) {
  const booking = readRecord(input, BOOKING_KEYS, BOOKING_KEYS, 'Booking intent request')
  const start = normalizeUtcTimestamp(booking.dtStart, 'Booking intent start')
  const end = normalizeUtcTimestamp(booking.dtEnd, 'Booking intent end')
  if (end.milliseconds <= start.milliseconds) throw new TypeError('Booking intent end must follow its start')
  if (booking.consent !== true) throw new TypeError('Booking intent consent must be affirmative')
  return Object.freeze({
    doctorSlug: normalizeKey(booking.doctorSlug, 'Booking intent doctor slug'),
    appointmentType: normalizeKey(booking.appointmentType, 'Booking intent appointment type', 64),
    intentId: normalizeUuid(booking.intentId, 'Booking intent ID'),
    dtStart: start.value,
    dtEnd: end.value,
    patient: normalizePatient(booking.patient),
    comment: normalizeText(booking.comment, 'Booking intent comment', 300, true),
    consent: true,
  })
}

function normalizeSlot(input, booking) {
  const slot = readRecord(input, SLOT_KEYS, SLOT_KEYS, 'Booking intent trusted slot')
  if (slot.valid !== true) throw new TypeError('Booking intent trusted slot must be verified')
  const start = normalizeMedflexTimestamp(slot.dtStart, 'Booking intent trusted start')
  const end = normalizeMedflexTimestamp(slot.dtEnd, 'Booking intent trusted end')
  if (end.milliseconds <= start.milliseconds) throw new TypeError('Booking intent trusted end must follow its start')
  if (start.milliseconds !== Date.parse(booking.dtStart) || end.milliseconds !== Date.parse(booking.dtEnd)) throw new TypeError('Booking intent trusted slot must match the normalized request interval')
  return Object.freeze({
    doctorId: normalizePositiveInteger(slot.doctorId, 'Booking intent doctor ID'),
    lpuId: normalizePositiveInteger(slot.lpuId, 'Booking intent LPU ID'),
    specialityId: normalizePositiveInteger(slot.specialityId, 'Booking intent speciality ID'),
    price: normalizePrice(slot.price),
    dtStart: start.value,
    dtEnd: end.value,
  })
}

function normalizeIdentity(input) {
  const options = readRecord(input, FINGERPRINT_KEYS, FINGERPRINT_KEYS, 'Booking intent identity')
  const booking = normalizeBooking(options.booking)
  const slot = normalizeSlot(options.slot, booking)
  return Object.freeze({ booking, slot })
}

function semanticPayload(identity) {
  const booking = identity.booking
  const patient = booking.patient
  const slot = identity.slot
  return JSON.stringify([
    booking.doctorSlug,
    booking.appointmentType,
    booking.dtStart,
    booking.dtEnd,
    patient.firstName,
    patient.lastName,
    patient.secondName,
    patient.phone,
    patient.birthday,
    booking.comment,
    booking.consent,
    slot.doctorId,
    slot.lpuId,
    slot.specialityId,
    slot.price,
    slot.dtStart,
    slot.dtEnd,
  ])
}

function fingerprint(secret, identity) {
  const payload = `${FINGERPRINT_DOMAIN}\0${FINGERPRINT_VERSION}\0${semanticPayload(identity)}`
  return `${FINGERPRINT_VERSION}:${createHmac('sha256', secret).update(payload, 'utf8').digest('hex')}`
}

function normalizeSecret(value) {
  if (typeof value !== 'string' || value.trim() !== value) throw new TypeError('Booking intent secret must be strong runtime text')
  const bytes = new TextEncoder().encode(value)
  if (bytes.length < 32 || bytes.length > 4_096 || new Set(bytes).size < 8) throw new TypeError('Booking intent secret must be strong runtime text')
  return value
}

function runtimeSecret() {
  if (typeof process !== 'undefined' && typeof process.env?.BOOKING_INTENT_SECRET === 'string') return process.env.BOOKING_INTENT_SECRET
  return undefined
}

function normalizeTtl(value, fallback, scope) {
  const ttl = value === undefined ? fallback : value
  if (!Number.isSafeInteger(ttl) || ttl < 1 || ttl > 365 * 24 * 60 * 60 * 1000) throw new TypeError(`${scope} must be a positive bounded integer`)
  return ttl
}

function normalizeClient(value) {
  if (value === null || typeof value !== 'object' || typeof value.execute !== 'function' || typeof value.batch !== 'function') throw new TypeError('Booking intent client must provide execute and batch operations')
  return value
}

function normalizeFactory(input) {
  const options = readRecord(input, FACTORY_KEYS, ['client'], 'Booking intent repository options')
  const clock = options.clock === undefined ? () => new Date() : options.clock
  const uuid = options.uuid === undefined ? randomUUID : options.uuid
  if (typeof clock !== 'function') throw new TypeError('Booking intent clock must be a function')
  if (typeof uuid !== 'function') throw new TypeError('Booking intent UUID source must be a function')
  const pendingTtlMs = normalizeTtl(options.pendingTtlMs, DEFAULT_PENDING_TTL_MS, 'Booking intent pending TTL')
  const secret = normalizeSecret(Object.hasOwn(options, 'secret') ? options.secret : runtimeSecret())
  return Object.freeze({ client: normalizeClient(options.client), secret, clock, uuid, pendingTtlMs })
}

function currentTime(configuration) {
  const value = configuration.clock()
  if (!(value instanceof Date)) throw new TypeError('Booking intent clock must return a valid Date')
  const milliseconds = Date.prototype.getTime.call(value)
  if (!Number.isFinite(milliseconds)) throw new TypeError('Booking intent clock must return a valid Date')
  const iso = new Date(milliseconds).toISOString()
  if (!UTC_TIMESTAMP_PATTERN.test(iso)) throw new TypeError('Booking intent clock must return a four-digit UTC year')
  return Object.freeze({ milliseconds, iso })
}

function futureTime(now, ttl, scope) {
  const milliseconds = now.milliseconds + ttl
  if (!Number.isFinite(milliseconds)) throw new TypeError(`${scope} exceeds the supported timestamp range`)
  return normalizeUtcTimestamp(new Date(milliseconds).toISOString(), scope).value
}

function monotonicTime(now, stored) {
  const previous = normalizeUtcTimestamp(stored, 'Stored booking intent update time')
  return previous.milliseconds > now.milliseconds ? Object.freeze({ milliseconds: previous.milliseconds, iso: previous.value }) : now
}

function nextFence(configuration) {
  return normalizeUuid(configuration.uuid(), 'Booking intent fencing token')
}

function retryFence(configuration, row, candidate) {
  if (candidate === row.fencingToken) throw invariant()
  const encoded = JSON.stringify([FENCE_VERSION, row.requestFingerprint, row.fencingToken, candidate])
  const digest = createHmac('sha256', configuration.secret).update(FENCE_DOMAIN, 'utf8').update('\0', 'utf8').update(encoded, 'utf8').digest('hex')
  const variant = ((Number.parseInt(digest[16], 16) & 3) | 8).toString(16)
  const hexadecimal = `${digest.slice(0, 12)}4${digest.slice(13, 16)}${variant}${digest.slice(17, 32)}`
  const derived = `${hexadecimal.slice(0, 8)}-${hexadecimal.slice(8, 12)}-${hexadecimal.slice(12, 16)}-${hexadecimal.slice(16, 20)}-${hexadecimal.slice(20)}`
  if (derived === row.fencingToken || derived === candidate) throw invariant()
  return derived
}

function readRows(result) {
  if (result === null || typeof result !== 'object' || !Array.isArray(result.rows)) throw invariant()
  return [...result.rows]
}

function normalizeNullableUuid(value, scope) {
  if (value === null) return null
  try {
    return normalizeUuid(value, scope)
  } catch {
    throw invariant()
  }
}

function normalizeRowText(value, validator) {
  try {
    return validator(value)
  } catch {
    throw invariant()
  }
}

function parseRow(input) {
  if (input === null || typeof input !== 'object') throw invariant()
  if (!ROW_COLUMNS.every((key) => Object.hasOwn(input, key))) throw invariant()
  const id = normalizeRowText(input.id, (value) => normalizeUuid(value, 'Stored booking intent ID'))
  const requestFingerprint = input.requestFingerprint
  const status = input.status
  const fencingToken = normalizeNullableUuid(input.fencingToken, 'Stored booking intent fence')
  if (typeof requestFingerprint !== 'string' || !FINGERPRINT_PATTERN.test(requestFingerprint) || !STATUSES.includes(status) || fencingToken === null) throw invariant()
  const doctorSlug = normalizeRowText(input.doctorSlug, (value) => normalizeKey(value, 'Stored booking intent doctor slug'))
  const appointmentType = normalizeRowText(input.appointmentType, (value) => normalizeKey(value, 'Stored booking intent appointment type', 64))
  const doctorId = normalizeRowText(input.doctorId, (value) => normalizePositiveInteger(value, 'Stored booking intent doctor ID'))
  const lpuId = normalizeRowText(input.lpuId, (value) => normalizePositiveInteger(value, 'Stored booking intent LPU ID'))
  const specialityId = normalizeRowText(input.specialityId, (value) => normalizePositiveInteger(value, 'Stored booking intent speciality ID'))
  const startsAt = normalizeRowText(input.startsAt, (value) => normalizeUtcTimestamp(value, 'Stored booking intent start').value)
  const endsAt = normalizeRowText(input.endsAt, (value) => normalizeUtcTimestamp(value, 'Stored booking intent end').value)
  const price = normalizeRowText(input.price, normalizePrice)
  const medflexClaimId = normalizeNullableUuid(input.medflexClaimId, 'Stored Medflex claim ID')
  const failureCode = input.failureCode
  const createdAt = normalizeRowText(input.createdAt, (value) => normalizeUtcTimestamp(value, 'Stored booking intent creation time').value)
  const updatedAt = normalizeRowText(input.updatedAt, (value) => normalizeUtcTimestamp(value, 'Stored booking intent update time').value)
  const pendingUntil = normalizeRowText(input.pendingUntil, (value) => normalizeUtcTimestamp(value, 'Stored booking intent pending deadline').value)
  if (endsAt <= startsAt || updatedAt < createdAt || pendingUntil <= createdAt) throw invariant()
  if ((status === 'confirmed') !== (medflexClaimId !== null)) throw invariant()
  if (failureCode !== null && !FAILURE_CODES.includes(failureCode)) throw invariant()
  if ((status === 'failed') !== (failureCode !== null)) throw invariant()
  return Object.freeze({ id, requestFingerprint, status, fencingToken, doctorSlug, appointmentType, doctorId, lpuId, specialityId, startsAt, endsAt, price, medflexClaimId, failureCode, createdAt, updatedAt, pendingUntil })
}

function publicIntent(row) {
  const value = {
    intentId: row.id,
    status: row.status,
    doctorSlug: row.doctorSlug,
    appointmentType: row.appointmentType,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    price: row.price,
  }
  if (row.status === 'confirmed') value.claimId = row.medflexClaimId
  if (row.status === 'failed') value.failureCode = row.failureCode
  return Object.freeze(value)
}

function createCapability(row) {
  const capability = Object.freeze(Object.create(null))
  CAPABILITIES.set(capability, Object.freeze({ id: row.id, requestFingerprint: row.requestFingerprint, fencingToken: row.fencingToken }))
  return capability
}

function readCapability(value) {
  if (value === null || typeof value !== 'object' || !CAPABILITIES.has(value)) throw new TypeError('Booking intent capability is invalid')
  return CAPABILITIES.get(value)
}

function outcome(action, row, capability) {
  const value = { action, public: publicIntent(row) }
  if (capability) value.capability = capability
  return Object.freeze(value)
}

function mismatch() {
  return Object.freeze({ action: 'mismatch', public: Object.freeze({ status: 'mismatch' }) })
}

function validateSlot() {
  return Object.freeze({ action: 'validate', public: Object.freeze({ status: 'not_found' }) })
}

function transition(action, applied, row, capability) {
  const value = { action, applied, public: publicIntent(row) }
  if (capability) value.capability = capability
  return Object.freeze(value)
}

function insertStatement(identity, requestFingerprint, fencingToken, now, configuration) {
  const booking = identity.booking
  const slot = identity.slot
  const pendingUntil = futureTime(now, configuration.pendingTtlMs, 'Booking intent pending deadline')
  return {
    sql: `INSERT INTO BookingIntent (${SELECT_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING RETURNING ${SELECT_COLUMNS}`,
    args: [booking.intentId, requestFingerprint, 'pending', fencingToken, booking.doctorSlug, booking.appointmentType, slot.doctorId, slot.lpuId, slot.specialityId, booking.dtStart, booking.dtEnd, slot.price, null, null, now.iso, now.iso, pendingUntil],
  }
}

function selectIdentityStatement(intentId, requestFingerprint) {
  return { sql: `SELECT ${SELECT_COLUMNS} FROM BookingIntent WHERE id = ? OR requestFingerprint = ? ORDER BY id`, args: [intentId, requestFingerprint] }
}

async function acquireRows(configuration, identity, requestFingerprint, fencingToken, now) {
  const results = await configuration.client.batch([insertStatement(identity, requestFingerprint, fencingToken, now, configuration), selectIdentityStatement(identity.booking.intentId, requestFingerprint)], 'write')
  if (!Array.isArray(results) || results.length !== 2) throw invariant()
  const inserted = readRows(results[0]).map(parseRow)
  const selected = readRows(results[1]).map(parseRow)
  if (inserted.length > 1 || selected.length < 1 || selected.length > 2) throw invariant()
  return Object.freeze({ inserted, selected })
}

async function selectCapabilityRow(configuration, capability) {
  const result = await configuration.client.execute({ sql: `SELECT ${SELECT_COLUMNS} FROM BookingIntent WHERE id = ? AND requestFingerprint = ?`, args: [capability.id, capability.requestFingerprint] })
  const rows = readRows(result).map(parseRow)
  if (rows.length > 1) throw invariant()
  return rows[0]
}

async function expirePending(configuration, row, now) {
  const result = await configuration.client.execute({
    sql: `UPDATE BookingIntent SET status = ?, updatedAt = max(updatedAt, ?) WHERE id = ? AND requestFingerprint = ? AND status = ? AND fencingToken = ? AND pendingUntil <= ? RETURNING ${SELECT_COLUMNS}`,
    args: ['uncertain', now.iso, row.id, row.requestFingerprint, 'pending', row.fencingToken, now.iso],
  })
  const rows = readRows(result).map(parseRow)
  if (rows.length > 1) throw invariant()
  return rows[0]
}

async function retryFailed(configuration, row, fencingToken, now) {
  const nextFencingToken = retryFence(configuration, row, fencingToken)
  const transitionTime = monotonicTime(now, row.updatedAt)
  const pendingUntil = futureTime(transitionTime, configuration.pendingTtlMs, 'Booking intent pending deadline')
  const result = await configuration.client.execute({
    sql: `UPDATE BookingIntent SET status = ?, fencingToken = ?, failureCode = ?, updatedAt = max(updatedAt, ?), pendingUntil = ? WHERE id = ? AND requestFingerprint = ? AND status = ? AND fencingToken = ? AND failureCode = ? AND updatedAt = ? RETURNING ${SELECT_COLUMNS}`,
    args: ['pending', nextFencingToken, null, transitionTime.iso, pendingUntil, row.id, row.requestFingerprint, 'failed', row.fencingToken, row.failureCode, row.updatedAt],
  })
  const rows = readRows(result).map(parseRow)
  if (rows.length > 1) throw invariant()
  return rows[0]
}

function matchesIdentity(row, identity, requestFingerprint) {
  return row.id === identity.booking.intentId && row.requestFingerprint === requestFingerprint && matchesTrustedScope(row, identity)
}

function matchesTrustedScope(row, identity) {
  const booking = identity.booking
  const slot = identity.slot
  return row.doctorSlug === booking.doctorSlug && row.appointmentType === booking.appointmentType && row.doctorId === slot.doctorId && row.lpuId === slot.lpuId && row.specialityId === slot.specialityId && row.startsAt === booking.dtStart && row.endsAt === booking.dtEnd && row.price === slot.price
}

async function resolveExisting(configuration, identity, requestFingerprint, fencingToken, now, selected, depth = 0) {
  if (depth > 3) throw invariant()
  const idRow = selected.find((row) => row.id === identity.booking.intentId)
  if (idRow && idRow.requestFingerprint !== requestFingerprint) return mismatch()
  if (selected.length === 2) throw invariant('BOOKING_INTENT_COLLISION')
  const row = selected[0]
  if (row.requestFingerprint !== requestFingerprint) throw invariant()
  if (!matchesTrustedScope(row, identity)) throw invariant()
  if (row.status === 'confirmed') return outcome('confirmed', row)
  if (row.status === 'uncertain') return outcome('reconcile', row, createCapability(row))
  if (row.status === 'failed' && !RETRYABLE_FAILURE_CODES.has(row.failureCode)) return outcome('failed', row)
  if (row.status === 'failed') {
    const retried = await retryFailed(configuration, row, fencingToken, now)
    if (retried) return outcome('retry', retried, createCapability(retried))
    const current = await selectCapabilityRow(configuration, { id: row.id, requestFingerprint: row.requestFingerprint })
    if (!current) throw invariant()
    return resolveExisting(configuration, identity, requestFingerprint, fencingToken, now, [current], depth + 1)
  }
  if (row.pendingUntil > now.iso) return outcome('pending', row)
  const expired = await expirePending(configuration, row, now)
  if (expired) return outcome('reconcile', expired, createCapability(expired))
  const current = await selectCapabilityRow(configuration, { id: row.id, requestFingerprint: row.requestFingerprint })
  if (!current) throw invariant()
  return resolveExisting(configuration, identity, requestFingerprint, fencingToken, now, [current], depth + 1)
}

async function acquire(configuration, input) {
  const options = readRecord(input, ACQUIRE_KEYS, ACQUIRE_KEYS, 'Booking intent acquisition')
  const identity = normalizeIdentity(options)
  const requestFingerprint = fingerprint(configuration.secret, identity)
  const fencingToken = nextFence(configuration)
  const now = currentTime(configuration)
  const rows = await acquireRows(configuration, identity, requestFingerprint, fencingToken, now)
  if (rows.inserted.length === 1) {
    if (rows.selected.length !== 1 || !matchesIdentity(rows.selected[0], identity, requestFingerprint)) throw invariant()
    return outcome('dispatch', rows.inserted[0], createCapability(rows.inserted[0]))
  }
  return resolveExisting(configuration, identity, requestFingerprint, fencingToken, now, rows.selected)
}

function medflexTimestampFromUtc(value) {
  const { milliseconds } = normalizeUtcTimestamp(value, 'Stored booking intent interval')
  const shifted = new Date(milliseconds + MOSCOW_OFFSET_MS).toISOString()
  return `${shifted.slice(0, 10)} ${shifted.slice(11, 16)}`
}

function storedSlot(row) {
  return Object.freeze({ valid: true, doctorId: row.doctorId, lpuId: row.lpuId, specialityId: row.specialityId, price: row.price, dtStart: medflexTimestampFromUtc(row.startsAt), dtEnd: medflexTimestampFromUtc(row.endsAt) })
}

function storedIdentity(booking, row) {
  return Object.freeze({ booking, slot: storedSlot(row) })
}

function matchesVisibleBookingScope(row, booking) {
  return row.doctorSlug === booking.doctorSlug && row.appointmentType === booking.appointmentType && row.startsAt === booking.dtStart && row.endsAt === booking.dtEnd
}

async function resumeIdRow(configuration, intentId) {
  const result = await configuration.client.execute({
    sql: `SELECT ${SELECT_COLUMNS} FROM BookingIntent WHERE id = ? LIMIT ?`,
    args: [intentId, 2],
  })
  const rows = readRows(result).map(parseRow)
  if (rows.length > 1) throw invariant()
  return rows[0]
}

async function resumeScopeRows(configuration, booking) {
  const result = await configuration.client.execute({
    sql: `SELECT ${SELECT_COLUMNS} FROM BookingIntent WHERE doctorSlug = ? AND appointmentType = ? AND startsAt = ? AND endsAt = ? LIMIT ?`,
    args: [booking.doctorSlug, booking.appointmentType, booking.dtStart, booking.dtEnd, MAX_RESUME_CANDIDATES + 1],
  })
  const rows = readRows(result).map(parseRow)
  if (rows.length > MAX_RESUME_CANDIDATES) throw invariant()
  return rows
}

async function resolveResumed(configuration, row, now, depth = 0) {
  if (depth > 3) throw invariant()
  if (row.status === 'confirmed') return outcome('confirmed', row)
  if (row.status === 'uncertain') return outcome('reconcile', row, createCapability(row))
  if (row.status === 'failed' && RETRYABLE_FAILURE_CODES.has(row.failureCode)) return outcome('validate', row)
  if (row.status === 'failed') return outcome('failed', row)
  if (row.pendingUntil > now.iso) return outcome('pending', row)
  const expired = await expirePending(configuration, row, now)
  if (expired) return outcome('reconcile', expired, createCapability(expired))
  const current = await selectCapabilityRow(configuration, { id: row.id, requestFingerprint: row.requestFingerprint })
  if (!current) throw invariant()
  return resolveResumed(configuration, current, now, depth + 1)
}

async function resume(configuration, input) {
  const options = readRecord(input, RESUME_KEYS, RESUME_KEYS, 'Booking intent resume')
  const booking = normalizeBooking(options.booking)
  const idRow = await resumeIdRow(configuration, booking.intentId)
  if (idRow) {
    const sameFingerprint = fingerprint(configuration.secret, storedIdentity(booking, idRow)) === idRow.requestFingerprint
    if (!sameFingerprint) return mismatch()
    if (!matchesVisibleBookingScope(idRow, booking)) throw invariant()
    return resolveResumed(configuration, idRow, currentTime(configuration))
  }
  const rows = await resumeScopeRows(configuration, booking)
  const matches = rows.filter((row) => {
    const sameFingerprint = fingerprint(configuration.secret, storedIdentity(booking, row)) === row.requestFingerprint
    if (sameFingerprint && !matchesVisibleBookingScope(row, booking)) throw invariant()
    return sameFingerprint
  })
  if (matches.length > 1) throw invariant('BOOKING_INTENT_COLLISION')
  if (matches.length === 0) return validateSlot()
  return resolveResumed(configuration, matches[0], currentTime(configuration))
}

async function currentTransition(configuration, capability, applied) {
  const row = await selectCapabilityRow(configuration, capability)
  if (!row) throw invariant()
  const sameFence = row.fencingToken === capability.fencingToken
  if (row.status === 'uncertain' && sameFence) return transition('reconcile', applied, row, createCapability(row))
  const action = row.status === 'uncertain' ? 'reconcile' : row.status
  return transition(action, applied, row)
}

async function reconciliationScope(configuration, input) {
  const options = readRecord(input, CAPABILITY_KEYS, CAPABILITY_KEYS, 'Booking intent reconciliation scope')
  const capability = readCapability(options.capability)
  const row = await selectCapabilityRow(configuration, capability)
  if (!row || row.status !== 'uncertain' || row.fencingToken !== capability.fencingToken) throw invariant()
  return storedSlot(row)
}

async function confirm(configuration, input) {
  const options = readRecord(input, CONFIRM_KEYS, CONFIRM_KEYS, 'Booking intent confirmation')
  const capability = readCapability(options.capability)
  const claimId = normalizeUuid(options.claimId, 'Medflex claim ID')
  const now = currentTime(configuration)
  const result = await configuration.client.execute({
    sql: `UPDATE BookingIntent SET status = ?, medflexClaimId = ?, failureCode = ?, updatedAt = max(updatedAt, ?) WHERE id = ? AND requestFingerprint = ? AND status = ? AND fencingToken = ? RETURNING ${SELECT_COLUMNS}`,
    args: ['confirmed', claimId, null, now.iso, capability.id, capability.requestFingerprint, 'pending', capability.fencingToken],
  })
  const rows = readRows(result).map(parseRow)
  if (rows.length > 1) throw invariant()
  if (rows.length === 1) return transition('confirmed', true, rows[0])
  return currentTransition(configuration, capability, false)
}

function normalizeFailureCode(value) {
  if (typeof value !== 'string' || !FAILURE_CODES.includes(value)) throw new TypeError('Booking intent failure code is not allowlisted')
  return value
}

async function fail(configuration, input) {
  const options = readRecord(input, FAIL_KEYS, FAIL_KEYS, 'Booking intent failure')
  const capability = readCapability(options.capability)
  const failureCode = normalizeFailureCode(options.failureCode)
  const now = currentTime(configuration)
  const result = await configuration.client.execute({
    sql: `UPDATE BookingIntent SET status = ?, failureCode = ?, medflexClaimId = ?, updatedAt = max(updatedAt, ?) WHERE id = ? AND requestFingerprint = ? AND status = ? AND fencingToken = ? RETURNING ${SELECT_COLUMNS}`,
    args: ['failed', failureCode, null, now.iso, capability.id, capability.requestFingerprint, 'pending', capability.fencingToken],
  })
  const rows = readRows(result).map(parseRow)
  if (rows.length > 1) throw invariant()
  if (rows.length === 1) return transition('failed', true, rows[0])
  return currentTransition(configuration, capability, false)
}

async function markUncertain(configuration, input) {
  const options = readRecord(input, CAPABILITY_KEYS, CAPABILITY_KEYS, 'Booking intent uncertainty')
  const capability = readCapability(options.capability)
  const now = currentTime(configuration)
  const result = await configuration.client.execute({
    sql: `UPDATE BookingIntent SET status = ?, failureCode = ?, medflexClaimId = ?, updatedAt = max(updatedAt, ?) WHERE id = ? AND requestFingerprint = ? AND status = ? AND fencingToken = ? RETURNING ${SELECT_COLUMNS}`,
    args: ['uncertain', null, null, now.iso, capability.id, capability.requestFingerprint, 'pending', capability.fencingToken],
  })
  const rows = readRows(result).map(parseRow)
  if (rows.length > 1) throw invariant()
  if (rows.length === 1) return transition('reconcile', true, rows[0], createCapability(rows[0]))
  return currentTransition(configuration, capability, false)
}

function normalizeHistory(input) {
  const history = readRecord(input, HISTORY_KEYS, ['found'], 'Booking intent history result')
  if (typeof history.found !== 'boolean') throw new TypeError('Booking intent history found flag must be boolean')
  if (!history.found && Object.hasOwn(history, 'claimId')) throw new TypeError('Booking intent empty history must not include a claim')
  if (history.found && !Object.hasOwn(history, 'claimId')) throw new TypeError('Booking intent positive history must include a claim')
  return Object.freeze({ found: history.found, claimId: history.found ? normalizeUuid(history.claimId, 'Medflex history claim ID') : '' })
}

async function reconcile(configuration, input) {
  const options = readRecord(input, RECONCILE_KEYS, RECONCILE_KEYS, 'Booking intent reconciliation')
  const capability = readCapability(options.capability)
  const history = normalizeHistory(options.history)
  if (!history.found) return currentTransition(configuration, capability, false)
  const now = currentTime(configuration)
  const result = await configuration.client.execute({
    sql: `UPDATE BookingIntent SET status = ?, medflexClaimId = ?, failureCode = ?, updatedAt = max(updatedAt, ?) WHERE id = ? AND requestFingerprint = ? AND status = ? AND fencingToken = ? RETURNING ${SELECT_COLUMNS}`,
    args: ['confirmed', history.claimId, null, now.iso, capability.id, capability.requestFingerprint, 'uncertain', capability.fencingToken],
  })
  const rows = readRows(result).map(parseRow)
  if (rows.length > 1) throw invariant()
  if (rows.length === 1) return transition('confirmed', true, rows[0])
  return currentTransition(configuration, capability, false)
}

/**
 * Creates a durable booking-intent repository over an injected libSQL client.
 */
export function createBookingIntentRepository(input) {
  const configuration = normalizeFactory(input)
  return Object.freeze({
    fingerprint: (value) => fingerprint(configuration.secret, normalizeIdentity(value)),
    acquire: (value) => acquire(configuration, value),
    resume: (value) => resume(configuration, value),
    confirm: (value) => confirm(configuration, value),
    fail: (value) => fail(configuration, value),
    markUncertain: (value) => markUncertain(configuration, value),
    reconciliationScope: (value) => reconciliationScope(configuration, value),
    reconcile: (value) => reconcile(configuration, value),
  })
}
