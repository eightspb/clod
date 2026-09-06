import { createHmac, randomUUID } from 'node:crypto'
import { decryptPatientProfile } from './contact-identity.js'
import { createPatientRecords } from './patient-records.js'

const FACTORY_KEYS = Object.freeze(['client', 'fingerprintKey', 'encryptionKey', 'clock', 'uuid'])
const PREPARE_KEYS = Object.freeze(['id', 'source', 'profile', 'appointment'])
const EXISTING_KEYS = Object.freeze(['id', 'profile', 'appointment'])
const PROJECT_KEYS = Object.freeze(['id', 'status', 'claimId', 'failureCode'])
const ID_KEYS = Object.freeze(['id'])
const LIST_KEYS = Object.freeze(['page', 'pageSize', 'status', 'source', 'doctorId', 'from', 'to'])
const APPOINTMENT_KEYS = Object.freeze(['medflexLpuId', 'medflexDoctorId', 'medflexSpecialityId', 'medflexServiceId', 'doctorName', 'specialityName', 'serviceName', 'startsAt', 'endsAt', 'priceRubles', 'localDoctorId'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const FINGERPRINT_PATTERN = /^v1:[0-9a-f]{64}$/
const FAILURE_PATTERN = /^[A-Z][A-Z0-9_]{2,64}$/
const SOURCES = Object.freeze(['website', 'admin_medflex', 'admin_existing'])
const PREPARE_SOURCES = Object.freeze(['website', 'admin_medflex'])
const STATUSES = Object.freeze(['pending', 'confirmed', 'cancelled', 'failed', 'needs_review'])
const INTENT_STATUSES = Object.freeze(['pending', 'confirmed', 'uncertain', 'failed'])
const ROW_COLUMNS = Object.freeze(['id', 'patientId', 'source', 'status', 'medflexClaimId', 'medflexLpuId', 'medflexDoctorId', 'medflexSpecialityId', 'medflexServiceId', 'doctorName', 'specialityName', 'serviceName', 'startsAt', 'endsAt', 'priceKopecks', 'bookingFingerprint', 'failureCode', 'createdAt', 'updatedAt', 'cancelledAt'])
const SELECT_COLUMNS = ROW_COLUMNS.join(', ')
const BOOKING_DOMAIN = 'clod.appointment-booking'
const VERSION = 'v1'
const ERROR_MESSAGES = Object.freeze({
  APPOINTMENT_NOT_FOUND: 'Appointment record was not found',
  APPOINTMENT_CONFLICT: 'Appointment identity resolves to inconsistent data',
  APPOINTMENT_DUPLICATE: 'The patient already has this appointment',
  APPOINTMENT_CLAIM_CONFLICT: 'Medflex claim identity is already assigned',
  APPOINTMENT_INVALID_TRANSITION: 'Appointment status transition is not allowed',
  APPOINTMENT_STORAGE_INVARIANT: 'Appointment storage contains an invalid record',
})

/**
 * Represents a safe appointment-record failure without exposing patient data.
 */
export class AppointmentRecordError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(ERROR_MESSAGES, code) ? code : 'APPOINTMENT_STORAGE_INVARIANT'
    super(ERROR_MESSAGES[safeCode])
    this.name = 'AppointmentRecordError'
    this.code = safeCode
    Object.freeze(this)
  }
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
    value[key] = descriptor.value
  }
  if (!required.every((key) => Object.hasOwn(value, key))) throw new TypeError(`${scope} is missing required fields`)
  return value
}

function normalizeClient(value) {
  if (value === null || typeof value !== 'object' || typeof value.execute !== 'function' || typeof value.transaction !== 'function') throw new TypeError('Appointment record client must provide execute and transaction operations')
  return value
}

function normalizeUuid(value, scope) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new TypeError(`${scope} must be a UUID`)
  return value.toLowerCase()
}

function normalizeTimestamp(value, scope) {
  if (typeof value !== 'string' || !TIMESTAMP_PATTERN.test(value) || !Number.isFinite(Date.parse(value)) || new Date(Date.parse(value)).toISOString() !== value) throw new TypeError(`${scope} must be a canonical UTC timestamp`)
  return value
}

function normalizeText(value, scope, nullable = false) {
  if (nullable && value === null) return null
  if (typeof value !== 'string') throw new TypeError(`${scope} must be bounded text`)
  const normalized = value.trim().normalize('NFC')
  if (normalized.length === 0 || [...normalized].length > 200 || [...normalized].some((character) => character.codePointAt(0) <= 31 || character.codePointAt(0) === 127)) throw new TypeError(`${scope} must be bounded text`)
  return normalized
}

function normalizeNullableInteger(value, scope) {
  if (value === null) return null
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${scope} must be a positive integer or null`)
  return value
}

function normalizePrice(value) {
  if (value === null) return null
  if (!Number.isSafeInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER / 100) throw new TypeError('Appointment price must be safe integer rubles or null')
  return value * 100
}

function normalizeLocalDoctor(value) {
  if (value === null) return null
  return normalizeText(value, 'Appointment local doctor ID')
}

function normalizeAppointment(raw, source) {
  const input = readRecord(raw, APPOINTMENT_KEYS, APPOINTMENT_KEYS, 'Appointment snapshot')
  const startsAt = normalizeTimestamp(input.startsAt, 'Appointment start')
  const endsAt = normalizeTimestamp(input.endsAt, 'Appointment end')
  if (endsAt <= startsAt) throw new TypeError('Appointment end must follow its start')
  const value = Object.freeze({ medflexLpuId: normalizeNullableInteger(input.medflexLpuId, 'Appointment Medflex LPU ID'), medflexDoctorId: normalizeNullableInteger(input.medflexDoctorId, 'Appointment Medflex doctor ID'), medflexSpecialityId: normalizeNullableInteger(input.medflexSpecialityId, 'Appointment Medflex speciality ID'), medflexServiceId: normalizeNullableInteger(input.medflexServiceId, 'Appointment Medflex service ID'), doctorName: normalizeText(input.doctorName, 'Appointment doctor name'), specialityName: normalizeText(input.specialityName, 'Appointment speciality name'), serviceName: normalizeText(input.serviceName, 'Appointment service name', true), startsAt, endsAt, priceKopecks: normalizePrice(input.priceRubles), localDoctorId: normalizeLocalDoctor(input.localDoctorId) })
  if (source !== 'admin_existing' && [value.medflexLpuId, value.medflexDoctorId, value.medflexSpecialityId].some((item) => item === null)) throw new TypeError('Medflex appointment snapshot requires external identifiers')
  return value
}

function normalizeSource(value, allowed = SOURCES) {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new TypeError('Appointment source is invalid')
  return value
}

function normalizeFactory(input) {
  const options = readRecord(input, FACTORY_KEYS, ['client', 'fingerprintKey', 'encryptionKey'], 'Appointment record options')
  const clock = options.clock === undefined ? () => new Date() : options.clock
  const uuid = options.uuid === undefined ? randomUUID : options.uuid
  if (typeof options.fingerprintKey !== 'string' || typeof options.encryptionKey !== 'string' || typeof clock !== 'function' || typeof uuid !== 'function') throw new TypeError('Appointment record security and runtime adapters are invalid')
  const configuration = { client: normalizeClient(options.client), fingerprintKey: options.fingerprintKey, encryptionKey: options.encryptionKey, clock, uuid }
  configuration.patients = createPatientRecords(configuration)
  return Object.freeze(configuration)
}

function currentTime(configuration) {
  const value = configuration.clock()
  if (!(value instanceof Date)) throw new TypeError('Appointment record clock must return a valid Date')
  const milliseconds = Date.prototype.getTime.call(value)
  if (!Number.isFinite(milliseconds)) throw new TypeError('Appointment record clock must return a valid Date')
  return normalizeTimestamp(new Date(milliseconds).toISOString(), 'Appointment runtime time')
}

function readRows(result) {
  if (result === null || typeof result !== 'object' || !Array.isArray(result.rows)) throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
  return [...result.rows]
}

function storedNullableInteger(value) {
  try {
    return normalizeNullableInteger(value, 'Stored appointment external ID')
  } catch {
    throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
  }
}

function storedTimestamp(value) {
  try {
    return normalizeTimestamp(value, 'Stored appointment timestamp')
  } catch {
    throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
  }
}

function parseRow(input) {
  if (input === null || typeof input !== 'object' || !ROW_COLUMNS.every((key) => Object.hasOwn(input, key))) throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
  const id = normalizeUuid(input.id, 'Stored appointment ID')
  const patientId = normalizeUuid(input.patientId, 'Stored appointment patient ID')
  const source = input.source
  const status = input.status
  const medflexClaimId = input.medflexClaimId === null ? null : normalizeUuid(input.medflexClaimId, 'Stored Medflex claim ID')
  const startsAt = storedTimestamp(input.startsAt)
  const endsAt = storedTimestamp(input.endsAt)
  const createdAt = storedTimestamp(input.createdAt)
  const updatedAt = storedTimestamp(input.updatedAt)
  const cancelledAt = input.cancelledAt === null ? null : storedTimestamp(input.cancelledAt)
  if (!SOURCES.includes(source) || !STATUSES.includes(status) || endsAt <= startsAt || updatedAt < createdAt) throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
  if (typeof input.bookingFingerprint !== 'string' || !FINGERPRINT_PATTERN.test(input.bookingFingerprint)) throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
  if (!Number.isSafeInteger(input.priceKopecks) && input.priceKopecks !== null) throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
  if (input.failureCode !== null && (typeof input.failureCode !== 'string' || !FAILURE_PATTERN.test(input.failureCode))) throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
  if (status === 'confirmed' && source !== 'admin_existing' && medflexClaimId === null) throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
  if (status === 'cancelled' && cancelledAt === null) throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
  return Object.freeze({ id, patientId, source, status, medflexClaimId, medflexLpuId: storedNullableInteger(input.medflexLpuId), medflexDoctorId: storedNullableInteger(input.medflexDoctorId), medflexSpecialityId: storedNullableInteger(input.medflexSpecialityId), medflexServiceId: storedNullableInteger(input.medflexServiceId), doctorName: input.doctorName, specialityName: input.specialityName, serviceName: input.serviceName, startsAt, endsAt, priceKopecks: input.priceKopecks, bookingFingerprint: input.bookingFingerprint, failureCode: input.failureCode, createdAt, updatedAt, cancelledAt })
}

function patientSummary(patient) {
  return Object.freeze({ id: patient.id, name: patient.name, phoneMask: patient.phoneMask })
}

function publicAppointment(row, patient) {
  return Object.freeze({ id: row.id, patient: patientSummary(patient), source: row.source, status: row.status, medflexClaimId: row.medflexClaimId, medflexLpuId: row.medflexLpuId, medflexDoctorId: row.medflexDoctorId, medflexSpecialityId: row.medflexSpecialityId, medflexServiceId: row.medflexServiceId, doctorName: row.doctorName, specialityName: row.specialityName, serviceName: row.serviceName, startsAt: row.startsAt, endsAt: row.endsAt, priceKopecks: row.priceKopecks, failureCode: row.failureCode, createdAt: row.createdAt, updatedAt: row.updatedAt, cancelledAt: row.cancelledAt })
}

async function inTransaction(client, operation) {
  const transaction = await client.transaction('write')
  try {
    const result = await operation(transaction)
    await transaction.commit()
    return result
  } catch (error) {
    await transaction.rollback()
    throw error
  } finally {
    transaction.close()
  }
}

function bookingFingerprint(configuration, patientFingerprint, appointment) {
  const doctor = appointment.medflexDoctorId === null ? `name:${appointment.doctorName}` : `medflex:${appointment.medflexDoctorId}`
  const payload = `${BOOKING_DOMAIN}\0${VERSION}\0${JSON.stringify([patientFingerprint, doctor, appointment.startsAt, appointment.endsAt])}`
  return `${VERSION}:${createHmac('sha256', configuration.fingerprintKey).update(payload, 'utf8').digest('hex')}`
}

function insertStatement(id, patientId, source, status, appointment, fingerprint, now) {
  return { sql: `INSERT INTO Appointment (${SELECT_COLUMNS}) VALUES (${ROW_COLUMNS.map(() => '?').join(', ')}) ON CONFLICT DO NOTHING RETURNING ${SELECT_COLUMNS}`, args: [id, patientId, source, status, null, appointment.medflexLpuId, appointment.medflexDoctorId, appointment.medflexSpecialityId, appointment.medflexServiceId, appointment.doctorName, appointment.specialityName, appointment.serviceName, appointment.startsAt, appointment.endsAt, appointment.priceKopecks, fingerprint, null, now, now, null] }
}

function matchesPrepared(row, patientId, source, appointment, fingerprint) {
  return row.patientId === patientId && row.source === source && row.medflexLpuId === appointment.medflexLpuId && row.medflexDoctorId === appointment.medflexDoctorId && row.medflexSpecialityId === appointment.medflexSpecialityId && row.medflexServiceId === appointment.medflexServiceId && row.doctorName === appointment.doctorName && row.specialityName === appointment.specialityName && row.serviceName === appointment.serviceName && row.startsAt === appointment.startsAt && row.endsAt === appointment.endsAt && row.priceKopecks === appointment.priceKopecks && row.bookingFingerprint === fingerprint
}

async function upsertDoctorLink(transaction, appointment, now) {
  if (appointment.medflexDoctorId === null) return
  await transaction.execute({ sql: 'INSERT INTO MedflexDoctorLink (medflexDoctorId, externalName, localDoctorId, active, syncedAt) VALUES (?, ?, ?, ?, ?) ON CONFLICT(medflexDoctorId) DO UPDATE SET externalName = excluded.externalName, localDoctorId = coalesce(excluded.localDoctorId, MedflexDoctorLink.localDoctorId), active = excluded.active, syncedAt = max(MedflexDoctorLink.syncedAt, excluded.syncedAt)', args: [appointment.medflexDoctorId, appointment.doctorName, appointment.localDoctorId, 1, now] })
}

async function writePrepared(configuration, normalized) {
  return inTransaction(configuration.client, async (transaction) => {
    const patient = await configuration.patients.upsert({ profile: normalized.profile, executor: transaction })
    const selectedPatient = await transaction.execute({ sql: 'SELECT phoneFingerprint FROM Patient WHERE id = ? LIMIT 2', args: [patient.id] })
    const patientRows = readRows(selectedPatient)
    if (patientRows.length !== 1 || typeof patientRows[0].phoneFingerprint !== 'string' || !FINGERPRINT_PATTERN.test(patientRows[0].phoneFingerprint)) throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
    const fingerprint = bookingFingerprint(configuration, patientRows[0].phoneFingerprint, normalized.appointment)
    const now = currentTime(configuration)
    const inserted = await transaction.execute(insertStatement(normalized.id, patient.id, normalized.source, normalized.status, normalized.appointment, fingerprint, now))
    const insertedRows = readRows(inserted).map(parseRow)
    const selected = await transaction.execute({ sql: `SELECT ${SELECT_COLUMNS} FROM Appointment WHERE id = ? OR (bookingFingerprint = ? AND status IN ('pending', 'confirmed', 'needs_review')) ORDER BY id`, args: [normalized.id, fingerprint] })
    const rows = readRows(selected).map(parseRow)
    if (insertedRows.length > 1 || rows.length < 1 || rows.length > 2) throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
    const idRow = rows.find((row) => row.id === normalized.id)
    if (!idRow) throw new AppointmentRecordError('APPOINTMENT_DUPLICATE')
    if (rows.length === 2) throw new AppointmentRecordError('APPOINTMENT_DUPLICATE')
    if (!matchesPrepared(idRow, patient.id, normalized.source, normalized.appointment, fingerprint)) throw new AppointmentRecordError('APPOINTMENT_CONFLICT')
    await upsertDoctorLink(transaction, normalized.appointment, now)
    return publicAppointment(idRow, patient)
  })
}

function normalizePrepare(raw, sourceOverride, status) {
  const keys = sourceOverride === undefined ? PREPARE_KEYS : EXISTING_KEYS
  const input = readRecord(raw, keys, keys, 'Appointment preparation')
  const source = sourceOverride ?? normalizeSource(input.source, PREPARE_SOURCES)
  return Object.freeze({ id: normalizeUuid(input.id, 'Appointment ID'), source, status, profile: input.profile, appointment: normalizeAppointment(input.appointment, source) })
}

async function prepare(configuration, raw) {
  return writePrepared(configuration, normalizePrepare(raw, undefined, 'pending'))
}

async function createExisting(configuration, raw) {
  return writePrepared(configuration, normalizePrepare(raw, 'admin_existing', 'confirmed'))
}

function targetProjection(input) {
  if (!INTENT_STATUSES.includes(input.status)) throw new TypeError('Booking intent projection status is invalid')
  if (input.status === 'confirmed') return Object.freeze({ status: 'confirmed', claimId: normalizeUuid(input.claimId, 'Medflex claim ID'), failureCode: null })
  if (input.status === 'failed') {
    if (typeof input.failureCode !== 'string' || !FAILURE_PATTERN.test(input.failureCode)) throw new TypeError('Appointment failure code is invalid')
    return Object.freeze({ status: 'failed', claimId: null, failureCode: input.failureCode })
  }
  return Object.freeze({ status: input.status === 'uncertain' ? 'needs_review' : 'pending', claimId: null, failureCode: null })
}

function claimedByAnother(rows, id) {
  return rows.some((row) => typeof row.id === 'string' && row.id !== id)
}

async function patientForAppointment(configuration, patientId) {
  return configuration.patients.get({ id: patientId })
}

async function project(configuration, raw) {
  const input = readRecord(raw, PROJECT_KEYS, ['id', 'status'], 'Appointment projection')
  const id = normalizeUuid(input.id, 'Appointment ID')
  const target = targetProjection(input)
  const row = await inTransaction(configuration.client, async (transaction) => {
    const selected = await transaction.execute({ sql: `SELECT ${SELECT_COLUMNS} FROM Appointment WHERE id = ? LIMIT 2`, args: [id] })
    const rows = readRows(selected).map(parseRow)
    if (rows.length === 0) throw new AppointmentRecordError('APPOINTMENT_NOT_FOUND')
    if (rows.length !== 1) throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
    const current = rows[0]
    if (current.status === 'cancelled') throw new AppointmentRecordError('APPOINTMENT_INVALID_TRANSITION')
    if (current.status === 'confirmed') {
      if (target.status !== 'confirmed' || current.medflexClaimId !== target.claimId) throw new AppointmentRecordError('APPOINTMENT_INVALID_TRANSITION')
      return current
    }
    if (target.claimId !== null) {
      const claims = await transaction.execute({ sql: 'SELECT id FROM Appointment WHERE medflexClaimId = ? LIMIT 2', args: [target.claimId] })
      if (claimedByAnother(readRows(claims), id)) throw new AppointmentRecordError('APPOINTMENT_CLAIM_CONFLICT')
    }
    const now = currentTime(configuration)
    let updated
    try {
      updated = await transaction.execute({ sql: `UPDATE Appointment SET status = ?, medflexClaimId = ?, failureCode = ?, updatedAt = max(updatedAt, ?) WHERE id = ? AND status <> ? RETURNING ${SELECT_COLUMNS}`, args: [target.status, target.claimId, target.failureCode, now, id, 'cancelled'] })
    } catch {
      throw new AppointmentRecordError(target.claimId === null ? 'APPOINTMENT_STORAGE_INVARIANT' : 'APPOINTMENT_CLAIM_CONFLICT')
    }
    const updatedRows = readRows(updated).map(parseRow)
    if (updatedRows.length !== 1) throw new AppointmentRecordError('APPOINTMENT_INVALID_TRANSITION')
    return updatedRows[0]
  })
  return publicAppointment(row, await patientForAppointment(configuration, row.patientId))
}

function normalizeList(raw) {
  const input = readRecord(raw, LIST_KEYS, ['page', 'pageSize'], 'Appointment list')
  if (!Number.isSafeInteger(input.page) || input.page < 1 || input.page > 10_000) throw new TypeError('Appointment page must be a positive bounded integer')
  if (!Number.isSafeInteger(input.pageSize) || input.pageSize < 1) throw new TypeError('Appointment page size must be a positive integer')
  if (input.status !== undefined && !STATUSES.includes(input.status)) throw new TypeError('Appointment status filter is invalid')
  if (input.source !== undefined) normalizeSource(input.source)
  if (input.doctorId !== undefined && (!Number.isSafeInteger(input.doctorId) || input.doctorId < 1)) throw new TypeError('Appointment doctor filter is invalid')
  const from = input.from === undefined ? undefined : normalizeTimestamp(input.from, 'Appointment filter start')
  const to = input.to === undefined ? undefined : normalizeTimestamp(input.to, 'Appointment filter end')
  if (from !== undefined && to !== undefined && to <= from) throw new TypeError('Appointment filter end must follow its start')
  return Object.freeze({ ...input, from, to, pageSize: Math.min(input.pageSize, 50) })
}

function filters(input) {
  const conditions = []
  const args = []
  if (input.status !== undefined) { conditions.push('a.status = ?'); args.push(input.status) }
  if (input.source !== undefined) { conditions.push('a.source = ?'); args.push(input.source) }
  if (input.doctorId !== undefined) { conditions.push('a.medflexDoctorId = ?'); args.push(input.doctorId) }
  if (input.from !== undefined) { conditions.push('a.startsAt >= ?'); args.push(input.from) }
  if (input.to !== undefined) { conditions.push('a.startsAt < ?'); args.push(input.to) }
  return Object.freeze({ clause: conditions.length === 0 ? '' : ` WHERE ${conditions.join(' AND ')}`, args: Object.freeze(args) })
}

function joinedColumns() {
  const appointment = ROW_COLUMNS.map((column) => `a.${column} AS ${column}`)
  return [...appointment, 'p.profileCiphertext AS patientProfileCiphertext', 'p.phoneMask AS patientPhoneMask', 'p.piiDestroyedAt AS patientPiiDestroyedAt'].join(', ')
}

function joinedPatient(configuration, row, patientId) {
  if (row.patientPiiDestroyedAt !== null) return Object.freeze({ id: patientId, name: null, phoneMask: null })
  if (typeof row.patientProfileCiphertext !== 'string' || typeof row.patientPhoneMask !== 'string') throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
  const profile = decryptPatientProfile({ envelope: row.patientProfileCiphertext, key: configuration.encryptionKey })
  return Object.freeze({ id: patientId, name: [profile.lastName, profile.firstName, profile.secondName].filter(Boolean).join(' '), phoneMask: row.patientPhoneMask })
}

async function list(configuration, raw) {
  const input = normalizeList(raw)
  const filter = filters(input)
  const count = await configuration.client.execute({ sql: `SELECT COUNT(*) AS total FROM Appointment a${filter.clause}`, args: [...filter.args] })
  const countRows = readRows(count)
  if (countRows.length !== 1 || !Number.isSafeInteger(Number(countRows[0].total))) throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
  const total = Number(countRows[0].total)
  const result = await configuration.client.execute({ sql: `SELECT ${joinedColumns()} FROM Appointment a JOIN Patient p ON p.id = a.patientId${filter.clause} ORDER BY a.startsAt DESC, a.id LIMIT ? OFFSET ?`, args: [...filter.args, input.pageSize, (input.page - 1) * input.pageSize] })
  const items = readRows(result).map((rawRow) => {
    const row = parseRow(rawRow)
    return publicAppointment(row, joinedPatient(configuration, rawRow, row.patientId))
  })
  return Object.freeze({ items: Object.freeze(items), page: input.page, pageSize: input.pageSize, total, pages: total === 0 ? 0 : Math.ceil(total / input.pageSize) })
}

async function get(configuration, raw) {
  const input = readRecord(raw, ID_KEYS, ID_KEYS, 'Appointment detail')
  const id = normalizeUuid(input.id, 'Appointment ID')
  const result = await configuration.client.execute({ sql: `SELECT ${joinedColumns()} FROM Appointment a JOIN Patient p ON p.id = a.patientId WHERE a.id = ? LIMIT 2`, args: [id] })
  const rows = readRows(result)
  if (rows.length === 0) throw new AppointmentRecordError('APPOINTMENT_NOT_FOUND')
  if (rows.length !== 1) throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
  const appointment = parseRow(rows[0])
  return publicAppointment(appointment, joinedPatient(configuration, rows[0], appointment.patientId))
}

async function cancel(configuration, raw) {
  const input = readRecord(raw, ID_KEYS, ID_KEYS, 'Appointment cancellation')
  const id = normalizeUuid(input.id, 'Appointment ID')
  const row = await inTransaction(configuration.client, async (transaction) => {
    const selected = await transaction.execute({ sql: `SELECT ${SELECT_COLUMNS} FROM Appointment WHERE id = ? LIMIT 2`, args: [id] })
    const rows = readRows(selected).map(parseRow)
    if (rows.length === 0) throw new AppointmentRecordError('APPOINTMENT_NOT_FOUND')
    if (rows.length !== 1) throw new AppointmentRecordError('APPOINTMENT_STORAGE_INVARIANT')
    if (rows[0].status === 'cancelled') return rows[0]
    if (rows[0].status !== 'confirmed') throw new AppointmentRecordError('APPOINTMENT_INVALID_TRANSITION')
    const cancelledAt = currentTime(configuration)
    const updated = await transaction.execute({ sql: `UPDATE Appointment SET status = ?, cancelledAt = ?, updatedAt = max(updatedAt, ?) WHERE id = ? AND status = ? RETURNING ${SELECT_COLUMNS}`, args: ['cancelled', cancelledAt, cancelledAt, id, 'confirmed'] })
    const updatedRows = readRows(updated).map(parseRow)
    if (updatedRows.length !== 1) throw new AppointmentRecordError('APPOINTMENT_INVALID_TRANSITION')
    return updatedRows[0]
  })
  return publicAppointment(row, await patientForAppointment(configuration, row.patientId))
}

/**
 * Creates the local appointment projection shared by public and admin booking flows.
 */
export function createAppointmentRecords(input) {
  const configuration = normalizeFactory(input)
  return Object.freeze({ prepare: (raw) => prepare(configuration, raw), createExisting: (raw) => createExisting(configuration, raw), project: (raw) => project(configuration, raw), list: (raw) => list(configuration, raw), get: (raw) => get(configuration, raw), cancel: (raw) => cancel(configuration, raw) })
}
