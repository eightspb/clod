import { createCipheriv, createDecipheriv, createHash, randomBytes as secureRandomBytes } from 'node:crypto'
import { constants } from 'node:fs'
import { link, lstat, open, realpath, unlink } from 'node:fs/promises'
import { basename, dirname, isAbsolute, isAbsolute as pathIsAbsolute, join, relative, sep } from 'node:path'
import { decryptPatientProfile, encryptImportedPatientProfile, normalizeImportedPatientProfile } from './contact-identity.js'
import { decryptProtectedData, encryptProtectedData } from './protected-patient-data.js'

const VERSION = 1
const ALGORITHM = 'aes-256-gcm'
const STAGE_DOMAIN = 'clod.clinic-import-stage'
const SHA256_PATTERN = /^[a-f0-9]{64}$/
const BASE64_KEY_PATTERN = /^[A-Za-z0-9+/]{43}=$/
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const FINGERPRINT_PATTERN = /^v1:[a-f0-9]{64}$/
const MAX_STAGE_BYTES = 192 * 1024 * 1024
const MAX_DATABASE_BYTES = 8 * 1024 * 1024 * 1024
const READ_CHUNK_BYTES = 1024 * 1024
const MAX_ARRAY_LENGTH = 500_000
const MAX_KEYS = 256
const MAX_DEPTH = 64
const MAX_NODES = 5_000_000
const MAX_AGGREGATE_INPUT_WORK = MAX_STAGE_BYTES
const MAX_CANDIDATES_PER_VISIT = 2_048
const MAX_TOTAL_CANDIDATES = 20_000
const ERROR_CODES = new Set(['DATABASE_CHANGED', 'INPUT_TOO_COMPLEX', 'INVALID_STAGE_INPUT', 'INVALID_STAGE_PATH', 'STAGE_CLEANUP_FAILED', 'STAGE_INTEGRITY_FAILED', 'STAGE_WRITE_FAILED'])
const MAGIC_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const BUNDLE_COLLECTIONS = Object.freeze(['patients', 'externalIdentifiers', 'contacts', 'nameHistory', 'privateData', 'consents', 'sourceLinks', 'historicalVisits', 'visitDetails', 'visitCandidates', 'identityIssues', 'visitIssues', 'normalizationIssues', 'sourceRows', 'invoices', 'attachments'])
const SOURCE_CONTRACTS = Object.freeze([
  Object.freeze({ role: 'pd', filename: '544663c3807aab090001bad8PD.csv', parsingMode: 'strict' }),
  Object.freeze({ role: 'patients', filename: '544663c3807aab090001bad8_patients.csv', parsingMode: 'strict' }),
  Object.freeze({ role: 'visits', filename: '544663c3807aab090001bad8_visits.csv', parsingMode: 'legacy_physical_rows' }),
  Object.freeze({ role: 'invoices', filename: '544663c3807aab090001bad8_invoices.csv', parsingMode: 'strict' }),
  Object.freeze({ role: 'pdWorkbook', filename: '544663c3807aab090001bad8PD — копия.xlsx', parsingMode: 'strict' }),
  Object.freeze({ role: 'medesk', filename: 'medesk.csv', parsingMode: 'strict' }),
  Object.freeze({ role: 'legacyPatients', filename: 'Vse pacienty.xlsx', parsingMode: 'strict' })
])
const SOURCE_NAMES = new Set(SOURCE_CONTRACTS.map(({ filename }) => filename))
const COLLECTION_KEYS = Object.freeze({
  patients: Object.freeze(['id', 'profile', 'firstSeenAt', 'lastSeenAt', 'isSupplemental']),
  externalIdentifiers: Object.freeze(['id', 'patientId', 'system', 'value', 'fingerprint', 'globalFingerprint', 'identityKey', 'isPrimary', 'source', 'sources']),
  contacts: Object.freeze(['id', 'patientId', 'kind', 'value', 'fingerprint', 'mask', 'isPrimary', 'source', 'sources', 'firstSeenAt', 'lastSeenAt']),
  nameHistory: Object.freeze(['id', 'patientId', 'lastName', 'source', 'sourceIdentifier', 'observedAt', 'reason']),
  privateData: Object.freeze(['id', 'patientId', 'value', 'sources']),
  consents: Object.freeze(['id', 'patientId', 'type', 'status', 'observedAt', 'source']),
  sourceLinks: Object.freeze(['id', 'patientId', 'source', 'kind']),
  historicalVisits: Object.freeze(['id', 'sourceName', 'sourceRow', 'patientId', 'appointmentIdFingerprint', 'startsAt', 'endsAt', 'sourceStatus', 'linkStatus', 'linkMethod', 'evidenceLevel', 'issueCodes']),
  visitDetails: Object.freeze(['id', 'historicalVisitId', 'value']),
  visitCandidates: Object.freeze(['id', 'historicalVisitId', 'patientId', 'evidenceCode', 'score']),
  identityIssues: Object.freeze(['id', 'code', 'source', 'candidatePatientIds']),
  visitIssues: Object.freeze(['id', 'historicalVisitId', 'code', 'field']),
  normalizationIssues: Object.freeze(['id', 'code', 'source', 'field']),
  sourceRows: Object.freeze(['id', 'sourceRole', 'sourceName', 'sourceRow', 'patientId', 'historicalVisitId', 'payload', 'payloadHash', 'issueCodes']),
  invoices: Object.freeze(['id', 'sourceName', 'sourceRow', 'historicalVisitId', 'status', 'payload', 'payloadHash']),
  attachments: Object.freeze([])
})
const PROTECTED_COLLECTION_KEYS = Object.freeze(Object.fromEntries(Object.entries(COLLECTION_KEYS).map(([collection, keys]) => {
  if (collection === 'patients') return [collection, Object.freeze(keys.filter((key) => key !== 'profile').concat('profileDataEnvelope', 'profileEnvelope'))]
  if (['externalIdentifiers', 'contacts', 'privateData', 'visitDetails', 'sourceRows', 'invoices'].includes(collection)) return [collection, Object.freeze(keys.filter((key) => !['value', 'payload'].includes(key)).concat(keys.includes('value') ? 'valueEnvelope' : 'payloadEnvelope'))]
  if (collection === 'nameHistory') return [collection, Object.freeze(keys.filter((key) => !['lastName', 'sourceIdentifier'].includes(key)).concat('valueEnvelope'))]
  return [collection, keys]
})))
const SOURCE_ROW_REPORT_KEYS = Object.freeze(['total', 'byRole'])
const PATIENT_REPORT_KEYS = Object.freeze(['total', 'supplemental', 'externalIdentifiers', 'medeskEhrIdentifiers', 'contacts', 'nameHistory', 'consents', 'evidenceCounts'])
const IDENTITY_EVIDENCE_KEYS = Object.freeze(['exactEhr', 'sameFioBirthDate', 'patronymicCorrection', 'surnameChange', 'sameFioMissingBirthDate', 'surnameChangeMissingBirthDate', 'componentConflicts', 'conflictingStrongIdentifiers', 'insufficientEvidence', 'sharedCardDifferentPeople', 'supplementalPatients', 'supplementalEnrichments', 'supplementalIssues'])
const IDENTITY_MERGE_REASONS = Object.freeze(['exactEhr', 'sameFioBirthDate', 'patronymicCorrection', 'surnameChange', 'sameFioMissingBirthDate', 'surnameChangeMissingBirthDate'])
const VISIT_REPORT_KEYS = Object.freeze(['total', 'linked', 'ambiguous', 'unmatched', 'exactEhr', 'exactClinicCard', 'leadingZeroClinicCard', 'phoneCompatibleName', 'exactFullName', 'conflictingCommentEvidence', 'missingDate', 'emptyStatus', 'shortRow', 'invalidStartDate', 'invalidEndDate', 'controlCharValue', 'valueTooLarge'])
const CONTROL_KEYS = Object.freeze(['primaryRows', 'medeskEhrIdentifiers', 'patients', 'visits', 'missingDates', 'validBirthDates', 'cardCollisionGroups', 'invoices', 'primaryMerges', 'supplementalPatients'])
const CANDIDATE_EVIDENCE_CODES = new Set(['EXACT_EHR', 'EXACT_CLINIC_CARD', 'LEADING_ZERO_CLINIC_CARD', 'PHONE_COMPATIBLE_NAME', 'EXACT_FULL_NAME', 'CONFLICTING_COMMENT_EVIDENCE'])
const VISIT_EVIDENCE = Object.freeze({ exact_ehr: Object.freeze({ code: 'EXACT_EHR', level: 'exact', score: 100 }), exact_clinic_card: Object.freeze({ code: 'EXACT_CLINIC_CARD', level: 'strong', score: 90 }), leading_zero_clinic_card: Object.freeze({ code: 'LEADING_ZERO_CLINIC_CARD', level: 'strong', score: 80 }), phone_compatible_name: Object.freeze({ code: 'PHONE_COMPATIBLE_NAME', level: 'strong', score: 70 }), exact_full_name: Object.freeze({ code: 'EXACT_FULL_NAME', level: 'moderate', score: 60 }), conflicting_comment_evidence: Object.freeze({ code: 'CONFLICTING_COMMENT_EVIDENCE', level: 'moderate', score: 50 }) })
const IDENTITY_ISSUE_CODES = new Set(['COMPONENT_IDENTITY_CONFLICT', 'CONFLICTING_STRONG_IDENTIFIER', 'INCOMPLETE_PATIENT_NAME', 'INSUFFICIENT_IDENTITY_EVIDENCE', 'SHARED_CARD_DIFFERENT_PEOPLE', 'SUPPLEMENTAL_EHR_AMBIGUOUS', 'SUPPLEMENTAL_EHR_NOT_FOUND', 'SUPPLEMENTAL_INSUFFICIENT_EVIDENCE', 'SUPPLEMENTAL_NAME_ONLY_MATCH'])
const VISIT_ISSUE_CODES = new Set(['SHORT_ROW', 'INVALID_START_DATE', 'INVALID_END_DATE', 'CONTROL_CHAR_VALUE', 'VALUE_TOO_LARGE'])
const NORMALIZATION_ISSUE_CODES = new Set(['AMBIGUOUS_LEFT_JOIN', 'INSUFFICIENT_LEFT_JOIN_EVIDENCE', 'INVALID_NORMALIZED_VALUE'])
const NORMALIZATION_FIELDS = new Set(['birth_date', 'clinic_card', 'consent', 'email', 'ehr', 'gender', 'inn', 'legacy_join', 'name', 'observed_at', 'passport', 'phone', 'private_data', 'snils'])
const VISIT_FIELDS = new Set(['appointment_id', 'appointment_begin', 'appointment_end', 'cabinet', 'comment', 'doctor', 'doctor_role', 'invoice_ids', 'patient_card', 'service_names', 'status'])
const VISIT_ISSUE_FIELDS = Object.freeze({ SHORT_ROW: new Set([null]), INVALID_START_DATE: new Set(['appointment_begin']), INVALID_END_DATE: new Set(['appointment_end']), CONTROL_CHAR_VALUE: VISIT_FIELDS, VALUE_TOO_LARGE: VISIT_FIELDS })
const SOURCE_ROW_ISSUE_CODES = new Set(['SHORT_ROW'])
const DEFAULT_FILE_SYSTEM = Object.freeze({ link, lstat, open, realpath, unlink, close: (handle) => handle.close() })

/** Represents a frozen, value-free clinic import stage failure. */
export class ClinicImportStageError extends Error {
  constructor(code = 'INVALID_STAGE_INPUT') {
    super('Clinic import encrypted stage operation failed')
    this.name = 'ClinicImportStageError'
    this.code = ERROR_CODES.has(code) ? code : 'INVALID_STAGE_INPUT'
    Object.freeze(this)
  }
}

function invalid(code = 'INVALID_STAGE_INPUT') {
  throw new ClinicImportStageError(code)
}

function exactRecord(value, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid()
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) invalid()
  const actual = Reflect.ownKeys(value)
  if (actual.length !== keys.length || actual.some((key) => typeof key !== 'string') || keys.some((key) => !actual.includes(key))) invalid()
  const result = Object.create(null)
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) invalid()
    result[key] = descriptor.value
  }
  return Object.freeze(result)
}

function plainRecord(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid()
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) invalid()
  const keys = Reflect.ownKeys(value)
  if (keys.length > MAX_KEYS || keys.some((key) => typeof key !== 'string' || MAGIC_KEYS.has(key))) invalid('INPUT_TOO_COMPLEX')
  const result = Object.create(null)
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) invalid()
    result[key] = descriptor.value
  }
  return Object.freeze(result)
}

function denseArray(value, maximum = MAX_ARRAY_LENGTH) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) invalid('INPUT_TOO_COMPLEX')
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length')
  if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, 'value') || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0 || lengthDescriptor.value > maximum) invalid('INPUT_TOO_COMPLEX')
  const length = lengthDescriptor.value
  const keys = Reflect.ownKeys(value)
  if (keys.length !== length + 1 || !keys.includes('length')) invalid()
  const result = []
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) invalid()
    result.push(descriptor.value)
  }
  return Object.freeze(result)
}

function aggregateDebit(state, amount) {
  if (!Number.isSafeInteger(amount) || amount < 0 || state.remaining < amount) invalid('INPUT_TOO_COMPLEX')
  state.remaining -= amount
}

function aggregateSnapshotValue(value, state, depth = 0) {
  if (value === null || typeof value === 'boolean') { aggregateDebit(state, 8); return value }
  if (typeof value === 'number') { if (!Number.isFinite(value) || Object.is(value, -0)) invalid(); aggregateDebit(state, 24); return value }
  if (typeof value === 'string') { aggregateDebit(state, value.length * 6 + 8); return value }
  if (typeof value !== 'object' || depth > MAX_DEPTH || state.ancestors.has(value)) invalid('INPUT_TOO_COMPLEX')
  state.ancestors.add(value)
  aggregateDebit(state, 32)
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) invalid('INPUT_TOO_COMPLEX')
      const descriptor = Object.getOwnPropertyDescriptor(value, 'length')
      if (!descriptor || !Object.hasOwn(descriptor, 'value') || !Number.isSafeInteger(descriptor.value) || descriptor.value < 0 || descriptor.value > MAX_ARRAY_LENGTH) invalid('INPUT_TOO_COMPLEX')
      const keys = Reflect.ownKeys(value)
      if (keys.length !== descriptor.value + 1 || !keys.includes('length')) invalid()
      aggregateDebit(state, descriptor.value * 8)
      const output = []
      for (let index = 0; index < descriptor.value; index += 1) {
        const entry = Object.getOwnPropertyDescriptor(value, String(index))
        if (!entry?.enumerable || !Object.hasOwn(entry, 'value')) invalid()
        output.push(aggregateSnapshotValue(entry.value, state, depth + 1))
      }
      return Object.freeze(output)
    }
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) invalid()
    const keys = Reflect.ownKeys(value)
    if (keys.length > MAX_KEYS || keys.some((key) => typeof key !== 'string' || MAGIC_KEYS.has(key))) invalid('INPUT_TOO_COMPLEX')
    const output = Object.create(null)
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) invalid()
      aggregateDebit(state, key.length * 6 + 8)
      output[key] = aggregateSnapshotValue(descriptor.value, state, depth + 1)
    }
    return Object.freeze(output)
  } finally {
    state.ancestors.delete(value)
  }
}

function aggregateSnapshot(value) {
  return aggregateSnapshotValue(value, { remaining: MAX_AGGREGATE_INPUT_WORK, ancestors: new WeakSet() })
}

function validUnicode(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code >= 0xD800 && code <= 0xDBFF) {
      const next = value.charCodeAt(index + 1)
      if (!(next >= 0xDC00 && next <= 0xDFFF)) return false
      index += 1
    } else if (code >= 0xDC00 && code <= 0xDFFF) return false
  }
  return true
}

function canonicalValue(value, state, depth = 0) {
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (!validUnicode(value)) invalid()
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return value
  if (typeof value !== 'object' || depth > MAX_DEPTH || state.nodes >= MAX_NODES || state.ancestors.has(value)) invalid('INPUT_TOO_COMPLEX')
  state.nodes += 1
  state.ancestors.add(value)
  try {
    if (Array.isArray(value)) return Object.freeze(denseArray(value).map((entry) => canonicalValue(entry, state, depth + 1)))
    const input = plainRecord(value)
    const output = Object.create(null)
    for (const key of Object.keys(input).sort()) {
      if (!validUnicode(key)) invalid()
      output[key] = canonicalValue(input[key], state, depth + 1)
    }
    return Object.freeze(output)
  } finally {
    state.ancestors.delete(value)
  }
}

function canonicalized(value) {
  return canonicalValue(value, { nodes: 0, ancestors: new WeakSet() })
}

function canonicalJson(value) {
  const json = jsonText(canonicalized(value), true)
  if (Buffer.byteLength(json, 'utf8') > MAX_STAGE_BYTES) invalid('INPUT_TOO_COMPLEX')
  return json
}

function jsonText(value, sorted = false) {
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return String(value)
  if (Array.isArray(value)) return `[${denseArray(value).map((entry) => jsonText(entry, sorted)).join(',')}]`
  const input = plainRecord(value)
  const keys = Object.keys(input)
  if (sorted) keys.sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${jsonText(input[key], sorted)}`).join(',')}}`
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function encryptionKey(value, integrity = false) {
  if (typeof value !== 'string' || !BASE64_KEY_PATTERN.test(value)) invalid(integrity ? 'STAGE_INTEGRITY_FAILED' : 'INVALID_STAGE_INPUT')
  const key = Buffer.from(value, 'base64')
  if (key.byteLength !== 32 || key.toString('base64') !== value) invalid(integrity ? 'STAGE_INTEGRITY_FAILED' : 'INVALID_STAGE_INPUT')
  return key
}

function hashValue(value, code = 'INVALID_STAGE_INPUT') {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) invalid(code)
  return value
}

function canonicalManifest(value, code = 'INVALID_STAGE_INPUT') {
  const manifest = exactRecord(value, ['version', 'files', 'sha256'])
  const files = denseArray(manifest.files)
  if (manifest.version !== VERSION || files.length !== SOURCE_CONTRACTS.length) invalid(code)
  const normalized = files.map((value, index) => {
    const file = exactRecord(value, ['role', 'filename', 'sha256', 'byteSize', 'rowCount', 'parsingMode', 'structuralIssueCount'])
    const contract = SOURCE_CONTRACTS[index]
    if (file.role !== contract.role || file.filename !== contract.filename || file.parsingMode !== contract.parsingMode || !SHA256_PATTERN.test(file.sha256) || !Number.isSafeInteger(file.byteSize) || file.byteSize < 0 || !Number.isSafeInteger(file.rowCount) || file.rowCount < 0 || !Number.isSafeInteger(file.structuralIssueCount) || file.structuralIssueCount < 0 || file.structuralIssueCount > file.rowCount) invalid(code)
    return Object.freeze({ role: contract.role, filename: contract.filename, sha256: file.sha256, byteSize: file.byteSize, rowCount: file.rowCount, parsingMode: contract.parsingMode, structuralIssueCount: file.structuralIssueCount })
  })
  const computed = sha256(Buffer.from(jsonText(Object.freeze({ version: VERSION, files: normalized })), 'utf8'))
  if (manifest.sha256 !== computed) invalid(code)
  return Object.freeze({ version: VERSION, files: Object.freeze(normalized), sha256: computed })
}

function safeUuid(value) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) invalid()
  return value
}

function nullableUuid(value) {
  return value === null ? null : safeUuid(value)
}

function safeTimestamp(value) {
  if (value === null) return null
  if (typeof value !== 'string') invalid()
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/.exec(value)
  if (match === null) invalid()
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59) invalid()
  return value
}

function safeFingerprint(value, nullable = false) {
  if (nullable && value === null) return null
  if (typeof value !== 'string' || !FINGERPRINT_PATTERN.test(value)) invalid()
  return value
}

function safeSource(value) {
  const source = exactRecord(value, ['sourceName', 'sourceRow'])
  if (!SOURCE_NAMES.has(source.sourceName) || !Number.isSafeInteger(source.sourceRow) || source.sourceRow < 1) invalid()
  return source
}

function safeSources(value) {
  return Object.freeze(denseArray(value).map(safeSource))
}

function safeCodes(value, allowed) {
  const codes = denseArray(value).map((code) => {
    if (typeof code !== 'string' || !allowed.has(code)) invalid()
    return code
  })
  if (new Set(codes).size !== codes.length) invalid()
  return Object.freeze(codes)
}

function safeMask(value) {
  if (typeof value !== 'string' || !validUnicode(value) || value.length > 320 || (!/^\+[1-9] •{5,12} \d{2}$/u.test(value) && !/^.{1}•••@[^@\s]+\.[^@\s]+$/u.test(value))) invalid()
  return value
}

function normalizedPatientProfile(value) {
  const input = exactRecord(value, ['birthDate', 'firstName', 'gender', 'lastName', 'middleName', 'primaryPhone'])
  if (input.gender !== null && input.gender !== 'female' && input.gender !== 'male') invalid()
  let normalized
  try {
    normalized = normalizeImportedPatientProfile({ firstName: input.firstName, lastName: input.lastName, secondName: input.middleName, phone: input.primaryPhone, birthday: input.birthDate })
  } catch {
    invalid()
  }
  return Object.freeze({ lastName: normalized.lastName, firstName: normalized.firstName, middleName: normalized.secondName, birthDate: normalized.birthday, gender: input.gender, primaryPhone: normalized.phone === null ? null : `+${normalized.phone}` })
}

function safeCollectionRecord(collection, value) {
  const record = canonicalized(exactRecord(value, COLLECTION_KEYS[collection]))
  if (collection === 'patients') {
    safeUuid(record.id); safeTimestamp(record.firstSeenAt); safeTimestamp(record.lastSeenAt); if (typeof record.isSupplemental !== 'boolean') invalid(); return Object.freeze({ ...record, profile: normalizedPatientProfile(record.profile) })
  } else if (collection === 'externalIdentifiers') {
    safeUuid(record.id); safeUuid(record.patientId); if (!['medesk_ehr', 'clinic_card', 'legacy_system'].includes(record.system)) invalid(); safeFingerprint(record.fingerprint); safeFingerprint(record.globalFingerprint, true); safeFingerprint(record.identityKey); if (typeof record.isPrimary !== 'boolean') invalid(); safeSource(record.source); safeSources(record.sources)
  } else if (collection === 'contacts') {
    safeUuid(record.id); safeUuid(record.patientId); if (!['phone', 'email'].includes(record.kind)) invalid(); safeFingerprint(record.fingerprint); safeMask(record.mask); if (typeof record.isPrimary !== 'boolean') invalid(); safeSource(record.source); safeSources(record.sources); safeTimestamp(record.firstSeenAt); safeTimestamp(record.lastSeenAt)
  } else if (collection === 'nameHistory') {
    safeUuid(record.id); safeUuid(record.patientId); safeSource(record.source); safeTimestamp(record.observedAt); if (!['surname_change', 'source_correction'].includes(record.reason)) invalid()
  } else if (collection === 'privateData') {
    safeUuid(record.id); safeUuid(record.patientId); safeSources(record.sources)
  } else if (collection === 'consents') {
    safeUuid(record.id); safeUuid(record.patientId); if (record.type !== 'sms_notifications' || !['granted', 'not_granted'].includes(record.status)) invalid(); safeTimestamp(record.observedAt); safeSource(record.source)
  } else if (collection === 'sourceLinks') {
    safeUuid(record.id); safeUuid(record.patientId); safeSource(record.source); if (!['patient', 'medesk_supplemental'].includes(record.kind)) invalid()
  } else if (collection === 'historicalVisits') {
    safeUuid(record.id); if (record.sourceName !== SOURCE_CONTRACTS[2].filename || !Number.isSafeInteger(record.sourceRow) || record.sourceRow < 1) invalid(); nullableUuid(record.patientId); safeFingerprint(record.appointmentIdFingerprint, true); safeTimestamp(record.startsAt); safeTimestamp(record.endsAt); if (!['', 'cancelled', 'completed', 'confirmed', 'noshow', 'tentative', 'unknown'].includes(record.sourceStatus) || !['linked', 'ambiguous', 'unmatched'].includes(record.linkStatus) || ![null, 'exact_ehr', 'exact_clinic_card', 'leading_zero_clinic_card', 'phone_compatible_name', 'exact_full_name', 'conflicting_comment_evidence'].includes(record.linkMethod) || !['exact', 'strong', 'moderate', 'none'].includes(record.evidenceLevel)) invalid(); safeCodes(record.issueCodes, VISIT_ISSUE_CODES)
  } else if (collection === 'visitDetails') {
    safeUuid(record.id); safeUuid(record.historicalVisitId)
  } else if (collection === 'visitCandidates') {
    safeUuid(record.id); safeUuid(record.historicalVisitId); safeUuid(record.patientId); if (!CANDIDATE_EVIDENCE_CODES.has(record.evidenceCode) || !Number.isSafeInteger(record.score) || record.score < 0 || record.score > 100) invalid()
  } else if (collection === 'identityIssues') {
    safeUuid(record.id); if (!IDENTITY_ISSUE_CODES.has(record.code)) invalid(); safeSource(record.source); Object.freeze(denseArray(record.candidatePatientIds).map(safeUuid))
  } else if (collection === 'visitIssues') {
    safeUuid(record.id); safeUuid(record.historicalVisitId); if (!VISIT_ISSUE_CODES.has(record.code) || !VISIT_ISSUE_FIELDS[record.code].has(record.field)) invalid()
  } else if (collection === 'normalizationIssues') {
    safeUuid(record.id); if (!NORMALIZATION_ISSUE_CODES.has(record.code) || !NORMALIZATION_FIELDS.has(record.field)) invalid(); safeSource(record.source)
  } else if (collection === 'sourceRows') {
    safeUuid(record.id); if (!SOURCE_CONTRACTS.some(({ role, filename }) => role === record.sourceRole && filename === record.sourceName) || !Number.isSafeInteger(record.sourceRow) || record.sourceRow < 1) invalid(); nullableUuid(record.patientId); nullableUuid(record.historicalVisitId); hashValue(record.payloadHash); safeCodes(record.issueCodes, SOURCE_ROW_ISSUE_CODES)
  } else if (collection === 'invoices') {
    safeUuid(record.id); if (record.sourceName !== SOURCE_CONTRACTS[3].filename || !Number.isSafeInteger(record.sourceRow) || record.sourceRow < 1 || record.status !== 'incomplete_source') invalid(); nullableUuid(record.historicalVisitId); hashValue(record.payloadHash)
  }
  return record
}

function randomPart(source, size) {
  if (typeof source !== 'function') invalid()
  let value
  try {
    value = source(size)
  } catch {
    invalid()
  }
  if (!ArrayBuffer.isView(value) || value.BYTES_PER_ELEMENT !== 1 || value.byteLength !== size) invalid()
  return Buffer.from(value)
}

function without(record, excluded) {
  const input = plainRecord(record)
  const output = {}
  for (const key of Object.keys(input)) if (!excluded.includes(key)) output[key] = canonicalized(input[key])
  return output
}

function sealedField(record, field, outputField, domain, key, randomBytes) {
  const input = plainRecord(record)
  if (!Object.hasOwn(input, field)) invalid()
  const output = without(input, [field])
  try {
    const privateValue = canonicalized(input[field])
    const encryptable = privateValue !== null && typeof privateValue === 'object' ? privateValue : Object.freeze({ value: privateValue })
    output[outputField] = encryptProtectedData({ domain, value: encryptable, key, randomBytes })
  } catch {
    invalid('INPUT_TOO_COMPLEX')
  }
  return Object.freeze(output)
}

function sealedNameHistory(record, key, randomBytes) {
  const input = plainRecord(record)
  if (!Object.hasOwn(input, 'lastName') || !Object.hasOwn(input, 'sourceIdentifier')) invalid()
  const output = without(input, ['lastName', 'sourceIdentifier'])
  try {
    output.valueEnvelope = encryptProtectedData({ domain: 'name_history', value: Object.freeze({ lastName: canonicalized(input.lastName), sourceIdentifier: canonicalized(input.sourceIdentifier) }), key, randomBytes })
  } catch {
    invalid('INPUT_TOO_COMPLEX')
  }
  return Object.freeze(output)
}

function sealedPatient(record, key, randomBytes) {
  const input = plainRecord(record)
  const profile = normalizedPatientProfile(input.profile)
  const output = without(input, ['profile'])
  try {
    output.profileEnvelope = encryptImportedPatientProfile({ profile: Object.freeze({ firstName: profile.firstName, lastName: profile.lastName, secondName: profile.middleName, phone: profile.primaryPhone, birthday: profile.birthDate }), key, randomBytes })
    output.profileDataEnvelope = encryptProtectedData({ domain: 'private_profile', value: profile, key, randomBytes })
  } catch {
    invalid('INPUT_TOO_COMPLEX')
  }
  return Object.freeze(output)
}

function countRecord(value, keys) {
  const input = exactRecord(value, keys)
  const result = Object.create(null)
  for (const key of keys) {
    if (!Number.isSafeInteger(input[key]) || input[key] < 0) invalid()
    result[key] = input[key]
  }
  return Object.freeze(result)
}

function identityMergeEvidence(value) {
  const records = denseArray(value)
  return Object.freeze(records.map((record, index) => {
    const input = exactRecord(record, ['ordinal', 'patientId', 'reason', 'sources'])
    const sources = safeSources(input.sources)
    if (input.ordinal !== index + 1 || !IDENTITY_MERGE_REASONS.includes(input.reason) || sources.length !== 2 || `${sources[0].sourceName}\0${sources[0].sourceRow}` >= `${sources[1].sourceName}\0${sources[1].sourceRow}`) invalid()
    return Object.freeze({ ordinal: input.ordinal, patientId: safeUuid(input.patientId), reason: input.reason, sources })
  }))
}

function equalRecord(first, second, keys) {
  return keys.every((key) => first[key] === second[key])
}

function nonnegative(value) {
  if (!Number.isSafeInteger(value) || value < 0) invalid()
  return value
}

function safeReport(value) {
  const input = exactRecord(value, ['version', 'manifestHash', 'sourceRows', 'patients', 'visits', 'invoices', 'attachments', 'issues', 'controls'])
  if (input.version !== VERSION) invalid()
  const sourceRows = exactRecord(input.sourceRows, SOURCE_ROW_REPORT_KEYS)
  const patients = exactRecord(input.patients, PATIENT_REPORT_KEYS)
  const result = Object.create(null)
  result.version = VERSION
  result.manifestHash = hashValue(input.manifestHash)
  result.sourceRows = Object.freeze({ total: nonnegative(sourceRows.total), byRole: countRecord(sourceRows.byRole, SOURCE_CONTRACTS.map(({ role }) => role)) })
  result.patients = Object.freeze({ total: nonnegative(patients.total), supplemental: nonnegative(patients.supplemental), externalIdentifiers: nonnegative(patients.externalIdentifiers), medeskEhrIdentifiers: nonnegative(patients.medeskEhrIdentifiers), contacts: nonnegative(patients.contacts), nameHistory: nonnegative(patients.nameHistory), consents: nonnegative(patients.consents), evidenceCounts: countRecord(patients.evidenceCounts, IDENTITY_EVIDENCE_KEYS) })
  result.visits = countRecord(input.visits, VISIT_REPORT_KEYS)
  result.invoices = countRecord(input.invoices, ['total', 'incomplete'])
  result.attachments = countRecord(input.attachments, ['total'])
  result.issues = countRecord(input.issues, ['normalization', 'identity', 'visits'])
  result.controls = countRecord(input.controls, CONTROL_KEYS)
  return Object.freeze(result)
}

function uniqueCollectionIds(collections) {
  for (const collection of BUNDLE_COLLECTIONS) {
    const ids = collections[collection].map(({ id }) => id)
    if (new Set(ids).size !== ids.length) invalid()
  }
}

function knownPatient(patientIds, value) {
  if (!patientIds.has(value)) invalid()
}

function knownVisit(visitIds, value) {
  if (!visitIds.has(value)) invalid()
}

function uniqueCoordinates(values, selector) {
  const coordinates = values.map(selector)
  if (new Set(coordinates).size !== coordinates.length) invalid()
}

function equalCodeSets(first, second) {
  return first.size === second.size && [...first].every((code) => second.has(code))
}

function verifyVisitIssueCodes(collections) {
  const codesByVisit = new Map()
  for (const issue of collections.visitIssues) {
    const codes = codesByVisit.get(issue.historicalVisitId) ?? new Set()
    codes.add(issue.code)
    codesByVisit.set(issue.historicalVisitId, codes)
  }
  for (const visit of collections.historicalVisits) if (!equalCodeSets(new Set(visit.issueCodes), codesByVisit.get(visit.id) ?? new Set())) invalid()
}

function sourceStructuralIssues(payload) {
  const input = exactRecord(payload, ['structuralIssues', 'values'])
  const values = plainRecord(input.values)
  for (const value of Object.values(values)) if (typeof value !== 'string') invalid()
  return Object.freeze(denseArray(input.structuralIssues, 1).map((value) => {
    const issue = exactRecord(value, ['actualWidth', 'code', 'expectedWidth'])
    if (issue.code !== 'SHORT_ROW' || !Number.isSafeInteger(issue.actualWidth) || issue.actualWidth < 0 || !Number.isSafeInteger(issue.expectedWidth) || issue.expectedWidth < 1 || issue.actualWidth >= issue.expectedWidth) invalid()
    return issue
  }))
}

function verifySourceRowIssues(manifest, collections, protectedMode) {
  const counts = Object.fromEntries(SOURCE_CONTRACTS.map(({ role }) => [role, 0]))
  for (const row of collections.sourceRows) {
    counts[row.sourceRole] += row.issueCodes.length
    if (!protectedMode) {
      const issues = sourceStructuralIssues(row.payload)
      if (!equalCodeSets(new Set(row.issueCodes), new Set(issues.map(({ code }) => code)))) invalid()
    }
  }
  for (const file of manifest.files) if (file.structuralIssueCount !== counts[file.role]) invalid()
}

function verifyInvoiceSourceRows(collections) {
  const sourceRows = new Map(collections.sourceRows.filter(({ sourceRole }) => sourceRole === 'invoices').map((row) => [`${row.sourceName}\0${row.sourceRow}`, row]))
  if (sourceRows.size !== collections.invoices.length) invalid()
  for (const invoice of collections.invoices) {
    const row = sourceRows.get(`${invoice.sourceName}\0${invoice.sourceRow}`)
    if (row === undefined || row.payloadHash !== invoice.payloadHash) invalid()
  }
}

function equalCounts(actual, expected, keys) {
  if (keys.some((key) => actual[key] !== expected[key])) invalid()
}

function sourceCounts(manifest, sourceRows) {
  const counts = Object.fromEntries(SOURCE_CONTRACTS.map(({ role }) => [role, 0]))
  for (const row of sourceRows) counts[row.sourceRole] += 1
  for (const file of manifest.files) if (counts[file.role] !== file.rowCount) invalid()
  return Object.freeze(counts)
}

function visitCounts(visits, issues) {
  const counts = Object.fromEntries(VISIT_REPORT_KEYS.map((key) => [key, 0]))
  const methods = { exact_ehr: 'exactEhr', exact_clinic_card: 'exactClinicCard', leading_zero_clinic_card: 'leadingZeroClinicCard', phone_compatible_name: 'phoneCompatibleName', exact_full_name: 'exactFullName', conflicting_comment_evidence: 'conflictingCommentEvidence' }
  const issueCodes = { SHORT_ROW: 'shortRow', INVALID_START_DATE: 'invalidStartDate', INVALID_END_DATE: 'invalidEndDate', CONTROL_CHAR_VALUE: 'controlCharValue', VALUE_TOO_LARGE: 'valueTooLarge' }
  counts.total = visits.length
  for (const visit of visits) {
    counts[visit.linkStatus] += 1
    if (visit.linkMethod !== null) counts[methods[visit.linkMethod]] += 1
    if (visit.startsAt === null && !visit.issueCodes.includes('INVALID_START_DATE')) counts.missingDate += 1
    if (visit.sourceStatus === '') counts.emptyStatus += 1
  }
  for (const issue of issues) if (Object.hasOwn(issueCodes, issue.code)) counts[issueCodes[issue.code]] += 1
  return Object.freeze(counts)
}

function verifyFingerprints(collections, protectedMode) {
  const global = new Set()
  const identifiers = new Map()
  const contacts = new Map()
  for (const identifier of collections.externalIdentifiers) {
    if ((identifier.system === 'medesk_ehr') !== (identifier.globalFingerprint !== null) || (identifier.globalFingerprint !== null && global.has(identifier.globalFingerprint))) invalid()
    if (identifier.globalFingerprint !== null) global.add(identifier.globalFingerprint)
    if (!protectedMode) {
      const token = `${identifier.system}\0${identifier.fingerprint}`
      const previous = identifiers.get(token)
      if (previous !== undefined && previous !== identifier.value) invalid()
      identifiers.set(token, identifier.value)
    }
  }
  if (!protectedMode) for (const contact of collections.contacts) {
    const token = `${contact.kind}\0${contact.fingerprint}`
    const previous = contacts.get(token)
    if (previous !== undefined && previous !== contact.value) invalid()
    contacts.set(token, contact.value)
  }
}

function verifyPayloads(collections, protectedMode) {
  if (protectedMode) return
  for (const row of collections.sourceRows) if (sha256(Buffer.from(jsonText(row.payload), 'utf8')) !== row.payloadHash) invalid()
  for (const invoice of collections.invoices) if (sha256(Buffer.from(jsonText(invoice.payload), 'utf8')) !== invoice.payloadHash) invalid()
}

function verifyAppointments(collections, protectedMode) {
  if (protectedMode) return
  const details = new Map(collections.visitDetails.map((detail) => [detail.historicalVisitId, detail]))
  const byFingerprint = new Map()
  const byAppointment = new Map()
  for (const visit of collections.historicalVisits) {
    const value = plainRecord(details.get(visit.id).value)
    const appointment = value.appointment_id
    if (typeof appointment !== 'string' || !validUnicode(appointment) || (appointment === '') !== (visit.appointmentIdFingerprint === null)) invalid()
    if (appointment === '') continue
    const knownAppointment = byFingerprint.get(visit.appointmentIdFingerprint)
    const knownFingerprint = byAppointment.get(appointment)
    if ((knownAppointment !== undefined && knownAppointment !== appointment) || (knownFingerprint !== undefined && knownFingerprint !== visit.appointmentIdFingerprint)) invalid()
    byFingerprint.set(visit.appointmentIdFingerprint, appointment)
    byAppointment.set(appointment, visit.appointmentIdFingerprint)
  }
}

function verifyInvoiceLinks(collections, protectedMode) {
  if (protectedMode) return
  const details = new Map(collections.visitDetails.map((detail) => [detail.historicalVisitId, detail]))
  const appointments = new Map()
  for (const visit of collections.historicalVisits) {
    const appointment = plainRecord(details.get(visit.id).value).appointment_id
    if (appointment === '') continue
    const matches = appointments.get(appointment) ?? []
    matches.push(visit.id)
    appointments.set(appointment, matches)
  }
  for (const invoice of collections.invoices) {
    const payload = plainRecord(invoice.payload)
    const values = plainRecord(payload.values)
    const appointment = values.appointment_id
    if (appointment !== undefined && typeof appointment !== 'string') invalid()
    const matches = appointment === undefined || appointment === '' ? [] : appointments.get(appointment) ?? []
    const expected = matches.length === 1 ? matches[0] : null
    if (invoice.historicalVisitId !== expected) invalid()
  }
}

function allUniqueIds(collections) {
  const ids = BUNDLE_COLLECTIONS.flatMap((collection) => collections[collection].map(({ id }) => id))
  if (new Set(ids).size !== ids.length) invalid()
}

function uniqueComposite(values, selector) {
  const keys = values.map(selector)
  if (new Set(keys).size !== keys.length) invalid()
}

function identityEvidenceFrom(value, mergeEvidence, collections) {
  const expected = countRecord(value, IDENTITY_EVIDENCE_KEYS)
  const counts = Object.fromEntries(IDENTITY_EVIDENCE_KEYS.map((key) => [key, 0]))
  for (const merge of mergeEvidence) counts[merge.reason] += 1
  const issueCounts = Object.create(null)
  for (const issue of collections.identityIssues) issueCounts[issue.code] = (issueCounts[issue.code] ?? 0) + 1
  counts.componentConflicts = issueCounts.COMPONENT_IDENTITY_CONFLICT ?? 0
  counts.conflictingStrongIdentifiers = issueCounts.CONFLICTING_STRONG_IDENTIFIER ?? 0
  counts.insufficientEvidence = issueCounts.INSUFFICIENT_IDENTITY_EVIDENCE ?? 0
  counts.sharedCardDifferentPeople = issueCounts.SHARED_CARD_DIFFERENT_PEOPLE ?? 0
  counts.supplementalPatients = collections.patients.filter(({ isSupplemental }) => isSupplemental).length
  counts.supplementalEnrichments = collections.sourceLinks.filter(({ source, kind }) => source.sourceName === SOURCE_CONTRACTS[5].filename && kind === 'patient').length
  counts.supplementalIssues = collections.identityIssues.filter(({ code }) => code.startsWith('SUPPLEMENTAL_')).length
  if (!equalRecord(expected, counts, IDENTITY_EVIDENCE_KEYS)) invalid()
  return Object.freeze(counts)
}

function cardCollisionGroups(collections) {
  const rows = new Map()
  for (const identifier of collections.externalIdentifiers) if (identifier.system === 'clinic_card') {
    const values = rows.get(identifier.fingerprint) ?? new Set()
    for (const source of identifier.sources) if (source.sourceName === SOURCE_CONTRACTS[0].filename) values.add(`${source.sourceName}\0${source.sourceRow}`)
    rows.set(identifier.fingerprint, values)
  }
  return [...rows.values()].filter((values) => values.size > 1).length
}

function verifyIdentityMergeGraph(mergeEvidence, sourceRows, patientIds) {
  const ownerByCoordinate = new Map()
  const coordinatesByPatient = new Map()
  for (const row of sourceRows) if (row.sourceRole === 'pd') {
    if (row.patientId === null) invalid()
    const coordinate = `${row.sourceName}\0${row.sourceRow}`
    ownerByCoordinate.set(coordinate, row.patientId)
    const coordinates = coordinatesByPatient.get(row.patientId) ?? []
    coordinates.push(coordinate)
    coordinatesByPatient.set(row.patientId, coordinates)
  }
  const parents = new Map([...ownerByCoordinate.keys()].map((coordinate) => [coordinate, coordinate]))
  const find = (coordinate) => {
    let root = coordinate
    while (parents.get(root) !== root) root = parents.get(root)
    while (parents.get(coordinate) !== coordinate) {
      const parent = parents.get(coordinate)
      parents.set(coordinate, root)
      coordinate = parent
    }
    return root
  }
  const counts = new Map()
  const edges = new Set()
  for (const evidence of mergeEvidence) {
    knownPatient(patientIds, evidence.patientId)
    const coordinates = evidence.sources.map(({ sourceName, sourceRow }) => `${sourceName}\0${sourceRow}`)
    if (evidence.sources.some(({ sourceName }) => sourceName !== SOURCE_CONTRACTS[0].filename) || coordinates.some((coordinate) => ownerByCoordinate.get(coordinate) !== evidence.patientId)) invalid()
    const edge = `${coordinates[0]}\0${coordinates[1]}`
    if (edges.has(edge)) invalid()
    edges.add(edge)
    const firstRoot = find(coordinates[0])
    const secondRoot = find(coordinates[1])
    if (firstRoot === secondRoot) invalid()
    parents.set(secondRoot, firstRoot)
    counts.set(evidence.patientId, (counts.get(evidence.patientId) ?? 0) + 1)
  }
  for (const [patientId, coordinates] of coordinatesByPatient) if ((counts.get(patientId) ?? 0) !== coordinates.length - 1 || new Set(coordinates.map(find)).size !== 1) invalid()
}

function verifyRelations(manifest, report, collections, identityMergeEvidenceValue, identityEvidenceValue, visitEvidenceValue, protectedMode = false) {
  uniqueCollectionIds(collections)
  allUniqueIds(collections)
  const patientIds = new Set(collections.patients.map(({ id }) => id))
  const supplementalPatientIds = new Set(collections.patients.filter(({ isSupplemental }) => isSupplemental).map(({ id }) => id))
  const visitIds = new Set(collections.historicalVisits.map(({ id }) => id))
  const visitById = new Map(collections.historicalVisits.map((visit) => [visit.id, visit]))
  for (const collection of ['externalIdentifiers', 'contacts', 'nameHistory', 'privateData', 'consents', 'sourceLinks']) for (const row of collections[collection]) knownPatient(patientIds, row.patientId)
  for (const visit of collections.historicalVisits) {
    if (visit.patientId !== null) knownPatient(patientIds, visit.patientId)
    if ((visit.linkStatus === 'linked') !== (visit.patientId !== null) || (visit.linkStatus === 'unmatched') !== (visit.linkMethod === null)) invalid()
    const evidence = visit.linkMethod === null ? null : VISIT_EVIDENCE[visit.linkMethod]
    if ((evidence === null && visit.evidenceLevel !== 'none') || (evidence !== null && visit.evidenceLevel !== evidence.level)) invalid()
  }
  for (const detail of collections.visitDetails) knownVisit(visitIds, detail.historicalVisitId)
  const candidateCounts = new Map()
  if (collections.visitCandidates.length > MAX_TOTAL_CANDIDATES) invalid('INPUT_TOO_COMPLEX')
  for (const candidate of collections.visitCandidates) {
    knownVisit(visitIds, candidate.historicalVisitId)
    knownPatient(patientIds, candidate.patientId)
    const count = (candidateCounts.get(candidate.historicalVisitId) ?? 0) + 1
    if (count > MAX_CANDIDATES_PER_VISIT) invalid('INPUT_TOO_COMPLEX')
    candidateCounts.set(candidate.historicalVisitId, count)
    const visit = visitById.get(candidate.historicalVisitId)
    const evidence = visit.linkMethod === null ? null : VISIT_EVIDENCE[visit.linkMethod]
    if (evidence === null || candidate.evidenceCode !== evidence.code || candidate.score !== evidence.score) invalid()
  }
  uniqueComposite(collections.externalIdentifiers, ({ patientId, identityKey }) => `${patientId}\0${identityKey}`)
  uniqueComposite(collections.contacts, ({ patientId, kind, fingerprint }) => `${patientId}\0${kind}\0${fingerprint}`)
  uniqueComposite(collections.visitCandidates, ({ historicalVisitId, patientId }) => `${historicalVisitId}\0${patientId}`)
  uniqueComposite(collections.visitIssues, ({ historicalVisitId, code, field }) => `${historicalVisitId}\0${code}\0${field ?? ''}`)
  for (const visit of collections.historicalVisits) {
    const count = candidateCounts.get(visit.id) ?? 0
    if ((visit.linkStatus === 'ambiguous' && count < 2) || (visit.linkStatus !== 'ambiguous' && count !== 0)) invalid()
  }
  verifyVisitIssueCodes(collections)
  for (const issue of collections.identityIssues) for (const patientId of issue.candidatePatientIds) knownPatient(patientIds, patientId)
  for (const issue of collections.visitIssues) knownVisit(visitIds, issue.historicalVisitId)
  for (const row of collections.sourceRows) { if (row.patientId !== null) knownPatient(patientIds, row.patientId); if (row.historicalVisitId !== null) knownVisit(visitIds, row.historicalVisitId) }
  for (const invoice of collections.invoices) if (invoice.historicalVisitId !== null) knownVisit(visitIds, invoice.historicalVisitId)
  if (collections.privateData.length !== patientIds.size || new Set(collections.privateData.map(({ patientId }) => patientId)).size !== patientIds.size) invalid()
  if (collections.visitDetails.length !== visitIds.size || new Set(collections.visitDetails.map(({ historicalVisitId }) => historicalVisitId)).size !== visitIds.size) invalid()
  if (new Set(collections.externalIdentifiers.map(({ patientId }) => patientId)).size !== patientIds.size) invalid()
  if (collections.consents.length !== patientIds.size || new Set(collections.consents.map(({ patientId, type }) => `${patientId}\0${type}`)).size !== patientIds.size) invalid()
  for (const consent of collections.consents) if (supplementalPatientIds.has(consent.patientId) && consent.status !== 'not_granted') invalid()
  uniqueCoordinates(collections.sourceRows, ({ sourceName, sourceRow }) => `${sourceName}\0${sourceRow}`)
  uniqueCoordinates(collections.historicalVisits, ({ sourceName, sourceRow }) => `${sourceName}\0${sourceRow}`)
  uniqueCoordinates(collections.invoices, ({ sourceName, sourceRow }) => `${sourceName}\0${sourceRow}`)
  const byRole = sourceCounts(manifest, collections.sourceRows)
  verifySourceRowIssues(manifest, collections, protectedMode)
  const sourceCoordinates = new Set(collections.sourceRows.map(({ sourceName, sourceRow }) => `${sourceName}\0${sourceRow}`))
  for (const collection of ['externalIdentifiers', 'contacts', 'nameHistory', 'privateData', 'consents', 'sourceLinks', 'identityIssues', 'normalizationIssues']) for (const row of collections[collection]) {
    const references = row.sources ?? [row.source]
    for (const source of references) if (!sourceCoordinates.has(`${source.sourceName}\0${source.sourceRow}`)) invalid()
  }
  const visitCoordinates = new Map(collections.historicalVisits.map((visit) => [`${visit.sourceName}\0${visit.sourceRow}`, visit]))
  const visitSourceRows = collections.sourceRows.filter(({ sourceRole }) => sourceRole === 'visits')
  if (visitSourceRows.length !== collections.historicalVisits.length || visitCoordinates.size !== collections.historicalVisits.length) invalid()
  for (const row of collections.sourceRows) if (row.sourceRole === 'visits') {
    const visit = visitCoordinates.get(`${row.sourceName}\0${row.sourceRow}`)
    if (visit === undefined || row.historicalVisitId !== visit.id || row.patientId !== visit.patientId || visit.issueCodes.includes('SHORT_ROW') !== row.issueCodes.includes('SHORT_ROW')) invalid()
  } else if (row.historicalVisitId !== null) invalid()
  verifyIdentityMergeGraph(identityMergeEvidenceValue, collections.sourceRows, patientIds)
  verifyInvoiceSourceRows(collections)
  const visits = visitCounts(collections.historicalVisits, collections.visitIssues)
  const identityEvidence = identityEvidenceFrom(identityEvidenceValue, identityMergeEvidenceValue, collections)
  const visitEvidence = countRecord(visitEvidenceValue, VISIT_REPORT_KEYS)
  const medesk = collections.externalIdentifiers.filter(({ system }) => system === 'medesk_ehr').length
  const supplemental = collections.patients.filter(({ isSupplemental }) => isSupplemental).length
  const validBirthDates = protectedMode ? null : collections.patients.filter(({ profile }) => profile.birthDate !== null).length
  const controls = Object.freeze({ primaryRows: manifest.files.find(({ role }) => role === 'pd').rowCount, medeskEhrIdentifiers: medesk, patients: collections.patients.length, visits: collections.historicalVisits.length, missingDates: visits.missingDate, validBirthDates, cardCollisionGroups: cardCollisionGroups(collections), invoices: collections.invoices.length, primaryMerges: manifest.files.find(({ role }) => role === 'pd').rowCount - (collections.patients.length - supplemental), supplementalPatients: supplemental })
  equalCounts(report.sourceRows.byRole, byRole, SOURCE_CONTRACTS.map(({ role }) => role))
  equalCounts(report.visits, visits, VISIT_REPORT_KEYS)
  if (!equalRecord(report.patients.evidenceCounts, identityEvidence, IDENTITY_EVIDENCE_KEYS) || !equalRecord(report.visits, visitEvidence, VISIT_REPORT_KEYS)) invalid()
  equalCounts(report.controls, controls, protectedMode ? CONTROL_KEYS.filter((key) => key !== 'validBirthDates') : CONTROL_KEYS)
  if (report.manifestHash !== manifest.sha256 || report.sourceRows.total !== collections.sourceRows.length || report.patients.total !== collections.patients.length || report.patients.supplemental !== supplemental || report.patients.externalIdentifiers !== collections.externalIdentifiers.length || report.patients.medeskEhrIdentifiers !== medesk || report.patients.contacts !== collections.contacts.length || report.patients.nameHistory !== collections.nameHistory.length || report.patients.consents !== collections.consents.length || report.invoices.total !== collections.invoices.length || report.invoices.incomplete !== collections.invoices.length || report.attachments.total !== collections.attachments.length || report.issues.normalization !== collections.normalizationIssues.length || report.issues.identity !== collections.identityIssues.length || report.issues.visits !== collections.visitIssues.length) invalid()
  const mergeKeys = ['exactEhr', 'sameFioBirthDate', 'patronymicCorrection', 'surnameChange', 'sameFioMissingBirthDate', 'surnameChangeMissingBirthDate']
  if (mergeKeys.reduce((total, key) => total + report.patients.evidenceCounts[key], 0) !== report.controls.primaryMerges || report.patients.evidenceCounts.supplementalPatients !== supplemental) invalid()
  if (!protectedMode && report.controls.validBirthDates !== validBirthDates) invalid()
  verifyFingerprints(collections, protectedMode)
  verifyPayloads(collections, protectedMode)
  verifyAppointments(collections, protectedMode)
  verifyInvoiceLinks(collections, protectedMode)
}

function bundleInput(value) {
  const keys = Object.freeze(['version', 'manifest', ...BUNDLE_COLLECTIONS, 'identityMergeEvidence', 'identityEvidenceCounts', 'visitEvidenceCounts', 'report'])
  const bundle = exactRecord(aggregateSnapshot(value), keys)
  if (bundle.version !== 1) invalid()
  const manifest = canonicalManifest(bundle.manifest)
  const collections = Object.fromEntries(BUNDLE_COLLECTIONS.map((collection) => [collection, Object.freeze(denseArray(bundle[collection], collection === 'visitCandidates' ? MAX_TOTAL_CANDIDATES : MAX_ARRAY_LENGTH).map((record) => safeCollectionRecord(collection, record)))]))
  const report = safeReport(bundle.report)
  const mergeEvidence = identityMergeEvidence(bundle.identityMergeEvidence)
  const identityEvidenceCounts = countRecord(bundle.identityEvidenceCounts, IDENTITY_EVIDENCE_KEYS)
  const visitEvidenceCounts = countRecord(bundle.visitEvidenceCounts, VISIT_REPORT_KEYS)
  if (collections.attachments.length !== 0) invalid()
  verifyRelations(manifest, report, collections, mergeEvidence, identityEvidenceCounts, visitEvidenceCounts)
  return Object.freeze({ manifest: canonicalized(manifest), manifestHash: manifest.sha256, report, identityMergeEvidence: mergeEvidence, identityEvidenceCounts, visitEvidenceCounts, collections: Object.freeze(collections) })
}

function logicalPlan(input, collections) {
  return Object.freeze({ version: VERSION, manifest: input.manifest, manifestHash: input.manifestHash, report: input.report, identityMergeEvidence: input.identityMergeEvidence, identityEvidenceCounts: input.identityEvidenceCounts, visitEvidenceCounts: input.visitEvidenceCounts, ...collections })
}

function logicalPlanHash(input, collections) {
  return sha256(canonicalJson(logicalPlan(input, collections)))
}

function protectedPlan(value, key, randomBytes) {
  const input = bundleInput(value)
  const { collections } = input
  const plan = {
    version: VERSION,
    manifest: input.manifest,
    manifestHash: input.manifestHash,
    report: input.report,
    identityMergeEvidence: input.identityMergeEvidence,
    identityEvidenceCounts: input.identityEvidenceCounts,
    visitEvidenceCounts: input.visitEvidenceCounts,
    patients: collections.patients.map((record) => sealedPatient(record, key, randomBytes)),
    externalIdentifiers: collections.externalIdentifiers.map((record) => sealedField(record, 'value', 'valueEnvelope', 'external_identifier', key, randomBytes)),
    contacts: collections.contacts.map((record) => sealedField(record, 'value', 'valueEnvelope', 'contact', key, randomBytes)),
    nameHistory: collections.nameHistory.map((record) => sealedNameHistory(record, key, randomBytes)),
    privateData: collections.privateData.map((record) => sealedField(record, 'value', 'valueEnvelope', 'private_profile', key, randomBytes)),
    consents: collections.consents.map(canonicalized),
    sourceLinks: collections.sourceLinks.map(canonicalized),
    historicalVisits: collections.historicalVisits.map(canonicalized),
    visitDetails: collections.visitDetails.map((record) => sealedField(record, 'value', 'valueEnvelope', 'visit_details', key, randomBytes)),
    visitCandidates: collections.visitCandidates.map(canonicalized),
    identityIssues: collections.identityIssues.map(canonicalized),
    visitIssues: collections.visitIssues.map(canonicalized),
    normalizationIssues: collections.normalizationIssues.map(canonicalized),
    sourceRows: collections.sourceRows.map((record) => sealedField(record, 'payload', 'payloadEnvelope', 'source_row', key, randomBytes)),
    invoices: collections.invoices.map((record) => sealedField(record, 'payload', 'payloadEnvelope', 'invoice', key, randomBytes)),
    attachments: []
  }
  return Object.freeze({ plan: canonicalized(plan), planHash: logicalPlanHash(input, collections) })
}

function safeEnvelope(value, maximum = 87_425) {
  if (typeof value !== 'string' || value.length > maximum || !/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) invalid()
  return value
}

function protectedRecord(collection, value) {
  const record = exactRecord(value, PROTECTED_COLLECTION_KEYS[collection])
  if (!['consents', 'sourceLinks', 'historicalVisits', 'visitCandidates', 'identityIssues', 'visitIssues', 'normalizationIssues', 'attachments'].includes(collection)) safeEnvelope(record[collection === 'patients' ? 'profileEnvelope' : ['sourceRows', 'invoices'].includes(collection) ? 'payloadEnvelope' : 'valueEnvelope'], collection === 'patients' ? 4_096 : 87_425)
  if (collection === 'patients') safeEnvelope(record.profileDataEnvelope, 4_096)
  if (collection === 'patients') {
    safeUuid(record.id); safeTimestamp(record.firstSeenAt); safeTimestamp(record.lastSeenAt); if (typeof record.isSupplemental !== 'boolean') invalid(); return record
  }
  const raw = Object.create(null)
  for (const key of COLLECTION_KEYS[collection]) if (Object.hasOwn(record, key)) raw[key] = record[key]
  if (['externalIdentifiers', 'contacts', 'privateData', 'visitDetails'].includes(collection)) raw.value = null
  if (collection === 'nameHistory') { raw.lastName = null; raw.sourceIdentifier = null }
  if (['sourceRows', 'invoices'].includes(collection)) raw.payload = null
  safeCollectionRecord(collection, Object.freeze(raw))
  return record
}

function openedField(record, envelopeField, valueField, domain, key) {
  const output = without(record, [envelopeField])
  const opened = decryptProtectedData({ domain, envelope: record[envelopeField], key })
  output[valueField] = ['external_identifier', 'contact'].includes(domain) ? exactRecord(opened, ['value']).value : opened
  return Object.freeze(output)
}

function openedNameHistory(record, key) {
  const output = without(record, ['valueEnvelope'])
  const opened = exactRecord(decryptProtectedData({ domain: 'name_history', envelope: record.valueEnvelope, key }), ['lastName', 'sourceIdentifier'])
  output.lastName = opened.lastName
  output.sourceIdentifier = opened.sourceIdentifier
  return Object.freeze(output)
}

function openedPatient(record, key) {
  const output = without(record, ['profileDataEnvelope', 'profileEnvelope'])
  const profile = normalizedPatientProfile(decryptProtectedData({ domain: 'private_profile', envelope: record.profileDataEnvelope, key }))
  const operational = decryptPatientProfile({ envelope: record.profileEnvelope, key })
  if (operational.firstName !== profile.firstName || operational.lastName !== profile.lastName || operational.secondName !== profile.middleName || operational.birthday !== profile.birthDate || operational.phone !== (profile.primaryPhone === null ? null : profile.primaryPhone.slice(1))) invalid()
  output.profile = profile
  return Object.freeze(output)
}

function openedCollections(collections, key) {
  return Object.freeze({ ...collections, patients: Object.freeze(collections.patients.map((record) => openedPatient(record, key))), externalIdentifiers: Object.freeze(collections.externalIdentifiers.map((record) => openedField(record, 'valueEnvelope', 'value', 'external_identifier', key))), contacts: Object.freeze(collections.contacts.map((record) => openedField(record, 'valueEnvelope', 'value', 'contact', key))), nameHistory: Object.freeze(collections.nameHistory.map((record) => openedNameHistory(record, key))), privateData: Object.freeze(collections.privateData.map((record) => openedField(record, 'valueEnvelope', 'value', 'private_profile', key))), visitDetails: Object.freeze(collections.visitDetails.map((record) => openedField(record, 'valueEnvelope', 'value', 'visit_details', key))), sourceRows: Object.freeze(collections.sourceRows.map((record) => openedField(record, 'payloadEnvelope', 'payload', 'source_row', key))), invoices: Object.freeze(collections.invoices.map((record) => openedField(record, 'payloadEnvelope', 'payload', 'invoice', key))) })
}

function protectedInput(value, key) {
  const keys = Object.freeze(['version', 'manifest', 'manifestHash', 'report', 'identityMergeEvidence', 'identityEvidenceCounts', 'visitEvidenceCounts', ...BUNDLE_COLLECTIONS])
  const input = exactRecord(value, keys)
  if (input.version !== VERSION) invalid()
  const manifest = canonicalManifest(input.manifest)
  const manifestHash = hashValue(input.manifestHash)
  if (manifest.sha256 !== manifestHash) invalid()
  const report = safeReport(input.report)
  const mergeEvidence = identityMergeEvidence(input.identityMergeEvidence)
  const identityEvidenceCounts = countRecord(input.identityEvidenceCounts, IDENTITY_EVIDENCE_KEYS)
  const visitEvidenceCounts = countRecord(input.visitEvidenceCounts, VISIT_REPORT_KEYS)
  const collections = Object.fromEntries(BUNDLE_COLLECTIONS.map((collection) => [collection, Object.freeze(denseArray(input[collection], collection === 'visitCandidates' ? MAX_TOTAL_CANDIDATES : MAX_ARRAY_LENGTH).map((record) => protectedRecord(collection, record)))]))
  if (collections.attachments.length !== 0) invalid()
  verifyRelations(manifest, report, collections, mergeEvidence, identityEvidenceCounts, visitEvidenceCounts, true)
  const opened = openedCollections(collections, key)
  verifyRelations(manifest, report, opened, mergeEvidence, identityEvidenceCounts, visitEvidenceCounts)
  const foundation = Object.freeze({ manifest, manifestHash, report, identityMergeEvidence: mergeEvidence, identityEvidenceCounts, visitEvidenceCounts })
  const plan = Object.freeze({ version: VERSION, ...foundation, ...collections })
  return Object.freeze({ plan, planHash: logicalPlanHash(foundation, opened) })
}

function stageSummary(plan) {
  return Object.freeze({ patients: plan.patients.length, externalIdentifiers: plan.externalIdentifiers.length, contacts: plan.contacts.length, nameHistory: plan.nameHistory.length, historicalVisits: plan.historicalVisits.length, sourceRows: plan.sourceRows.length, invoices: plan.invoices.length, attachments: plan.attachments.length, issues: plan.identityIssues.length + plan.visitIssues.length + plan.normalizationIssues.length })
}

function stageAad(manifestHash, planHash) {
  return Buffer.from(`${STAGE_DOMAIN}\0${VERSION}\0${manifestHash}\0${planHash}`, 'utf8')
}

function encryptedArtifact(plan, manifestHash, planHash, keyValue, randomBytes) {
  const plaintext = Buffer.from(canonicalJson(plan), 'utf8')
  hashValue(planHash)
  const iv = randomPart(randomBytes, 12)
  const cipher = createCipheriv(ALGORITHM, encryptionKey(keyValue), iv)
  cipher.setAAD(stageAad(manifestHash, planHash))
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const artifact = Object.freeze({ version: VERSION, algorithm: ALGORITHM, manifestHash, planHash, iv: iv.toString('base64url'), ciphertext: ciphertext.toString('base64url'), tag: cipher.getAuthTag().toString('base64url') })
  const bytes = Buffer.from(jsonText(artifact), 'utf8')
  if (bytes.byteLength > MAX_STAGE_BYTES) invalid('INPUT_TOO_COMPLEX')
  return Object.freeze({ artifact, bytes, planHash })
}

function safePathText(value) {
  return typeof value === 'string' && isAbsolute(value) && !value.includes('\0')
}

function inside(parent, child) {
  const path = relative(parent, child)
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !pathIsAbsolute(path))
}

async function outsideStagePath(stagePath, repositoryPath, fileSystem = DEFAULT_FILE_SYSTEM) {
  if (!safePathText(stagePath) || !safePathText(repositoryPath) || basename(stagePath) === '.' || basename(stagePath) === '..') invalid('INVALID_STAGE_PATH')
  let repository
  let parent
  try {
    repository = await fileSystem.realpath(repositoryPath)
    parent = await fileSystem.realpath(dirname(stagePath))
  } catch {
    invalid('INVALID_STAGE_PATH')
  }
  const target = join(parent, basename(stagePath))
  if (inside(repository, target)) invalid('INVALID_STAGE_PATH')
  return Object.freeze({ originalParent: dirname(stagePath), originalRepository: repositoryPath, parent, repository, target })
}

function ownErrorCode(error) {
  if (error === null || typeof error !== 'object') return null
  const descriptor = Object.getOwnPropertyDescriptor(error, 'code')
  return descriptor && Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'string' ? descriptor.value : null
}

async function retained(filePath, fileSystem) {
  try {
    await fileSystem.lstat(filePath)
    return true
  } catch (error) {
    return ownErrorCode(error) !== 'ENOENT'
  }
}

async function regularSnapshot(filePath, tooLargeCode, prohibitedRoot = null, fileSystem = DEFAULT_FILE_SYSTEM) {
  if (!safePathText(filePath)) invalid('INVALID_STAGE_PATH')
  let canonicalPath
  let handle
  try {
    canonicalPath = await fileSystem.realpath(filePath)
    if (prohibitedRoot !== null && inside(prohibitedRoot, canonicalPath)) invalid('INVALID_STAGE_PATH')
    handle = await fileSystem.open(canonicalPath, constants.O_RDONLY | constants.O_NOFOLLOW)
    const metadata = await handle.stat()
    if (!metadata.isFile() || !Number.isSafeInteger(metadata.size) || metadata.size < 0 || metadata.size > MAX_STAGE_BYTES) invalid(tooLargeCode)
    const bytes = Buffer.alloc(metadata.size)
    let offset = 0
    while (offset < bytes.byteLength) {
      const result = await handle.read(bytes, offset, bytes.byteLength - offset, offset)
      if (result.bytesRead === 0) invalid('STAGE_INTEGRITY_FAILED')
      offset += result.bytesRead
    }
    const probe = Buffer.alloc(1)
    if ((await handle.read(probe, 0, 1, bytes.byteLength)).bytesRead !== 0) invalid('STAGE_INTEGRITY_FAILED')
    const confirmed = await fileSystem.realpath(filePath)
    const current = await fileSystem.lstat(canonicalPath)
    if (confirmed !== canonicalPath || !current.isFile() || current.dev !== metadata.dev || current.ino !== metadata.ino) invalid('STAGE_INTEGRITY_FAILED')
    return Object.freeze({ bytes, hash: sha256(bytes) })
  } catch (error) {
    if (error instanceof ClinicImportStageError) throw error
    invalid('STAGE_INTEGRITY_FAILED')
  } finally {
    try {
      if (handle !== undefined && handle !== null) await fileSystem.close(handle)
    } catch {
      invalid('STAGE_CLEANUP_FAILED')
    }
  }
}

async function regularDigest(filePath, fileSystem = DEFAULT_FILE_SYSTEM) {
  if (!safePathText(filePath)) invalid('INVALID_STAGE_PATH')
  let canonicalPath
  let handle
  try {
    canonicalPath = await fileSystem.realpath(filePath)
    handle = await fileSystem.open(canonicalPath, constants.O_RDONLY | constants.O_NOFOLLOW)
    const metadata = await handle.stat()
    if (!metadata.isFile() || !Number.isSafeInteger(metadata.size) || metadata.size < 0 || metadata.size > MAX_DATABASE_BYTES) invalid('INPUT_TOO_COMPLEX')
    const digest = createHash('sha256')
    const buffer = Buffer.alloc(Math.min(READ_CHUNK_BYTES, Math.max(1, metadata.size)))
    let offset = 0
    while (offset < metadata.size) {
      const result = await handle.read(buffer, 0, Math.min(buffer.byteLength, metadata.size - offset), offset)
      if (result.bytesRead === 0) invalid('STAGE_INTEGRITY_FAILED')
      digest.update(buffer.subarray(0, result.bytesRead))
      offset += result.bytesRead
    }
    if ((await handle.read(buffer, 0, 1, metadata.size)).bytesRead !== 0) invalid('STAGE_INTEGRITY_FAILED')
    const confirmed = await fileSystem.realpath(filePath)
    const current = await fileSystem.lstat(canonicalPath)
    if (confirmed !== canonicalPath || !current.isFile() || current.dev !== metadata.dev || current.ino !== metadata.ino || current.size !== metadata.size) invalid('STAGE_INTEGRITY_FAILED')
    return Object.freeze({ hash: digest.digest('hex'), byteSize: metadata.size })
  } catch (error) {
    if (error instanceof ClinicImportStageError) throw error
    invalid('STAGE_INTEGRITY_FAILED')
  } finally {
    try {
      if (handle !== undefined && handle !== null) await fileSystem.close(handle)
    } catch {
      invalid('STAGE_CLEANUP_FAILED')
    }
  }
}

async function publishedStage(target, temporary, parentInfo, bytes, afterLink, fileSystem) {
  let handle
  try {
    await afterLink()
    const confirmedParent = await fileSystem.realpath(parentInfo.originalParent)
    const confirmedRepository = await fileSystem.realpath(parentInfo.originalRepository)
    const confirmedTarget = await fileSystem.realpath(target)
    if (confirmedParent !== parentInfo.parent || confirmedRepository !== parentInfo.repository || confirmedTarget !== target || inside(confirmedRepository, confirmedTarget)) invalid('INVALID_STAGE_PATH')
    handle = await fileSystem.open(confirmedTarget, constants.O_RDONLY | constants.O_NOFOLLOW)
    const [targetMetadata, temporaryMetadata] = await Promise.all([handle.stat(), fileSystem.lstat(temporary)])
    const repeatedParent = await fileSystem.realpath(parentInfo.originalParent)
    const repeatedRepository = await fileSystem.realpath(parentInfo.originalRepository)
    const current = await fileSystem.lstat(confirmedTarget)
    if (repeatedParent !== parentInfo.parent || repeatedRepository !== parentInfo.repository || !targetMetadata.isFile() || !temporaryMetadata.isFile() || !current.isFile() || targetMetadata.dev !== temporaryMetadata.dev || targetMetadata.ino !== temporaryMetadata.ino || current.dev !== targetMetadata.dev || current.ino !== targetMetadata.ino || targetMetadata.size !== bytes.byteLength) invalid('STAGE_INTEGRITY_FAILED')
    const digest = createHash('sha256')
    const buffer = Buffer.alloc(Math.min(READ_CHUNK_BYTES, Math.max(1, targetMetadata.size)))
    let offset = 0
    while (offset < targetMetadata.size) {
      const result = await handle.read(buffer, 0, Math.min(buffer.byteLength, targetMetadata.size - offset), offset)
      if (result.bytesRead === 0) invalid('STAGE_INTEGRITY_FAILED')
      digest.update(buffer.subarray(0, result.bytesRead))
      offset += result.bytesRead
    }
    if ((await handle.read(buffer, 0, 1, targetMetadata.size)).bytesRead !== 0 || digest.digest('hex') !== sha256(bytes)) invalid('STAGE_INTEGRITY_FAILED')
  } finally {
    try {
      if (handle !== undefined && handle !== null) await fileSystem.close(handle)
    } catch {
      invalid('STAGE_CLEANUP_FAILED')
    }
  }
}

async function writeExclusive(target, parentInfo, bytes, randomBytes, afterLink, fileSystem) {
  const token = randomPart(randomBytes, 16).toString('hex')
  const temporary = join(parentInfo.parent, `.clinic-import-stage-${token}.tmp`)
  let handle
  let temporaryCreated = false
  let linked = false
  let primary = null
  try {
    const confirmedParent = await fileSystem.realpath(parentInfo.originalParent)
    const confirmedRepository = await fileSystem.realpath(parentInfo.originalRepository)
    if (confirmedParent !== parentInfo.parent || confirmedRepository !== parentInfo.repository || inside(confirmedRepository, join(confirmedParent, basename(target)))) invalid('INVALID_STAGE_PATH')
    handle = await fileSystem.open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600)
    temporaryCreated = true
    await handle.writeFile(bytes)
    await handle.sync()
    await fileSystem.close(handle)
    handle = null
    const repeatedParent = await fileSystem.realpath(parentInfo.originalParent)
    const repeatedRepository = await fileSystem.realpath(parentInfo.originalRepository)
    if (repeatedParent !== parentInfo.parent || repeatedRepository !== parentInfo.repository || inside(repeatedRepository, target)) invalid('INVALID_STAGE_PATH')
    await fileSystem.link(temporary, target)
    linked = true
    await publishedStage(target, temporary, parentInfo, bytes, afterLink, fileSystem)
  } catch (error) {
    primary = error
  }
  let cleanupFailed = false
  try {
    if (handle !== undefined && handle !== null) await fileSystem.close(handle)
  } catch {
    cleanupFailed = true
  }
  if (primary !== null && linked) try {
    await fileSystem.unlink(target)
    if (await retained(target, fileSystem)) cleanupFailed = true
    linked = false
  } catch {
    cleanupFailed = true
  }
  if (temporaryCreated) try {
    await fileSystem.unlink(temporary)
    if (await retained(temporary, fileSystem)) cleanupFailed = true
  } catch {
    cleanupFailed = true
  }
  if (cleanupFailed) {
    if (linked) try {
      await fileSystem.unlink(target)
      if (await retained(target, fileSystem)) invalid('STAGE_CLEANUP_FAILED')
    } catch {
      invalid('STAGE_CLEANUP_FAILED')
    }
    invalid('STAGE_CLEANUP_FAILED')
  }
  if (primary !== null) {
    if (primary instanceof ClinicImportStageError) throw primary
    invalid(ownErrorCode(primary) === 'EEXIST' ? 'STAGE_WRITE_FAILED' : 'STAGE_WRITE_FAILED')
  }
}

function safeFileSystem(value) {
  const input = plainRecord(value)
  const required = ['link', 'lstat', 'open', 'realpath', 'unlink']
  const keys = Object.keys(input)
  if (required.some((key) => !keys.includes(key)) || keys.some((key) => ![...required, 'close'].includes(key))) invalid()
  for (const key of keys) if (typeof input[key] !== 'function') invalid()
  return Object.freeze({ link: input.link, lstat: input.lstat, open: input.open, realpath: input.realpath, unlink: input.unlink, close: input.close ?? DEFAULT_FILE_SYSTEM.close })
}

function dependenciesFrom(value) {
  if (value === undefined) return Object.freeze({ randomBytes: secureRandomBytes, afterLink: async () => {}, fileSystem: DEFAULT_FILE_SYSTEM })
  const input = plainRecord(value)
  const keys = Object.keys(input)
  if (!keys.includes('randomBytes') || keys.some((key) => !['randomBytes', 'afterLink', 'fileSystem'].includes(key)) || typeof input.randomBytes !== 'function' || (Object.hasOwn(input, 'afterLink') && typeof input.afterLink !== 'function')) invalid()
  return Object.freeze({ randomBytes: input.randomBytes, afterLink: input.afterLink ?? (async () => {}), fileSystem: Object.hasOwn(input, 'fileSystem') ? safeFileSystem(input.fileSystem) : DEFAULT_FILE_SYSTEM })
}

function writeInput(value) {
  return exactRecord(value, ['bundle', 'databasePath', 'encryptionKey', 'repositoryPath', 'stagePath'])
}

function readInput(value) {
  return exactRecord(value, ['encryptionKey', 'expectedManifestHash', 'expectedPlanHash', 'repositoryPath', 'stagePath'])
}

function artifactPart(value, expectedBytes = null) {
  if (typeof value !== 'string' || !BASE64URL_PATTERN.test(value)) invalid('STAGE_INTEGRITY_FAILED')
  const bytes = Buffer.from(value, 'base64url')
  if ((expectedBytes !== null && bytes.byteLength !== expectedBytes) || bytes.toString('base64url') !== value) invalid('STAGE_INTEGRITY_FAILED')
  return bytes
}

function parsedArtifact(bytes, expectedManifestHash, expectedPlanHash) {
  if (bytes.byteLength > MAX_STAGE_BYTES) invalid('INPUT_TOO_COMPLEX')
  let parsed
  try {
    parsed = JSON.parse(bytes.toString('utf8'))
  } catch {
    invalid('STAGE_INTEGRITY_FAILED')
  }
  const artifact = exactRecord(parsed, ['algorithm', 'ciphertext', 'iv', 'manifestHash', 'planHash', 'tag', 'version'])
  if (artifact.version !== VERSION || artifact.algorithm !== ALGORITHM || hashValue(artifact.manifestHash, 'STAGE_INTEGRITY_FAILED') !== expectedManifestHash || hashValue(artifact.planHash, 'STAGE_INTEGRITY_FAILED') !== expectedPlanHash) invalid('STAGE_INTEGRITY_FAILED')
  return Object.freeze({ artifact, iv: artifactPart(artifact.iv, 12), ciphertext: artifactPart(artifact.ciphertext), tag: artifactPart(artifact.tag, 16) })
}

function openedPlan(parts, keyValue) {
  let plaintext
  try {
    const decipher = createDecipheriv(ALGORITHM, encryptionKey(keyValue, true), parts.iv)
    decipher.setAAD(stageAad(parts.artifact.manifestHash, parts.artifact.planHash))
    decipher.setAuthTag(parts.tag)
    plaintext = Buffer.concat([decipher.update(parts.ciphertext), decipher.final()])
  } catch (error) {
    if (error instanceof ClinicImportStageError) throw error
    invalid('STAGE_INTEGRITY_FAILED')
  }
  if (plaintext.byteLength > MAX_STAGE_BYTES) invalid('STAGE_INTEGRITY_FAILED')
  let parsed
  try {
    parsed = JSON.parse(plaintext.toString('utf8'))
  } catch {
    invalid('STAGE_INTEGRITY_FAILED')
  }
  const canonical = canonicalized(parsed)
  if (Buffer.from(canonicalJson(canonical), 'utf8').compare(plaintext) !== 0) invalid('STAGE_INTEGRITY_FAILED')
  const opened = protectedInput(canonical, keyValue)
  if (opened.plan.manifestHash !== parts.artifact.manifestHash || opened.planHash !== parts.artifact.planHash) invalid('STAGE_INTEGRITY_FAILED')
  return canonicalized(opened.plan)
}

/** Writes a fully encrypted dry-run stage while proving the target database stayed byte-identical. */
export async function writeClinicImportStage(value, dependencies) {
  try {
    const input = writeInput(value)
    const key = input.encryptionKey
    encryptionKey(key)
    const { randomBytes, afterLink, fileSystem } = dependenciesFrom(dependencies)
    const stage = await outsideStagePath(input.stagePath, input.repositoryPath, fileSystem)
    if (!safePathText(input.databasePath)) invalid('INVALID_STAGE_PATH')
    const before = await regularDigest(input.databasePath, fileSystem)
    const staged = protectedPlan(input.bundle, key, randomBytes)
    const encrypted = encryptedArtifact(staged.plan, staged.plan.manifestHash, staged.planHash, key, randomBytes)
    const after = await regularDigest(input.databasePath, fileSystem)
    if (before.hash !== after.hash || before.byteSize !== after.byteSize) invalid('DATABASE_CHANGED')
    await writeExclusive(stage.target, stage, encrypted.bytes, randomBytes, afterLink, fileSystem)
    return Object.freeze({ version: VERSION, manifestHash: staged.plan.manifestHash, planHash: encrypted.planHash, byteSize: encrypted.bytes.byteLength, summary: stageSummary(staged.plan) })
  } catch (error) {
    if (error instanceof ClinicImportStageError) throw error
    throw new ClinicImportStageError('STAGE_WRITE_FAILED')
  }
}

/** Opens and verifies an encrypted stage without touching any original source file. */
export async function readClinicImportStage(value) {
  try {
    const input = readInput(value)
    const manifestHash = hashValue(input.expectedManifestHash, 'STAGE_INTEGRITY_FAILED')
    const planHash = hashValue(input.expectedPlanHash, 'STAGE_INTEGRITY_FAILED')
    const stage = await outsideStagePath(input.stagePath, input.repositoryPath)
    const snapshot = await regularSnapshot(stage.target, 'INPUT_TOO_COMPLEX', stage.repository)
    const parts = parsedArtifact(snapshot.bytes, manifestHash, planHash)
    const plan = openedPlan(parts, input.encryptionKey)
    return Object.freeze({ version: VERSION, manifestHash, planHash, plan, summary: stageSummary(plan) })
  } catch (error) {
    if (error instanceof ClinicImportStageError && error.code === 'INVALID_STAGE_PATH') throw error
    if (error instanceof ClinicImportStageError && error.code === 'INPUT_TOO_COMPLEX') throw error
    throw new ClinicImportStageError('STAGE_INTEGRITY_FAILED')
  }
}
