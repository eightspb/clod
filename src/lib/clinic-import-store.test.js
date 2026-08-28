import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it, onTestFinished } from 'vitest'
import { fingerprintContactPhone } from './contact-identity.js'
import { writeClinicImportStage } from './clinic-import-stage.js'
import { applyClinicImportStage } from './clinic-import-store.js'
import { createPatientRecords } from './patient-records.js'
import { fingerprintClinicImportIdentity, fingerprintClinicImportVisit } from './clinic-import-fingerprints.js'
import { encryptProtectedData } from './protected-patient-data.js'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const MIGRATION_SCRIPT = join(PROJECT_ROOT, 'scripts/init-db.mjs')
const ENCRYPTION_KEY = Buffer.from('store-encryption-key-synthetic-3').toString('base64')
const FINGERPRINT_KEY = 'store-fingerprint-key-synthetic-2026-secure'
const SOURCE_ROLES = Object.freeze(['pd', 'patients', 'visits', 'invoices', 'pdWorkbook', 'medesk', 'legacyPatients'])
const SOURCE_NAMES = Object.freeze({ pd: '544663c3807aab090001bad8PD.csv', patients: '544663c3807aab090001bad8_patients.csv', visits: '544663c3807aab090001bad8_visits.csv', invoices: '544663c3807aab090001bad8_invoices.csv', pdWorkbook: '544663c3807aab090001bad8PD — копия.xlsx', medesk: 'medesk.csv', legacyPatients: 'Vse pacienty.xlsx' })
const ROW_COUNTS = Object.freeze({ pd: 2, patients: 0, visits: 2, invoices: 1, pdWorkbook: 0, medesk: 0, legacyPatients: 0 })
const MANIFEST_FILES = Object.freeze(SOURCE_ROLES.map((role, index) => Object.freeze({ role, filename: SOURCE_NAMES[role], sha256: String(index + 1).repeat(64), byteSize: index + 1, rowCount: ROW_COUNTS[role], parsingMode: role === 'visits' ? 'legacy_physical_rows' : 'strict', structuralIssueCount: 0 })))
const MANIFEST_HASH = createHash('sha256').update(JSON.stringify({ version: 1, files: MANIFEST_FILES })).digest('hex')
const SECRET_VALUES = Object.freeze(['Скрытая Фамилия', '+79991112233', '0000000000007001', 'appointment-secret', 'Скрытый врач', 'Скрытый комментарий', 'Скрытый адрес', 'Скрытая услуга'])
const PATIENT_ID = '00000000-0000-8000-8000-000000000001'
const SECOND_PATIENT_ID = '00000000-0000-8000-8000-000000000031'
const VISIT_IDS = Object.freeze(['00000000-0000-8000-8000-000000000002', '00000000-0000-8000-8000-000000000012'])
const OPERATIONAL_PHONE = '+79991112233'
const CANONICAL_PHONE = '79991112233'
const IDENTITY_EVIDENCE = Object.freeze({ exactEhr: 0, sameFioBirthDate: 0, patronymicCorrection: 0, surnameChange: 0, sameFioMissingBirthDate: 0, surnameChangeMissingBirthDate: 0, componentConflicts: 0, conflictingStrongIdentifiers: 0, insufficientEvidence: 0, sharedCardDifferentPeople: 0, supplementalPatients: 0, supplementalEnrichments: 0, supplementalIssues: 0 })
const VISIT_EVIDENCE = Object.freeze({ total: 2, linked: 1, ambiguous: 1, unmatched: 0, exactEhr: 1, exactClinicCard: 0, leadingZeroClinicCard: 0, phoneCompatibleName: 0, exactFullName: 1, conflictingCommentEvidence: 0, missingDate: 1, emptyStatus: 0, shortRow: 0, invalidStartDate: 0, invalidEndDate: 0, controlCharValue: 0, valueTooLarge: 0 })
const CONTROLS = Object.freeze({ primaryRows: 2, medeskEhrIdentifiers: 2, patients: 2, visits: 2, missingDates: 1, validBirthDates: 2, cardCollisionGroups: 0, invoices: 1, primaryMerges: 0, supplementalPatients: 0, nameHistoryRecords: 1 })

function identityFingerprint(domain, value) {
  return fingerprintClinicImportIdentity({ key: FINGERPRINT_KEY, domain, value })
}

function visitFingerprint(domain, value) {
  return fingerprintClinicImportVisit({ key: FINGERPRINT_KEY, domain, value })
}

const APPOINTMENT_FINGERPRINT = visitFingerprint('appointment-id', 'appointment-secret')

function source(sourceRow) {
  return Object.freeze({ sourceName: SOURCE_NAMES.pd, sourceRow })
}

function payloadHash(payload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

function testBundle() {
  const patientPayload = Object.freeze({ structuralIssues: Object.freeze([]), values: Object.freeze({ surname: 'Скрытая Фамилия' }) })
  const secondPatientPayload = Object.freeze({ structuralIssues: Object.freeze([]), values: Object.freeze({ surname: 'Другая Фамилия' }) })
  const firstVisitPayload = Object.freeze({ structuralIssues: Object.freeze([]), values: Object.freeze({ appointment_id: 'appointment-secret', doctor: 'Скрытый врач' }) })
  const secondVisitPayload = Object.freeze({ structuralIssues: Object.freeze([]), values: Object.freeze({ appointment_id: 'appointment-secret', comment: 'Скрытый комментарий' }) })
  const invoicePayload = Object.freeze({ structuralIssues: Object.freeze([]), values: Object.freeze({ appointment_id: 'appointment-secret', service_name: 'Скрытая услуга' }) })
  const detail = (id, historicalVisitId, value) => Object.freeze({ id, historicalVisitId, value })
  return Object.freeze({
    version: 1,
    manifest: Object.freeze({ version: 1, files: MANIFEST_FILES, sha256: MANIFEST_HASH }),
    patients: Object.freeze([Object.freeze({ id: PATIENT_ID, profile: Object.freeze({ lastName: 'Скрытая Фамилия', firstName: 'Ия', middleName: 'Тестовна', birthDate: '1988-02-29', gender: 'female', primaryPhone: CANONICAL_PHONE }), firstSeenAt: null, lastSeenAt: null, isSupplemental: false }), Object.freeze({ id: SECOND_PATIENT_ID, profile: Object.freeze({ lastName: 'Другая Фамилия', firstName: 'Ия', middleName: 'Тестовна', birthDate: '1990-01-01', gender: 'female', primaryPhone: null }), firstSeenAt: null, lastSeenAt: null, isSupplemental: false })]),
    externalIdentifiers: Object.freeze([Object.freeze({ id: '00000000-0000-8000-8000-000000000003', patientId: PATIENT_ID, system: 'medesk_ehr', value: '0000000000007001', fingerprint: identityFingerprint('external:medesk_ehr', '0000000000007001'), globalFingerprint: identityFingerprint('external-global:medesk_ehr', '0000000000007001'), identityKey: identityFingerprint('external-identity', [PATIENT_ID, 'medesk_ehr', '0000000000007001']), isPrimary: true, source: source(2), sources: Object.freeze([source(2)]) }), Object.freeze({ id: '00000000-0000-8000-8000-000000000032', patientId: SECOND_PATIENT_ID, system: 'medesk_ehr', value: '0000000000007002', fingerprint: identityFingerprint('external:medesk_ehr', '0000000000007002'), globalFingerprint: identityFingerprint('external-global:medesk_ehr', '0000000000007002'), identityKey: identityFingerprint('external-identity', [SECOND_PATIENT_ID, 'medesk_ehr', '0000000000007002']), isPrimary: true, source: source(3), sources: Object.freeze([source(3)]) })]),
    contacts: Object.freeze([Object.freeze({ id: '00000000-0000-8000-8000-000000000004', patientId: PATIENT_ID, kind: 'phone', value: CANONICAL_PHONE, fingerprint: identityFingerprint('contact:phone', CANONICAL_PHONE), mask: '+7 •••••••• 33', isPrimary: true, source: source(2), sources: Object.freeze([source(2)]), firstSeenAt: null, lastSeenAt: null })]),
    nameHistory: Object.freeze([Object.freeze({ id: '00000000-0000-8000-8000-000000000005', patientId: PATIENT_ID, lastName: 'Скрытая Фамилия', source: source(2), sourceIdentifier: '0000000000007001', observedAt: null, reason: 'identity_alias' })]),
    privateData: Object.freeze([Object.freeze({ id: '00000000-0000-8000-8000-000000000006', patientId: PATIENT_ID, value: Object.freeze({ address: 'Скрытый адрес', gender: 'female' }), sources: Object.freeze([source(2)]) }), Object.freeze({ id: '00000000-0000-8000-8000-000000000033', patientId: SECOND_PATIENT_ID, value: Object.freeze({ address: null, gender: 'female' }), sources: Object.freeze([source(3)]) })]),
    consents: Object.freeze([Object.freeze({ id: '00000000-0000-8000-8000-000000000007', patientId: PATIENT_ID, type: 'sms_notifications', status: 'granted', observedAt: null, source: source(2) }), Object.freeze({ id: '00000000-0000-8000-8000-000000000034', patientId: SECOND_PATIENT_ID, type: 'sms_notifications', status: 'not_granted', observedAt: null, source: source(3) })]),
    sourceLinks: Object.freeze([]),
    historicalVisits: Object.freeze([Object.freeze({ id: VISIT_IDS[0], sourceName: SOURCE_NAMES.visits, sourceRow: 2, patientId: null, appointmentIdFingerprint: APPOINTMENT_FINGERPRINT, startsAt: '2024-02-29T09:15:00.000Z', endsAt: '2024-02-29T09:15:00.000Z', sourceStatus: 'completed', linkStatus: 'ambiguous', linkMethod: 'exact_full_name', evidenceLevel: 'moderate', issueCodes: Object.freeze([]) }), Object.freeze({ id: VISIT_IDS[1], sourceName: SOURCE_NAMES.visits, sourceRow: 3, patientId: PATIENT_ID, appointmentIdFingerprint: APPOINTMENT_FINGERPRINT, startsAt: null, endsAt: null, sourceStatus: 'completed', linkStatus: 'linked', linkMethod: 'exact_ehr', evidenceLevel: 'exact', issueCodes: Object.freeze([]) })]),
    visitDetails: Object.freeze([detail('00000000-0000-8000-8000-000000000008', VISIT_IDS[0], Object.freeze({ appointment_id: 'appointment-secret', doctor: 'Скрытый врач', doctor_role: 'Врач', cabinet: '1', comment: '', service_names: '' })), detail('00000000-0000-8000-8000-000000000018', VISIT_IDS[1], Object.freeze({ appointment_id: 'appointment-secret', doctor: '', doctor_role: '', cabinet: '', comment: 'Скрытый комментарий', service_names: 'Скрытая услуга' }))]),
    visitCandidates: Object.freeze([Object.freeze({ id: '00000000-0000-8000-8000-000000000019', historicalVisitId: VISIT_IDS[0], patientId: PATIENT_ID, evidenceCode: 'EXACT_FULL_NAME', score: 60 }), Object.freeze({ id: '00000000-0000-8000-8000-000000000035', historicalVisitId: VISIT_IDS[0], patientId: SECOND_PATIENT_ID, evidenceCode: 'EXACT_FULL_NAME', score: 60 })]),
    identityIssues: Object.freeze([]),
    visitIssues: Object.freeze([]),
    normalizationIssues: Object.freeze([Object.freeze({ id: '00000000-0000-8000-8000-000000000037', code: 'INVALID_NORMALIZED_VALUE', source: source(2), field: 'phone' })]),
    sourceRows: Object.freeze([
      Object.freeze({ id: '00000000-0000-8000-8000-000000000009', sourceRole: 'pd', sourceName: SOURCE_NAMES.pd, sourceRow: 2, patientId: PATIENT_ID, historicalVisitId: null, birthDateValid: true, payload: patientPayload, payloadHash: payloadHash(patientPayload), issueCodes: Object.freeze([]) }),
      Object.freeze({ id: '00000000-0000-8000-8000-000000000036', sourceRole: 'pd', sourceName: SOURCE_NAMES.pd, sourceRow: 3, patientId: SECOND_PATIENT_ID, historicalVisitId: null, birthDateValid: true, payload: secondPatientPayload, payloadHash: payloadHash(secondPatientPayload), issueCodes: Object.freeze([]) }),
      Object.freeze({ id: '00000000-0000-8000-8000-000000000011', sourceRole: 'visits', sourceName: SOURCE_NAMES.visits, sourceRow: 2, patientId: null, historicalVisitId: VISIT_IDS[0], birthDateValid: null, payload: firstVisitPayload, payloadHash: payloadHash(firstVisitPayload), issueCodes: Object.freeze([]) }),
      Object.freeze({ id: '00000000-0000-8000-8000-000000000021', sourceRole: 'visits', sourceName: SOURCE_NAMES.visits, sourceRow: 3, patientId: PATIENT_ID, historicalVisitId: VISIT_IDS[1], birthDateValid: null, payload: secondVisitPayload, payloadHash: payloadHash(secondVisitPayload), issueCodes: Object.freeze([]) }),
      Object.freeze({ id: '00000000-0000-8000-8000-000000000022', sourceRole: 'invoices', sourceName: SOURCE_NAMES.invoices, sourceRow: 2, patientId: null, historicalVisitId: null, birthDateValid: null, payload: invoicePayload, payloadHash: payloadHash(invoicePayload), issueCodes: Object.freeze([]) })
    ]),
    invoices: Object.freeze([Object.freeze({ id: '00000000-0000-8000-8000-000000000010', sourceName: SOURCE_NAMES.invoices, sourceRow: 2, historicalVisitId: null, status: 'incomplete_source', payload: invoicePayload, payloadHash: payloadHash(invoicePayload) })]),
    attachments: Object.freeze([]),
    identityMergeEvidence: Object.freeze([]),
    identityEvidenceCounts: IDENTITY_EVIDENCE,
    visitEvidenceCounts: VISIT_EVIDENCE,
    report: Object.freeze({ version: 1, manifestHash: MANIFEST_HASH, sourceRows: Object.freeze({ total: 5, byRole: ROW_COUNTS }), patients: Object.freeze({ total: 2, supplemental: 0, externalIdentifiers: 2, medeskEhrIdentifiers: 2, contacts: 1, nameHistory: 1, consents: 2, evidenceCounts: IDENTITY_EVIDENCE }), visits: VISIT_EVIDENCE, invoices: Object.freeze({ total: 1, incomplete: 1 }), attachments: Object.freeze({ total: 0 }), issues: Object.freeze({ normalization: 1, identity: 0, visits: 0 }), controls: CONTROLS })
  })
}

function mergedBirthBundle() {
  const value = structuredClone(testBundle())
  value.patients[1].isSupplemental = true
  value.sourceRows[1].patientId = PATIENT_ID
  value.identityMergeEvidence = [{ ordinal: 1, patientId: PATIENT_ID, reason: 'exactEhr', sources: [source(2), source(3)] }]
  value.identityEvidenceCounts.exactEhr = 1
  value.identityEvidenceCounts.supplementalPatients = 1
  value.report.patients.supplemental = 1
  value.report.patients.evidenceCounts.exactEhr = 1
  value.report.patients.evidenceCounts.supplementalPatients = 1
  value.report.controls.primaryMerges = 1
  value.report.controls.supplementalPatients = 1
  return value
}

function invalidStartDateBundle() {
  const value = structuredClone(testBundle())
  value.historicalVisits[0].startsAt = null
  value.historicalVisits[0].issueCodes = ['INVALID_START_DATE']
  value.visitIssues.push({ id: '00000000-0000-8000-8000-000000000038', historicalVisitId: VISIT_IDS[0], code: 'INVALID_START_DATE', field: 'appointment_begin' })
  value.visitEvidenceCounts.invalidStartDate = 1
  value.report.visits.invalidStartDate = 1
  value.report.issues.visits = 1
  return value
}

function randomSource(seed = 0) {
  let counter = seed
  return (size) => Buffer.alloc(size, ++counter)
}

async function migratedDatabase(databasePath) {
  await executeFile(process.execPath, [MIGRATION_SCRIPT], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: pathToFileURL(databasePath).href, ASTRO_DB_APP_TOKEN: '' }, timeout: 20_000, maxBuffer: 1_000_000 })
  const client = createClient({ url: pathToFileURL(databasePath).href })
  onTestFinished(() => client.close())
  return client
}

async function fixture(bundle = testBundle()) {
  const root = await mkdtemp(join(tmpdir(), 'clinic-store-test-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const repositoryPath = join(root, 'repository')
  const outsidePath = join(root, 'outside')
  await Promise.all([mkdir(repositoryPath), mkdir(outsidePath)])
  const databasePath = join(root, 'target.db')
  const client = await migratedDatabase(databasePath)
  const stagePath = join(outsidePath, 'clinic-import.stage')
  const staged = await captured(() => writeClinicImportStage({ bundle, stagePath, databasePath, repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource() }))
  if (staged.error !== null) throw new Error(`Synthetic stage fixture failed: ${staged.error.name}/${staged.error.code}`)
  const written = staged.value
  return Object.freeze({ client, databasePath, repositoryPath, stagePath, written })
}

function tracked(client) {
  let transactions = 0
  return Object.freeze({ client: Object.freeze({ execute: (...args) => client.execute(...args), transaction: (...args) => { transactions += 1; return client.transaction(...args) } }), count: () => transactions })
}

function input(value, client = value.client) {
  return Object.freeze({ client, stagePath: value.stagePath, repositoryPath: value.repositoryPath, encryptionKey: ENCRYPTION_KEY, fingerprintKey: FINGERPRINT_KEY, expectedManifestHash: value.written.manifestHash, expectedPlanHash: value.written.planHash })
}

async function captured(operation) {
  try { return Object.freeze({ value: await operation(), error: null }) } catch (error) { return Object.freeze({ value: null, error }) }
}

describe('clinic import transactional store', () => {
  it('fully verifies the stage before opening exactly one transaction and completes after exact control queries', async () => {
    const value = await fixture()
    const observed = tracked(value.client)
    const rejected = await captured(() => applyClinicImportStage({ ...input(value, observed.client), expectedPlanHash: 'd'.repeat(64) }))
    const applied = await captured(() => applyClinicImportStage(input(value, observed.client), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() }))
    if (applied.error !== null) throw new Error(`Synthetic apply failed: ${applied.error.name}/${applied.error.code}`)
    const result = applied.value
    const batch = await value.client.execute({ sql: 'SELECT id, manifestHash, planHash, mode, status, controlTotals, completedAt FROM ImportBatch', args: [] })
    expect({ rejected: rejected.error?.code, transactions: observed.count(), result, batch: batch.rows }).toEqual({ rejected: 'STAGE_VERIFICATION_FAILED', transactions: 1, result: { batchId: result.batchId, manifestHash: MANIFEST_HASH, planHash: value.written.planHash, status: 'completed', applied: true, controls: CONTROLS, summary: value.written.summary }, batch: [{ id: result.batchId, manifestHash: MANIFEST_HASH, planHash: value.written.planHash, mode: 'apply', status: 'completed', controlTotals: JSON.stringify(result.controls), completedAt: '2026-08-27T12:00:00.000Z' }] })
  })

  it('uses a deterministic batch id, is manifest-and-plan idempotent, preserves candidates, and permits duplicate appointment fingerprints', async () => {
    const value = await fixture()
    const first = await applyClinicImportStage(input(value), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() })
    const second = await applyClinicImportStage(input(value), { clock: () => '2026-08-28T12:00:00.000Z', randomBytes: randomSource() })
    const batches = await value.client.execute('SELECT COUNT(*) AS total FROM ImportBatch')
    const duplicateAppointments = await value.client.execute({ sql: 'SELECT COUNT(*) AS total FROM HistoricalVisit WHERE appointmentIdFingerprint = ?', args: [APPOINTMENT_FINGERPRINT] })
    const candidates = await value.client.execute('SELECT historicalVisitId, patientId, evidenceCode, score FROM HistoricalVisitCandidate')
    expect({ idsEqual: first.batchId === second.batchId, firstApplied: first.applied, secondApplied: second.applied, batches: Number(batches.rows[0].total), duplicateAppointments: Number(duplicateAppointments.rows[0].total), candidates: candidates.rows }).toEqual({ idsEqual: true, firstApplied: true, secondApplied: false, batches: 1, duplicateAppointments: 2, candidates: [{ historicalVisitId: VISIT_IDS[0], patientId: PATIENT_ID, evidenceCode: 'EXACT_FULL_NAME', score: 60 }, { historicalVisitId: VISIT_IDS[0], patientId: SECOND_PATIENT_ID, evidenceCode: 'EXACT_FULL_NAME', score: 60 }] })
  })

  it('applies and idempotently replays pre-merge birth-date controls', async () => {
    const value = await fixture(mergedBirthBundle())
    const first = await applyClinicImportStage(input(value), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() })
    const second = await applyClinicImportStage(input(value), { clock: () => '2026-08-28T12:00:00.000Z', randomBytes: randomSource(10) })
    expect({ applied: [first.applied, second.applied], validBirthDates: first.controls.validBirthDates, primaryMerges: first.controls.primaryMerges }).toEqual({ applied: [true, false], validBirthDates: 2, primaryMerges: 1 })
  })

  it('persists an invalid nonempty start date as null without counting it as a missing source date', async () => {
    const value = await fixture(invalidStartDateBundle())
    const result = await captured(() => applyClinicImportStage(input(value), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() }))
    const nullDates = Number((await value.client.execute('SELECT COUNT(*) AS total FROM HistoricalVisit WHERE startsAt IS NULL')).rows[0].total)
    expect({ code: result.error?.code ?? null, missingDates: result.value?.controls.missingDates ?? null, nullDates }).toEqual({ code: null, missingDates: 1, nullDates: 2 })
  })

  it('treats independently encrypted stages of one logical bundle as the same idempotent plan', async () => {
    const value = await fixture()
    const secondStagePath = `${value.stagePath}.second`
    const secondStage = await writeClinicImportStage({ bundle: testBundle(), stagePath: secondStagePath, databasePath: value.databasePath, repositoryPath: value.repositoryPath, encryptionKey: ENCRYPTION_KEY }, { randomBytes: randomSource(100) })
    const firstBytes = await readFile(value.stagePath)
    const secondBytes = await readFile(secondStagePath)
    const first = await applyClinicImportStage(input(value), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() })
    const second = await applyClinicImportStage({ ...input(value), stagePath: secondStagePath, expectedPlanHash: secondStage.planHash }, { clock: () => '2026-08-28T12:00:00.000Z', randomBytes: randomSource(200) })
    expect({ differentCiphertext: firstBytes.compare(secondBytes) !== 0, planHashes: [value.written.planHash, secondStage.planHash], idsEqual: first.batchId === second.batchId, applied: [first.applied, second.applied] }).toEqual({ differentCiphertext: true, planHashes: [value.written.planHash, value.written.planHash], idsEqual: true, applied: [true, false] })
  })

  it('rejects replay when safe import-batch state has drifted despite matching hashes', async () => {
    const value = await fixture()
    await applyClinicImportStage(input(value), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() })
    await value.client.execute("UPDATE ImportBatch SET mode = 'dry-run' WHERE manifestHash = ?", [MANIFEST_HASH])
    const result = await captured(() => applyClinicImportStage(input(value), { clock: () => '2026-08-28T12:00:00.000Z', randomBytes: randomSource(10) }))
    expect({ code: result.error?.code, frozen: Object.isFrozen(result.error) }).toEqual({ code: 'MANIFEST_CONFLICT', frozen: true })
  })

  it.each([
    ['HistoricalVisit', 'createdAt'],
    ['PatientExternalIdentifier', 'updatedAt']
  ])('rejects replay when %s.%s has a different valid audit timestamp', async (table, column) => {
    const value = await fixture()
    await applyClinicImportStage(input(value), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() })
    await value.client.execute(`UPDATE ${table} SET ${column} = '2026-08-27T13:00:00.000Z'`)
    const result = await captured(() => applyClinicImportStage(input(value), { clock: () => '2026-08-28T12:00:00.000Z', randomBytes: randomSource(10) }))
    expect({ code: result.error?.code, frozen: Object.isFrozen(result.error) }).toEqual({ code: 'IMPORT_RECONCILIATION_FAILED', frozen: true })
  })

  it('serializes concurrent applies and resolves the second attempt as idempotent inside its write transaction', async () => {
    const value = await fixture()
    const results = await Promise.all([applyClinicImportStage(input(value), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() }), applyClinicImportStage(input(value), { clock: () => '2026-08-28T12:00:00.000Z', randomBytes: randomSource() })])
    const batches = Number((await value.client.execute('SELECT COUNT(*) AS total FROM ImportBatch')).rows[0].total)
    expect({ ids: new Set(results.map(({ batchId }) => batchId)).size, applied: results.map(({ applied }) => applied).sort(), batches }).toEqual({ ids: 1, applied: [false, true], batches: 1 })
  })

  it('projects imported phone contacts into the operational fingerprint domain used by exact search', async () => {
    const value = await fixture()
    const applied = await captured(() => applyClinicImportStage(input(value), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() }))
    if (applied.error !== null) throw new Error(`Synthetic operational projection failed: ${applied.error.code}`)
    const expectedFingerprint = fingerprintContactPhone({ phone: OPERATIONAL_PHONE, key: FINGERPRINT_KEY })
    const stored = await value.client.execute({ sql: 'SELECT p.phoneFingerprint AS rootFingerprint, c.fingerprint AS contactFingerprint FROM Patient p JOIN PatientContact c ON c.patientId = p.id AND c.kind = ? WHERE p.id = ?', args: ['phone', PATIENT_ID] })
    const records = createPatientRecords({ client: value.client, fingerprintKey: FINGERPRINT_KEY, encryptionKey: ENCRYPTION_KEY })
    const found = await records.list({ page: 1, pageSize: 50, phone: OPERATIONAL_PHONE })
    expect({ stored: stored.rows, expectedFingerprint, found: { total: found.total, ids: found.items.map(({ id }) => id) } }).toEqual({ stored: [{ rootFingerprint: expectedFingerprint, contactFingerprint: expectedFingerprint }], expectedFingerprint, found: { total: 1, ids: [PATIENT_ID] } })
  })

  it('key-binds every staged protected identifier before target access', async () => {
    const value = await fixture()
    const observed = tracked(value.client)
    const result = await captured(() => applyClinicImportStage({ ...input(value, observed.client), fingerprintKey: 'wrong-fingerprint-key-synthetic-2026-secure' }))
    expect({ code: result.error?.code, transactions: observed.count() }).toEqual({ code: 'INVALID_STORE_INPUT', transactions: 0 })
  })

  it('links MANGO calls for one active operational phone candidate and clears links when import makes it shared', async () => {
    const unique = await fixture()
    const fingerprint = fingerprintContactPhone({ phone: OPERATIONAL_PHONE, key: FINGERPRINT_KEY })
    const call = (entryId, patientId) => unique.client.execute({ sql: 'INSERT INTO MangoCall VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [entryId, patientId, 'missed', 'sealed', '+7 •••••••• 33', fingerprint, 0, '78127482210', null, '2026-08-27T10:00:00.000Z', null, null, '2026-08-27T10:00:01.000Z', 1, 0, null, '2026-08-27T10:00:01.000Z', '2026-08-27T10:00:00.000Z', '2026-08-27T10:00:01.000Z', null] })
    await call('store-unique-call', null)
    const uniqueApplied = await captured(() => applyClinicImportStage(input(unique), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() }))
    if (uniqueApplied.error !== null) throw new Error(`Synthetic unique MANGO projection failed: ${uniqueApplied.error.code}`)
    const uniqueCall = await unique.client.execute("SELECT patientId FROM MangoCall WHERE entryId = 'store-unique-call'")
    const shared = await fixture()
    const existingId = '00000000-0000-8000-8000-000000000099'
    const existing = createPatientRecords({ client: shared.client, fingerprintKey: FINGERPRINT_KEY, encryptionKey: ENCRYPTION_KEY, uuid: () => existingId, clock: () => new Date('2026-08-27T09:00:00.000Z') })
    await existing.upsert({ profile: { firstName: 'Другая', lastName: 'Пациентка', secondName: '', phone: OPERATIONAL_PHONE, birthday: null } })
    await shared.client.execute({ sql: 'INSERT INTO MangoCall VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['store-shared-call', existingId, 'missed', 'sealed', '+7 •••••••• 33', fingerprint, 0, '78127482210', null, '2026-08-27T10:00:00.000Z', null, null, '2026-08-27T10:00:01.000Z', 1, 0, null, '2026-08-27T10:00:01.000Z', '2026-08-27T10:00:00.000Z', '2026-08-27T10:00:01.000Z', null] })
    const sharedApplied = await captured(() => applyClinicImportStage(input(shared), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() }))
    if (sharedApplied.error !== null) throw new Error(`Synthetic shared MANGO projection failed: ${sharedApplied.error.code}`)
    const sharedCall = await shared.client.execute("SELECT patientId FROM MangoCall WHERE entryId = 'store-shared-call'")
    expect({ unique: uniqueCall.rows, shared: sharedCall.rows }).toEqual({ unique: [{ patientId: PATIENT_ID }], shared: [{ patientId: null }] })
  })

  it('stores protected columns without any source plaintext and keeps nullable chronology intact', async () => {
    const value = await fixture()
    await applyClinicImportStage(input(value), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() })
    const columns = await Promise.all([
      value.client.execute('SELECT profileCiphertext, firstSeenAt, lastSeenAt FROM Patient'),
      value.client.execute('SELECT ciphertext FROM PatientExternalIdentifier'),
      value.client.execute('SELECT ciphertext, firstSeenAt, lastSeenAt FROM PatientContact'),
      value.client.execute('SELECT lastNameCiphertext, sourceIdentifierCiphertext, observedAt FROM PatientNameHistory'),
      value.client.execute('SELECT profileCiphertext FROM PatientPrivateData'),
      value.client.execute('SELECT observedAt FROM PatientConsent'),
      value.client.execute('SELECT appointmentIdCiphertext, doctorCiphertext, detailsCiphertext FROM HistoricalVisit'),
      value.client.execute('SELECT payloadCiphertext FROM ImportSourceRow'),
      value.client.execute('SELECT candidatesCiphertext, detailsCiphertext FROM ImportIssue'),
      value.client.execute('SELECT payloadCiphertext FROM HistoricalInvoice')
    ])
    const serialized = JSON.stringify(columns.flatMap(({ rows }) => rows))
    const nullable = [columns[0].rows[0].firstSeenAt, columns[0].rows[0].lastSeenAt, columns[2].rows[0].firstSeenAt, columns[2].rows[0].lastSeenAt, columns[3].rows[0].observedAt, columns[5].rows[0].observedAt]
    expect({ leaked: SECRET_VALUES.filter((secret) => serialized.includes(secret)), envelopeCount: (serialized.match(/v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []).length, nullable }).toEqual({ leaked: [], envelopeCount: 22, nullable: [null, null, null, null, null, null] })
  })

  it('rolls back every row when the final completion transition fails', async () => {
    const value = await fixture()
    await value.client.execute("CREATE TRIGGER reject_import_completion BEFORE UPDATE OF status ON ImportBatch WHEN NEW.status = 'completed' BEGIN SELECT RAISE(ABORT, 'synthetic late failure'); END")
    const result = await captured(() => applyClinicImportStage(input(value), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() }))
    const counts = await Promise.all(['ImportBatch', 'Patient', 'PatientExternalIdentifier', 'HistoricalVisit', 'HistoricalVisitCandidate', 'ImportSourceRow', 'ImportIssue', 'HistoricalInvoice'].map(async (table) => Number((await value.client.execute(`SELECT COUNT(*) AS total FROM ${table}`)).rows[0].total)))
    expect({ error: { name: result.error?.name, code: result.error?.code, frozen: Object.isFrozen(result.error), leaked: SECRET_VALUES.some((secret) => result.error?.message.includes(secret)) }, counts }).toEqual({ error: { name: 'ClinicImportStoreError', code: 'IMPORT_FAILED', frozen: true, leaked: false }, counts: [0, 0, 0, 0, 0, 0, 0, 0] })
  })

  it('rolls back a same-count persisted field mutation detected by exact reconciliation', async () => {
    const value = await fixture()
    await value.client.execute("CREATE TRIGGER mutate_import_visit AFTER INSERT ON HistoricalVisit BEGIN UPDATE HistoricalVisit SET sourceStatus = 'cancelled' WHERE id = NEW.id; END")
    const result = await captured(() => applyClinicImportStage(input(value), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() }))
    const counts = await Promise.all(['ImportBatch', 'Patient', 'HistoricalVisit'].map(async (table) => Number((await value.client.execute(`SELECT COUNT(*) AS total FROM ${table}`)).rows[0].total)))
    expect({ code: result.error?.code, counts }).toEqual({ code: 'IMPORT_RECONCILIATION_FAILED', counts: [0, 0, 0] })
  })

  it('rolls back when a trigger adds an unexpected row to a batch-scoped table', async () => {
    const value = await fixture()
    await value.client.execute("CREATE TRIGGER add_import_issue AFTER INSERT ON ImportBatch BEGIN INSERT INTO ImportIssue VALUES ('00000000-0000-8000-8000-000000000098', NEW.id, 'synthetic.csv', 1, 'UNEXPECTED', NULL, NULL, NULL, NULL, NEW.createdAt, NULL); END")
    const result = await captured(() => applyClinicImportStage(input(value), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() }))
    const counts = await Promise.all(['ImportBatch', 'ImportIssue'].map(async (table) => Number((await value.client.execute(`SELECT COUNT(*) AS total FROM ${table}`)).rows[0].total)))
    expect({ code: result.error?.code, counts }).toEqual({ code: 'IMPORT_RECONCILIATION_FAILED', counts: [0, 0] })
  })

  it('rejects an unexpected child row attached to an imported patient on replay', async () => {
    const value = await fixture()
    await applyClinicImportStage(input(value), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() })
    await value.client.execute({ sql: 'INSERT INTO PatientContact VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['00000000-0000-8000-8000-000000000097', PATIENT_ID, 'email', null, null, 's•••@example.test', 0, SOURCE_NAMES.pd, null, null, null] })
    const result = await captured(() => applyClinicImportStage(input(value), { clock: () => '2026-08-28T12:00:00.000Z', randomBytes: randomSource(10) }))
    expect({ code: result.error?.code, frozen: Object.isFrozen(result.error) }).toEqual({ code: 'IMPORT_RECONCILIATION_FAILED', frozen: true })
  })

  it('rejects a valid alternate envelope whose decrypted replay value differs', async () => {
    const value = await fixture()
    await applyClinicImportStage(input(value), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() })
    const replacement = encryptProtectedData({ domain: 'private_profile', value: Object.freeze({ address: 'Другой синтетический адрес', gender: 'female' }), key: ENCRYPTION_KEY, randomBytes: randomSource(90) })
    await value.client.execute({ sql: 'UPDATE PatientPrivateData SET profileCiphertext = ? WHERE patientId = ?', args: [replacement, PATIENT_ID] })
    const result = await captured(() => applyClinicImportStage(input(value), { clock: () => '2026-08-28T12:00:00.000Z', randomBytes: randomSource(10) }))
    expect({ code: result.error?.code, frozen: Object.isFrozen(result.error) }).toEqual({ code: 'IMPORT_RECONCILIATION_FAILED', frozen: true })
  })

  it('awaits transaction cleanup before returning a successful apply result', async () => {
    const value = await fixture()
    let closed = false
    const client = Object.freeze({ execute: (...args) => value.client.execute(...args), transaction: async (...args) => {
      const transaction = await value.client.transaction(...args)
      return Object.freeze({ execute: (...values) => transaction.execute(...values), batch: (...values) => transaction.batch(...values), commit: (...values) => transaction.commit(...values), rollback: (...values) => transaction.rollback(...values), close: async () => { await new Promise((resolveClose) => setTimeout(resolveClose, 10)); transaction.close(); closed = true } })
    } })
    const result = await applyClinicImportStage(input(value, client), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() })
    expect({ status: result.status, closed }).toEqual({ status: 'completed', closed: true })
  })

  it('attempts rollback and close and gives cleanup failure value-free precedence', async () => {
    const value = await fixture()
    await value.client.execute("CREATE TRIGGER reject_import_completion BEFORE UPDATE OF status ON ImportBatch WHEN NEW.status = 'completed' BEGIN SELECT RAISE(ABORT, 'synthetic late failure'); END")
    const cleanup = []
    const client = Object.freeze({ execute: (...args) => value.client.execute(...args), transaction: async (...args) => {
      const transaction = await value.client.transaction(...args)
      return Object.freeze({ execute: (...values) => transaction.execute(...values), batch: (...values) => transaction.batch(...values), commit: (...values) => transaction.commit(...values), rollback: async () => { await transaction.rollback(); cleanup.push('rollback'); throw new Error('private rollback failure') }, close: async () => { transaction.close(); cleanup.push('close'); throw new Error('private close failure') } })
    } })
    const result = await captured(() => applyClinicImportStage(input(value, client), { clock: () => '2026-08-27T12:00:00.000Z', randomBytes: randomSource() }))
    const count = Number((await value.client.execute('SELECT COUNT(*) AS total FROM ImportBatch')).rows[0].total)
    expect({ code: result.error?.code, frozen: Object.isFrozen(result.error), message: result.error?.message, cleanup, count }).toEqual({ code: 'TRANSACTION_CLEANUP_FAILED', frozen: true, message: 'Clinic import stage could not be applied', cleanup: ['rollback', 'close'], count: 0 })
  })

  it('rolls back and awaits close when an opened transaction exposes an invalid adapter', async () => {
    const value = await fixture()
    const cleanup = []
    const client = Object.freeze({ execute: (...args) => value.client.execute(...args), transaction: async (...args) => {
      const transaction = await value.client.transaction(...args)
      const hostile = { batch: (...values) => transaction.batch(...values), commit: (...values) => transaction.commit(...values), rollback: async () => { cleanup.push('rollback'); await transaction.rollback() }, close: async () => { await new Promise((resolveClose) => setTimeout(resolveClose, 10)); cleanup.push('close'); transaction.close() } }
      Object.defineProperty(hostile, 'execute', { get() { throw new Error('private adapter value') } })
      return hostile
    } })
    const result = await captured(() => applyClinicImportStage(input(value, client)))
    expect({ code: result.error?.code, frozen: Object.isFrozen(result.error), cleanup }).toEqual({ code: 'IMPORT_FAILED', frozen: true, cleanup: ['rollback', 'close'] })
  })

  it('rejects hostile database rows without invoking nested coercion or exposing values', async () => {
    const value = await fixture()
    let coerced = false
    const hostileRow = { total: Object.freeze({ valueOf() { coerced = true; throw new Error('private row value') } }) }
    Object.defineProperty(hostileRow, 'id', { enumerable: true, get() { throw new Error('private row getter') } })
    Object.freeze(hostileRow)
    const hostileRows = Object.freeze([hostileRow])
    const transaction = Object.freeze({ execute: async () => Object.freeze({ rows: hostileRows }), batch: async () => [], commit: async () => {}, rollback: async () => {}, close: async () => {} })
    const hostile = Object.freeze({ client: Object.freeze({ execute: (...args) => value.client.execute(...args), transaction: async () => transaction }), stagePath: value.stagePath, repositoryPath: value.repositoryPath, encryptionKey: ENCRYPTION_KEY, fingerprintKey: FINGERPRINT_KEY, expectedManifestHash: value.written.manifestHash, expectedPlanHash: value.written.planHash })
    const result = await captured(() => applyClinicImportStage(hostile))
    expect({ code: result.error?.code, frozen: Object.isFrozen(result.error), coerced, leaked: result.error?.message.includes('private') }).toEqual({ code: 'IMPORT_RECONCILIATION_FAILED', frozen: true, coerced: false, leaked: false })
  })
})
