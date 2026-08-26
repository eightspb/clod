import { randomUUID } from 'node:crypto'
import { decryptPatientProfile, encryptPatientProfile, fingerprintContactPhone, maskContactPhone, normalizeContactPhone } from './contact-identity.js'

const FACTORY_KEYS = Object.freeze(['client', 'fingerprintKey', 'encryptionKey', 'clock', 'uuid'])
const UPSERT_KEYS = Object.freeze(['profile', 'executor'])
const LIST_KEYS = Object.freeze(['page', 'pageSize', 'phone'])
const ACCESS_KEYS = Object.freeze(['id', 'actor'])
const ID_KEYS = Object.freeze(['id'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ACTOR_PATTERN = /^v1:[0-9a-f]{64}$/
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const FINGERPRINT_PATTERN = /^v1:[0-9a-f]{64}$/
const ROW_COLUMNS = Object.freeze(['id', 'profileCiphertext', 'phoneMask', 'phoneFingerprint', 'firstSeenAt', 'lastSeenAt', 'createdAt', 'updatedAt', 'piiDestroyedAt'])
const SELECT_COLUMNS = ROW_COLUMNS.join(', ')
const ERROR_MESSAGES = Object.freeze({
  PATIENT_NOT_FOUND: 'Patient record was not found',
  PATIENT_PII_DESTROYED: 'Patient personal data has been destroyed',
  PATIENT_STORAGE_INVARIANT: 'Patient storage contains an invalid record',
})

/**
 * Represents a safe patient-record failure without exposing personal data.
 */
export class PatientRecordError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(ERROR_MESSAGES, code) ? code : 'PATIENT_STORAGE_INVARIANT'
    super(ERROR_MESSAGES[safeCode])
    this.name = 'PatientRecordError'
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
  if (value === null || typeof value !== 'object' || typeof value.execute !== 'function' || typeof value.transaction !== 'function') throw new TypeError('Patient record client must provide execute and transaction operations')
  return value
}

function normalizeExecutor(value) {
  if (value === null || typeof value !== 'object' || typeof value.execute !== 'function') throw new TypeError('Patient record executor must provide execute operations')
  return value
}

function normalizeUuid(value, scope) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new TypeError(`${scope} must be a UUID`)
  return value.toLowerCase()
}

function normalizeActor(value) {
  if (typeof value !== 'string' || !ACTOR_PATTERN.test(value)) throw new TypeError('Patient access actor must be a safe fingerprint')
  return value
}

function normalizePage(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000_000) throw new TypeError('Patient page must be a positive bounded integer')
  return value
}

function normalizePageSize(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError('Patient page size must be a positive integer')
  return Math.min(value, 50)
}

function normalizeFactory(input) {
  const options = readRecord(input, FACTORY_KEYS, ['client', 'fingerprintKey', 'encryptionKey'], 'Patient record options')
  const clock = options.clock === undefined ? () => new Date() : options.clock
  const uuid = options.uuid === undefined ? randomUUID : options.uuid
  if (typeof options.fingerprintKey !== 'string' || typeof options.encryptionKey !== 'string' || typeof clock !== 'function' || typeof uuid !== 'function') throw new TypeError('Patient record security and runtime adapters are invalid')
  return Object.freeze({ client: normalizeClient(options.client), fingerprintKey: options.fingerprintKey, encryptionKey: options.encryptionKey, clock, uuid })
}

function currentTime(configuration) {
  const value = configuration.clock()
  if (!(value instanceof Date)) throw new TypeError('Patient record clock must return a valid Date')
  const milliseconds = Date.prototype.getTime.call(value)
  if (!Number.isFinite(milliseconds)) throw new TypeError('Patient record clock must return a valid Date')
  const iso = new Date(milliseconds).toISOString()
  if (!TIMESTAMP_PATTERN.test(iso)) throw new TypeError('Patient record clock must return a four-digit UTC year')
  return iso
}

function nextUuid(configuration, scope) {
  return normalizeUuid(configuration.uuid(), scope)
}

function readRows(result) {
  if (result === null || typeof result !== 'object' || !Array.isArray(result.rows)) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  return [...result.rows]
}

function storedTimestamp(value) {
  if (typeof value !== 'string' || !TIMESTAMP_PATTERN.test(value) || !Number.isFinite(Date.parse(value))) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  return value
}

function parseRow(input) {
  if (input === null || typeof input !== 'object' || !ROW_COLUMNS.every((key) => Object.hasOwn(input, key))) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  const id = normalizeUuid(input.id, 'Stored patient ID')
  const firstSeenAt = storedTimestamp(input.firstSeenAt)
  const lastSeenAt = storedTimestamp(input.lastSeenAt)
  const createdAt = storedTimestamp(input.createdAt)
  const updatedAt = storedTimestamp(input.updatedAt)
  const piiDestroyedAt = input.piiDestroyedAt === null ? null : storedTimestamp(input.piiDestroyedAt)
  const active = piiDestroyedAt === null
  if (lastSeenAt < firstSeenAt || updatedAt < createdAt) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  if (active && (typeof input.profileCiphertext !== 'string' || typeof input.phoneMask !== 'string' || typeof input.phoneFingerprint !== 'string' || !FINGERPRINT_PATTERN.test(input.phoneFingerprint))) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  if (!active && (input.profileCiphertext !== null || input.phoneMask !== null || input.phoneFingerprint !== null)) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  return Object.freeze({ id, profileCiphertext: input.profileCiphertext, phoneMask: input.phoneMask, phoneFingerprint: input.phoneFingerprint, firstSeenAt, lastSeenAt, createdAt, updatedAt, piiDestroyedAt })
}

function patientName(profile) {
  return [profile.lastName, profile.firstName, profile.secondName].filter(Boolean).join(' ')
}

function publicPatient(configuration, row) {
  const profile = row.profileCiphertext === null ? undefined : decryptPatientProfile({ envelope: row.profileCiphertext, key: configuration.encryptionKey })
  return Object.freeze({ id: row.id, name: profile ? patientName(profile) : null, phoneMask: row.phoneMask, firstSeenAt: row.firstSeenAt, lastSeenAt: row.lastSeenAt, createdAt: row.createdAt, updatedAt: row.updatedAt, piiDestroyedAt: row.piiDestroyedAt })
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

function protectedProfile(configuration, profile) {
  const ciphertext = encryptPatientProfile({ profile, key: configuration.encryptionKey })
  const phoneValue = Object.getOwnPropertyDescriptor(profile, 'phone').value
  const phone = normalizeContactPhone(phoneValue)
  return Object.freeze({ ciphertext, phoneMask: maskContactPhone(phone), phoneFingerprint: fingerprintContactPhone({ phone: phoneValue, key: configuration.fingerprintKey }) })
}

async function executeUpsert(configuration, executor, input) {
  const protectedData = protectedProfile(configuration, input.profile)
  const id = nextUuid(configuration, 'Patient ID')
  const now = currentTime(configuration)
  const result = await executor.execute({
    sql: `INSERT INTO Patient (${SELECT_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(phoneFingerprint) DO UPDATE SET profileCiphertext = excluded.profileCiphertext, phoneMask = excluded.phoneMask, lastSeenAt = max(Patient.lastSeenAt, excluded.lastSeenAt), updatedAt = max(Patient.updatedAt, excluded.updatedAt) RETURNING ${SELECT_COLUMNS}`,
    args: [id, protectedData.ciphertext, protectedData.phoneMask, protectedData.phoneFingerprint, now, now, now, now, null],
  })
  const rows = readRows(result).map(parseRow)
  if (rows.length !== 1) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  return publicPatient(configuration, rows[0])
}

async function upsert(configuration, raw) {
  const input = readRecord(raw, UPSERT_KEYS, ['profile'], 'Patient upsert')
  if (input.executor !== undefined) return executeUpsert(configuration, normalizeExecutor(input.executor), input)
  return inTransaction(configuration.client, (executor) => executeUpsert(configuration, executor, input))
}

async function list(configuration, raw) {
  const input = readRecord(raw, LIST_KEYS, ['page', 'pageSize'], 'Patient list')
  const page = normalizePage(input.page)
  const pageSize = normalizePageSize(input.pageSize)
  const phoneFingerprint = input.phone === undefined ? undefined : fingerprintContactPhone({ phone: input.phone, key: configuration.fingerprintKey })
  const where = phoneFingerprint === undefined ? '' : ' WHERE phoneFingerprint = ?'
  const args = phoneFingerprint === undefined ? [] : [phoneFingerprint]
  const count = await configuration.client.execute({ sql: `SELECT COUNT(*) AS total FROM Patient${where}`, args })
  const countRows = readRows(count)
  if (countRows.length !== 1 || !Number.isSafeInteger(Number(countRows[0].total)) || Number(countRows[0].total) < 0) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  const total = Number(countRows[0].total)
  const result = await configuration.client.execute({ sql: `SELECT ${SELECT_COLUMNS} FROM Patient${where} ORDER BY lastSeenAt DESC, id LIMIT ? OFFSET ?`, args: [...args, pageSize, (page - 1) * pageSize] })
  const items = readRows(result).map(parseRow).map((row) => publicPatient(configuration, row))
  return Object.freeze({ items: Object.freeze(items), page, pageSize, total, pages: total === 0 ? 0 : Math.ceil(total / pageSize) })
}

async function get(configuration, raw) {
  const input = readRecord(raw, ID_KEYS, ID_KEYS, 'Patient detail')
  const id = normalizeUuid(input.id, 'Patient ID')
  const result = await configuration.client.execute({ sql: `SELECT ${SELECT_COLUMNS} FROM Patient WHERE id = ? LIMIT 2`, args: [id] })
  const rows = readRows(result).map(parseRow)
  if (rows.length === 0) throw new PatientRecordError('PATIENT_NOT_FOUND')
  if (rows.length !== 1) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  return publicPatient(configuration, rows[0])
}

async function reveal(configuration, raw) {
  const input = readRecord(raw, ACCESS_KEYS, ACCESS_KEYS, 'Patient reveal')
  const id = normalizeUuid(input.id, 'Patient ID')
  const actor = normalizeActor(input.actor)
  return inTransaction(configuration.client, async (transaction) => {
    const result = await transaction.execute({ sql: `SELECT ${SELECT_COLUMNS} FROM Patient WHERE id = ? LIMIT 2`, args: [id] })
    const rows = readRows(result).map(parseRow)
    if (rows.length === 0) throw new PatientRecordError('PATIENT_NOT_FOUND')
    if (rows.length !== 1) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
    if (rows[0].profileCiphertext === null) throw new PatientRecordError('PATIENT_PII_DESTROYED')
    const profile = decryptPatientProfile({ envelope: rows[0].profileCiphertext, key: configuration.encryptionKey })
    const createdAt = currentTime(configuration)
    const accessId = nextUuid(configuration, 'Patient access ID')
    await transaction.execute({ sql: 'INSERT INTO PatientAccess (id, patientId, action, actor, createdAt) VALUES (?, ?, ?, ?, ?)', args: [accessId, id, 'reveal', actor, createdAt] })
    return Object.freeze({ id, phone: profile.phone, revealedAt: createdAt })
  })
}

async function destroy(configuration, raw) {
  const input = readRecord(raw, ACCESS_KEYS, ACCESS_KEYS, 'Patient destruction')
  const id = normalizeUuid(input.id, 'Patient ID')
  const actor = normalizeActor(input.actor)
  return inTransaction(configuration.client, async (transaction) => {
    const selected = await transaction.execute({ sql: `SELECT ${SELECT_COLUMNS} FROM Patient WHERE id = ? LIMIT 2`, args: [id] })
    const rows = readRows(selected).map(parseRow)
    if (rows.length === 0) throw new PatientRecordError('PATIENT_NOT_FOUND')
    if (rows.length !== 1) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
    if (rows[0].piiDestroyedAt !== null) return Object.freeze({ id, destroyedAt: rows[0].piiDestroyedAt, alreadyDestroyed: true })
    const destroyedAt = currentTime(configuration)
    const updated = await transaction.execute({ sql: 'UPDATE Patient SET profileCiphertext = ?, phoneMask = ?, phoneFingerprint = ?, piiDestroyedAt = ?, updatedAt = max(updatedAt, ?) WHERE id = ? AND piiDestroyedAt IS NULL RETURNING id', args: [null, null, null, destroyedAt, destroyedAt, id] })
    if (readRows(updated).length !== 1) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
    const accessId = nextUuid(configuration, 'Patient access ID')
    await transaction.execute({ sql: 'INSERT INTO PatientAccess (id, patientId, action, actor, createdAt) VALUES (?, ?, ?, ?, ?)', args: [accessId, id, 'destroy', actor, destroyedAt] })
    return Object.freeze({ id, destroyedAt, alreadyDestroyed: false })
  })
}

/**
 * Creates the encrypted patient record boundary used by booking and admin flows.
 */
export function createPatientRecords(input) {
  const configuration = normalizeFactory(input)
  return Object.freeze({ upsert: (raw) => upsert(configuration, raw), list: (raw) => list(configuration, raw), get: (raw) => get(configuration, raw), reveal: (raw) => reveal(configuration, raw), destroy: (raw) => destroy(configuration, raw) })
}
