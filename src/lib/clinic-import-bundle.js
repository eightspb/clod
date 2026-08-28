import { createHash, createHmac } from 'node:crypto'
import { resolveClinicImportIdentities } from './clinic-import-identities.js'
import { normalizeClinicCard, normalizeImportEmail, normalizeImportPhone, normalizeImportText, normalizeMedeskEhr, normalizePassportDigits, selectBirthDate, selectGender } from './clinic-import-normalization.js'
import { loadClinicImportSources } from './clinic-import-sources.js'
import { resolveClinicImportVisits } from './clinic-import-visits.js'

const VERSION = 1
const HMAC_DOMAIN = 'clod.clinic-import-bundle'
const SOURCE_ROLES = Object.freeze(['pd', 'patients', 'visits', 'invoices', 'pdWorkbook', 'medesk', 'legacyPatients'])
const MEDICAL_ROLE_PATTERN = /(?:attachment|document|medical|record|scan)/iu
const MEDESK_EHR_PATTERN = /^(?:[0-9]{16}|[0-9]{4}(?:-[0-9]{4}){3})$/
const SHA256_PATTERN = /^[a-f0-9]{64}$/
const MAX_SOURCE_ROWS = 250_000
const MAX_SOURCE_ROW_BYTES = 65_536
const MAX_ISSUES = 250_000
const MAX_KEYS = 128
const MAX_DEPTH = 16
const MAX_NODES = 20_000
const MAX_AGGREGATE_INPUT_WORK = 512 * 1024 * 1024
const MAX_CANDIDATES_PER_VISIT = 2_048
const MAX_TOTAL_CANDIDATES = 20_000
const MAX_IDENTITY_EVIDENCE_BUCKET = 256
const MAX_IDENTITY_EVIDENCE_PAIRS = 250_000
const MAGIC_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const CONTROL_KEYS = Object.freeze(['primaryRows', 'medeskEhrIdentifiers', 'patients', 'visits', 'missingDates', 'validBirthDates', 'cardCollisionGroups', 'invoices', 'primaryMerges', 'supplementalPatients', 'nameHistoryRecords'])
const IDENTITY_EVIDENCE_KEYS = Object.freeze(['exactEhr', 'sameFioBirthDate', 'patronymicCorrection', 'surnameChange', 'sameFioMissingBirthDate', 'surnameChangeMissingBirthDate', 'componentConflicts', 'conflictingStrongIdentifiers', 'insufficientEvidence', 'sharedCardDifferentPeople', 'supplementalPatients', 'supplementalEnrichments', 'supplementalIssues'])
const VISIT_EVIDENCE_KEYS = Object.freeze(['total', 'linked', 'ambiguous', 'unmatched', 'exactEhr', 'exactClinicCard', 'leadingZeroClinicCard', 'phoneCompatibleName', 'exactFullName', 'conflictingCommentEvidence', 'missingDate', 'emptyStatus', 'shortRow', 'invalidStartDate', 'invalidEndDate', 'controlCharValue', 'valueTooLarge'])
const VISIT_EVIDENCE = Object.freeze({ exact_ehr: Object.freeze({ code: 'EXACT_EHR', level: 'exact', score: 100 }), exact_clinic_card: Object.freeze({ code: 'EXACT_CLINIC_CARD', level: 'strong', score: 90 }), leading_zero_clinic_card: Object.freeze({ code: 'LEADING_ZERO_CLINIC_CARD', level: 'strong', score: 80 }), phone_compatible_name: Object.freeze({ code: 'PHONE_COMPATIBLE_NAME', level: 'strong', score: 70 }), exact_full_name: Object.freeze({ code: 'EXACT_FULL_NAME', level: 'moderate', score: 60 }), conflicting_comment_evidence: Object.freeze({ code: 'CONFLICTING_COMMENT_EVIDENCE', level: 'moderate', score: 50 }) })
const ERROR_CODES = new Set(['BUNDLE_INVARIANT_FAILED', 'INPUT_TOO_COMPLEX', 'INVALID_BUNDLE_INPUT'])
const ERROR_STAGES = new Set(['adapter', 'identity', 'identity_consents', 'identity_enrichment', 'identity_evidence', 'identity_merge_evidence', 'invariants', 'production_controls', 'relational_invariants', 'report', 'source_capture', 'sources', 'visits'])
const DETAIL_CODES = new Set(['IDENTITY_INVARIANT_FAILED', 'INPUT_TOO_COMPLEX', 'INVALID_IDENTITY_INPUT', 'INVALID_VISIT_INPUT', 'VISIT_INVARIANT_FAILED'])
const SAFE_FIELD_CODES = new Set(['birth_date', 'clinic_card', 'consent', 'email', 'ehr', 'gender', 'inn', 'legacy_join', 'name', 'observed_at', 'passport', 'phone', 'private_data', 'snils'])
const SAFE_ERRORS = new WeakSet()

export const CLINIC_IMPORT_PRODUCTION_CONTROLS = Object.freeze({ primaryRows: 16_187, medeskEhrIdentifiers: 16_189, patients: 16_173, visits: 49_768, missingDates: 2_105, validBirthDates: 14_097, cardCollisionGroups: 74, invoices: 12, primaryMerges: 16, supplementalPatients: 2, nameHistoryRecords: 4 })

/** Represents a value-free clinic import bundle failure. */
export class ClinicImportBundleError extends Error {
  constructor(code = 'INVALID_BUNDLE_INPUT', stage = 'sources', detailCode = null) {
    super('Clinic import bundle could not be prepared')
    this.name = 'ClinicImportBundleError'
    this.code = ERROR_CODES.has(code) ? code : 'INVALID_BUNDLE_INPUT'
    this.stage = ERROR_STAGES.has(stage) ? stage : 'sources'
    this.detailCode = DETAIL_CODES.has(detailCode) ? detailCode : null
    SAFE_ERRORS.add(this)
    Object.freeze(this)
  }
}

function invalid(code = 'INVALID_BUNDLE_INPUT') {
  throw new ClinicImportBundleError(code)
}

function safeErrorCode(error) {
  if (error === null || typeof error !== 'object') return null
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, 'code')
    return descriptor && Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'string' ? descriptor.value : null
  } catch {
    return null
  }
}

function phase(stage, operation) {
  try {
    return operation()
  } catch (error) {
    if (SAFE_ERRORS.has(error)) throw new ClinicImportBundleError(error.code, stage, error.detailCode)
    const detailCode = safeErrorCode(error)
    throw new ClinicImportBundleError(detailCode === 'INPUT_TOO_COMPLEX' ? 'INPUT_TOO_COMPLEX' : 'BUNDLE_INVARIANT_FAILED', stage, detailCode)
  }
}

function exactRecord(value, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid()
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) invalid()
  const actual = Reflect.ownKeys(value)
  if (actual.length !== keys.length || actual.some((key) => typeof key !== 'string') || keys.some((key) => !actual.includes(key))) invalid()
  const result = {}
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

function denseArray(value, maximum = MAX_SOURCE_ROWS) {
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
  if (typeof value !== 'object' || depth > 64 || state.ancestors.has(value)) invalid('INPUT_TOO_COMPLEX')
  state.ancestors.add(value)
  aggregateDebit(state, 32)
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) invalid('INPUT_TOO_COMPLEX')
      const descriptor = Object.getOwnPropertyDescriptor(value, 'length')
      if (!descriptor || !Object.hasOwn(descriptor, 'value') || !Number.isSafeInteger(descriptor.value) || descriptor.value < 0 || descriptor.value > MAX_SOURCE_ROWS) invalid('INPUT_TOO_COMPLEX')
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

function loadedSnapshot(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid()
  const prototype = Object.getPrototypeOf(value)
  const keys = Reflect.ownKeys(value)
  if ((prototype !== Object.prototype && prototype !== null) || keys.length > MAX_KEYS || keys.some((key) => typeof key !== 'string' || MAGIC_KEYS.has(key)) || !['sources', 'manifest'].every((key) => keys.includes(key))) invalid()
  const state = { remaining: MAX_AGGREGATE_INPUT_WORK, ancestors: new WeakSet() }
  const output = Object.create(null)
  for (const key of ['sources', 'manifest']) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) invalid()
    aggregateDebit(state, key.length * 6 + 8)
    output[key] = aggregateSnapshotValue(descriptor.value, state, 1)
  }
  return Object.freeze(output)
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

function boundedValue(value, state, depth = 0) {
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
    if (Array.isArray(value)) return Object.freeze(denseArray(value, MAX_NODES).map((entry) => boundedValue(entry, state, depth + 1)))
    const input = plainRecord(value)
    const result = Object.create(null)
    for (const key of Object.keys(input).sort()) result[key] = boundedValue(input[key], state, depth + 1)
    return Object.freeze(result)
  } finally {
    state.ancestors.delete(value)
  }
}

function boundedPayload(value) {
  const result = boundedValue(value, { nodes: 0, ancestors: new WeakSet() })
  if (Buffer.byteLength(jsonText(result), 'utf8') > MAX_SOURCE_ROW_BYTES) invalid('INPUT_TOO_COMPLEX')
  return result
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function jsonText(value) {
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return String(value)
  if (Array.isArray(value)) return `[${value.map(jsonText).join(',')}]`
  if (value === null || typeof value !== 'object') invalid()
  const parts = []
  for (const key of Object.keys(value)) {
    if (MAGIC_KEYS.has(key)) invalid()
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) invalid()
    parts.push(`${JSON.stringify(key)}:${jsonText(descriptor.value)}`)
  }
  return `{${parts.join(',')}}`
}

function canonical(value) {
  return jsonText(value)
}

function hmac(key, domain, value) {
  return createHmac('sha256', key).update(canonical([HMAC_DOMAIN, VERSION, domain, value]), 'utf8').digest()
}

function uuid(key, domain, value) {
  const bytes = Buffer.from(hmac(key, domain, value).subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x80
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function fingerprintKey(value) {
  if (typeof value !== 'string' || value.trim() !== value) invalid()
  const bytes = Buffer.from(value, 'utf8')
  if (bytes.byteLength < 32 || bytes.byteLength > 4_096 || new Set(bytes).size < 8) invalid()
  return value
}

function sourceReference(row) {
  if (typeof row.sourceName !== 'string' || row.sourceName.length === 0 || row.sourceName.includes('/') || row.sourceName.includes('\\') || !Number.isSafeInteger(row.sourceRow) || row.sourceRow < 1) invalid()
  return Object.freeze({ sourceName: row.sourceName, sourceRow: row.sourceRow })
}

function loadedRow(value, role) {
  const row = exactRecord(value, ['sourceRole', 'sourceName', 'sourceRow', 'structuralIssues', 'values'])
  if (row.sourceRole !== role) invalid('BUNDLE_INVARIANT_FAILED')
  const source = sourceReference(row)
  const values = plainRecord(row.values)
  for (const field of Object.keys(values)) if (typeof values[field] !== 'string') invalid()
  const structuralIssues = denseArray(row.structuralIssues, 1).map((issue) => boundedPayload(issue))
  return Object.freeze({ sourceRole: role, ...source, values, structuralIssues: Object.freeze(structuralIssues) })
}

function sourceFrom(value, role) {
  const source = plainRecord(value)
  if (source.role !== role || source.sourceName === undefined || source.rows === undefined || MEDICAL_ROLE_PATTERN.test(role)) invalid('BUNDLE_INVARIANT_FAILED')
  if (typeof source.sourceName !== 'string' || source.sourceName.includes('/') || source.sourceName.includes('\\') || MEDICAL_ROLE_PATTERN.test(source.sourceName)) invalid('BUNDLE_INVARIANT_FAILED')
  return Object.freeze({ role, sourceName: source.sourceName, rows: Object.freeze(denseArray(source.rows).map((row) => loadedRow(row, role))) })
}

function manifestFrom(value, sources) {
  const manifest = exactRecord(value, ['version', 'files', 'sha256'])
  const files = denseArray(manifest.files, SOURCE_ROLES.length)
  if (manifest.version !== 1 || files.length !== SOURCE_ROLES.length || typeof manifest.sha256 !== 'string' || !SHA256_PATTERN.test(manifest.sha256)) invalid('BUNDLE_INVARIANT_FAILED')
  const normalized = files.map((value, index) => {
    const file = exactRecord(value, ['role', 'filename', 'sha256', 'byteSize', 'rowCount', 'parsingMode', 'structuralIssueCount'])
    const role = SOURCE_ROLES[index]
    const source = sources[role]
    if (file.role !== role || file.filename !== source.sourceName || !SHA256_PATTERN.test(file.sha256) || !Number.isSafeInteger(file.byteSize) || file.byteSize < 0 || !Number.isSafeInteger(file.rowCount) || file.rowCount !== source.rows.length || !Number.isSafeInteger(file.structuralIssueCount) || file.structuralIssueCount !== source.rows.reduce((count, row) => count + row.structuralIssues.length, 0) || typeof file.parsingMode !== 'string') invalid('BUNDLE_INVARIANT_FAILED')
    return Object.freeze({ role, filename: file.filename, sha256: file.sha256, byteSize: file.byteSize, rowCount: file.rowCount, parsingMode: file.parsingMode, structuralIssueCount: file.structuralIssueCount })
  })
  const computed = sha256(Buffer.from(jsonText({ version: 1, files: normalized }), 'utf8'))
  if (computed !== manifest.sha256) invalid('BUNDLE_INVARIANT_FAILED')
  return Object.freeze({ version: 1, files: Object.freeze(normalized), sha256: computed })
}

function loadedResult(value) {
  const loaded = loadedSnapshot(value)
  const rawSources = plainRecord(loaded.sources)
  const keys = Object.keys(rawSources)
  if (keys.length !== SOURCE_ROLES.length || SOURCE_ROLES.some((role) => !Object.hasOwn(rawSources, role)) || keys.some((role) => !SOURCE_ROLES.includes(role) || MEDICAL_ROLE_PATTERN.test(role))) invalid('BUNDLE_INVARIANT_FAILED')
  const sources = Object.freeze(Object.fromEntries(SOURCE_ROLES.map((role) => [role, sourceFrom(rawSources[role], role)])))
  const total = SOURCE_ROLES.reduce((count, role) => count + sources[role].rows.length, 0)
  if (!Number.isSafeInteger(total) || total > MAX_SOURCE_ROWS) invalid('INPUT_TOO_COMPLEX')
  return Object.freeze({ sources, manifest: manifestFrom(loaded.manifest, sources) })
}

function issueCollector(key) {
  const issues = new Map()
  return Object.freeze({ add: (code, source, field) => {
    const safeField = SAFE_FIELD_CODES.has(field) ? field : 'private_data'
    const id = uuid(key, 'normalization-issue', [code, source.sourceName, source.sourceRow, safeField])
    if (!issues.has(id) && issues.size >= MAX_ISSUES) invalid('INPUT_TOO_COMPLEX')
    if (!issues.has(id)) issues.set(id, Object.freeze({ id, code, source, field: safeField }))
  }, values: () => Object.freeze([...issues.values()].sort((first, second) => first.id < second.id ? -1 : first.id > second.id ? 1 : 0)) })
}

function normalizer(issues, source, field, operation) {
  try {
    return operation()
  } catch {
    issues.add('INVALID_NORMALIZED_VALUE', source, field)
    return null
  }
}

function normalizedText(value, issues, source, field) {
  return normalizer(issues, source, field, () => normalizeImportText(value))
}

function exactIndex(rows, selectors) {
  const indexes = selectors.map(() => new Map())
  for (const row of rows) selectors.forEach((selector, index) => {
    const key = selector(row)
    if (key === null || key === '') return
    const values = indexes[index].get(key) ?? []
    values.push(row)
    indexes[index].set(key, values)
  })
  return Object.freeze(indexes)
}

function firstMatch(indexes, keys, issues, source, field) {
  const matches = new Map()
  keys.forEach((key, index) => {
    if (key !== null) for (const row of indexes[index].get(key) ?? []) matches.set(`${row.sourceName}\0${row.sourceRow}`, row)
  })
  const values = [...matches.values()].sort((first, second) => first.sourceRow - second.sourceRow)
  if (values.length > 1) {
    issues.add('AMBIGUOUS_LEFT_JOIN', source, field)
    return null
  }
  return values[0] ?? null
}

function optionalNameKey(values, fields) {
  try {
    const parts = fields.map((field) => normalizeImportText(values[field] ?? ''))
    if (parts[0] === null || parts[1] === null) return null
    return parts.map((part) => part ?? '').join('\0')
  } catch {
    return null
  }
}

function legacyMatch(indexes, ehr, clinicCard, primaryValues, issues, source) {
  const exactEhr = ehr === null ? [] : indexes[0].get(ehr) ?? []
  if (exactEhr.length === 1) return exactEhr[0]
  if (exactEhr.length > 1) {
    issues.add('AMBIGUOUS_LEFT_JOIN', source, 'legacy_join')
    return null
  }
  const cardRows = clinicCard === null ? [] : indexes[1].get(clinicCard) ?? []
  const primaryName = optionalNameKey(primaryValues, ['Фамилия', 'Имя', 'Отчество'])
  const matches = primaryName === null ? [] : cardRows.filter((row) => optionalNameKey(row.values, ['Фамилия', 'Имя', 'Отчество']) === primaryName)
  if (matches.length === 1) return matches[0]
  if (cardRows.length > 0) issues.add(matches.length > 1 ? 'AMBIGUOUS_LEFT_JOIN' : 'INSUFFICIENT_LEFT_JOIN_EVIDENCE', source, 'legacy_join')
  return null
}

function timestamp(value) {
  if (typeof value !== 'string' || value.length === 0) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/.exec(value)
  const date = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value)
  const compact = /^(\d{2})\.(\d{2})\.(\d{4}) ?(\d{2}):(\d{2})$/.exec(value)
  const parts = iso === null ? date ?? compact : iso
  if (parts === null) return null
  const year = Number(iso === null ? parts[3] : parts[1])
  const month = Number(iso === null ? parts[2] : parts[2])
  const day = Number(iso === null ? parts[1] : parts[3])
  const hour = Number(iso === null ? compact?.[4] ?? 0 : parts[4])
  const minute = Number(iso === null ? compact?.[5] ?? 0 : parts[5])
  const second = Number(iso === null ? 0 : parts[6])
  const millisecond = Number(iso === null ? 0 : parts[7])
  const instant = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond))
  if (instant.getUTCFullYear() !== year || instant.getUTCMonth() !== month - 1 || instant.getUTCDate() !== day || instant.getUTCHours() !== hour || instant.getUTCMinutes() !== minute || instant.getUTCSeconds() !== second || instant.getUTCMilliseconds() !== millisecond) return null
  return instant.toISOString()
}

function stableObservedAt(linked) {
  const candidates = [linked.legacy?.values['Дата изменения'], linked.legacy?.values['\uFEFFДата создания'], linked.medesk?.values['Когда добавлен']]
  return candidates.map(timestamp).find((value) => value !== null) ?? null
}

function normalizedEhr(value, issues, source) {
  return normalizer(issues, source, 'ehr', () => normalizeMedeskEhr(value))
}

function optionalEhr(value) {
  return typeof value === 'string' && MEDESK_EHR_PATTERN.test(value) ? normalizeMedeskEhr(value) : null
}

function optionalCard(value) {
  try {
    return normalizeClinicCard(value)
  } catch {
    return null
  }
}

function normalizedCard(value, issues, source) {
  return normalizer(issues, source, 'clinic_card', () => normalizeClinicCard(value))
}

function splitName(value, issues, source) {
  const text = normalizedText(value, issues, source, 'name')
  if (text === null) return Object.freeze({ lastName: null, firstName: null, middleName: null })
  const parts = text.split(' ')
  return Object.freeze({ lastName: parts[0] ?? null, firstName: parts[1] ?? null, middleName: parts.slice(2).join(' ') || null })
}

function contactsFrom(values, issues, source) {
  const candidates = [['phone', values['Телефон 1']], ['phone', values['Телефон 2']], ['email', values['Почта 1']], ['email', values['Почта 2']]]
  const contacts = []
  for (const [kind, raw] of candidates) {
    if (raw === undefined || raw === '') continue
    const value = normalizedContactValue(kind, raw, issues, source)
    if (value !== null && !contacts.some((entry) => entry.kind === kind && entry.value === value)) contacts.push(Object.freeze({ kind, value, isPrimary: !contacts.some((entry) => entry.kind === kind) }))
  }
  return Object.freeze(contacts)
}

function normalizedContactValue(kind, raw, issues, source) {
  return normalizer(issues, source, kind, () => {
    const normalize = kind === 'phone' ? normalizeImportPhone : normalizeImportEmail
    const value = normalize(raw)
    if (value === null || normalize(value) !== value) throw new TypeError('Non-canonical import contact')
    return value
  })
}

function medeskContactsFrom(values, issues, source) {
  const contacts = []
  for (const [kind, field] of [['phone', 'Телефон'], ['email', 'Почта']]) {
    const raw = values[field] ?? ''
    if (raw === '') continue
    const value = normalizedContactValue(kind, raw, issues, source)
    if (value !== null) contacts.push(Object.freeze({ kind, value, isPrimary: true }))
  }
  return Object.freeze(contacts)
}

function checksumInn(value) {
  const digits = [...value].map(Number)
  if (digits.length === 10) return [2, 4, 10, 3, 5, 9, 4, 6, 8].reduce((sum, weight, index) => sum + weight * digits[index], 0) % 11 % 10 === digits[9]
  if (digits.length !== 12) return false
  const tenth = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8].reduce((sum, weight, index) => sum + weight * digits[index], 0) % 11 % 10
  const eleventh = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8].reduce((sum, weight, index) => sum + weight * digits[index], 0) % 11 % 10
  return tenth === digits[10] && eleventh === digits[11]
}

function normalizedInn(value, issues, source) {
  return normalizer(issues, source, 'inn', () => {
    const text = normalizeImportText(value)
    if (text === null) return null
    if (!/^(?:\d{10}|\d{12})$/.test(text) || !checksumInn(text)) throw new TypeError('Invalid INN')
    return text
  })
}

function normalizedSnils(value, issues, source) {
  return normalizer(issues, source, 'snils', () => {
    const text = normalizeImportText(value)
    if (text === null) return null
    if (!/^(?:\d{11}|\d{3}-\d{3}-\d{3} \d{2})$/.test(text)) throw new TypeError('Invalid SNILS')
    const digits = text.replaceAll(/[- ]/g, '')
    const sum = [...digits.slice(0, 9)].reduce((total, digit, index) => total + Number(digit) * (9 - index), 0)
    const remainder = sum < 100 ? sum : sum % 101
    const check = remainder === 100 ? 0 : remainder
    if (check !== Number(digits.slice(9))) throw new TypeError('Invalid SNILS')
    return digits
  })
}

function identifiersFrom(values, issues, source) {
  const series = values['Паспорт (серия)'] ?? ''
  const number = values['Паспорт (номер)'] ?? ''
  const passport = series === '' && number === '' ? null : normalizer(issues, source, 'passport', () => normalizePassportDigits(`${series}${number}`))
  return Object.freeze({ inn: normalizedInn(values['ИНН'] ?? '', issues, source), snils: normalizedSnils(values['СНИЛС'] ?? '', issues, source), passport, contract: normalizedText(values['Номер договора'] ?? '', issues, source, 'private_data') })
}

function consentFrom(legacy, observedAt, issues, source) {
  const value = legacy === null ? null : normalizedText(legacy.values['Согласия на коммуникацию'] ?? '', issues, source, 'consent')
  return Object.freeze([Object.freeze({ type: 'sms_notifications', status: value === null ? 'not_granted' : 'granted', observedAt })])
}

function privateDataFrom(values, linked, birth, gender, identifiers, issues, source) {
  const text = (name) => normalizedText(values[name] ?? '', issues, source, 'private_data')
  const legacyText = (name) => linked.legacy === null ? null : normalizedText(linked.legacy.values[name] ?? '', issues, source, 'private_data')
  return Object.freeze({ gender: gender.value, genderSource: gender.source, genderInferred: gender.inferred, passport: Object.freeze({ series: text('Паспорт (серия)'), number: text('Паспорт (номер)'), issuedBy: text('Паспорт (кем выдан)'), issuedAt: text('Паспорт (дата выдачи)'), departmentCode: text('Паспорт (код подразделения)') }), address: Object.freeze({ postalCode: text('Адрес (индекс)'), region: text('Адрес (область)'), locality: text('Адрес (населенный пункт)'), streetAddress: text('Адрес (улица, дом, кв.)') }), contract: identifiers.contract, inn: identifiers.inn, snils: identifiers.snils, pensionCertificate: text('Номер пенсионного удостоверения'), representatives: text('Представители'), tags: Object.freeze([text('Метки'), linked.patient === null ? null : normalizedText(linked.patient.values.tags ?? '', issues, source, 'private_data')].filter((value) => value !== null)), createdBy: text('Кем создан'), responsibleEmployee: text('Ответственный сотрудник'), legacyCreatedAt: linked.legacy === null ? null : timestamp(linked.legacy.values['\uFEFFДата создания']), legacyUpdatedAt: linked.legacy === null ? null : timestamp(linked.legacy.values['Дата изменения']), notes: legacyText('Заметки'), birthDateSource: birth.source })
}

function joinedRows(sources, issues) {
  const patientIndexes = exactIndex(sources.patients.rows, [(row) => optionalEhr(row.values.ehr ?? '')])
  const workbookIndexes = exactIndex(sources.pdWorkbook.rows, [(row) => optionalEhr(row.values['Номер карты (MEDESK)'] ?? '')])
  const medeskIndexes = exactIndex(sources.medesk.rows, [(row) => optionalEhr(row.values['Карта'] ?? '')])
  const legacyIndexes = exactIndex(sources.legacyPatients.rows, [(row) => optionalEhr(row.values['Системный ID'] ?? ''), (row) => optionalCard(row.values['Номер карты'] ?? '')])
  const candidates = sources.pd.rows.map((row) => {
    const source = sourceReference(row)
    const ehr = normalizedEhr(row.values['Номер карты (MEDESK)'] ?? '', issues, source)
    const clinicCard = normalizedCard(row.values['Номер карты (клиника)'] ?? '', issues, source)
    return Object.freeze({ row, source, ehr, clinicCard, patient: firstMatch(patientIndexes, [ehr], issues, source, 'birth_date'), workbook: firstMatch(workbookIndexes, [ehr], issues, source, 'birth_date'), medesk: firstMatch(medeskIndexes, [ehr], issues, source, 'gender'), legacy: legacyMatch(legacyIndexes, ehr, clinicCard, row.values, issues, source) })
  })
  const owners = new Map()
  for (const candidate of candidates) if (candidate.legacy !== null) {
    const token = `${candidate.legacy.sourceName}\0${candidate.legacy.sourceRow}`
    owners.set(token, (owners.get(token) ?? 0) + 1)
  }
  return candidates.map((candidate) => {
    if (candidate.legacy === null) return candidate
    const token = `${candidate.legacy.sourceName}\0${candidate.legacy.sourceRow}`
    if (owners.get(token) === 1) return candidate
    issues.add('AMBIGUOUS_LEFT_JOIN', candidate.source, 'legacy_join')
    return Object.freeze({ ...candidate, legacy: null })
  })
}

function primaryPatientRows(sources, issues) {
  const joined = joinedRows(sources, issues)
  const legacyAssociations = Object.freeze(joined.filter(({ legacy }) => legacy !== null).map(({ source, legacy }) => Object.freeze({ primary: source, legacy: sourceReference(legacy) })))
  const rows = Object.freeze(joined.map((linked) => {
    const { row, source, ehr, clinicCard } = linked
    const birth = normalizer(issues, source, 'birth_date', () => selectBirthDate({ pd: row.values['Дата рождения'], patientsUtc: linked.patient?.values.birthday, pdXlsx: linked.workbook?.values['Дата рождения'], medesk: linked.medesk?.values['День рождения'] })) ?? Object.freeze({ value: null, source: null })
    const gender = normalizer(issues, source, 'gender', () => selectGender({ pd: row.values['Пол'], medesk: linked.medesk?.values['Пол'], patronymic: row.values['Отчество'] })) ?? Object.freeze({ value: null, source: null, inferred: false })
    const observedAt = stableObservedAt(linked)
    const identifiers = identifiersFrom(row.values, issues, source)
    return Object.freeze({ source, ehr, clinicCard, profile: Object.freeze({ lastName: normalizedText(row.values['Фамилия'] ?? '', issues, source, 'name'), firstName: normalizedText(row.values['Имя'] ?? '', issues, source, 'name'), middleName: normalizedText(row.values['Отчество'] ?? '', issues, source, 'name'), birthDate: birth.value, gender: gender.value }), contacts: contactsFrom(row.values, issues, source), identifiers, privateData: privateDataFrom(row.values, linked, birth, gender, identifiers, issues, source), consents: consentFrom(linked.legacy, observedAt, issues, source), observedAt, sourcePriority: 1 })
  }))
  return Object.freeze({ rows, legacyAssociations })
}

function medeskPatientRows(source, issues, includeSupplementalData = false) {
  return Object.freeze(source.rows.map((row) => {
    const reference = sourceReference(row)
    const profile = splitName(row.values['Имя'] ?? '', issues, reference)
    const birth = normalizer(issues, reference, 'birth_date', () => selectBirthDate({ medesk: row.values['День рождения'] })) ?? Object.freeze({ value: null })
    const gender = normalizer(issues, reference, 'gender', () => selectGender({ medesk: row.values['Пол'], patronymic: profile.middleName })) ?? Object.freeze({ value: null })
    const cardValue = row.values['Карта'] ?? ''
    const ehr = optionalEhr(cardValue)
    const observedAt = timestamp(row.values['Когда добавлен'])
    const contacts = includeSupplementalData ? medeskContactsFrom(row.values, issues, reference) : Object.freeze([])
    const privateData = includeSupplementalData ? Object.freeze({ gender: gender.value, address: normalizedText(row.values['Адрес'] ?? '', issues, reference, 'private_data'), tags: normalizedText(row.values['Метки'] ?? '', issues, reference, 'private_data'), employment: normalizedText(row.values['Работа'] ?? '', issues, reference, 'private_data') }) : Object.freeze({})
    const consents = includeSupplementalData ? Object.freeze([Object.freeze({ type: 'sms_notifications', status: 'not_granted', observedAt })]) : Object.freeze([])
    return Object.freeze({ source: reference, ehr, clinicCard: ehr === null ? optionalCard(cardValue) : null, profile: Object.freeze({ ...profile, birthDate: birth.value, gender: gender.value }), contacts, identifiers: Object.freeze({ inn: null, snils: null, passport: null, contract: null }), privateData, consents, observedAt, sourcePriority: 4 })
  }))
}

function enrichedSupplementalIdentities(identities, medeskRows, key) {
  const supplementalSources = new Set(identities.sourceLinks.filter(({ kind }) => kind === 'medesk_supplemental').map(({ source }) => `${source.sourceName}\0${source.sourceRow}`))
  const rows = Object.freeze(medeskRows.filter(({ source }) => supplementalSources.has(`${source.sourceName}\0${source.sourceRow}`)))
  if (rows.length === 0) return identities
  const supplemental = resolveClinicImportIdentities({ patientRows: rows, medeskRows: Object.freeze([]), visitReferences: Object.freeze([]), fingerprintKey: key })
  const patientIds = new Set(identities.patients.filter(({ isSupplemental }) => isSupplemental).map(({ id }) => id))
  if (supplemental.patients.some(({ id }) => !patientIds.has(id))) invalid('BUNDLE_INVARIANT_FAILED')
  const privateByPatient = new Map(supplemental.privateData.map((value) => [value.patientId, value]))
  return Object.freeze({ ...identities, contacts: Object.freeze([...identities.contacts, ...supplemental.contacts].sort((first, second) => first.id < second.id ? -1 : first.id > second.id ? 1 : 0)), privateData: Object.freeze(identities.privateData.map((value) => privateByPatient.get(value.patientId) ?? value)), consents: Object.freeze([...identities.consents, ...supplemental.consents].sort((first, second) => first.id < second.id ? -1 : first.id > second.id ? 1 : 0)) })
}

function visitReferences(source) {
  return Object.freeze(source.rows.map((row) => {
    const reference = sourceReference(row)
    return Object.freeze({ source: reference, ehr: optionalEhr(row.values.patient_card ?? ''), profile: Object.freeze({ lastName: null, firstName: null, middleName: null, birthDate: null }) })
  }))
}

function identitiesForVisits(identities) {
  return Object.freeze({ patients: identities.patients, externalIdentifiers: identities.externalIdentifiers, contacts: identities.contacts, nameHistory: identities.nameHistory })
}

function identifierOwners(identities, system) {
  const owners = new Map()
  for (const identifier of identities.externalIdentifiers) if (identifier.system === system) {
    const values = owners.get(identifier.value) ?? new Set()
    values.add(identifier.patientId)
    owners.set(identifier.value, values)
  }
  return owners
}

function uniqueOwner(owners, value) {
  const values = value === null ? null : owners.get(value)
  return values?.size === 1 ? [...values][0] : null
}

function inferredSourcePatient(row, ehrOwners) {
  if (row.sourceRole === 'patients') return uniqueOwner(ehrOwners, optionalEhr(row.values.ehr ?? ''))
  if (row.sourceRole === 'pdWorkbook') return uniqueOwner(ehrOwners, optionalEhr(row.values['Номер карты (MEDESK)'] ?? ''))
  if (row.sourceRole === 'medesk') return uniqueOwner(ehrOwners, optionalEhr(row.values['Карта'] ?? ''))
  if (row.sourceRole === 'legacyPatients') return uniqueOwner(ehrOwners, optionalEhr(row.values['Системный ID'] ?? ''))
  if (row.sourceRole === 'invoices') return uniqueOwner(ehrOwners, optionalEhr(row.values.payer_patient_card ?? ''))
  return null
}

function sourceRowsFrom(sources, identities, visits, legacyAssociations, primaryRows, key) {
  const patientLinks = new Map(identities.sourceLinks.map((link) => [`${link.source.sourceName}\0${link.source.sourceRow}`, link.patientId]))
  const visitLinks = new Map(visits.historicalVisits.map((visit) => [`${visit.sourceName}\0${visit.sourceRow}`, visit.id]))
  const visitPatients = new Map(visits.historicalVisits.map((visit) => [visit.id, visit.patientId]))
  const ehrOwners = identifierOwners(identities, 'medesk_ehr')
  const birthDates = new Map(primaryRows.map(({ source, profile }) => [`${source.sourceName}\0${source.sourceRow}`, profile.birthDate !== null]))
  const legacyOwners = new Map()
  for (const association of legacyAssociations) {
    const patientId = patientLinks.get(`${association.primary.sourceName}\0${association.primary.sourceRow}`)
    if (patientId === undefined) continue
    const token = `${association.legacy.sourceName}\0${association.legacy.sourceRow}`
    const owners = legacyOwners.get(token) ?? new Set()
    owners.add(patientId)
    legacyOwners.set(token, owners)
  }
  return Object.freeze(SOURCE_ROLES.flatMap((role) => sources[role].rows.map((row) => {
    const token = `${row.sourceName}\0${row.sourceRow}`
    const historicalVisitId = visitLinks.get(token) ?? null
    const payload = boundedPayload(Object.freeze({ values: row.values, structuralIssues: row.structuralIssues }))
    const birthDateValid = role === 'pd' ? birthDates.get(token) : null
    if (birthDateValid === undefined) invalid('BUNDLE_INVARIANT_FAILED')
    return Object.freeze({ id: uuid(key, 'source-row', [role, row.sourceName, row.sourceRow]), sourceRole: role, sourceName: row.sourceName, sourceRow: row.sourceRow, patientId: patientLinks.get(token) ?? visitPatients.get(historicalVisitId) ?? uniqueOwner(legacyOwners, token) ?? inferredSourcePatient(row, ehrOwners), historicalVisitId, birthDateValid, payload, payloadHash: sha256(Buffer.from(jsonText(payload), 'utf8')), issueCodes: Object.freeze(row.structuralIssues.map(({ code }) => code).filter((code) => typeof code === 'string')) })
  })))
}

function invoicesFrom(source, visits, key) {
  const appointments = new Map()
  for (const detail of visits.visitDetails) {
    const appointment = detail.value.appointment_id
    if (appointment === '') continue
    const values = appointments.get(appointment) ?? []
    values.push(detail.historicalVisitId)
    appointments.set(appointment, values)
  }
  return Object.freeze(source.rows.map((row) => {
    const appointment = row.values.appointment_id ?? ''
    const matches = appointment === '' ? [] : appointments.get(appointment) ?? []
    const payload = boundedPayload(Object.freeze({ values: row.values, structuralIssues: row.structuralIssues }))
    return Object.freeze({ id: uuid(key, 'invoice', [row.sourceName, row.sourceRow]), sourceName: row.sourceName, sourceRow: row.sourceRow, historicalVisitId: matches.length === 1 ? matches[0] : null, status: 'incomplete_source', payload, payloadHash: sha256(Buffer.from(jsonText(payload), 'utf8')) })
  }))
}

function consolidatedConsents(values) {
  const grouped = new Map()
  for (const consent of values) {
    const key = `${consent.patientId}\0${consent.type}`
    const current = grouped.get(key)
    const statusPreferred = current !== undefined && Number(consent.status === 'granted') > Number(current.status === 'granted')
    const knownPreferred = current !== undefined && consent.status === current.status && consent.observedAt !== null && current.observedAt === null
    const laterPreferred = current !== undefined && consent.status === current.status && consent.observedAt !== null && current.observedAt !== null && `${consent.observedAt}:${consent.id}` > `${current.observedAt}:${current.id}`
    const stablePreferred = current !== undefined && consent.status === current.status && consent.observedAt === current.observedAt && consent.id > current.id
    const preferred = current === undefined || statusPreferred || knownPreferred || laterPreferred || stablePreferred
    if (preferred) grouped.set(key, consent)
  }
  return Object.freeze([...grouped.values()].sort((first, second) => first.id < second.id ? -1 : first.id > second.id ? 1 : 0))
}

function uniqueComposite(values, selector) {
  const keys = values.map(selector)
  if (new Set(keys).size !== keys.length) invalid('BUNDLE_INVARIANT_FAILED')
}

function evidenceCounts(value, keys) {
  const input = exactRecord(value, keys)
  const result = Object.create(null)
  for (const key of keys) {
    if (!Number.isSafeInteger(input[key]) || input[key] < 0) invalid('BUNDLE_INVARIANT_FAILED')
    result[key] = input[key]
  }
  return Object.freeze(result)
}

function identityNameKey(value) {
  return value === null ? null : value.toLocaleLowerCase('ru-RU')
}

function identityFullName(row) {
  const { lastName, firstName, middleName } = row.profile
  if (lastName === null || firstName === null || middleName === null) return null
  return `${identityNameKey(lastName)}\0${identityNameKey(firstName)}\0${identityNameKey(middleName)}`
}

function identityGivenName(row) {
  const { firstName, middleName } = row.profile
  if (firstName === null || middleName === null) return null
  return `${identityNameKey(firstName)}\0${identityNameKey(middleName)}`
}

function differentIdentityValue(first, second) {
  return first !== null && second !== null && first !== second
}

function identityIndependentMatch(first, second) {
  const contacts = new Set(first.contacts.map(({ kind, value }) => `${kind}\0${value}`))
  return second.contacts.some(({ kind, value }) => contacts.has(`${kind}\0${value}`)) || ['passport', 'contract'].some((field) => first.identifiers[field] !== null && first.identifiers[field] === second.identifiers[field])
}

function identityMergeReason(first, second) {
  if (differentIdentityValue(first.identifiers.inn, second.identifiers.inn) || differentIdentityValue(first.identifiers.snils, second.identifiers.snils)) return null
  const firstFullName = identityFullName(first)
  const sameFullName = firstFullName !== null && firstFullName === identityFullName(second)
  const firstGivenName = identityGivenName(first)
  const sameGivenName = firstGivenName !== null && firstGivenName === identityGivenName(second)
  const sameLastName = first.profile.lastName !== null && second.profile.lastName !== null && identityNameKey(first.profile.lastName) === identityNameKey(second.profile.lastName)
  const sameFirstName = first.profile.firstName !== null && second.profile.firstName !== null && identityNameKey(first.profile.firstName) === identityNameKey(second.profile.firstName)
  const sameBirthDate = first.profile.birthDate !== null && first.profile.birthDate === second.profile.birthDate
  const oneBirthDateMissing = (first.profile.birthDate === null) !== (second.profile.birthDate === null)
  const bothBirthDatesMissing = first.profile.birthDate === null && second.profile.birthDate === null
  const sameCard = first.clinicCard !== null && first.clinicCard === second.clinicCard
  const independentMatch = identityIndependentMatch(first, second)
  const surnameChanged = sameGivenName && first.profile.lastName !== null && second.profile.lastName !== null && identityNameKey(first.profile.lastName) !== identityNameKey(second.profile.lastName)
  const patronymicChanged = first.profile.middleName !== null && second.profile.middleName !== null && identityNameKey(first.profile.middleName) !== identityNameKey(second.profile.middleName)
  if (first.ehr !== null && first.ehr === second.ehr) return 'exactEhr'
  if (sameFullName && sameBirthDate && sameCard) return 'sameFioBirthDate'
  if (sameLastName && sameFirstName && patronymicChanged && sameBirthDate && sameCard && independentMatch) return 'patronymicCorrection'
  if (surnameChanged && sameBirthDate && sameCard && independentMatch) return 'surnameChange'
  if (sameFullName && oneBirthDateMissing && sameCard) return 'sameFioMissingBirthDate'
  if (sameFullName && bothBirthDatesMissing && sameCard && independentMatch) return 'sameFioMissingBirthDate'
  if (surnameChanged && oneBirthDateMissing && sameCard && independentMatch) return 'surnameChangeMissingBirthDate'
  return null
}

function identityEvidenceKeys(row) {
  const values = []
  const fullName = identityFullName(row)
  const givenName = identityGivenName(row)
  if (row.ehr !== null) values.push(canonical(['ehr', row.ehr]))
  if (fullName !== null) values.push(canonical(['full-name', fullName]))
  if (row.clinicCard !== null) values.push(canonical(['clinic-card', row.clinicCard]))
  if (givenName !== null && row.profile.birthDate !== null && row.clinicCard !== null) values.push(canonical(['surname-birth-card', givenName, row.profile.birthDate, row.clinicCard]))
  if (givenName !== null) {
    for (const contact of row.contacts) values.push(canonical(['surname-contact', givenName, contact.kind, contact.value]))
    for (const field of ['passport', 'contract']) if (row.identifiers[field] !== null) values.push(canonical(['surname-identifier', givenName, field, row.identifiers[field]]))
  }
  return new Set(values)
}

function identityMergePairs(rows) {
  const index = new Map()
  rows.forEach((row, rowIndex) => {
    for (const evidenceKey of identityEvidenceKeys(row)) {
      const values = index.get(evidenceKey) ?? []
      values.push(rowIndex)
      index.set(evidenceKey, values)
    }
  })
  const pairs = new Set()
  let operations = 0
  for (const values of index.values()) {
    if (values.length > MAX_IDENTITY_EVIDENCE_BUCKET) invalid('INPUT_TOO_COMPLEX')
    operations += values.length * (values.length - 1) / 2
    if (operations > MAX_IDENTITY_EVIDENCE_PAIRS) invalid('INPUT_TOO_COMPLEX')
    for (let first = 0; first < values.length; first += 1) for (let second = first + 1; second < values.length; second += 1) {
      pairs.add(values[first] * rows.length + values[second])
      if (pairs.size > MAX_IDENTITY_EVIDENCE_PAIRS) invalid('INPUT_TOO_COMPLEX')
    }
  }
  return [...pairs].map((pair) => {
    const firstIndex = Math.floor(pair / rows.length)
    const secondIndex = pair % rows.length
    const reason = identityMergeReason(rows[firstIndex], rows[secondIndex])
    const rowKey = canonical([canonical(['source', rows[firstIndex].source.sourceName, rows[firstIndex].source.sourceRow]), canonical(['source', rows[secondIndex].source.sourceName, rows[secondIndex].source.sourceRow])].sort())
    return Object.freeze({ firstIndex, secondIndex, reason, rowKey })
  }).filter(({ reason }) => reason !== null).sort((first, second) => Number(second.reason === 'exactEhr') - Number(first.reason === 'exactEhr') || first.rowKey.localeCompare(second.rowKey))
}

function identityMergeEvidence(rows, identities) {
  const parents = rows.map((_row, index) => index)
  const metadata = rows.map((row) => ({ birthDate: row.profile.birthDate, inn: row.identifiers.inn, snils: row.identifiers.snils }))
  const find = (value) => {
    let root = value
    while (parents[root] !== root) root = parents[root]
    while (parents[value] !== value) {
      const parent = parents[value]
      parents[value] = root
      value = parent
    }
    return root
  }
  const ownerBySource = new Map(identities.sourceLinks.filter(({ kind }) => kind === 'patient').map(({ patientId, source }) => [`${source.sourceName}\0${source.sourceRow}`, patientId]))
  const result = []
  for (const pair of identityMergePairs(rows)) {
    const firstRoot = find(pair.firstIndex)
    const secondRoot = find(pair.secondIndex)
    if (firstRoot === secondRoot) continue
    const firstMetadata = metadata[firstRoot]
    const secondMetadata = metadata[secondRoot]
    if (['birthDate', 'inn', 'snils'].some((field) => differentIdentityValue(firstMetadata[field], secondMetadata[field]))) continue
    const [parent, child] = firstRoot < secondRoot ? [firstRoot, secondRoot] : [secondRoot, firstRoot]
    parents[child] = parent
    metadata[parent] = { birthDate: firstMetadata.birthDate ?? secondMetadata.birthDate, inn: firstMetadata.inn ?? secondMetadata.inn, snils: firstMetadata.snils ?? secondMetadata.snils }
    const sources = [rows[pair.firstIndex].source, rows[pair.secondIndex].source].sort((first, second) => canonical([first.sourceName, first.sourceRow]).localeCompare(canonical([second.sourceName, second.sourceRow])))
    const patientId = ownerBySource.get(`${sources[0].sourceName}\0${sources[0].sourceRow}`)
    if (patientId === undefined || ownerBySource.get(`${sources[1].sourceName}\0${sources[1].sourceRow}`) !== patientId) invalid('BUNDLE_INVARIANT_FAILED')
    result.push(Object.freeze({ ordinal: result.length + 1, patientId, reason: pair.reason, sources: Object.freeze(sources) }))
  }
  return Object.freeze(result)
}

function validateIdentityEvidence(identities, mergeEvidence) {
  const expected = evidenceCounts(identities.evidenceCounts, IDENTITY_EVIDENCE_KEYS)
  const counts = Object.fromEntries(IDENTITY_EVIDENCE_KEYS.map((key) => [key, 0]))
  for (const merge of mergeEvidence) counts[merge.reason] += 1
  const issueCounts = Object.create(null)
  for (const issue of identities.issues) issueCounts[issue.code] = (issueCounts[issue.code] ?? 0) + 1
  counts.componentConflicts = issueCounts.COMPONENT_IDENTITY_CONFLICT ?? 0
  counts.conflictingStrongIdentifiers = issueCounts.CONFLICTING_STRONG_IDENTIFIER ?? 0
  counts.insufficientEvidence = issueCounts.INSUFFICIENT_IDENTITY_EVIDENCE ?? 0
  counts.sharedCardDifferentPeople = issueCounts.SHARED_CARD_DIFFERENT_PEOPLE ?? 0
  counts.supplementalPatients = identities.patients.filter(({ isSupplemental }) => isSupplemental).length
  counts.supplementalEnrichments = identities.sourceLinks.filter(({ source, kind }) => source.sourceName === 'medesk.csv' && kind === 'patient').length
  counts.supplementalIssues = identities.issues.filter(({ code }) => code.startsWith('SUPPLEMENTAL_')).length
  if (IDENTITY_EVIDENCE_KEYS.some((key) => counts[key] !== expected[key])) invalid('BUNDLE_INVARIANT_FAILED')
  return Object.freeze(counts)
}

function validateBundleParts(manifest, identities, consents, visits, normalizationIssues, sourceRows, invoices, attachments) {
  const expectedRows = manifest.files.reduce((count, file) => count + file.rowCount, 0)
  if (sourceRows.length !== expectedRows || visits.historicalVisits.length !== visits.visitDetails.length || visits.evidenceCounts.total !== visits.historicalVisits.length || visits.evidenceCounts.linked + visits.evidenceCounts.ambiguous + visits.evidenceCounts.unmatched !== visits.evidenceCounts.total || invoices.length !== manifest.files.find(({ role }) => role === 'invoices').rowCount || attachments.length !== 0) invalid('BUNDLE_INVARIANT_FAILED')
  const patientIds = new Set(identities.patients.map(({ id }) => id))
  const supplementalPatientIds = new Set(identities.patients.filter(({ isSupplemental }) => isSupplemental).map(({ id }) => id))
  const privateDataPatientIds = new Set(identities.privateData.map(({ patientId }) => patientId))
  const externalIdentifierPatientIds = new Set(identities.externalIdentifiers.map(({ patientId }) => patientId))
  if (patientIds.size !== identities.patients.length) invalid('BUNDLE_INVARIANT_FAILED')
  for (const patientId of patientIds) if (!privateDataPatientIds.has(patientId) || !externalIdentifierPatientIds.has(patientId)) invalid('BUNDLE_INVARIANT_FAILED')
  if (consents.length !== patientIds.size || new Set(consents.map(({ patientId, type }) => `${patientId}\0${type}`)).size !== patientIds.size) invalid('BUNDLE_INVARIANT_FAILED')
  for (const consent of consents) if (!patientIds.has(consent.patientId) || consent.type !== 'sms_notifications' || !['granted', 'not_granted'].includes(consent.status) || (supplementalPatientIds.has(consent.patientId) && consent.status !== 'not_granted')) invalid('BUNDLE_INVARIANT_FAILED')
  const allIds = [identities.patients, identities.externalIdentifiers, identities.contacts, identities.nameHistory, identities.privateData, consents, identities.sourceLinks, visits.historicalVisits, visits.visitDetails, visits.candidates, identities.issues, visits.issues, normalizationIssues, sourceRows, invoices, attachments].flat().map(({ id }) => id)
  if (new Set(allIds).size !== allIds.length) invalid('BUNDLE_INVARIANT_FAILED')
  uniqueComposite(identities.externalIdentifiers, ({ patientId, identityKey }) => `${patientId}\0${identityKey}`)
  uniqueComposite(identities.contacts, ({ patientId, kind, fingerprint }) => `${patientId}\0${kind}\0${fingerprint}`)
  uniqueComposite(visits.candidates, ({ historicalVisitId, patientId }) => `${historicalVisitId}\0${patientId}`)
  if (visits.candidates.length > MAX_TOTAL_CANDIDATES) invalid('INPUT_TOO_COMPLEX')
  const visitByCoordinate = new Map(visits.historicalVisits.map((visit) => [`${visit.sourceName}\0${visit.sourceRow}`, visit]))
  const visitById = new Map(visits.historicalVisits.map((visit) => [visit.id, visit]))
  const visitRows = sourceRows.filter(({ sourceRole }) => sourceRole === 'visits')
  if (visitRows.length !== visits.historicalVisits.length || visitByCoordinate.size !== visits.historicalVisits.length) invalid('BUNDLE_INVARIANT_FAILED')
  for (const row of visitRows) {
    const visit = visitByCoordinate.get(`${row.sourceName}\0${row.sourceRow}`)
    if (visit === undefined || row.historicalVisitId !== visit.id || row.patientId !== visit.patientId) invalid('BUNDLE_INVARIANT_FAILED')
  }
  const candidateCounts = new Map()
  for (const candidate of visits.candidates) {
    const visit = visitById.get(candidate.historicalVisitId)
    if (visit === undefined || !patientIds.has(candidate.patientId)) invalid('BUNDLE_INVARIANT_FAILED')
    const evidence = visit.linkMethod === null ? null : VISIT_EVIDENCE[visit.linkMethod]
    if (evidence === null || candidate.evidenceCode !== evidence.code || candidate.score !== evidence.score) invalid('BUNDLE_INVARIANT_FAILED')
    const count = (candidateCounts.get(candidate.historicalVisitId) ?? 0) + 1
    if (count > MAX_CANDIDATES_PER_VISIT) invalid('INPUT_TOO_COMPLEX')
    candidateCounts.set(candidate.historicalVisitId, count)
  }
  for (const visit of visits.historicalVisits) {
    const count = candidateCounts.get(visit.id) ?? 0
    const evidence = visit.linkMethod === null ? null : VISIT_EVIDENCE[visit.linkMethod]
    if ((visit.linkStatus === 'ambiguous' && count < 2) || (visit.linkStatus !== 'ambiguous' && count !== 0) || (evidence === null && visit.evidenceLevel !== 'none') || (evidence !== null && visit.evidenceLevel !== evidence.level)) invalid('BUNDLE_INVARIANT_FAILED')
  }
  const appointmentVisits = new Map()
  for (const detail of visits.visitDetails) {
    const appointment = detail.value.appointment_id
    if (appointment === '') continue
    const matches = appointmentVisits.get(appointment) ?? []
    matches.push(detail.historicalVisitId)
    appointmentVisits.set(appointment, matches)
  }
  for (const invoice of invoices) {
    const appointment = invoice.payload.values.appointment_id
    const matches = appointment === undefined || appointment === '' ? [] : appointmentVisits.get(appointment) ?? []
    const expected = matches.length === 1 ? matches[0] : null
    if (invoice.historicalVisitId !== expected) invalid('BUNDLE_INVARIANT_FAILED')
  }
  const ehrs = identities.externalIdentifiers.filter(({ system }) => system === 'medesk_ehr').map(({ globalFingerprint }) => globalFingerprint)
  if (ehrs.includes(null) || new Set(ehrs).size !== ehrs.length) invalid('BUNDLE_INVARIANT_FAILED')
  evidenceCounts(visits.evidenceCounts, VISIT_EVIDENCE_KEYS)
}

function cardCollisionGroups(identities) {
  const rows = new Map()
  for (const identifier of identities.externalIdentifiers) if (identifier.system === 'clinic_card') {
    const values = rows.get(identifier.fingerprint) ?? new Set()
    for (const source of identifier.sources) if (source.sourceName === '544663c3807aab090001bad8PD.csv') values.add(`${source.sourceName}\0${source.sourceRow}`)
    rows.set(identifier.fingerprint, values)
  }
  return [...rows.values()].filter((values) => values.size > 1).length
}

function controlsFrom(manifest, identities, visits, invoices, patientRows) {
  const primaryRows = manifest.files.find(({ role }) => role === 'pd').rowCount
  const primaryPatients = identities.patients.filter(({ isSupplemental }) => !isSupplemental).length
  return Object.freeze({ primaryRows, medeskEhrIdentifiers: identities.externalIdentifiers.filter(({ system }) => system === 'medesk_ehr').length, patients: identities.patients.length, visits: visits.historicalVisits.length, missingDates: visits.evidenceCounts.missingDate, validBirthDates: patientRows.filter(({ profile }) => profile.birthDate !== null).length, cardCollisionGroups: cardCollisionGroups(identities), invoices: invoices.length, primaryMerges: primaryRows - primaryPatients, supplementalPatients: identities.patients.length - primaryPatients, nameHistoryRecords: identities.nameHistory.length })
}

function expectedControlsFrom(value) {
  if (value === undefined) return null
  const controls = exactRecord(value, CONTROL_KEYS)
  for (const key of CONTROL_KEYS) if (!Number.isSafeInteger(controls[key]) || controls[key] < 0) invalid()
  return controls
}

function verifyControls(expected, actual) {
  if (expected !== null && CONTROL_KEYS.some((key) => expected[key] !== actual[key])) invalid('BUNDLE_INVARIANT_FAILED')
}

function safeReport(manifest, identities, identityEvidenceCounts, consents, visits, sourceRows, invoices, normalizationIssues, controls) {
  const byRole = Object.freeze(Object.fromEntries(SOURCE_ROLES.map((role) => [role, sourceRows.filter((row) => row.sourceRole === role).length])))
  return Object.freeze({ version: VERSION, manifestHash: manifest.sha256, sourceRows: Object.freeze({ total: sourceRows.length, byRole }), patients: Object.freeze({ total: identities.patients.length, supplemental: identities.patients.filter(({ isSupplemental }) => isSupplemental).length, externalIdentifiers: identities.externalIdentifiers.length, medeskEhrIdentifiers: identities.externalIdentifiers.filter(({ system }) => system === 'medesk_ehr').length, contacts: identities.contacts.length, nameHistory: identities.nameHistory.length, consents: consents.length, evidenceCounts: identityEvidenceCounts }), visits: evidenceCounts(visits.evidenceCounts, VISIT_EVIDENCE_KEYS), invoices: Object.freeze({ total: invoices.length, incomplete: invoices.length }), attachments: Object.freeze({ total: 0 }), issues: Object.freeze({ normalization: normalizationIssues.length, identity: identities.issues.length, visits: visits.issues.length }), controls })
}

function composedBundle(loaded, key, expectedControls) {
  const issues = issueCollector(key)
  const adapted = phase('adapter', () => {
    const primary = primaryPatientRows(loaded.sources, issues)
    return Object.freeze({ patientRows: primary.rows, legacyAssociations: primary.legacyAssociations, medeskRows: medeskPatientRows(loaded.sources.medesk, issues), fullMedeskRows: medeskPatientRows(loaded.sources.medesk, issues, true), references: visitReferences(loaded.sources.visits) })
  })
  const resolvedIdentities = phase('identity', () => resolveClinicImportIdentities({ patientRows: adapted.patientRows, medeskRows: adapted.medeskRows, visitReferences: adapted.references, fingerprintKey: key }))
  const identities = phase('identity_enrichment', () => enrichedSupplementalIdentities(resolvedIdentities, adapted.fullMedeskRows, key))
  const visits = phase('visits', () => resolveClinicImportVisits({ identities: identitiesForVisits(identities), visitRows: loaded.sources.visits.rows, fingerprintKey: key }))
  const consents = phase('identity_consents', () => consolidatedConsents(identities.consents))
  const sourceRows = phase('source_capture', () => sourceRowsFrom(loaded.sources, identities, visits, adapted.legacyAssociations, adapted.patientRows, key))
  const invoices = phase('source_capture', () => invoicesFrom(loaded.sources.invoices, visits, key))
  const attachments = Object.freeze([])
  const normalizationIssues = phase('adapter', () => issues.values())
  const mergeEvidence = phase('identity_merge_evidence', () => identityMergeEvidence(adapted.patientRows, identities))
  const identityEvidenceCounts = phase('identity_evidence', () => validateIdentityEvidence(identities, mergeEvidence))
  phase('relational_invariants', () => validateBundleParts(loaded.manifest, identities, consents, visits, normalizationIssues, sourceRows, invoices, attachments))
  const controls = phase('production_controls', () => controlsFrom(loaded.manifest, identities, visits, invoices, adapted.patientRows))
  phase('production_controls', () => verifyControls(expectedControls, controls))
  const report = phase('report', () => safeReport(loaded.manifest, identities, identityEvidenceCounts, consents, visits, sourceRows, invoices, normalizationIssues, controls))
  return Object.freeze({ version: VERSION, manifest: loaded.manifest, patients: identities.patients, externalIdentifiers: identities.externalIdentifiers, contacts: identities.contacts, nameHistory: identities.nameHistory, privateData: identities.privateData, consents, sourceLinks: identities.sourceLinks, historicalVisits: visits.historicalVisits, visitDetails: visits.visitDetails, visitCandidates: visits.candidates, identityIssues: identities.issues, visitIssues: visits.issues, normalizationIssues, sourceRows, invoices, attachments, identityMergeEvidence: mergeEvidence, identityEvidenceCounts, visitEvidenceCounts: visits.evidenceCounts, report })
}

function dependenciesFrom(value) {
  if (value === undefined) return Object.freeze({ loadSources: loadClinicImportSources })
  const input = exactRecord(value, ['loadSources'])
  if (typeof input.loadSources !== 'function') invalid()
  return input
}

function requestInput(value, production) {
  const input = plainRecord(value)
  const keys = Object.keys(input)
  if (!keys.includes('fingerprintKey') || !keys.includes('sourcePaths') || keys.some((key) => !['expectedControls', 'fingerprintKey', 'sourcePaths'].includes(key))) invalid()
  if (production && Object.hasOwn(input, 'expectedControls')) invalid()
  const expectedControls = production ? CLINIC_IMPORT_PRODUCTION_CONTROLS : Object.hasOwn(input, 'expectedControls') ? expectedControlsFrom(input.expectedControls) : null
  return Object.freeze({ fingerprintKey: input.fingerprintKey, sourcePaths: input.sourcePaths, expectedControls })
}

/** Loads the seven approved sources and composes a complete immutable import bundle. */
export async function createClinicImportBundle(value, dependencies) {
  try {
    const input = requestInput(value, dependencies === undefined)
    const key = fingerprintKey(input.fingerprintKey)
    const { loadSources } = dependenciesFrom(dependencies)
    const loaded = loadedResult(await loadSources(input.sourcePaths))
    return composedBundle(loaded, key, input.expectedControls)
  } catch (error) {
    if (SAFE_ERRORS.has(error)) throw error
    throw new ClinicImportBundleError('BUNDLE_INVARIANT_FAILED')
  }
}
