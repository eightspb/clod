import { createHash, randomBytes as secureRandomBytes } from 'node:crypto'
import { decryptPatientProfile, fingerprintContactPhone, normalizeContactPhone } from './contact-identity.js'
import { fingerprintClinicImportIdentity, fingerprintClinicImportVisit } from './clinic-import-fingerprints.js'
import { normalizeImportText } from './clinic-import-normalization.js'
import { readClinicImportStage } from './clinic-import-stage.js'
import { decryptProtectedData, encryptProtectedData, fingerprintProtectedValue } from './protected-patient-data.js'

const ERROR_CODES = new Set(['IMPORT_FAILED', 'IMPORT_RECONCILIATION_FAILED', 'INVALID_STORE_INPUT', 'MANIFEST_CONFLICT', 'STAGE_VERIFICATION_FAILED', 'TRANSACTION_CLEANUP_FAILED'])
const SAFE_ERRORS = new WeakSet()
const HASH_PATTERN = /^[a-f0-9]{64}$/
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const INSERT_CHUNK = 250
const COUNT_CHUNK = 500
const CONTROL_OR_FORMAT_PATTERN = /[\p{Cc}\p{Cf}]/u
const PROTECTED_COLUMNS = new Set(['appointmentIdCiphertext', 'candidatesCiphertext', 'ciphertext', 'detailsCiphertext', 'doctorCiphertext', 'lastNameCiphertext', 'payloadCiphertext', 'profileCiphertext', 'sourceIdentifierCiphertext'])
const VOLATILE_COLUMNS = new Set(['createdAt', 'updatedAt'])
const PROTECTED_DOMAINS = Object.freeze({ 'HistoricalInvoice.payloadCiphertext': 'invoice', 'HistoricalVisit.appointmentIdCiphertext': 'visit_details', 'HistoricalVisit.detailsCiphertext': 'visit_details', 'HistoricalVisit.doctorCiphertext': 'visit_details', 'ImportIssue.candidatesCiphertext': 'source_row', 'ImportIssue.detailsCiphertext': 'source_row', 'ImportSourceRow.payloadCiphertext': 'source_row', 'PatientContact.ciphertext': 'contact', 'PatientExternalIdentifier.ciphertext': 'external_identifier', 'PatientNameHistory.lastNameCiphertext': 'name_history', 'PatientNameHistory.sourceIdentifierCiphertext': 'name_history', 'PatientPrivateData.profileCiphertext': 'private_profile' })

/** Represents a value-free failure while applying a clinic import stage. */
export class ClinicImportStoreError extends Error {
  constructor(code = 'IMPORT_FAILED') {
    super('Clinic import stage could not be applied')
    this.name = 'ClinicImportStoreError'
    this.code = ERROR_CODES.has(code) ? code : 'IMPORT_FAILED'
    SAFE_ERRORS.add(this)
    Object.freeze(this)
  }
}

function invalid(code = 'INVALID_STORE_INPUT') {
  throw new ClinicImportStoreError(code)
}

function exactRecord(value, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid()
  let prototype
  let actual
  try {
    prototype = Object.getPrototypeOf(value)
    actual = Reflect.ownKeys(value)
  } catch {
    invalid()
  }
  if ((prototype !== Object.prototype && prototype !== null) || actual.length !== keys.length || actual.some((key) => typeof key !== 'string') || keys.some((key) => !actual.includes(key))) invalid()
  const result = Object.create(null)
  for (const key of keys) {
    let descriptor
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key)
    } catch {
      invalid()
    }
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) invalid()
    result[key] = descriptor.value
  }
  return Object.freeze(result)
}

function safeClient(value) {
  if (value === null || typeof value !== 'object') invalid()
  let execute
  let transaction
  try {
    execute = value.execute
    transaction = value.transaction
  } catch {
    invalid()
  }
  if (typeof execute !== 'function' || typeof transaction !== 'function') invalid()
  return Object.freeze({ execute: execute.bind(value), transaction: transaction.bind(value) })
}

function hash(value) {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) invalid()
  return value
}

function timestamp(value) {
  if (typeof value !== 'string' || !TIMESTAMP_PATTERN.test(value) || new Date(value).toISOString() !== value) invalid()
  return value
}

function dependenciesFrom(value) {
  if (value === undefined) return Object.freeze({ clock: () => new Date().toISOString(), randomBytes: secureRandomBytes })
  const input = exactRecord(value, ['clock', 'randomBytes'])
  if (typeof input.clock !== 'function' || typeof input.randomBytes !== 'function') invalid()
  return input
}

function inputFrom(value) {
  const input = exactRecord(value, ['client', 'encryptionKey', 'expectedManifestHash', 'expectedPlanHash', 'fingerprintKey', 'repositoryPath', 'stagePath'])
  return Object.freeze({ ...input, client: safeClient(input.client), expectedManifestHash: hash(input.expectedManifestHash), expectedPlanHash: hash(input.expectedPlanHash) })
}

function deterministicUuid(value) {
  const bytes = Buffer.from(createHash('sha256').update(`clod.clinic-import-batch\0v1\0${value}`, 'utf8').digest().subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x80
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function seal(domain, value, configuration) {
  return encryptProtectedData({ domain, value, key: configuration.encryptionKey, randomBytes: configuration.randomBytes })
}

function identityFingerprint(configuration, domain, value) {
  return fingerprintClinicImportIdentity({ key: configuration.fingerprintKey, domain, value })
}

function visitFingerprint(configuration, domain, value) {
  return fingerprintClinicImportVisit({ key: configuration.fingerprintKey, domain, value })
}

function canonicalEmail(value) {
  if (typeof value !== 'string' || value.length > 320 || value.normalize('NFC') !== value || value.toLowerCase() !== value || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(value)) invalid()
  return value
}

function appointmentValue(value) {
  if (typeof value !== 'string') invalid()
  if (value.length > 8_192 || [...value].length > 4_096 || CONTROL_OR_FORMAT_PATTERN.test(value)) return null
  return normalizeImportText(value)
}

function primaryPhones(contacts) {
  const result = new Map()
  for (const contact of contacts) if (contact.kind === 'phone' && contact.isPrimary) {
    if (result.has(contact.patientId)) invalid()
    result.set(contact.patientId, contact)
  }
  return result
}

function preparedPatients(plan, configuration, contacts, profiles) {
  const phones = primaryPhones(contacts)
  return Object.freeze(plan.patients.map((patient) => {
    const phone = phones.get(patient.id) ?? null
    const profile = profiles.get(patient.id)
    if (profile === undefined || (profile.phone === null) !== (phone === null) || (profile.phone !== null && profile.phone !== phone.normalizedValue)) invalid()
    return Object.freeze({ id: patient.id, profileCiphertext: patient.profileEnvelope, phoneMask: phone?.mask ?? null, phoneFingerprint: phone?.fingerprint ?? null, firstSeenAt: patient.firstSeenAt, lastSeenAt: patient.lastSeenAt, createdAt: configuration.now, updatedAt: configuration.now, piiDestroyedAt: null })
  }))
}

function preparedIdentifiers(plan, configuration) {
  return Object.freeze(plan.externalIdentifiers.map((record) => {
    const protectedValue = exactRecord(decryptProtectedData({ domain: 'external_identifier', envelope: record.valueEnvelope, key: configuration.encryptionKey }), ['value'])
    const fingerprint = identityFingerprint(configuration, `external:${record.system}`, protectedValue.value)
    const globalFingerprint = record.system === 'medesk_ehr' ? identityFingerprint(configuration, 'external-global:medesk_ehr', protectedValue.value) : null
    const identityKey = identityFingerprint(configuration, 'external-identity', [record.patientId, record.system, protectedValue.value])
    if (record.fingerprint !== fingerprint || record.globalFingerprint !== globalFingerprint || record.identityKey !== identityKey) invalid()
    return Object.freeze({ id: record.id, patientId: record.patientId, system: record.system, ciphertext: record.valueEnvelope, fingerprint, globalFingerprint, identityKey, sourceName: record.source.sourceName, sourceRow: record.source.sourceRow, isPrimary: Number(record.isPrimary), createdAt: configuration.now, updatedAt: configuration.now })
  }))
}

function preparedContacts(plan, configuration) {
  const phoneFingerprints = new Set()
  const rows = plan.contacts.map((record) => {
    const contact = exactRecord(decryptProtectedData({ domain: 'contact', envelope: record.valueEnvelope, key: configuration.encryptionKey }), ['value'])
    const identity = identityFingerprint(configuration, `contact:${record.kind}`, contact.value)
    if (record.fingerprint !== identity) invalid()
    let fingerprint = identity
    let normalizedValue = contact.value
    if (record.kind === 'phone') {
      normalizedValue = normalizeContactPhone(contact.value)
      if (contact.value !== normalizedValue) invalid()
      fingerprint = fingerprintContactPhone({ phone: normalizedValue, key: configuration.fingerprintKey })
      phoneFingerprints.add(fingerprint)
    } else canonicalEmail(contact.value)
    return Object.freeze({ id: record.id, patientId: record.patientId, kind: record.kind, ciphertext: record.valueEnvelope, fingerprint, mask: record.mask, isPrimary: Number(record.isPrimary), sourceName: record.source.sourceName, firstSeenAt: record.firstSeenAt, lastSeenAt: record.lastSeenAt, piiDestroyedAt: null, normalizedValue })
  })
  return Object.freeze({ rows: Object.freeze(rows), phoneFingerprints: Object.freeze([...phoneFingerprints].sort()) })
}

function preparedNameHistory(plan, configuration) {
  return Object.freeze(plan.nameHistory.map((record) => {
    const value = exactRecord(decryptProtectedData({ domain: 'name_history', envelope: record.valueEnvelope, key: configuration.encryptionKey }), ['lastName', 'sourceIdentifier'])
    return Object.freeze({ id: record.id, patientId: record.patientId, lastNameCiphertext: seal('name_history', Object.freeze({ lastName: value.lastName }), configuration), lastNameFingerprint: fingerprintProtectedValue({ domain: 'name_history', value: value.lastName, key: configuration.fingerprintKey }), sourceName: record.source.sourceName, sourceIdentifierCiphertext: seal('name_history', Object.freeze({ sourceIdentifier: value.sourceIdentifier }), configuration), observedAt: record.observedAt, reason: record.reason, piiDestroyedAt: null })
  }))
}

function preparedPrivateData(plan, configuration) {
  return Object.freeze(plan.privateData.map((record) => Object.freeze({ id: record.id, patientId: record.patientId, profileCiphertext: record.valueEnvelope, createdAt: configuration.now, updatedAt: configuration.now, piiDestroyedAt: null })))
}

function preparedConsents(plan, configuration) {
  return Object.freeze(plan.consents.map((record) => Object.freeze({ id: record.id, patientId: record.patientId, type: record.type, status: record.status, sourceName: record.source.sourceName, observedAt: record.observedAt, createdAt: configuration.now, updatedAt: configuration.now })))
}

function preparedVisits(plan, batchId, configuration) {
  const details = new Map(plan.visitDetails.map((record) => [record.historicalVisitId, record]))
  return Object.freeze(plan.historicalVisits.map((record) => {
    const protectedDetail = details.get(record.id)
    const detail = decryptProtectedData({ domain: 'visit_details', envelope: protectedDetail.valueEnvelope, key: configuration.encryptionKey })
    const appointmentId = appointmentValue(detail.appointment_id)
    const appointmentIdFingerprint = appointmentId === null ? null : visitFingerprint(configuration, 'appointment-id', appointmentId)
    if (record.appointmentIdFingerprint !== appointmentIdFingerprint) invalid()
    return Object.freeze({ id: record.id, batchId, sourceName: record.sourceName, sourceRow: record.sourceRow, patientId: record.patientId, appointmentIdCiphertext: appointmentId === null ? null : seal('visit_details', Object.freeze({ appointmentId }), configuration), appointmentIdFingerprint, startsAt: record.startsAt, endsAt: record.endsAt, sourceStatus: record.sourceStatus, doctorCiphertext: seal('visit_details', Object.freeze({ doctor: detail.doctor }), configuration), detailsCiphertext: protectedDetail.valueEnvelope, linkStatus: record.linkStatus, linkMethod: record.linkMethod, evidenceLevel: record.evidenceLevel, createdAt: configuration.now, piiDestroyedAt: null })
  }))
}

function preparedCandidates(plan, configuration) {
  return Object.freeze(plan.visitCandidates.map((record) => Object.freeze({ ...record, createdAt: configuration.now })))
}

function preparedSourceRows(plan, batchId, configuration) {
  return Object.freeze(plan.sourceRows.map((record) => Object.freeze({ id: record.id, batchId, sourceName: record.sourceName, sourceRow: record.sourceRow, patientId: record.patientId, historicalVisitId: record.historicalVisitId, payloadCiphertext: record.payloadEnvelope, payloadHash: record.payloadHash, createdAt: configuration.now, piiDestroyedAt: null })))
}

function issueSource(issue, kind, visitById) {
  if (kind !== 'visit') return issue.source
  const visit = visitById.get(issue.historicalVisitId)
  return Object.freeze({ sourceName: visit.sourceName, sourceRow: visit.sourceRow })
}

function preparedIssues(plan, batchId, configuration) {
  const visitById = new Map(plan.historicalVisits.map((record) => [record.id, record]))
  const sourceByCoordinate = new Map(plan.sourceRows.map((record) => [`${record.sourceName}\0${record.sourceRow}`, record]))
  const groups = [['identity', plan.identityIssues], ['visit', plan.visitIssues], ['normalization', plan.normalizationIssues]]
  return Object.freeze(groups.flatMap(([kind, values]) => values.map((issue) => {
    const source = issueSource(issue, kind, visitById)
    const linked = sourceByCoordinate.get(`${source.sourceName}\0${source.sourceRow}`)
    const candidates = kind === 'identity' ? issue.candidatePatientIds : Object.freeze([])
    const historicalVisitId = kind === 'visit' ? issue.historicalVisitId : linked?.historicalVisitId ?? null
    const patientId = candidates.length === 1 ? candidates[0] : linked?.patientId ?? visitById.get(historicalVisitId)?.patientId ?? null
    const details = Object.freeze({ category: kind, field: issue.field ?? null })
    return Object.freeze({ id: issue.id, batchId, sourceName: source.sourceName, sourceRow: source.sourceRow, code: issue.code, patientId, historicalVisitId, candidatesCiphertext: candidates.length === 0 ? null : seal('source_row', Object.freeze({ value: candidates }), configuration), detailsCiphertext: seal('source_row', details, configuration), createdAt: configuration.now, resolvedAt: null })
  })))
}

function preparedInvoices(plan, batchId, configuration) {
  return Object.freeze(plan.invoices.map((record) => Object.freeze({ id: record.id, batchId, sourceName: record.sourceName, sourceRow: record.sourceRow, historicalVisitId: record.historicalVisitId, payloadCiphertext: record.payloadEnvelope, sourceStatus: record.status, createdAt: configuration.now, piiDestroyedAt: null })))
}

function verifyControls(plan) {
  const pd = plan.manifest.files.find(({ role }) => role === 'pd')
  if (pd === undefined) invalid()
  const primaryPatients = plan.patients.filter(({ isSupplemental }) => !isSupplemental).length
  const cards = new Map()
  for (const identifier of plan.externalIdentifiers) if (identifier.system === 'clinic_card') {
    const sources = cards.get(identifier.fingerprint) ?? new Set()
    for (const source of identifier.sources) if (source.sourceName === pd.filename) sources.add(`${source.sourceName}\0${source.sourceRow}`)
    cards.set(identifier.fingerprint, sources)
  }
  const actual = Object.freeze({ primaryRows: plan.sourceRows.filter(({ sourceRole }) => sourceRole === 'pd').length, medeskEhrIdentifiers: plan.externalIdentifiers.filter(({ system }) => system === 'medesk_ehr').length, patients: plan.patients.length, visits: plan.historicalVisits.length, missingDates: plan.historicalVisits.filter(({ startsAt, issueCodes }) => startsAt === null && !issueCodes.includes('INVALID_START_DATE')).length, validBirthDates: plan.sourceRows.filter(({ sourceRole, birthDateValid }) => sourceRole === 'pd' && birthDateValid).length, cardCollisionGroups: [...cards.values()].filter((sources) => sources.size > 1).length, invoices: plan.invoices.length, primaryMerges: pd.rowCount - primaryPatients, supplementalPatients: plan.patients.length - primaryPatients, nameHistoryRecords: plan.nameHistory.length })
  const expected = plan.report.controls
  if (Object.keys(actual).some((key) => actual[key] !== expected[key])) invalid()
}

function preparedPlan(opened, input, dependencies) {
  const now = timestamp(dependencies.clock())
  const batchId = deterministicUuid(opened.manifestHash)
  const configuration = Object.freeze({ encryptionKey: input.encryptionKey, fingerprintKey: input.fingerprintKey, randomBytes: dependencies.randomBytes, now })
  fingerprintProtectedValue({ domain: 'name_history', value: 'clinic-import-key-check', key: configuration.fingerprintKey })
  const plan = opened.plan
  verifyControls(plan)
  const profiles = new Map(plan.patients.map((patient) => [patient.id, decryptPatientProfile({ envelope: patient.profileEnvelope, key: configuration.encryptionKey })]))
  const contacts = preparedContacts(plan, configuration)
  const contactRows = Object.freeze(contacts.rows.map((record) => Object.freeze({ id: record.id, patientId: record.patientId, kind: record.kind, ciphertext: record.ciphertext, fingerprint: record.fingerprint, mask: record.mask, isPrimary: record.isPrimary, sourceName: record.sourceName, firstSeenAt: record.firstSeenAt, lastSeenAt: record.lastSeenAt, piiDestroyedAt: record.piiDestroyedAt })))
  return Object.freeze({ batchId, now, patientIds: Object.freeze(plan.patients.map(({ id }) => id)), visitIds: Object.freeze(plan.historicalVisits.map(({ id }) => id)), batchIds: Object.freeze([batchId]), patients: preparedPatients(plan, configuration, contacts.rows, profiles), externalIdentifiers: preparedIdentifiers(plan, configuration), contacts: contactRows, phoneFingerprints: contacts.phoneFingerprints, nameHistory: preparedNameHistory(plan, configuration), privateData: preparedPrivateData(plan, configuration), consents: preparedConsents(plan, configuration), historicalVisits: preparedVisits(plan, batchId, configuration), candidates: preparedCandidates(plan, configuration), sourceRows: preparedSourceRows(plan, batchId, configuration), issues: preparedIssues(plan, batchId, configuration), invoices: preparedInvoices(plan, batchId, configuration) })
}

const INSERTS = Object.freeze([
  Object.freeze({ name: 'Patient', columns: Object.freeze(['id', 'profileCiphertext', 'phoneMask', 'phoneFingerprint', 'firstSeenAt', 'lastSeenAt', 'createdAt', 'updatedAt', 'piiDestroyedAt']), key: 'patients', scopeColumn: 'id', scopeKey: 'patientIds' }),
  Object.freeze({ name: 'PatientExternalIdentifier', columns: Object.freeze(['id', 'patientId', 'system', 'ciphertext', 'fingerprint', 'globalFingerprint', 'identityKey', 'sourceName', 'sourceRow', 'isPrimary', 'createdAt', 'updatedAt']), key: 'externalIdentifiers', scopeColumn: 'patientId', scopeKey: 'patientIds' }),
  Object.freeze({ name: 'PatientContact', columns: Object.freeze(['id', 'patientId', 'kind', 'ciphertext', 'fingerprint', 'mask', 'isPrimary', 'sourceName', 'firstSeenAt', 'lastSeenAt', 'piiDestroyedAt']), key: 'contacts', scopeColumn: 'patientId', scopeKey: 'patientIds' }),
  Object.freeze({ name: 'PatientNameHistory', columns: Object.freeze(['id', 'patientId', 'lastNameCiphertext', 'lastNameFingerprint', 'sourceName', 'sourceIdentifierCiphertext', 'observedAt', 'reason', 'piiDestroyedAt']), key: 'nameHistory', scopeColumn: 'patientId', scopeKey: 'patientIds' }),
  Object.freeze({ name: 'PatientPrivateData', columns: Object.freeze(['id', 'patientId', 'profileCiphertext', 'createdAt', 'updatedAt', 'piiDestroyedAt']), key: 'privateData', scopeColumn: 'patientId', scopeKey: 'patientIds' }),
  Object.freeze({ name: 'PatientConsent', columns: Object.freeze(['id', 'patientId', 'type', 'status', 'sourceName', 'observedAt', 'createdAt', 'updatedAt']), key: 'consents', scopeColumn: 'patientId', scopeKey: 'patientIds' }),
  Object.freeze({ name: 'HistoricalVisit', columns: Object.freeze(['id', 'batchId', 'sourceName', 'sourceRow', 'patientId', 'appointmentIdCiphertext', 'appointmentIdFingerprint', 'startsAt', 'endsAt', 'sourceStatus', 'doctorCiphertext', 'detailsCiphertext', 'linkStatus', 'linkMethod', 'evidenceLevel', 'createdAt', 'piiDestroyedAt']), key: 'historicalVisits', scopeColumn: 'batchId', scopeKey: 'batchIds' }),
  Object.freeze({ name: 'HistoricalVisitCandidate', columns: Object.freeze(['id', 'historicalVisitId', 'patientId', 'evidenceCode', 'score', 'createdAt']), key: 'candidates', scopeColumn: 'historicalVisitId', scopeKey: 'visitIds' }),
  Object.freeze({ name: 'ImportSourceRow', columns: Object.freeze(['id', 'batchId', 'sourceName', 'sourceRow', 'patientId', 'historicalVisitId', 'payloadCiphertext', 'payloadHash', 'createdAt', 'piiDestroyedAt']), key: 'sourceRows', scopeColumn: 'batchId', scopeKey: 'batchIds' }),
  Object.freeze({ name: 'ImportIssue', columns: Object.freeze(['id', 'batchId', 'sourceName', 'sourceRow', 'code', 'patientId', 'historicalVisitId', 'candidatesCiphertext', 'detailsCiphertext', 'createdAt', 'resolvedAt']), key: 'issues', scopeColumn: 'batchId', scopeKey: 'batchIds' }),
  Object.freeze({ name: 'HistoricalInvoice', columns: Object.freeze(['id', 'batchId', 'sourceName', 'sourceRow', 'historicalVisitId', 'payloadCiphertext', 'sourceStatus', 'createdAt', 'piiDestroyedAt']), key: 'invoices', scopeColumn: 'batchId', scopeKey: 'batchIds' })
])

async function insertRows(transaction, definition, rows) {
  const placeholders = definition.columns.map(() => '?').join(', ')
  const sql = `INSERT INTO ${definition.name} (${definition.columns.join(', ')}) VALUES (${placeholders})`
  for (let offset = 0; offset < rows.length; offset += INSERT_CHUNK) await transaction.batch(rows.slice(offset, offset + INSERT_CHUNK).map((row) => ({ sql, args: definition.columns.map((column) => row[column]) })))
}

function resultRows(value) {
  try {
    if (value === null || typeof value !== 'object') invalid('IMPORT_RECONCILIATION_FAILED')
    const rowsDescriptor = Object.getOwnPropertyDescriptor(value, 'rows')
    if (!rowsDescriptor || !Object.hasOwn(rowsDescriptor, 'value') || !Array.isArray(rowsDescriptor.value)) invalid('IMPORT_RECONCILIATION_FAILED')
    const rows = rowsDescriptor.value
    const lengthDescriptor = Object.getOwnPropertyDescriptor(rows, 'length')
    const length = lengthDescriptor?.value
    if (!Number.isSafeInteger(length) || length < 0 || length > COUNT_CHUNK + 1) invalid('IMPORT_RECONCILIATION_FAILED')
    const keys = Reflect.ownKeys(rows)
    if (keys.length !== length + 1 || !keys.includes('length')) invalid('IMPORT_RECONCILIATION_FAILED')
    const output = []
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(rows, String(index))
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid('IMPORT_RECONCILIATION_FAILED')
      output.push(resultRow(descriptor.value))
    }
    return Object.freeze(output)
  } catch (error) {
    if (SAFE_ERRORS.has(error)) throw error
    invalid('IMPORT_RECONCILIATION_FAILED')
  }
}

function resultRow(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid('IMPORT_RECONCILIATION_FAILED')
  const prototype = Object.getPrototypeOf(value)
  const keys = Reflect.ownKeys(value)
  if ((prototype !== Object.prototype && prototype !== null) || keys.length > 64 || keys.some((key) => typeof key !== 'string')) invalid('IMPORT_RECONCILIATION_FAILED')
  const output = Object.create(null)
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid('IMPORT_RECONCILIATION_FAILED')
    output[key] = descriptor.value
  }
  return Object.freeze(output)
}

function storedValue(row, column) {
  if (!Object.hasOwn(row, column)) invalid('IMPORT_RECONCILIATION_FAILED')
  return row[column]
}

function semanticEnvelope(definition, column, actual, expected, encryptionKey) {
  if (expected === null) return actual === null
  if (typeof actual !== 'string') return false
  try {
    const openedActual = definition.name === 'Patient' && column === 'profileCiphertext' ? decryptPatientProfile({ envelope: actual, key: encryptionKey }) : decryptProtectedData({ domain: PROTECTED_DOMAINS[`${definition.name}.${column}`], envelope: actual, key: encryptionKey })
    const openedExpected = definition.name === 'Patient' && column === 'profileCiphertext' ? decryptPatientProfile({ envelope: expected, key: encryptionKey }) : decryptProtectedData({ domain: PROTECTED_DOMAINS[`${definition.name}.${column}`], envelope: expected, key: encryptionKey })
    return JSON.stringify(openedActual) === JSON.stringify(openedExpected)
  } catch {
    return false
  }
}

function reconciledValue(definition, column, actual, expected, exact, encryptionKey, persistedAt) {
  if (exact || (!PROTECTED_COLUMNS.has(column) && !VOLATILE_COLUMNS.has(column))) return actual === expected
  if (PROTECTED_COLUMNS.has(column)) return semanticEnvelope(definition, column, actual, expected, encryptionKey)
  return actual === persistedAt
}

function safeCount(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value
  if (typeof value === 'bigint' && value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(value)
  invalid('IMPORT_RECONCILIATION_FAILED')
}

async function exactCardinality(executor, prepared, definition) {
  const scopeValues = prepared[definition.scopeKey]
  const expected = new Map(scopeValues.map((value) => [value, 0]))
  for (const row of prepared[definition.key]) {
    const value = row[definition.scopeColumn]
    if (!expected.has(value)) invalid('IMPORT_RECONCILIATION_FAILED')
    expected.set(value, expected.get(value) + 1)
  }
  for (let offset = 0; offset < scopeValues.length; offset += COUNT_CHUNK) {
    const values = scopeValues.slice(offset, offset + COUNT_CHUNK)
    const rows = resultRows(await executor.execute({ sql: `SELECT COUNT(*) AS total FROM ${definition.name} WHERE ${definition.scopeColumn} IN (${values.map(() => '?').join(', ')})`, args: values }))
    const expectedCount = values.reduce((total, value) => total + expected.get(value), 0)
    if (rows.length !== 1 || safeCount(storedValue(rows[0], 'total')) !== expectedCount) invalid('IMPORT_RECONCILIATION_FAILED')
  }
}

async function reconcile(executor, prepared, exact, encryptionKey, persistedAt = prepared.now) {
  for (const definition of INSERTS) {
    const expectedRows = prepared[definition.key]
    await exactCardinality(executor, prepared, definition)
    for (let offset = 0; offset < expectedRows.length; offset += COUNT_CHUNK) {
      const expected = expectedRows.slice(offset, offset + COUNT_CHUNK)
      const ids = expected.map(({ id }) => id)
      const rows = resultRows(await executor.execute({ sql: `SELECT ${definition.columns.join(', ')} FROM ${definition.name} WHERE id IN (${ids.map(() => '?').join(', ')})`, args: ids }))
      if (rows.length !== expected.length) invalid('IMPORT_RECONCILIATION_FAILED')
      const byId = new Map(rows.map((row) => [storedValue(row, 'id'), row]))
      if (byId.size !== rows.length) invalid('IMPORT_RECONCILIATION_FAILED')
      for (const record of expected) {
        const row = byId.get(record.id)
        if (row === undefined || definition.columns.some((column) => !reconciledValue(definition, column, storedValue(row, column), record[column], exact, encryptionKey, persistedAt))) invalid('IMPORT_RECONCILIATION_FAILED')
      }
    }
  }
}

async function synchronizeMango(transaction, prepared) {
  for (let offset = 0; offset < prepared.phoneFingerprints.length; offset += COUNT_CHUNK) {
    const fingerprints = prepared.phoneFingerprints.slice(offset, offset + COUNT_CHUNK)
    const values = fingerprints.map(() => '(?)').join(', ')
    const sql = `WITH affected(fingerprint) AS (VALUES ${values}), candidates(fingerprint, patientId) AS (SELECT a.fingerprint, p.id FROM affected a JOIN Patient p ON p.phoneFingerprint = a.fingerprint AND p.piiDestroyedAt IS NULL UNION SELECT a.fingerprint, p.id FROM affected a JOIN PatientContact c ON c.kind = 'phone' AND c.fingerprint = a.fingerprint AND c.piiDestroyedAt IS NULL JOIN Patient p ON p.id = c.patientId AND p.piiDestroyedAt IS NULL), resolutions(fingerprint, patientId) AS (SELECT fingerprint, CASE WHEN COUNT(*) = 1 THEN MIN(patientId) ELSE NULL END FROM candidates GROUP BY fingerprint) UPDATE MangoCall SET patientId = (SELECT patientId FROM resolutions WHERE fingerprint = MangoCall.callerFingerprint), updatedAt = max(updatedAt, ?) WHERE callerFingerprint IN (SELECT fingerprint FROM affected) AND piiDestroyedAt IS NULL`
    await transaction.execute({ sql, args: [...fingerprints, prepared.now] })
  }
}

async function existingBatch(client, manifestHash) {
  const rows = resultRows(await client.execute({ sql: 'SELECT id, manifestHash, planHash, mode, status, controlTotals, createdAt, completedAt FROM ImportBatch WHERE manifestHash = ? LIMIT 2', args: [manifestHash] }))
  if (rows.length > 1) invalid('MANIFEST_CONFLICT')
  return rows[0] ?? null
}

function safeResult(opened, prepared, applied) {
  return Object.freeze({ batchId: prepared.batchId, manifestHash: opened.manifestHash, planHash: opened.planHash, status: 'completed', applied, controls: opened.plan.report.controls, summary: opened.summary })
}

async function transactionFor(client) {
  const transaction = await client.transaction('write')
  const methods = Object.create(null)
  let valid = transaction !== null && typeof transaction === 'object'
  for (const name of ['execute', 'batch', 'commit', 'rollback', 'close']) {
    try { methods[name] = transaction?.[name] } catch { valid = false }
    if (typeof methods[name] !== 'function') valid = false
  }
  if (valid) return Object.freeze(Object.fromEntries(Object.entries(methods).map(([name, method]) => [name, method.bind(transaction)])))
  let cleanupFailed = false
  try { if (typeof methods.rollback === 'function') await methods.rollback.call(transaction); else cleanupFailed = true } catch { cleanupFailed = true }
  try { if (typeof methods.close === 'function') await methods.close.call(transaction); else cleanupFailed = true } catch { cleanupFailed = true }
  invalid(cleanupFailed ? 'TRANSACTION_CLEANUP_FAILED' : 'IMPORT_FAILED')
}

async function appliedResult(input, opened, prepared) {
  const transaction = await transactionFor(input.client)
  let failure = null
  let result = null
  try {
    const existing = await existingBatch(transaction, opened.manifestHash)
    if (existing !== null) {
      if (existing.id !== prepared.batchId || existing.manifestHash !== opened.manifestHash || existing.planHash !== opened.planHash || existing.mode !== 'apply' || existing.status !== 'completed' || existing.controlTotals !== JSON.stringify(opened.plan.report.controls) || existing.createdAt !== existing.completedAt) invalid('MANIFEST_CONFLICT')
      try { timestamp(existing.createdAt) } catch { invalid('MANIFEST_CONFLICT') }
      await reconcile(transaction, prepared, false, input.encryptionKey, existing.createdAt)
      result = safeResult(opened, prepared, false)
    } else {
      await transaction.execute({ sql: 'INSERT INTO ImportBatch (id, manifestHash, planHash, mode, status, controlTotals, createdAt, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: [prepared.batchId, opened.manifestHash, opened.planHash, 'apply', 'applying', JSON.stringify(opened.plan.report.controls), prepared.now, null] })
      for (const definition of INSERTS) await insertRows(transaction, definition, prepared[definition.key])
      await synchronizeMango(transaction, prepared)
      await reconcile(transaction, prepared, true, input.encryptionKey)
      await transaction.execute({ sql: "UPDATE ImportBatch SET status = 'completed', completedAt = ? WHERE id = ? AND status = 'applying'", args: [prepared.now, prepared.batchId] })
      const rows = resultRows(await transaction.execute({ sql: 'SELECT status, completedAt FROM ImportBatch WHERE id = ? LIMIT 2', args: [prepared.batchId] }))
      if (rows.length !== 1 || storedValue(rows[0], 'status') !== 'completed' || storedValue(rows[0], 'completedAt') !== prepared.now) invalid('IMPORT_RECONCILIATION_FAILED')
      result = safeResult(opened, prepared, true)
    }
    await transaction.commit()
  } catch (error) {
    failure = SAFE_ERRORS.has(error) ? error : new ClinicImportStoreError('IMPORT_FAILED')
    try { await transaction.rollback() } catch { failure = new ClinicImportStoreError('TRANSACTION_CLEANUP_FAILED') }
  }
  try { await transaction.close() } catch { failure = new ClinicImportStoreError('TRANSACTION_CLEANUP_FAILED') }
  if (failure !== null) throw failure
  return result
}

async function verifiedStage(input) {
  try {
    return await readClinicImportStage({ stagePath: input.stagePath, repositoryPath: input.repositoryPath, encryptionKey: input.encryptionKey, expectedManifestHash: input.expectedManifestHash, expectedPlanHash: input.expectedPlanHash })
  } catch {
    throw new ClinicImportStoreError('STAGE_VERIFICATION_FAILED')
  }
}

/** Applies one fully verified clinic import stage to its target database. */
export async function applyClinicImportStage(value, dependencies) {
  try {
    const input = inputFrom(value)
    const runtime = dependenciesFrom(dependencies)
    const opened = await verifiedStage(input)
    const prepared = preparedPlan(opened, input, runtime)
    return await appliedResult(input, opened, prepared)
  } catch (error) {
    if (SAFE_ERRORS.has(error)) throw error
    throw new ClinicImportStoreError('IMPORT_FAILED')
  }
}
