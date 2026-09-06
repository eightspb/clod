import { randomUUID } from 'node:crypto'
import { decryptPatientProfile, encryptContactPhone, encryptPatientProfile, fingerprintContactPhone, maskContactPhone, normalizePatientProfile } from './contact-identity.js'
import { purgeMangoCalls } from './mango-call-purge.js'

const FACTORY_KEYS = Object.freeze(['client', 'fingerprintKey', 'encryptionKey', 'clock', 'uuid'])
const UPSERT_KEYS = Object.freeze(['profile', 'executor'])
const LIST_KEYS = Object.freeze(['page', 'pageSize', 'phone', 'patientId', 'piiStatus', 'history', 'issues', 'from', 'to'])
const PII_STATUSES = Object.freeze(['active', 'destroyed'])
const HISTORY_FILTERS = Object.freeze(['with_visits', 'without_visits'])
const ISSUE_FILTERS = Object.freeze(['with_issues', 'without_issues'])
const ACCESS_KEYS = Object.freeze(['id', 'actor'])
const ACCESS_COUNT_KEYS = Object.freeze(['actions', 'since'])
const SEARCH_AUDIT_KEYS = Object.freeze(['patientIds', 'actor'])
const ACCESS_ACTIONS = Object.freeze(['reveal', 'reveal_full', 'search', 'destroy'])
const ID_KEYS = Object.freeze(['id'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ACTOR_PATTERN = /^v1:[0-9a-f]{64}$/
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const FINGERPRINT_PATTERN = /^v1:[0-9a-f]{64}$/
const ROW_COLUMNS = Object.freeze(['id', 'profileCiphertext', 'phoneMask', 'phoneFingerprint', 'firstSeenAt', 'lastSeenAt', 'createdAt', 'updatedAt', 'piiDestroyedAt'])
const SELECT_COLUMNS = ROW_COLUMNS.join(', ')
const MAX_PHONE_CANDIDATES = 100
const MAX_STORAGE_ROWS = 1_000
const ERROR_MESSAGES = Object.freeze({
  PATIENT_NOT_FOUND: 'Patient record was not found',
  PATIENT_PII_DESTROYED: 'Patient personal data has been destroyed',
  PATIENT_STORAGE_INVARIANT: 'Patient storage contains an invalid record',
})
const TRUSTED_ERRORS = new WeakSet()

/**
 * Represents a safe patient-record failure without exposing personal data.
 */
export class PatientRecordError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(ERROR_MESSAGES, code) ? code : 'PATIENT_STORAGE_INVARIANT'
    super(ERROR_MESSAGES[safeCode])
    this.name = 'PatientRecordError'
    this.code = safeCode
    TRUSTED_ERRORS.add(this)
    Object.freeze(this)
  }
}

/** Identifies only value-safe patient-record failures created by this module. */
export function isPatientRecordError(value) {
  return value !== null && typeof value === 'object' && TRUSTED_ERRORS.has(value)
}

function readRecord(input, allowed, required, scope) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`${scope} must be a plain data object`)
  let prototype
  let keys
  try {
    prototype = Object.getPrototypeOf(input)
    keys = Reflect.ownKeys(input)
  } catch {
    throw new TypeError(`${scope} must be a plain data object`)
  }
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${scope} must be a plain data object`)
  const value = Object.create(null)
  for (const key of keys) {
    if (typeof key !== 'string' || !allowed.includes(key)) throw new TypeError(`${scope} contains unknown fields`)
    let descriptor
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, key)
    } catch {
      throw new TypeError(`${scope} must be a plain data object`)
    }
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

function storedValue(value, key) {
  let descriptor
  try {
    descriptor = value === null || typeof value !== 'object' ? undefined : Object.getOwnPropertyDescriptor(value, key)
  } catch {
    throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  }
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  return descriptor.value
}

function readRows(result) {
  const rows = storedValue(result, 'rows')
  let rowsAreArray
  try {
    rowsAreArray = Array.isArray(rows)
  } catch {
    throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  }
  if (!rowsAreArray) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  const length = storedValue(rows, 'length')
  if (!Number.isSafeInteger(length) || length < 0 || length > MAX_STORAGE_ROWS) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  let keys
  try {
    keys = Reflect.ownKeys(rows)
  } catch {
    throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  }
  if (keys.length !== length + 1 || !keys.includes('length')) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  return Object.freeze(Array.from({ length }, (_value, index) => storedValue(rows, String(index))))
}

function storedTimestamp(value) {
  if (typeof value !== 'string' || !TIMESTAMP_PATTERN.test(value) || !Number.isFinite(Date.parse(value))) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  return value
}

function filterTimestamp(value, scope) {
  const milliseconds = typeof value === 'string' ? Date.parse(value) : Number.NaN
  if (typeof value !== 'string' || !TIMESTAMP_PATTERN.test(value) || !Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) throw new TypeError(`${scope} is invalid`)
  return value
}

function nullableStoredTimestamp(value) {
  return value === null ? null : storedTimestamp(value)
}

function parseRow(input) {
  if (input === null || typeof input !== 'object') throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  const row = Object.create(null)
  for (const key of ROW_COLUMNS) row[key] = storedValue(input, key)
  const id = normalizeUuid(row.id, 'Stored patient ID')
  const firstSeenAt = nullableStoredTimestamp(row.firstSeenAt)
  const lastSeenAt = nullableStoredTimestamp(row.lastSeenAt)
  const createdAt = storedTimestamp(row.createdAt)
  const updatedAt = storedTimestamp(row.updatedAt)
  const piiDestroyedAt = row.piiDestroyedAt === null ? null : storedTimestamp(row.piiDestroyedAt)
  const active = piiDestroyedAt === null
  if ((firstSeenAt === null) !== (lastSeenAt === null) || (firstSeenAt !== null && lastSeenAt < firstSeenAt) || updatedAt < createdAt) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  const hasPhone = row.phoneMask !== null || row.phoneFingerprint !== null
  if (active && (typeof row.profileCiphertext !== 'string' || (hasPhone && (typeof row.phoneMask !== 'string' || typeof row.phoneFingerprint !== 'string' || !FINGERPRINT_PATTERN.test(row.phoneFingerprint))))) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  if (!active && (row.profileCiphertext !== null || row.phoneMask !== null || row.phoneFingerprint !== null)) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  return Object.freeze({ id, profileCiphertext: row.profileCiphertext, phoneMask: row.phoneMask, phoneFingerprint: row.phoneFingerprint, firstSeenAt, lastSeenAt, createdAt, updatedAt, piiDestroyedAt })
}

function patientName(profile) {
  return [profile.lastName, profile.firstName, profile.secondName].filter(Boolean).join(' ') || null
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
  const normalized = normalizePatientProfile(profile)
  const phoneMask = maskContactPhone(normalized.phone)
  const phoneFingerprint = fingerprintContactPhone({ phone: normalized.phone, key: configuration.fingerprintKey })
  return Object.freeze({ profile: normalized, ciphertext: encryptPatientProfile({ profile: normalized, key: configuration.encryptionKey }), phoneCiphertext: encryptContactPhone({ phone: normalized.phone, key: configuration.encryptionKey }), phoneMask, phoneFingerprint })
}

function comparableIdentity(value) {
  return typeof value === 'string' && value.length > 0 ? value.toLowerCase() : null
}

function compatibleProfile(first, second) {
  const fields = ['firstName', 'lastName', 'secondName', 'birthday']
  for (const field of fields) {
    const left = comparableIdentity(first[field])
    const right = comparableIdentity(second[field])
    if (left !== null && right !== null && left !== right) return false
  }
  const firstName = comparableIdentity(first.firstName) !== null && comparableIdentity(first.firstName) === comparableIdentity(second.firstName)
  const lastName = comparableIdentity(first.lastName) !== null && comparableIdentity(first.lastName) === comparableIdentity(second.lastName)
  const birthday = first.birthday !== null && first.birthday === second.birthday
  return (firstName && lastName) || (birthday && (firstName || lastName))
}

async function phoneCandidateRows(configuration, executor, fingerprint) {
  const result = await executor.execute({ sql: `SELECT ${ROW_COLUMNS.map((column) => `p.${column} AS ${column}`).join(', ')} FROM Patient p LEFT JOIN PatientContact c ON c.patientId = p.id AND c.kind = ? AND c.fingerprint = ? AND c.piiDestroyedAt IS NULL WHERE p.piiDestroyedAt IS NULL AND (c.id IS NOT NULL OR p.phoneFingerprint = ?) ORDER BY p.id LIMIT ?`, args: ['phone', fingerprint, fingerprint, MAX_PHONE_CANDIDATES + 1] })
  const rows = readRows(result).map(parseRow)
  if (rows.length > MAX_PHONE_CANDIDATES || new Set(rows.map(({ id }) => id)).size !== rows.length) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  return rows
}

async function compatibleCandidate(configuration, executor, protectedData) {
  const candidates = await phoneCandidateRows(configuration, executor, protectedData.phoneFingerprint)
  const matching = candidates.filter((row) => compatibleProfile(protectedData.profile, decryptPatientProfile({ envelope: row.profileCiphertext, key: configuration.encryptionKey })))
  if (matching.length > 1) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  return matching[0] ?? null
}

async function writePatient(configuration, executor, candidate, protectedData, now) {
  if (candidate === null) {
    const id = nextUuid(configuration, 'Patient ID')
    const inserted = await executor.execute({ sql: `INSERT INTO Patient (${SELECT_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING ${SELECT_COLUMNS}`, args: [id, protectedData.ciphertext, protectedData.phoneMask, protectedData.phoneFingerprint, now, now, now, now, null] })
    const rows = readRows(inserted).map(parseRow)
    if (rows.length !== 1) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
    return rows[0]
  }
  const updated = await executor.execute({ sql: `UPDATE Patient SET profileCiphertext = ?, phoneMask = ?, phoneFingerprint = ?, firstSeenAt = COALESCE(firstSeenAt, ?), lastSeenAt = CASE WHEN lastSeenAt IS NULL OR lastSeenAt < ? THEN ? ELSE lastSeenAt END, updatedAt = max(updatedAt, ?) WHERE id = ? AND piiDestroyedAt IS NULL RETURNING ${SELECT_COLUMNS}`, args: [protectedData.ciphertext, protectedData.phoneMask, protectedData.phoneFingerprint, now, now, now, now, candidate.id] })
  const rows = readRows(updated).map(parseRow)
  if (rows.length !== 1) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  return rows[0]
}

async function projectPrimaryContact(configuration, executor, patientId, protectedData, now) {
  await executor.execute({ sql: 'UPDATE PatientContact SET isPrimary = ? WHERE patientId = ? AND kind = ? AND fingerprint <> ? AND piiDestroyedAt IS NULL', args: [0, patientId, 'phone', protectedData.phoneFingerprint] })
  const updated = await executor.execute({ sql: 'UPDATE PatientContact SET ciphertext = ?, mask = ?, isPrimary = ?, firstSeenAt = COALESCE(firstSeenAt, ?), lastSeenAt = CASE WHEN lastSeenAt IS NULL OR lastSeenAt < ? THEN ? ELSE lastSeenAt END WHERE patientId = ? AND kind = ? AND fingerprint = ? AND piiDestroyedAt IS NULL RETURNING id', args: [protectedData.phoneCiphertext, protectedData.phoneMask, 1, now, now, now, patientId, 'phone', protectedData.phoneFingerprint] })
  const rows = readRows(updated)
  if (rows.length > 1) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  if (rows.length === 1) return
  const id = nextUuid(configuration, 'Patient contact ID')
  await executor.execute({ sql: 'INSERT INTO PatientContact (id, patientId, kind, ciphertext, fingerprint, mask, isPrimary, sourceName, firstSeenAt, lastSeenAt, piiDestroyedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [id, patientId, 'phone', protectedData.phoneCiphertext, protectedData.phoneFingerprint, protectedData.phoneMask, 1, 'operational', now, now, null] })
}

async function activeContactPatientIds(executor, fingerprint) {
  const result = await executor.execute({ sql: 'SELECT DISTINCT p.id FROM Patient p LEFT JOIN PatientContact c ON c.patientId = p.id AND c.kind = ? AND c.fingerprint = ? AND c.piiDestroyedAt IS NULL WHERE p.piiDestroyedAt IS NULL AND (p.phoneFingerprint = ? OR c.id IS NOT NULL) ORDER BY p.id LIMIT 2', args: ['phone', fingerprint, fingerprint] })
  const rows = readRows(result)
  const ids = rows.map((row) => {
    return normalizeUuid(storedValue(row, 'id'), 'Stored patient ID')
  })
  if (new Set(ids).size !== ids.length) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  return ids
}

async function synchronizeMango(executor, fingerprint, now) {
  const ids = await activeContactPatientIds(executor, fingerprint)
  await executor.execute({ sql: 'UPDATE MangoCall SET patientId = ?, updatedAt = max(updatedAt, ?) WHERE callerFingerprint = ? AND piiDestroyedAt IS NULL', args: [ids.length === 1 ? ids[0] : null, now, fingerprint] })
}

async function executeUpsert(configuration, executor, input) {
  const protectedData = protectedProfile(configuration, input.profile)
  const now = currentTime(configuration)
  const candidate = await compatibleCandidate(configuration, executor, protectedData)
  const row = await writePatient(configuration, executor, candidate, protectedData, now)
  await projectPrimaryContact(configuration, executor, row.id, protectedData, now)
  await synchronizeMango(executor, protectedData.phoneFingerprint, now)
  return publicPatient(configuration, row)
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
  const patientId = input.patientId === undefined ? undefined : normalizeUuid(input.patientId, 'Patient list ID')
  if (input.piiStatus !== undefined && !PII_STATUSES.includes(input.piiStatus)) throw new TypeError('Patient PII filter is invalid')
  if (input.history !== undefined && !HISTORY_FILTERS.includes(input.history)) throw new TypeError('Patient history filter is invalid')
  if (input.issues !== undefined && !ISSUE_FILTERS.includes(input.issues)) throw new TypeError('Patient issue filter is invalid')
  const from = input.from === undefined ? undefined : filterTimestamp(input.from, 'Patient activity filter start')
  const to = input.to === undefined ? undefined : filterTimestamp(input.to, 'Patient activity filter end')
  if ((from === undefined) !== (to === undefined) || (from !== undefined && from >= to)) throw new TypeError('Patient activity range is invalid')
  if (phoneFingerprint !== undefined && patientId !== undefined) throw new TypeError('Patient list filters are mutually exclusive')
  const source = phoneFingerprint === undefined ? 'Patient p' : 'Patient p LEFT JOIN PatientContact c ON c.patientId = p.id AND c.kind = ? AND c.fingerprint = ? AND c.piiDestroyedAt IS NULL'
  const clauses = []
  const args = phoneFingerprint === undefined ? [] : ['phone', phoneFingerprint]
  if (patientId !== undefined) { clauses.push('p.id = ?'); args.push(patientId) }
  if (phoneFingerprint !== undefined) { clauses.push('p.piiDestroyedAt IS NULL AND (c.id IS NOT NULL OR p.phoneFingerprint = ?)'); args.push(phoneFingerprint) }
  if (input.piiStatus === 'active') clauses.push('p.piiDestroyedAt IS NULL')
  if (input.piiStatus === 'destroyed') clauses.push('p.piiDestroyedAt IS NOT NULL')
  if (input.history === 'with_visits') clauses.push('EXISTS (SELECT 1 FROM HistoricalVisit v WHERE v.patientId = p.id)')
  if (input.history === 'without_visits') clauses.push('NOT EXISTS (SELECT 1 FROM HistoricalVisit v WHERE v.patientId = p.id)')
  if (input.issues === 'with_issues') clauses.push('EXISTS (SELECT 1 FROM ImportIssue i WHERE i.patientId = p.id OR i.historicalVisitId IN (SELECT v.id FROM HistoricalVisit v WHERE v.patientId = p.id))')
  if (input.issues === 'without_issues') clauses.push('NOT EXISTS (SELECT 1 FROM ImportIssue i WHERE i.patientId = p.id OR i.historicalVisitId IN (SELECT v.id FROM HistoricalVisit v WHERE v.patientId = p.id))')
  if (from !== undefined) { clauses.push('p.lastSeenAt >= ?'); args.push(from); clauses.push('p.lastSeenAt < ?'); args.push(to) }
  const where = clauses.length === 0 ? '' : ` WHERE ${clauses.join(' AND ')}`
  const count = await configuration.client.execute({ sql: `SELECT COUNT(DISTINCT p.id) AS total FROM ${source}${where}`, args })
  const countRows = readRows(count)
  const total = countRows.length === 1 ? Number(storedValue(countRows[0], 'total')) : Number.NaN
  if (!Number.isSafeInteger(total) || total < 0) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  const columns = ROW_COLUMNS.map((column) => `p.${column} AS ${column}`).join(', ')
  const distinct = phoneFingerprint === undefined ? '' : 'DISTINCT '
  const result = await configuration.client.execute({ sql: `SELECT ${distinct}${columns} FROM ${source}${where} ORDER BY p.lastSeenAt DESC, p.id LIMIT ? OFFSET ?`, args: [...args, pageSize, (page - 1) * pageSize] })
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
    const selectedContacts = await transaction.execute({ sql: 'SELECT fingerprint FROM PatientContact WHERE patientId = ? AND kind = ? AND fingerprint IS NOT NULL AND piiDestroyedAt IS NULL ORDER BY fingerprint', args: [id, 'phone'] })
    const fingerprints = readRows(selectedContacts).map((row) => {
      const fingerprint = storedValue(row, 'fingerprint')
      if (typeof fingerprint !== 'string' || !FINGERPRINT_PATTERN.test(fingerprint)) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
      return fingerprint
    })
    if (rows[0].phoneFingerprint !== null) fingerprints.push(rows[0].phoneFingerprint)
    const updated = await transaction.execute({ sql: 'UPDATE Patient SET profileCiphertext = ?, phoneMask = ?, phoneFingerprint = ?, piiDestroyedAt = ?, updatedAt = max(updatedAt, ?) WHERE id = ? AND piiDestroyedAt IS NULL RETURNING id', args: [null, null, null, destroyedAt, destroyedAt, id] })
    if (readRows(updated).length !== 1) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
    await transaction.execute({ sql: 'UPDATE PatientContact SET ciphertext = ?, fingerprint = ?, mask = ?, isPrimary = ?, piiDestroyedAt = ?, lastSeenAt = max(lastSeenAt, ?) WHERE patientId = ? AND piiDestroyedAt IS NULL', args: [null, null, null, 0, destroyedAt, destroyedAt, id] })
    await purgeMangoCalls(transaction, { patientId: id, fingerprints, destroyedAt, actor, nextUuid: () => nextUuid(configuration, 'MANGO call access ID') })
    const accessId = nextUuid(configuration, 'Patient access ID')
    await transaction.execute({ sql: 'INSERT INTO PatientAccess (id, patientId, action, actor, createdAt) VALUES (?, ?, ?, ?, ?)', args: [accessId, id, 'destroy', actor, destroyedAt] })
    return Object.freeze({ id, destroyedAt, alreadyDestroyed: false })
  })
}

/**
 * Creates the encrypted patient record boundary used by booking and admin flows.
 */
/**
 * Clinic-wide count of audited accesses since a moment; the reveal budget is derived from the
 * durable audit instead of a per-token limiter that a fresh login or a redeploy resets.
 */
async function countAccess(configuration, raw) {
  const input = readRecord(raw, ACCESS_COUNT_KEYS, ACCESS_COUNT_KEYS, 'Patient access count')
  if (!Array.isArray(input.actions) || input.actions.length === 0 || input.actions.some((action) => !ACCESS_ACTIONS.includes(action))) throw new TypeError('Patient access count requires allowlisted actions')
  const since = filterTimestamp(input.since, 'Patient access count start')
  const placeholders = input.actions.map(() => '?').join(', ')
  const result = await configuration.client.execute({ sql: `SELECT COUNT(*) AS total FROM PatientAccess WHERE action IN (${placeholders}) AND createdAt > ?`, args: [...input.actions, since] })
  const rows = readRows(result)
  const total = rows.length === 1 ? Number(storedValue(rows[0], 'total')) : Number.NaN
  if (!Number.isSafeInteger(total) || total < 0) throw new PatientRecordError('PATIENT_STORAGE_INVARIANT')
  return total
}

/**
 * Records that an exact phone search matched these patients: the search answers "is this person
 * a patient here" and must leave the same trail as a reveal, without the digits themselves.
 */
async function auditSearch(configuration, raw) {
  const input = readRecord(raw, SEARCH_AUDIT_KEYS, SEARCH_AUDIT_KEYS, 'Patient search audit')
  if (!Array.isArray(input.patientIds)) throw new TypeError('Patient search audit requires patient IDs')
  const ids = input.patientIds.map((id) => normalizeUuid(id, 'Patient ID'))
  const actor = normalizeActor(input.actor)
  const createdAt = currentTime(configuration)
  for (const id of ids) {
    await configuration.client.execute({ sql: 'INSERT INTO PatientAccess (id, patientId, action, actor, createdAt) VALUES (?, ?, ?, ?, ?)', args: [nextUuid(configuration, 'Patient access ID'), id, 'search', actor, createdAt] })
  }
  return Object.freeze({ audited: ids.length, createdAt })
}

export function createPatientRecords(input) {
  const configuration = normalizeFactory(input)
  return Object.freeze({ upsert: (raw) => upsert(configuration, raw), list: (raw) => list(configuration, raw), get: (raw) => get(configuration, raw), reveal: (raw) => reveal(configuration, raw), destroy: (raw) => destroy(configuration, raw), countAccess: (raw) => countAccess(configuration, raw), auditSearch: (raw) => auditSearch(configuration, raw) })
}
