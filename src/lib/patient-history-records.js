import { randomUUID } from 'node:crypto'
import { decryptPatientProfile } from './contact-identity.js'
import { PATIENT_HISTORY_ATTACHMENT_KINDS as ATTACHMENT_KINDS, PATIENT_HISTORY_ATTACHMENT_SOURCES as ATTACHMENT_SOURCE_NAMES, PATIENT_HISTORY_CANDIDATE_EVIDENCE_CODES as CANDIDATE_EVIDENCE_CODES, PATIENT_HISTORY_CONTACT_SOURCES as CONTACT_SOURCE_NAMES, PATIENT_HISTORY_EVIDENCE_LEVELS as EVIDENCE_LEVELS, PATIENT_HISTORY_IMPORT_ISSUE_CODES as IMPORT_ISSUE_CODES, PATIENT_HISTORY_IMPORT_SOURCES as IMPORT_SOURCE_NAMES, PATIENT_HISTORY_LINK_METHODS as LINK_METHODS, PATIENT_HISTORY_NAME_HISTORY_REASONS as NAME_HISTORY_REASONS, PATIENT_HISTORY_SOURCE_STATUSES as SOURCE_STATUSES, PATIENT_HISTORY_VISIT_SOURCES as VISIT_SOURCE_NAMES, PATIENT_HISTORY_VISIT_STATUSES as VISIT_STATUSES } from './patient-history-contract.js'
import { decryptProtectedData } from './protected-patient-data.js'
import { purgeMangoCalls } from './mango-call-purge.js'

const FACTORY_KEYS = Object.freeze(['client', 'encryptionKey', 'clock', 'uuid'])
const SUMMARY_KEYS = Object.freeze(['ids'])
const PAGE_KEYS = Object.freeze(['patientId', 'page', 'pageSize', 'status'])
const ISSUE_KEYS = Object.freeze(['patientId', 'page', 'pageSize'])
const PATIENT_KEYS = Object.freeze(['patientId'])
const ACCESS_KEYS = Object.freeze(['id', 'actor'])
const REVEAL_KEYS = Object.freeze(['id', 'actor', 'reason'])
const REASON_PATTERN = /^[\p{L}\p{N}\p{P}\p{Zs}]{5,200}$/u
const LINK_KEYS = Object.freeze(['page', 'pageSize', 'status'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const SAFE_TEXT_PATTERN = /^[^\p{Cc}\p{Cf}]{1,255}$/u
const ACTOR_PATTERN = /^v1:[0-9a-f]{64}$/
const ENCRYPTION_KEY_PATTERN = /^[A-Za-z0-9+/]{43}=$/
const PHONE_PATTERN = /^[1-9][0-9]{7,14}$/
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/u
const MAX_CANDIDATES_PER_VISIT = 2_048
const MAX_PAGE_CANDIDATES = 20_000
const MAX_COUNT = 50_000_000
const MAX_REVEAL_CHILDREN = 1_000
const MAX_STORAGE_ROWS = 20_000
const LINK_EVIDENCE = Object.freeze({ exact_ehr: Object.freeze({ level: 'exact', code: 'EXACT_EHR', score: 100, ambiguous: false }), exact_clinic_card: Object.freeze({ level: 'strong', code: 'EXACT_CLINIC_CARD', score: 90, ambiguous: true }), leading_zero_clinic_card: Object.freeze({ level: 'strong', code: 'LEADING_ZERO_CLINIC_CARD', score: 80, ambiguous: false }), phone_compatible_name: Object.freeze({ level: 'strong', code: 'PHONE_COMPATIBLE_NAME', score: 70, ambiguous: true }), exact_full_name: Object.freeze({ level: 'moderate', code: 'EXACT_FULL_NAME', score: 60, ambiguous: true }), conflicting_comment_evidence: Object.freeze({ level: 'moderate', code: 'CONFLICTING_COMMENT_EVIDENCE', score: 50, ambiguous: true, linked: false }) })
const ERROR_MESSAGES = Object.freeze({
  PATIENT_NOT_FOUND: 'Patient history was not found',
  PATIENT_PII_DESTROYED: 'Patient personal data has been destroyed',
  PATIENT_HISTORY_STORAGE_INVARIANT: 'Patient history storage contains an invalid record',
})
const TRUSTED_ERRORS = new WeakSet()

/** Represents a value-free patient-history storage failure. */
export class PatientHistoryRecordError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(ERROR_MESSAGES, code) ? code : 'PATIENT_HISTORY_STORAGE_INVARIANT'
    super(ERROR_MESSAGES[safeCode])
    this.name = 'PatientHistoryRecordError'
    this.code = safeCode
    TRUSTED_ERRORS.add(this)
    Object.freeze(this)
  }
}

/** Identifies only value-safe patient-history failures created by this module. */
export function isPatientHistoryRecordError(value) {
  return value !== null && typeof value === 'object' && TRUSTED_ERRORS.has(value)
}

function invalid(code = 'PATIENT_HISTORY_STORAGE_INVARIANT') {
  throw new PatientHistoryRecordError(code)
}

function record(value, allowed, required, scope) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${scope} must be a plain data object`)
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${scope} must be a plain data object`)
  const result = Object.create(null)
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) throw new TypeError(`${scope} contains unknown fields`)
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) throw new TypeError(`${scope} must contain enumerable data fields only`)
    result[key] = descriptor.value
  }
  if (!required.every((key) => Object.hasOwn(result, key))) throw new TypeError(`${scope} is missing required fields`)
  return result
}

function normalizeFactory(value) {
  const input = record(value, FACTORY_KEYS, ['client', 'encryptionKey'], 'Patient history options')
  const clock = input.clock ?? (() => new Date())
  const uuid = input.uuid ?? randomUUID
  if (input.client === null || typeof input.client !== 'object' || typeof input.client.execute !== 'function' || typeof input.client.transaction !== 'function') throw new TypeError('Patient history client must provide execute and transaction operations')
  if (typeof input.encryptionKey !== 'string' || !ENCRYPTION_KEY_PATTERN.test(input.encryptionKey) || Buffer.from(input.encryptionKey, 'base64').byteLength !== 32 || Buffer.from(input.encryptionKey, 'base64').toString('base64') !== input.encryptionKey || typeof clock !== 'function' || typeof uuid !== 'function') throw new TypeError('Patient history security and runtime adapters are invalid')
  return Object.freeze({ client: input.client, encryptionKey: input.encryptionKey, clock, uuid })
}

function uuid(value, scope = 'Patient ID') {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new TypeError(`${scope} must be a UUID`)
  return value.toLowerCase()
}

function page(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000_000) throw new TypeError('Patient history page must be a positive bounded integer')
  return value
}

function pageSize(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError('Patient history page size must be a positive integer')
  return Math.min(value, 50)
}

function actor(value) {
  if (typeof value !== 'string' || !ACTOR_PATTERN.test(value)) throw new TypeError('Patient history actor must be a safe fingerprint')
  return value
}

function currentTime(configuration) {
  const value = configuration.clock()
  if (Object.getPrototypeOf(value) !== Date.prototype) invalid()
  const milliseconds = Date.prototype.getTime.call(value)
  if (!Number.isFinite(milliseconds)) invalid()
  return timestamp(new Date(milliseconds).toISOString())
}

function nextUuid(configuration) {
  return uuid(configuration.uuid(), 'Patient access ID')
}

function rows(value) {
  if (value === null || typeof value !== 'object') invalid()
  const descriptor = Object.getOwnPropertyDescriptor(value, 'rows')
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || !Array.isArray(descriptor.value) || Object.getPrototypeOf(descriptor.value) !== Array.prototype) invalid()
  const rowArray = descriptor.value
  const length = Object.getOwnPropertyDescriptor(rowArray, 'length')?.value
  if (!Number.isSafeInteger(length) || length < 0 || length > MAX_STORAGE_ROWS || Reflect.ownKeys(rowArray).length !== length + 1) invalid()
  const result = []
  for (let index = 0; index < length; index += 1) {
    const item = Object.getOwnPropertyDescriptor(rowArray, String(index))
    if (!item || !Object.hasOwn(item, 'value') || item.enumerable !== true) invalid()
    result.push(item.value)
  }
  return Object.freeze(result)
}

function field(row, key) {
  if (row === null || typeof row !== 'object') invalid()
  const descriptor = Object.getOwnPropertyDescriptor(row, key)
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid()
  return descriptor.value
}

function count(value) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > MAX_COUNT) invalid()
  return value
}

function coherentLinkage(linkStatus, linkMethod, evidenceLevel, candidateCount) {
  if (linkStatus === 'unmatched') return linkMethod === null && evidenceLevel === 'none' && candidateCount === 0
  if (linkMethod === null || !Object.hasOwn(LINK_EVIDENCE, linkMethod)) return false
  const evidence = LINK_EVIDENCE[linkMethod]
  if (evidenceLevel !== evidence.level) return false
  if (linkStatus === 'linked') return evidence.linked !== false && candidateCount === 0
  return linkStatus === 'ambiguous' && evidence.ambiguous && candidateCount >= 2 && candidateCount <= MAX_CANDIDATES_PER_VISIT
}

function text(value) {
  if (typeof value !== 'string' || !SAFE_TEXT_PATTERN.test(value)) invalid()
  return value
}

function sourceName(value, allowed) {
  return status(value, allowed)
}

function timestamp(value) {
  if (typeof value !== 'string' || !TIMESTAMP_PATTERN.test(value)) invalid()
  const milliseconds = Date.parse(value)
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) invalid()
  return value
}

function nullableTimestamp(value) {
  return value === null ? null : timestamp(value)
}

function status(value, allowed) {
  if (typeof value !== 'string' || !allowed.includes(value)) invalid()
  return value
}

function knownFailure(value) {
  return value !== null && typeof value === 'object' && TRUSTED_ERRORS.has(value)
}

async function storage(operation) {
  try {
    return await operation()
  } catch (error) {
    if (knownFailure(error)) throw error
    invalid()
  }
}

async function close(transaction) {
  try {
    await transaction.close()
  } catch {
    invalid()
  }
}

async function rollback(transaction) {
  try {
    await transaction.rollback()
  } catch {
    invalid()
  }
}

async function inTransaction(configuration, operation) {
  const transaction = await configuration.client.transaction('write')
  try {
    const result = await operation(transaction)
    await transaction.commit()
    return result
  } catch (error) {
    await rollback(transaction)
    throw error
  } finally {
    await close(transaction)
  }
}

function pageResult(items, number, size, total) {
  return Object.freeze({ items: Object.freeze(items), page: number, pageSize: size, total, pages: total === 0 ? 0 : Math.ceil(total / size) })
}

function summaryRow(row) {
  return Object.freeze({
    patientId: uuid(field(row, 'patientId')),
    externalIdentifierCount: count(field(row, 'externalIdentifierCount')),
    clinicCardCount: count(field(row, 'clinicCardCount')),
    contactCount: count(field(row, 'contactCount')),
    previousLastNameCount: count(field(row, 'previousLastNameCount')),
    historicalVisitCount: count(field(row, 'historicalVisitCount')),
    issueCount: count(field(row, 'issueCount')),
    attachmentCount: count(field(row, 'attachmentCount')),
  })
}

async function summaries(configuration, value) {
  const input = record(value, SUMMARY_KEYS, SUMMARY_KEYS, 'Patient history summaries')
  if (!Array.isArray(input.ids) || Object.getPrototypeOf(input.ids) !== Array.prototype || input.ids.length > 50) throw new TypeError('Patient history summary IDs must be a bounded array')
  const ids = input.ids.map((id) => uuid(id))
  if (new Set(ids).size !== ids.length) throw new TypeError('Patient history summary IDs must be unique')
  if (ids.length === 0) return Object.freeze([])
  return storage(async () => {
    const placeholders = ids.map(() => '?').join(', ')
    const sql = `SELECT p.id AS patientId, (SELECT COUNT(*) FROM PatientExternalIdentifier e WHERE e.patientId = p.id) AS externalIdentifierCount, (SELECT COUNT(*) FROM PatientExternalIdentifier e WHERE e.patientId = p.id AND e.system = 'clinic_card') AS clinicCardCount, (SELECT COUNT(*) FROM PatientContact c WHERE c.patientId = p.id AND c.piiDestroyedAt IS NULL) AS contactCount, (SELECT COUNT(*) FROM PatientNameHistory n WHERE n.patientId = p.id AND n.piiDestroyedAt IS NULL) AS previousLastNameCount, (SELECT COUNT(*) FROM HistoricalVisit v WHERE v.patientId = p.id) AS historicalVisitCount, (SELECT COUNT(DISTINCT i.id) FROM ImportIssue i WHERE i.patientId = p.id OR i.historicalVisitId IN (SELECT v.id FROM HistoricalVisit v WHERE v.patientId = p.id)) AS issueCount, (SELECT COUNT(*) FROM PatientAttachment a WHERE a.patientId = p.id AND a.piiDestroyedAt IS NULL AND a.deletedAt IS NULL) AS attachmentCount FROM Patient p WHERE p.id IN (${placeholders}) ORDER BY p.id`
    return Object.freeze(rows(await configuration.client.execute({ sql, args: ids })).map(summaryRow))
  })
}

function visitRow(row) {
  const linkStatus = status(field(row, 'linkStatus'), VISIT_STATUSES)
  const sourceStatus = status(field(row, 'sourceStatus'), SOURCE_STATUSES)
  const linkMethod = field(row, 'linkMethod') === null ? null : status(field(row, 'linkMethod'), LINK_METHODS)
  const evidenceLevel = field(row, 'evidenceLevel') === null ? null : status(field(row, 'evidenceLevel'), EVIDENCE_LEVELS)
  const candidateCount = count(field(row, 'candidateCount'))
  const protectedDetailsAvailable = count(field(row, 'protectedDetailsAvailable'))
  if (protectedDetailsAvailable > 1 || !coherentLinkage(linkStatus, linkMethod, evidenceLevel, candidateCount)) invalid()
  return Object.freeze({ id: uuid(field(row, 'id'), 'Historical visit ID'), sourceName: sourceName(field(row, 'sourceName'), VISIT_SOURCE_NAMES), sourceRow: count(field(row, 'sourceRow')), startsAt: nullableTimestamp(field(row, 'startsAt')), endsAt: nullableTimestamp(field(row, 'endsAt')), sourceStatus, linkStatus, linkMethod, evidenceLevel, issueCount: count(field(row, 'issueCount')), candidateCount, protectedDetailsAvailable: protectedDetailsAvailable === 1 })
}

async function visits(configuration, value) {
  const input = record(value, PAGE_KEYS, ['patientId', 'page', 'pageSize'], 'Patient historical visits')
  const patientId = uuid(input.patientId)
  const number = page(input.page)
  const size = pageSize(input.pageSize)
  const linkStatus = input.status === undefined ? undefined : status(input.status, VISIT_STATUSES)
  const where = linkStatus === undefined ? 'patientId = ?' : 'patientId = ? AND linkStatus = ?'
  const args = linkStatus === undefined ? [patientId] : [patientId, linkStatus]
  return storage(async () => {
    const totalRows = rows(await configuration.client.execute({ sql: `SELECT COUNT(*) AS total FROM HistoricalVisit WHERE ${where}`, args }))
    if (totalRows.length !== 1) invalid()
    const total = count(field(totalRows[0], 'total'))
    const sql = `SELECT id, sourceName, sourceRow, startsAt, endsAt, sourceStatus, linkStatus, linkMethod, evidenceLevel, (SELECT COUNT(*) FROM ImportIssue i WHERE i.historicalVisitId = HistoricalVisit.id) AS issueCount, (SELECT COUNT(*) FROM HistoricalVisitCandidate c WHERE c.historicalVisitId = HistoricalVisit.id) AS candidateCount, CASE WHEN piiDestroyedAt IS NULL AND (appointmentIdCiphertext IS NOT NULL OR doctorCiphertext IS NOT NULL OR detailsCiphertext IS NOT NULL) THEN 1 ELSE 0 END AS protectedDetailsAvailable FROM HistoricalVisit WHERE ${where} ORDER BY startsAt DESC NULLS FIRST, sourceName, sourceRow, id LIMIT ? OFFSET ?`
    const items = rows(await configuration.client.execute({ sql, args: [...args, size, (number - 1) * size] })).map(visitRow)
    return pageResult(items, number, size, total)
  })
}

function issueRow(row) {
  return Object.freeze({ id: uuid(field(row, 'id'), 'Import issue ID'), sourceName: sourceName(field(row, 'sourceName'), IMPORT_SOURCE_NAMES), sourceRow: count(field(row, 'sourceRow')), code: status(field(row, 'code'), IMPORT_ISSUE_CODES), historicalVisitId: field(row, 'historicalVisitId') === null ? null : uuid(field(row, 'historicalVisitId'), 'Historical visit ID'), createdAt: timestamp(field(row, 'createdAt')), resolvedAt: nullableTimestamp(field(row, 'resolvedAt')) })
}

async function issues(configuration, value) {
  const input = record(value, ISSUE_KEYS, ISSUE_KEYS, 'Patient history issues')
  const patientId = uuid(input.patientId)
  const number = page(input.page)
  const size = pageSize(input.pageSize)
  const args = [patientId, patientId]
  const where = 'patientId = ? OR historicalVisitId IN (SELECT id FROM HistoricalVisit WHERE patientId = ?)'
  return storage(async () => {
    const totalRows = rows(await configuration.client.execute({ sql: `SELECT COUNT(DISTINCT id) AS total FROM ImportIssue WHERE ${where}`, args }))
    if (totalRows.length !== 1) invalid()
    const total = count(field(totalRows[0], 'total'))
    const result = await configuration.client.execute({ sql: `SELECT id, sourceName, sourceRow, code, historicalVisitId, createdAt, resolvedAt FROM ImportIssue WHERE ${where} ORDER BY createdAt DESC, sourceName, sourceRow, id LIMIT ? OFFSET ?`, args: [...args, size, (number - 1) * size] })
    return pageResult(rows(result).map(issueRow), number, size, total)
  })
}

function attachmentRow(row) {
  const protectedData = count(field(row, 'protectedDataAvailable'))
  if (protectedData > 1) invalid()
  return Object.freeze({ id: uuid(field(row, 'id'), 'Patient attachment ID'), kind: status(field(row, 'kind'), ATTACHMENT_KINDS), sourceName: sourceName(field(row, 'sourceName'), ATTACHMENT_SOURCE_NAMES), createdAt: timestamp(field(row, 'createdAt')), deletedAt: nullableTimestamp(field(row, 'deletedAt')), protectedDataAvailable: protectedData === 1 })
}

async function attachments(configuration, value) {
  const input = record(value, PATIENT_KEYS, PATIENT_KEYS, 'Patient attachments')
  const patientId = uuid(input.patientId)
  const sql = 'SELECT id, kind, sourceName, createdAt, deletedAt, CASE WHEN piiDestroyedAt IS NULL AND (urlCiphertext IS NOT NULL OR metadataCiphertext IS NOT NULL) THEN 1 ELSE 0 END AS protectedDataAvailable FROM PatientAttachment WHERE patientId = ? AND deletedAt IS NULL ORDER BY createdAt DESC, id LIMIT 1000'
  return storage(async () => Object.freeze(rows(await configuration.client.execute({ sql, args: [patientId] })).map(attachmentRow)))
}

function linkRow(row, candidates, expectedStatus) {
  const linkStatus = status(field(row, 'linkStatus'), ['ambiguous', 'unmatched'])
  const linkMethod = field(row, 'linkMethod') === null ? null : status(field(row, 'linkMethod'), LINK_METHODS)
  const evidenceLevel = field(row, 'evidenceLevel') === null ? null : status(field(row, 'evidenceLevel'), EVIDENCE_LEVELS)
  if (linkStatus !== expectedStatus || !coherentLinkage(linkStatus, linkMethod, evidenceLevel, candidates.length)) invalid()
  const evidence = linkMethod === null ? undefined : LINK_EVIDENCE[linkMethod]
  if (new Set(candidates.map(({ patientId }) => patientId)).size !== candidates.length || candidates.some(({ evidenceCode, score }) => evidenceCode !== evidence?.code || score !== evidence?.score)) invalid()
  return Object.freeze({ id: uuid(field(row, 'id'), 'Historical visit ID'), sourceName: sourceName(field(row, 'sourceName'), VISIT_SOURCE_NAMES), sourceRow: count(field(row, 'sourceRow')), startsAt: nullableTimestamp(field(row, 'startsAt')), sourceStatus: status(field(row, 'sourceStatus'), SOURCE_STATUSES), linkStatus, linkMethod, evidenceLevel, candidates })
}

function candidateRow(row) {
  const score = count(field(row, 'score'))
  if (score > 100) invalid()
  return Object.freeze({ historicalVisitId: uuid(field(row, 'historicalVisitId'), 'Historical visit ID'), patientId: uuid(field(row, 'patientId')), evidenceCode: status(field(row, 'evidenceCode'), CANDIDATE_EVIDENCE_CODES), score })
}

async function linkIssues(configuration, value) {
  const input = record(value, LINK_KEYS, LINK_KEYS, 'Patient unresolved history')
  const number = page(input.page)
  const size = pageSize(input.pageSize)
  const linkStatus = status(input.status, ['ambiguous', 'unmatched'])
  return storage(async () => {
    const totalRows = rows(await configuration.client.execute({ sql: 'SELECT COUNT(*) AS total FROM HistoricalVisit WHERE linkStatus = ?', args: [linkStatus] }))
    if (totalRows.length !== 1) invalid()
    const total = count(field(totalRows[0], 'total'))
    const result = rows(await configuration.client.execute({ sql: 'SELECT id, sourceName, sourceRow, startsAt, sourceStatus, linkStatus, linkMethod, evidenceLevel FROM HistoricalVisit WHERE linkStatus = ? ORDER BY startsAt DESC NULLS FIRST, sourceName, sourceRow, id LIMIT ? OFFSET ?', args: [linkStatus, size, (number - 1) * size] }))
    const ids = result.map((row) => uuid(field(row, 'id'), 'Historical visit ID'))
    const candidates = new Map(ids.map((id) => [id, []]))
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(', ')
      const candidateRows = rows(await configuration.client.execute({ sql: `SELECT historicalVisitId, patientId, evidenceCode, score FROM HistoricalVisitCandidate WHERE historicalVisitId IN (${placeholders}) ORDER BY historicalVisitId, patientId, id`, args: ids })).map(candidateRow)
      if (candidateRows.length > MAX_PAGE_CANDIDATES) invalid()
      for (const candidate of candidateRows) {
        const values = candidates.get(candidate.historicalVisitId)
        if (values === undefined || values.length >= MAX_CANDIDATES_PER_VISIT) invalid()
        values.push(Object.freeze({ patientId: candidate.patientId, evidenceCode: candidate.evidenceCode, score: candidate.score }))
      }
    }
    const items = result.map((row, index) => linkRow(row, Object.freeze(candidates.get(ids[index])), linkStatus))
    return pageResult(items, number, size, total)
  })
}

function decrypted(configuration, domain, envelope) {
  if (typeof envelope !== 'string') invalid()
  return decryptProtectedData({ domain, envelope, key: configuration.encryptionKey })
}

function unwrapped(value) {
  if (value !== null && typeof value === 'object' && Object.hasOwn(value, 'value') && value.value !== null && typeof value.value === 'object') return value.value
  return value
}

function privateText(value, key) {
  if (value === null || typeof value !== 'object') invalid()
  if (typeof value[key] === 'string') return value[key]
  if (typeof value.value === 'string') return value.value
  if (value.value !== null && typeof value.value === 'object' && typeof value.value[key] === 'string') return value.value[key]
  invalid()
}

function privatePhone(value) {
  if (typeof value !== 'string' || !PHONE_PATTERN.test(value)) invalid()
  return value
}

function privateEmail(value) {
  if (typeof value !== 'string' || [...value].length > 320 || value.normalize('NFC') !== value || value.toLowerCase() !== value || !EMAIL_PATTERN.test(value)) invalid()
  return value
}

function storedBoolean(value) {
  if (value === true || value === 1) return true
  if (value === false || value === 0) return false
  invalid()
}

function observationRange(firstValue, lastValue) {
  const firstSeenAt = nullableTimestamp(firstValue)
  const lastSeenAt = nullableTimestamp(lastValue)
  if ((firstSeenAt === null) !== (lastSeenAt === null) || (firstSeenAt !== null && firstSeenAt > lastSeenAt)) invalid()
  return Object.freeze({ firstSeenAt, lastSeenAt })
}

function contactRow(configuration, row) {
  const payload = decrypted(configuration, 'contact', field(row, 'ciphertext'))
  const kind = status(field(row, 'kind'), ['phone', 'email'])
  const value = privateText(payload, 'value')
  const chronology = observationRange(field(row, 'firstSeenAt'), field(row, 'lastSeenAt'))
  return Object.freeze({ kind, value: kind === 'phone' ? privatePhone(value) : privateEmail(value), mask: text(field(row, 'mask')), isPrimary: storedBoolean(field(row, 'isPrimary')), sourceName: sourceName(field(row, 'sourceName'), CONTACT_SOURCE_NAMES), ...chronology })
}

function nameRow(configuration, row, patientLastSeenAt) {
  const payload = decrypted(configuration, 'name_history', field(row, 'lastNameCiphertext'))
  const reason = status(field(row, 'reason'), NAME_HISTORY_REASONS)
  const observedAt = nullableTimestamp(field(row, 'observedAt'))
  if (reason === 'surname_change' && (observedAt === null || patientLastSeenAt === null || observedAt >= patientLastSeenAt)) invalid()
  return Object.freeze({ lastName: privateText(payload, 'lastName'), reason, sourceName: sourceName(field(row, 'sourceName'), IMPORT_SOURCE_NAMES), observedAt })
}

function identifierRow(configuration, row) {
  const payload = decrypted(configuration, 'external_identifier', field(row, 'ciphertext'))
  return Object.freeze({ system: status(field(row, 'system'), ['medesk_ehr', 'clinic_card', 'legacy_system']), value: privateText(payload, 'value'), isPrimary: storedBoolean(field(row, 'isPrimary')), sourceName: sourceName(field(row, 'sourceName'), IMPORT_SOURCE_NAMES), sourceRow: count(field(row, 'sourceRow')) })
}

function consentRow(row) {
  return Object.freeze({ type: status(field(row, 'type'), ['sms_notifications']), status: status(field(row, 'status'), ['granted', 'not_granted']), sourceName: sourceName(field(row, 'sourceName'), IMPORT_SOURCE_NAMES), observedAt: nullableTimestamp(field(row, 'observedAt')) })
}

function revealedAttachment(configuration, row) {
  const url = field(row, 'urlCiphertext') === null ? null : unwrapped(decrypted(configuration, 'attachment', field(row, 'urlCiphertext')))
  const metadata = field(row, 'metadataCiphertext') === null ? null : unwrapped(decrypted(configuration, 'attachment', field(row, 'metadataCiphertext')))
  return Object.freeze({ id: uuid(field(row, 'id'), 'Patient attachment ID'), kind: status(field(row, 'kind'), ATTACHMENT_KINDS), url, metadata, sourceName: sourceName(field(row, 'sourceName'), ATTACHMENT_SOURCE_NAMES), createdAt: timestamp(field(row, 'createdAt')) })
}

function revealedVisit(configuration, row) {
  const appointmentCiphertext = field(row, 'appointmentIdCiphertext')
  const doctorCiphertext = field(row, 'doctorCiphertext')
  const detailsCiphertext = field(row, 'detailsCiphertext')
  const appointmentId = appointmentCiphertext === null ? null : privateText(decrypted(configuration, 'visit_details', appointmentCiphertext), 'appointmentId')
  const doctor = doctorCiphertext === null ? null : privateText(decrypted(configuration, 'visit_details', doctorCiphertext), 'doctor')
  const details = detailsCiphertext === null ? null : unwrapped(decrypted(configuration, 'visit_details', detailsCiphertext))
  if (details !== null && (typeof details !== 'object' || Array.isArray(details))) invalid()
  return Object.freeze({ id: uuid(field(row, 'id'), 'Historical visit ID'), appointmentId, doctor, details })
}

async function selectedRows(transaction, sql, patientId) {
  return rows(await transaction.execute({ sql, args: [patientId] }))
}

async function selectedRevealRows(transaction, sql, patientId, state) {
  const values = await selectedRows(transaction, sql, patientId)
  state.rows += values.length
  if (state.rows > MAX_REVEAL_CHILDREN) invalid()
  return values
}

async function reveal(configuration, value) {
  const input = record(value, REVEAL_KEYS, ACCESS_KEYS, 'Patient history reveal')
  const id = uuid(input.id)
  const accessActor = actor(input.actor)
  if (input.reason !== undefined && (typeof input.reason !== 'string' || input.reason.normalize('NFC') !== input.reason || !REASON_PATTERN.test(input.reason))) throw new TypeError('Patient history reveal reason is invalid')
  const reason = input.reason ?? null
  return storage(() => inTransaction(configuration, async (transaction) => {
    const patientRows = await selectedRows(transaction, 'SELECT id, profileCiphertext, firstSeenAt, lastSeenAt, piiDestroyedAt FROM Patient WHERE id = ? LIMIT 2', id)
    if (patientRows.length === 0) invalid('PATIENT_NOT_FOUND')
    if (patientRows.length !== 1 || uuid(field(patientRows[0], 'id')) !== id) invalid()
    if (field(patientRows[0], 'piiDestroyedAt') !== null) invalid('PATIENT_PII_DESTROYED')
    const patientChronology = observationRange(field(patientRows[0], 'firstSeenAt'), field(patientRows[0], 'lastSeenAt'))
    const profileCiphertext = field(patientRows[0], 'profileCiphertext')
    if (typeof profileCiphertext !== 'string') invalid()
    const profile = decryptPatientProfile({ envelope: profileCiphertext, key: configuration.encryptionKey })
    const revealState = { rows: 0 }
    const contactRows = await selectedRevealRows(transaction, 'SELECT kind, ciphertext, mask, isPrimary, sourceName, firstSeenAt, lastSeenAt FROM PatientContact WHERE patientId = ? AND piiDestroyedAt IS NULL ORDER BY kind, isPrimary DESC, id LIMIT 1001', id, revealState)
    const nameRows = await selectedRevealRows(transaction, 'SELECT lastNameCiphertext, sourceName, observedAt, reason FROM PatientNameHistory WHERE patientId = ? AND piiDestroyedAt IS NULL ORDER BY observedAt DESC, id LIMIT 1001', id, revealState)
    const identifierRows = await selectedRevealRows(transaction, 'SELECT system, ciphertext, isPrimary, sourceName, sourceRow FROM PatientExternalIdentifier WHERE patientId = ? ORDER BY system, isPrimary DESC, sourceName, sourceRow, id LIMIT 1001', id, revealState)
    const privateRows = await selectedRevealRows(transaction, 'SELECT profileCiphertext FROM PatientPrivateData WHERE patientId = ? AND piiDestroyedAt IS NULL LIMIT 2', id, revealState)
    if (privateRows.length > 1) invalid()
    const privateData = privateRows.length === 0 ? Object.freeze({}) : unwrapped(decrypted(configuration, 'private_profile', field(privateRows[0], 'profileCiphertext')))
    if (privateData === null || typeof privateData !== 'object' || Array.isArray(privateData)) invalid()
    const consentRows = await selectedRevealRows(transaction, 'SELECT type, status, sourceName, observedAt FROM PatientConsent WHERE patientId = ? ORDER BY type, id LIMIT 1001', id, revealState)
    const attachmentRows = await selectedRevealRows(transaction, 'SELECT id, kind, urlCiphertext, metadataCiphertext, sourceName, createdAt FROM PatientAttachment WHERE patientId = ? AND piiDestroyedAt IS NULL AND deletedAt IS NULL ORDER BY createdAt DESC, id LIMIT 1001', id, revealState)
    const historicalVisitRows = await selectedRevealRows(transaction, 'SELECT id, appointmentIdCiphertext, doctorCiphertext, detailsCiphertext FROM HistoricalVisit WHERE patientId = ? AND piiDestroyedAt IS NULL ORDER BY startsAt DESC NULLS FIRST, sourceName, sourceRow, id LIMIT 1001', id, revealState)
    const contacts = Object.freeze(contactRows.map((row) => contactRow(configuration, row)))
    const previousLastNames = Object.freeze(nameRows.map((row) => nameRow(configuration, row, patientChronology.lastSeenAt)))
    const externalIdentifiers = Object.freeze(identifierRows.map((row) => identifierRow(configuration, row)))
    const consents = Object.freeze(consentRows.map(consentRow))
    const protectedAttachments = Object.freeze(attachmentRows.map((row) => revealedAttachment(configuration, row)))
    const historicalVisits = Object.freeze(historicalVisitRows.map((row) => revealedVisit(configuration, row)))
    const revealedAt = currentTime(configuration)
    await transaction.execute({ sql: 'INSERT INTO PatientAccess (id, patientId, action, actor, createdAt, reason) VALUES (?, ?, ?, ?, ?, ?)', args: [nextUuid(configuration), id, 'reveal_full', accessActor, revealedAt, reason] })
    return Object.freeze({ id, patientLastSeenAt: patientChronology.lastSeenAt, profile, contacts, previousLastNames, externalIdentifiers, privateData, consents, attachments: protectedAttachments, historicalVisits, revealedAt })
  }))
}

async function clearPatientHistory(transaction, id, destroyedAt) {
  const visitIds = 'SELECT id FROM HistoricalVisit WHERE patientId = ? UNION SELECT historicalVisitId FROM HistoricalVisitCandidate WHERE patientId = ?'
  await transaction.execute({ sql: 'DELETE FROM PatientExternalIdentifier WHERE patientId = ?', args: [id] })
  await transaction.execute({ sql: 'UPDATE PatientContact SET ciphertext = NULL, fingerprint = NULL, mask = NULL, piiDestroyedAt = COALESCE(piiDestroyedAt, ?) WHERE patientId = ?', args: [destroyedAt, id] })
  await transaction.execute({ sql: 'UPDATE PatientNameHistory SET lastNameCiphertext = NULL, lastNameFingerprint = NULL, sourceIdentifierCiphertext = NULL, piiDestroyedAt = COALESCE(piiDestroyedAt, ?) WHERE patientId = ?', args: [destroyedAt, id] })
  await transaction.execute({ sql: 'UPDATE PatientPrivateData SET profileCiphertext = NULL, piiDestroyedAt = COALESCE(piiDestroyedAt, ?), updatedAt = max(updatedAt, ?) WHERE patientId = ?', args: [destroyedAt, destroyedAt, id] })
  await transaction.execute({ sql: 'UPDATE PatientAttachment SET urlCiphertext = NULL, metadataCiphertext = NULL, piiDestroyedAt = COALESCE(piiDestroyedAt, ?) WHERE patientId = ?', args: [destroyedAt, id] })
  await transaction.execute({ sql: `UPDATE ImportSourceRow SET payloadCiphertext = NULL, payloadHash = 'destroyed', piiDestroyedAt = COALESCE(piiDestroyedAt, ?) WHERE patientId = ? OR historicalVisitId IN (${visitIds})`, args: [destroyedAt, id, id, id] })
  await transaction.execute({ sql: `UPDATE ImportIssue SET candidatesCiphertext = NULL, detailsCiphertext = NULL WHERE patientId = ? OR historicalVisitId IN (${visitIds})`, args: [id, id, id] })
  await transaction.execute({ sql: `UPDATE HistoricalInvoice SET payloadCiphertext = NULL, piiDestroyedAt = COALESCE(piiDestroyedAt, ?) WHERE historicalVisitId IN (${visitIds})`, args: [destroyedAt, id, id] })
  await transaction.execute({ sql: `UPDATE HistoricalVisit SET appointmentIdCiphertext = NULL, appointmentIdFingerprint = NULL, doctorCiphertext = NULL, detailsCiphertext = NULL, piiDestroyedAt = COALESCE(piiDestroyedAt, ?) WHERE id IN (${visitIds})`, args: [destroyedAt, id, id] })
}

async function phoneFingerprints(transaction, id) {
  const patientRows = await selectedRows(transaction, 'SELECT phoneFingerprint FROM Patient WHERE id = ? AND phoneFingerprint IS NOT NULL LIMIT 1', id)
  const contactRows = await selectedRows(transaction, "SELECT fingerprint FROM PatientContact WHERE patientId = ? AND kind = 'phone' AND fingerprint IS NOT NULL AND piiDestroyedAt IS NULL", id)
  return [...patientRows.map((row) => field(row, 'phoneFingerprint')), ...contactRows.map((row) => field(row, 'fingerprint'))].filter((value) => typeof value === 'string')
}

async function destroy(configuration, value) {
  const input = record(value, ACCESS_KEYS, ACCESS_KEYS, 'Patient history destruction')
  const id = uuid(input.id)
  const accessActor = actor(input.actor)
  return storage(() => inTransaction(configuration, async (transaction) => {
    const patientRows = await selectedRows(transaction, 'SELECT id, piiDestroyedAt FROM Patient WHERE id = ? LIMIT 2', id)
    if (patientRows.length === 0) invalid('PATIENT_NOT_FOUND')
    if (patientRows.length !== 1 || uuid(field(patientRows[0], 'id')) !== id) invalid()
    const previous = field(patientRows[0], 'piiDestroyedAt')
    const destroyedAt = previous === null ? currentTime(configuration) : timestamp(previous)
    const fingerprints = await phoneFingerprints(transaction, id)
    if (previous === null) {
      const updated = rows(await transaction.execute({ sql: 'UPDATE Patient SET profileCiphertext = NULL, phoneMask = NULL, phoneFingerprint = NULL, piiDestroyedAt = ?, updatedAt = max(updatedAt, ?) WHERE id = ? AND piiDestroyedAt IS NULL RETURNING id', args: [destroyedAt, destroyedAt, id] }))
      if (updated.length !== 1 || uuid(field(updated[0], 'id')) !== id) invalid()
    }
    await clearPatientHistory(transaction, id, destroyedAt)
    await purgeMangoCalls(transaction, { patientId: id, fingerprints, destroyedAt, actor: accessActor, nextUuid: () => nextUuid(configuration) })
    if (previous === null) await transaction.execute({ sql: 'INSERT INTO PatientAccess (id, patientId, action, actor, createdAt) VALUES (?, ?, ?, ?, ?)', args: [nextUuid(configuration), id, 'destroy', accessActor, destroyedAt] })
    return Object.freeze({ id, destroyedAt, alreadyDestroyed: previous !== null })
  }))
}

/** Creates the immutable repository boundary for protected imported patient history. */
export function createPatientHistoryRecords(value) {
  const configuration = normalizeFactory(value)
  return Object.freeze({ summaries: (input) => summaries(configuration, input), visits: (input) => visits(configuration, input), issues: (input) => issues(configuration, input), attachments: (input) => attachments(configuration, input), linkIssues: (input) => linkIssues(configuration, input), reveal: (input) => reveal(configuration, input), destroy: (input) => destroy(configuration, input) })
}
