import { randomUUID } from 'node:crypto'
import { decryptContactPhone, encryptContactPhone, fingerprintContactPhone, maskContactPhone, normalizeContactPhone } from './contact-identity.js'

const FACTORY_KEYS = Object.freeze(['client', 'fingerprintKey', 'encryptionKey', 'clock', 'uuid'])
const LIVE_KEYS = Object.freeze(['kind', 'entryId', 'callId', 'seq', 'state', 'location', 'eventAt', 'callerPhone', 'lineNumber', 'operatorExtension', 'disconnectReason'])
const FINAL_KEYS = Object.freeze(['kind', 'entryId', 'status', 'callerPhone', 'lineNumber', 'operatorExtension', 'startedAt', 'forwardedAt', 'answeredAt', 'endedAt', 'waitSeconds', 'talkSeconds', 'disconnectReason', 'finalizedAt'])
const REMOVE_KEYS = Object.freeze(['kind', 'entryId'])
const IGNORE_KEYS = Object.freeze(['kind', 'reason', 'entryId'])
const LIST_KEYS = Object.freeze(['page', 'pageSize', 'status', 'lineNumber', 'operatorExtension', 'patientId', 'from', 'to'])
const RANGE_KEYS = Object.freeze(['from', 'to'])
const ENTRY_KEYS = Object.freeze(['entryId'])
const ACCESS_KEYS = Object.freeze(['entryId', 'actor'])
const LIVE_STATES = new Set(['ringing', 'queued', 'connected', 'on_hold', 'finalizing'])
const FINAL_STATES = new Set(['answered', 'missed'])
const ALL_STATES = new Set([...LIVE_STATES, ...FINAL_STATES])
const LOCATIONS = new Set(['ivr', 'queue', 'abonent'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ACTOR_PATTERN = /^v1:[0-9a-f]{64}$/
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const PUBLIC_COLUMNS = Object.freeze(['entryId', 'patientId', 'status', 'callerMask', 'repeatCaller', 'lineNumber', 'operatorExtension', 'startedAt', 'forwardedAt', 'answeredAt', 'endedAt', 'waitSeconds', 'talkSeconds', 'disconnectReason', 'finalizedAt', 'createdAt', 'updatedAt', 'piiDestroyedAt'])
const SELECT_PUBLIC = PUBLIC_COLUMNS.join(', ')
const ERROR_MESSAGES = Object.freeze({ CALL_NOT_FOUND: 'Call record was not found', CALL_PII_DESTROYED: 'Call personal data has been destroyed', CALL_CONFLICT: 'Call identity conflicts with stored data', CALL_STORAGE_INVARIANT: 'Call storage contains an invalid record' })
const MAX_STORAGE_ROWS = 1_000
const MAX_STORAGE_COLUMNS = 128
let localWriteQueue = Promise.resolve()

/**
 * Represents a safe call-record failure without exposing protected contact data.
 */
export class MangoCallRecordError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(ERROR_MESSAGES, code) ? code : 'CALL_STORAGE_INVARIANT'
    super(ERROR_MESSAGES[safeCode])
    this.name = 'MangoCallRecordError'
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
  if (value === null || typeof value !== 'object' || typeof value.execute !== 'function' || typeof value.transaction !== 'function') throw new TypeError('MANGO call client must provide execute and transaction operations')
  return value
}

function normalizeFactory(input) {
  const options = readRecord(input, FACTORY_KEYS, ['client', 'fingerprintKey', 'encryptionKey'], 'MANGO call record options')
  const clock = options.clock === undefined ? () => new Date() : options.clock
  const uuid = options.uuid === undefined ? randomUUID : options.uuid
  if (typeof options.fingerprintKey !== 'string' || typeof options.encryptionKey !== 'string' || typeof clock !== 'function' || typeof uuid !== 'function') throw new TypeError('MANGO call security and runtime adapters are invalid')
  return Object.freeze({ client: normalizeClient(options.client), fingerprintKey: options.fingerprintKey, encryptionKey: options.encryptionKey, clock, uuid })
}

function prohibitedTextCharacter(value) {
  const code = value.codePointAt(0)
  return code <= 31 || code === 127
}

function identifier(value, scope) {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0 || Buffer.byteLength(value, 'utf8') > 128 || [...value].some(prohibitedTextCharacter)) throw new TypeError(`${scope} must be bounded text`)
  return value
}

function nullableText(value, scope, pattern) {
  if (value === null) return null
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0 || Buffer.byteLength(value, 'utf8') > 128 || [...value].some(prohibitedTextCharacter) || (pattern && !pattern.test(value))) throw new TypeError(`${scope} must be bounded text`)
  return value
}

function timestamp(value, scope, nullable = false) {
  if (nullable && value === null) return null
  if (typeof value !== 'string' || !TIMESTAMP_PATTERN.test(value) || !Number.isFinite(Date.parse(value))) throw new TypeError(`${scope} must be a UTC timestamp`)
  return value
}

function currentTime(configuration) {
  const value = configuration.clock()
  if (!(value instanceof Date) || !Number.isFinite(Date.prototype.getTime.call(value))) throw new TypeError('MANGO call clock must return a valid Date')
  return timestamp(new Date(Date.prototype.getTime.call(value)).toISOString(), 'MANGO call clock')
}

function nextUuid(configuration) {
  const value = configuration.uuid()
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new TypeError('MANGO call access ID must be a UUID')
  return value.toLowerCase()
}

function positiveInteger(value, scope, allowZero = false) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1) || value > 86_400) throw new TypeError(`${scope} must be a bounded integer`)
  return value
}

function sequenceNumber(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError('MANGO call sequence must be a positive integer')
  return value
}

function storedValue(value, key) {
  let descriptor
  try {
    descriptor = value === null || typeof value !== 'object' ? undefined : Object.getOwnPropertyDescriptor(value, key)
  } catch {
    throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  }
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  return descriptor.value
}

function storedRow(value) {
  let keys
  try {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
    keys = Reflect.ownKeys(value)
  } catch {
    throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  }
  if (keys.length > MAX_STORAGE_COLUMNS || keys.some((key) => typeof key !== 'string')) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  const result = Object.create(null)
  for (const key of keys) Object.defineProperty(result, key, { configurable: false, enumerable: true, value: storedValue(value, key), writable: false })
  return Object.freeze(result)
}

function readRows(result) {
  const rows = storedValue(result, 'rows')
  let rowsAreArray
  try {
    rowsAreArray = Array.isArray(rows)
  } catch {
    throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  }
  if (!rowsAreArray) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  const length = storedValue(rows, 'length')
  if (!Number.isSafeInteger(length) || length < 0 || length > MAX_STORAGE_ROWS) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  let keys
  try {
    keys = Reflect.ownKeys(rows)
  } catch {
    throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  }
  if (keys.length !== length + 1 || !keys.includes('length')) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  return Object.freeze(Array.from({ length }, (_value, index) => storedRow(storedValue(rows, String(index)))))
}

function storedUuid(value) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  return value.toLowerCase()
}

function booleanOrNull(value) {
  if (value === null) return null
  if (value === true || value === 1) return true
  if (value === false || value === 0) return false
  throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
}

function integerOrNull(value) {
  if (value === null) return null
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 0 || number > 86_400) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  return number
}

function publicCall(input) {
  if (input === null || typeof input !== 'object' || !PUBLIC_COLUMNS.every((key) => Object.hasOwn(input, key))) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  const result = { entryId: identifier(input.entryId, 'Stored call ID'), patientId: input.patientId === null ? null : storedUuid(input.patientId), status: input.status, callerMask: input.callerMask, repeatCaller: booleanOrNull(input.repeatCaller), lineNumber: normalizeContactPhone(input.lineNumber), operatorExtension: input.operatorExtension, startedAt: timestamp(input.startedAt, 'Stored call start'), forwardedAt: timestamp(input.forwardedAt, 'Stored call forward', true), answeredAt: timestamp(input.answeredAt, 'Stored call answer', true), endedAt: timestamp(input.endedAt, 'Stored call end', true), waitSeconds: integerOrNull(input.waitSeconds), talkSeconds: integerOrNull(input.talkSeconds), disconnectReason: input.disconnectReason, finalizedAt: timestamp(input.finalizedAt, 'Stored call finalization', true), createdAt: timestamp(input.createdAt, 'Stored call creation'), updatedAt: timestamp(input.updatedAt, 'Stored call update'), piiDestroyedAt: timestamp(input.piiDestroyedAt, 'Stored call PII destruction', true) }
  if (!ALL_STATES.has(result.status) || (result.piiDestroyedAt === null && (typeof result.callerMask !== 'string' || result.repeatCaller === null)) || (result.piiDestroyedAt !== null && (result.callerMask !== null || result.repeatCaller !== null))) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  return Object.freeze(result)
}

function transientLock(error) {
  return error !== null && typeof error === 'object' && (error.code === 'SQLITE_BUSY' || error.rawCode === 5)
}

function retryPause(attempt) {
  return new Promise((resolve) => setTimeout(resolve, attempt * 10))
}

async function transactionAttempt(client, operation) {
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

async function inTransaction(client, operation) {
  let release
  const previous = localWriteQueue
  localWriteQueue = new Promise((resolve) => { release = resolve })
  await previous
  try {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        return await transactionAttempt(client, operation)
      } catch (error) {
        if (!transientLock(error) || attempt === 5) throw error
        await retryPause(attempt)
      }
    }
    throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  } finally {
    release()
  }
}

function protectCaller(configuration, phone) {
  const normalized = normalizeContactPhone(phone)
  return Object.freeze({ ciphertext: encryptContactPhone({ phone: normalized, key: configuration.encryptionKey }), mask: maskContactPhone(normalized), fingerprint: fingerprintContactPhone({ phone: normalized, key: configuration.fingerprintKey }) })
}

async function linkedPatient(executor, fingerprint) {
  const result = await executor.execute({ sql: 'SELECT DISTINCT p.id FROM Patient p LEFT JOIN PatientContact c ON c.patientId = p.id AND c.kind = ? AND c.fingerprint = ? AND c.piiDestroyedAt IS NULL WHERE p.piiDestroyedAt IS NULL AND (p.phoneFingerprint = ? OR c.id IS NOT NULL) ORDER BY p.id LIMIT 2', args: ['phone', fingerprint, fingerprint] })
  const ids = readRows(result).map((row) => storedUuid(storedValue(row, 'id')))
  if (new Set(ids).size !== ids.length) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  return ids.length === 1 ? ids[0] : null
}

async function repeatedCaller(executor, entryId, fingerprint) {
  const result = await executor.execute({ sql: 'SELECT 1 AS found FROM MangoCall WHERE callerFingerprint = ? AND entryId <> ? AND finalizedAt IS NOT NULL AND piiDestroyedAt IS NULL LIMIT 1', args: [fingerprint, entryId] })
  return readRows(result).length > 0
}

function liveCommand(raw) {
  const input = readRecord(raw, LIVE_KEYS, LIVE_KEYS, 'MANGO live persistence command')
  if (input.kind !== 'apply_live' || !LIVE_STATES.has(input.state) || !LOCATIONS.has(input.location)) throw new TypeError('MANGO live persistence command is invalid')
  return Object.freeze({ ...input, entryId: identifier(input.entryId, 'MANGO entry ID'), callId: identifier(input.callId, 'MANGO call ID'), seq: sequenceNumber(input.seq), eventAt: timestamp(input.eventAt, 'MANGO live event time'), callerPhone: normalizeContactPhone(input.callerPhone), lineNumber: normalizeContactPhone(input.lineNumber), operatorExtension: nullableText(input.operatorExtension, 'MANGO operator extension', /^[0-9]{1,32}$/), disconnectReason: nullableText(input.disconnectReason, 'MANGO disconnect reason') })
}

function finalCommand(raw) {
  const input = readRecord(raw, FINAL_KEYS, FINAL_KEYS, 'MANGO summary persistence command')
  if (input.kind !== 'finalize' || !FINAL_STATES.has(input.status)) throw new TypeError('MANGO summary persistence command is invalid')
  const result = { ...input, entryId: identifier(input.entryId, 'MANGO entry ID'), callerPhone: normalizeContactPhone(input.callerPhone), lineNumber: normalizeContactPhone(input.lineNumber), operatorExtension: nullableText(input.operatorExtension, 'MANGO operator extension', /^[0-9]{1,32}$/), startedAt: timestamp(input.startedAt, 'MANGO call start'), forwardedAt: timestamp(input.forwardedAt, 'MANGO call forward', true), answeredAt: timestamp(input.answeredAt, 'MANGO call answer', true), endedAt: timestamp(input.endedAt, 'MANGO call end'), waitSeconds: positiveInteger(input.waitSeconds, 'MANGO wait duration', true), talkSeconds: positiveInteger(input.talkSeconds, 'MANGO talk duration', true), disconnectReason: nullableText(input.disconnectReason, 'MANGO disconnect reason'), finalizedAt: timestamp(input.finalizedAt, 'MANGO call finalization') }
  if ((result.status === 'answered') !== (result.answeredAt !== null) || result.endedAt !== result.finalizedAt || result.startedAt > result.endedAt) throw new TypeError('MANGO summary persistence command is inconsistent')
  return Object.freeze(result)
}

async function selectAggregate(executor, entryId) {
  const result = await executor.execute({ sql: 'SELECT entryId, callerFingerprint, lineNumber, finalizedAt, piiDestroyedAt FROM MangoCall WHERE entryId = ? LIMIT 2', args: [entryId] })
  const rows = readRows(result)
  if (rows.length > 1) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  return rows[0] ?? null
}

function assertAggregateIdentity(row, identity, lineNumber) {
  if (row.piiDestroyedAt === null && row.callerFingerprint !== identity.fingerprint) throw new MangoCallRecordError('CALL_CONFLICT')
  if (row.lineNumber !== lineNumber) throw new MangoCallRecordError('CALL_CONFLICT')
}

async function insertLiveAggregate(configuration, executor, command, identity, now) {
  const patientId = await linkedPatient(executor, identity.fingerprint)
  const repeated = await repeatedCaller(executor, command.entryId, identity.fingerprint)
  await executor.execute({ sql: 'INSERT INTO MangoCall (entryId, patientId, status, callerCiphertext, callerMask, callerFingerprint, repeatCaller, lineNumber, operatorExtension, startedAt, forwardedAt, answeredAt, endedAt, waitSeconds, talkSeconds, disconnectReason, finalizedAt, createdAt, updatedAt, piiDestroyedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [command.entryId, patientId, command.state, identity.ciphertext, identity.mask, identity.fingerprint, repeated, command.lineNumber, command.operatorExtension, command.eventAt, null, null, null, null, null, command.disconnectReason, null, now, now, null] })
}

async function applyLive(configuration, raw) {
  const command = liveCommand(raw)
  const identity = protectCaller(configuration, command.callerPhone)
  const now = currentTime(configuration)
  return inTransaction(configuration.client, async (executor) => {
    const aggregate = await selectAggregate(executor, command.entryId)
    if (aggregate !== null) {
      assertAggregateIdentity(aggregate, identity, command.lineNumber)
      if (aggregate.finalizedAt !== null) return Object.freeze({ outcome: 'stale', entryId: command.entryId })
    } else await insertLiveAggregate(configuration, executor, command, identity, now)
    const applied = await executor.execute({ sql: 'INSERT INTO MangoCallLeg (callId, entryId, maxSeq, state, location, extension, eventAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(callId) DO UPDATE SET maxSeq = excluded.maxSeq, state = excluded.state, location = excluded.location, extension = excluded.extension, eventAt = excluded.eventAt, updatedAt = max(MangoCallLeg.updatedAt, excluded.updatedAt) WHERE MangoCallLeg.entryId = excluded.entryId AND excluded.maxSeq > MangoCallLeg.maxSeq RETURNING maxSeq', args: [command.callId, command.entryId, command.seq, command.state, command.location, command.operatorExtension, command.eventAt, now, now] })
    if (readRows(applied).length === 0) {
      const stored = await executor.execute({ sql: 'SELECT entryId, maxSeq FROM MangoCallLeg WHERE callId = ? LIMIT 2', args: [command.callId] })
      const rows = readRows(stored)
      if (rows.length !== 1 || rows[0].entryId !== command.entryId) throw new MangoCallRecordError('CALL_CONFLICT')
      return Object.freeze({ outcome: Number(rows[0].maxSeq) === command.seq ? 'duplicate' : 'stale', entryId: command.entryId })
    }
    const latest = await executor.execute({ sql: 'SELECT state, extension, eventAt FROM MangoCallLeg WHERE entryId = ? ORDER BY eventAt DESC, maxSeq DESC, callId DESC LIMIT 1', args: [command.entryId] })
    const row = readRows(latest)[0]
    if (!row) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
    const updated = await executor.execute({ sql: 'UPDATE MangoCall SET status = ?, operatorExtension = coalesce(?, operatorExtension), disconnectReason = coalesce(?, disconnectReason), startedAt = min(startedAt, ?), updatedAt = max(updatedAt, ?) WHERE entryId = ? AND finalizedAt IS NULL RETURNING entryId', args: [row.state, row.extension, row.eventAt === command.eventAt ? command.disconnectReason : null, command.eventAt, now, command.entryId] })
    if (readRows(updated).length !== 1) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
    return Object.freeze({ outcome: 'applied', entryId: command.entryId })
  })
}

async function finalize(configuration, raw) {
  const command = finalCommand(raw)
  const identity = protectCaller(configuration, command.callerPhone)
  const now = currentTime(configuration)
  return inTransaction(configuration.client, async (executor) => {
    const aggregate = await selectAggregate(executor, command.entryId)
    if (aggregate?.finalizedAt !== null && aggregate !== null) {
      assertAggregateIdentity(aggregate, identity, command.lineNumber)
      return Object.freeze({ outcome: 'duplicate', entryId: command.entryId })
    }
    if (aggregate !== null) assertAggregateIdentity(aggregate, identity, command.lineNumber)
    const destroyed = aggregate?.piiDestroyedAt !== null && aggregate !== null
    const patientId = destroyed ? null : await linkedPatient(executor, identity.fingerprint)
    const repeated = destroyed ? null : await repeatedCaller(executor, command.entryId, identity.fingerprint)
    if (aggregate === null) await executor.execute({ sql: 'INSERT INTO MangoCall (entryId, patientId, status, callerCiphertext, callerMask, callerFingerprint, repeatCaller, lineNumber, operatorExtension, startedAt, forwardedAt, answeredAt, endedAt, waitSeconds, talkSeconds, disconnectReason, finalizedAt, createdAt, updatedAt, piiDestroyedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [command.entryId, patientId, command.status, identity.ciphertext, identity.mask, identity.fingerprint, repeated, command.lineNumber, command.operatorExtension, command.startedAt, command.forwardedAt, command.answeredAt, command.endedAt, command.waitSeconds, command.talkSeconds, command.disconnectReason, command.finalizedAt, now, now, null] })
    else {
      const updated = await executor.execute({ sql: 'UPDATE MangoCall SET patientId = ?, status = ?, callerCiphertext = CASE WHEN piiDestroyedAt IS NULL THEN ? ELSE NULL END, callerMask = CASE WHEN piiDestroyedAt IS NULL THEN ? ELSE NULL END, callerFingerprint = CASE WHEN piiDestroyedAt IS NULL THEN ? ELSE NULL END, repeatCaller = CASE WHEN piiDestroyedAt IS NULL THEN ? ELSE NULL END, lineNumber = ?, operatorExtension = ?, startedAt = ?, forwardedAt = ?, answeredAt = ?, endedAt = ?, waitSeconds = ?, talkSeconds = ?, disconnectReason = ?, finalizedAt = ?, updatedAt = max(updatedAt, ?) WHERE entryId = ? AND finalizedAt IS NULL RETURNING entryId', args: [patientId, command.status, identity.ciphertext, identity.mask, identity.fingerprint, repeated, command.lineNumber, command.operatorExtension, command.startedAt, command.forwardedAt, command.answeredAt, command.endedAt, command.waitSeconds, command.talkSeconds, command.disconnectReason, command.finalizedAt, now, command.entryId] })
      if (readRows(updated).length !== 1) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
    }
    return Object.freeze({ outcome: 'applied', entryId: command.entryId })
  })
}

async function removeNonInbound(configuration, raw) {
  const command = readRecord(raw, REMOVE_KEYS, REMOVE_KEYS, 'MANGO non-inbound cleanup command')
  if (command.kind !== 'remove_non_inbound') throw new TypeError('MANGO non-inbound cleanup command is invalid')
  const entryId = identifier(command.entryId, 'MANGO entry ID')
  return inTransaction(configuration.client, async (executor) => {
    const aggregate = await selectAggregate(executor, entryId)
    if (aggregate?.finalizedAt !== null && aggregate !== null) return Object.freeze({ outcome: 'stale', entryId })
    await executor.execute({ sql: 'DELETE FROM MangoCallLeg WHERE entryId = ?', args: [entryId] })
    await executor.execute({ sql: 'DELETE FROM MangoCall WHERE entryId = ? AND finalizedAt IS NULL', args: [entryId] })
    return Object.freeze({ outcome: 'removed', entryId })
  })
}

function ignored(raw) {
  const command = readRecord(raw, IGNORE_KEYS, IGNORE_KEYS, 'MANGO ignored persistence command')
  if (command.kind !== 'ignore') throw new TypeError('MANGO ignored persistence command is invalid')
  return Object.freeze({ outcome: 'ignored', entryId: identifier(command.entryId, 'MANGO entry ID') })
}

async function apply(configuration, raw) {
  if (raw === null || typeof raw !== 'object') throw new TypeError('MANGO persistence command must be an object')
  if (raw.kind === 'apply_live') return applyLive(configuration, raw)
  if (raw.kind === 'finalize') return finalize(configuration, raw)
  if (raw.kind === 'remove_non_inbound') return removeNonInbound(configuration, raw)
  if (raw.kind === 'ignore') return ignored(raw)
  throw new TypeError('MANGO persistence command kind is unsupported')
}

function page(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000_000) throw new TypeError('MANGO call page must be a positive bounded integer')
  return value
}

function pageSize(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError('MANGO call page size must be a positive integer')
  return Math.min(value, 50)
}

function filters(raw) {
  const input = readRecord(raw, LIST_KEYS, ['page', 'pageSize'], 'MANGO call list')
  const result = { page: page(input.page), pageSize: pageSize(input.pageSize), status: input.status, lineNumber: input.lineNumber, operatorExtension: input.operatorExtension, patientId: input.patientId, from: input.from, to: input.to }
  if (result.status !== undefined && !ALL_STATES.has(result.status)) throw new TypeError('MANGO call status filter is invalid')
  if (result.lineNumber !== undefined) result.lineNumber = normalizeContactPhone(result.lineNumber)
  if (result.operatorExtension !== undefined) result.operatorExtension = nullableText(result.operatorExtension, 'MANGO operator filter', /^[0-9]{1,32}$/)
  if (result.patientId !== undefined) result.patientId = identifier(result.patientId, 'MANGO patient filter')
  if (result.from !== undefined) result.from = timestamp(result.from, 'MANGO call range start')
  if (result.to !== undefined) result.to = timestamp(result.to, 'MANGO call range end')
  if (result.from !== undefined && result.to !== undefined && result.from >= result.to) throw new TypeError('MANGO call range is invalid')
  return result
}

function whereClause(input) {
  const clauses = []
  const args = []
  for (const [field, sql] of [['status', 'status = ?'], ['lineNumber', 'lineNumber = ?'], ['operatorExtension', 'operatorExtension = ?'], ['patientId', 'patientId = ?'], ['from', 'startedAt >= ?'], ['to', 'startedAt < ?']]) {
    if (input[field] !== undefined) {
      clauses.push(sql)
      args.push(input[field])
    }
  }
  return Object.freeze({ sql: clauses.length === 0 ? '' : ` WHERE ${clauses.join(' AND ')}`, args })
}

async function list(configuration, raw) {
  const input = filters(raw)
  const where = whereClause(input)
  const count = await configuration.client.execute({ sql: `SELECT COUNT(*) AS total FROM MangoCall${where.sql}`, args: where.args })
  const countRows = readRows(count)
  const total = Number(countRows[0]?.total)
  if (countRows.length !== 1 || !Number.isSafeInteger(total) || total < 0) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  const selected = await configuration.client.execute({ sql: `SELECT ${SELECT_PUBLIC} FROM MangoCall${where.sql} ORDER BY startedAt DESC, entryId LIMIT ? OFFSET ?`, args: [...where.args, input.pageSize, (input.page - 1) * input.pageSize] })
  const items = readRows(selected).map(publicCall)
  return Object.freeze({ items: Object.freeze(items), page: input.page, pageSize: input.pageSize, total, pages: total === 0 ? 0 : Math.ceil(total / input.pageSize) })
}

async function get(configuration, raw) {
  const input = readRecord(raw, ENTRY_KEYS, ENTRY_KEYS, 'MANGO call detail')
  const entryId = identifier(input.entryId, 'MANGO entry ID')
  const result = await configuration.client.execute({ sql: `SELECT ${SELECT_PUBLIC} FROM MangoCall WHERE entryId = ? LIMIT 2`, args: [entryId] })
  const rows = readRows(result).map(publicCall)
  if (rows.length === 0) throw new MangoCallRecordError('CALL_NOT_FOUND')
  if (rows.length !== 1) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  return rows[0]
}

async function metrics(configuration, raw) {
  const input = readRecord(raw, RANGE_KEYS, RANGE_KEYS, 'MANGO call metrics')
  const from = timestamp(input.from, 'MANGO call range start')
  const to = timestamp(input.to, 'MANGO call range end')
  if (from >= to) throw new TypeError('MANGO call range is invalid')
  const result = await configuration.client.execute({ sql: "SELECT COUNT(*) AS incoming, SUM(CASE WHEN status IN ('ringing', 'queued', 'connected', 'on_hold', 'finalizing') THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status = 'answered' THEN 1 ELSE 0 END) AS answered, SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) AS missed, AVG(CASE WHEN status IN ('answered', 'missed') THEN waitSeconds END) AS averageWait, AVG(CASE WHEN status IN ('answered', 'missed') THEN talkSeconds END) AS averageTalk FROM MangoCall WHERE startedAt >= ? AND startedAt < ?", args: [from, to] })
  const rows = readRows(result)
  if (rows.length !== 1) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
  const incoming = Number(rows[0].incoming ?? 0)
  const active = Number(rows[0].active ?? 0)
  const answered = Number(rows[0].answered ?? 0)
  const missed = Number(rows[0].missed ?? 0)
  const final = answered + missed
  const rounded = (value) => Math.round(Number(value ?? 0) * 10) / 10
  return Object.freeze({ active, incoming, answered, missed, answerRate: final === 0 ? 0 : rounded(answered * 100 / final), averageWaitSeconds: rounded(rows[0].averageWait), averageTalkSeconds: rounded(rows[0].averageTalk) })
}

function actor(value) {
  if (typeof value !== 'string' || !ACTOR_PATTERN.test(value)) throw new TypeError('MANGO call access actor must be a safe fingerprint')
  return value
}

async function reveal(configuration, raw) {
  const input = readRecord(raw, ACCESS_KEYS, ACCESS_KEYS, 'MANGO caller reveal')
  const entryId = identifier(input.entryId, 'MANGO entry ID')
  const accessActor = actor(input.actor)
  return inTransaction(configuration.client, async (executor) => {
    const selected = await executor.execute({ sql: 'SELECT callerCiphertext, piiDestroyedAt FROM MangoCall WHERE entryId = ? LIMIT 2', args: [entryId] })
    const rows = readRows(selected)
    if (rows.length === 0) throw new MangoCallRecordError('CALL_NOT_FOUND')
    if (rows.length !== 1) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
    if (rows[0].piiDestroyedAt !== null || rows[0].callerCiphertext === null) throw new MangoCallRecordError('CALL_PII_DESTROYED')
    const phone = decryptContactPhone({ envelope: rows[0].callerCiphertext, key: configuration.encryptionKey })
    const revealedAt = currentTime(configuration)
    await executor.execute({ sql: 'INSERT INTO MangoCallAccess (id, entryId, action, actor, createdAt) VALUES (?, ?, ?, ?, ?)', args: [nextUuid(configuration), entryId, 'reveal', accessActor, revealedAt] })
    return Object.freeze({ entryId, phone, revealedAt })
  })
}

async function destroy(configuration, raw) {
  const input = readRecord(raw, ACCESS_KEYS, ACCESS_KEYS, 'MANGO caller destruction')
  const entryId = identifier(input.entryId, 'MANGO entry ID')
  const accessActor = actor(input.actor)
  return inTransaction(configuration.client, async (executor) => {
    const selected = await executor.execute({ sql: 'SELECT piiDestroyedAt FROM MangoCall WHERE entryId = ? LIMIT 2', args: [entryId] })
    const rows = readRows(selected)
    if (rows.length === 0) throw new MangoCallRecordError('CALL_NOT_FOUND')
    if (rows.length !== 1) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
    if (rows[0].piiDestroyedAt !== null) return Object.freeze({ entryId, destroyedAt: rows[0].piiDestroyedAt, alreadyDestroyed: true })
    const destroyedAt = currentTime(configuration)
    const updated = await executor.execute({ sql: 'UPDATE MangoCall SET patientId = NULL, callerCiphertext = NULL, callerMask = NULL, callerFingerprint = NULL, repeatCaller = NULL, piiDestroyedAt = ?, updatedAt = max(updatedAt, ?) WHERE entryId = ? AND piiDestroyedAt IS NULL RETURNING entryId', args: [destroyedAt, destroyedAt, entryId] })
    if (readRows(updated).length !== 1) throw new MangoCallRecordError('CALL_STORAGE_INVARIANT')
    await executor.execute({ sql: 'INSERT INTO MangoCallAccess (id, entryId, action, actor, createdAt) VALUES (?, ?, ?, ?, ?)', args: [nextUuid(configuration), entryId, 'destroy', accessActor, destroyedAt] })
    return Object.freeze({ entryId, destroyedAt, alreadyDestroyed: false })
  })
}

/**
 * Creates the transactional MANGO call boundary used by webhooks and admin flows.
 */
export function createMangoCallRecords(input) {
  const configuration = normalizeFactory(input)
  return Object.freeze({ apply: (raw) => apply(configuration, raw), list: (raw) => list(configuration, raw), get: (raw) => get(configuration, raw), metrics: (raw) => metrics(configuration, raw), reveal: (raw) => reveal(configuration, raw), destroy: (raw) => destroy(configuration, raw) })
}
