import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import { encryptPatientProfile, fingerprintContactPhone, maskContactPhone } from './contact-identity.js'
import { PatientHistoryRecordError, createPatientHistoryRecords } from './patient-history-records.js'
import { encryptProtectedData } from './protected-patient-data.js'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const MIGRATION_SCRIPT = join(PROJECT_ROOT, 'scripts/init-db.mjs')
const ENCRYPTION_KEY = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64')
const PATIENT_ID = '71000000-0000-4000-8000-000000000001'
const SECOND_PATIENT_ID = '71000000-0000-4000-8000-000000000011'
const VISIT_ID = '72000000-0000-4000-8000-000000000002'
const CANDIDATE_VISIT_ID = '72000000-0000-4000-8000-000000000012'
const BATCH_ID = '73000000-0000-4000-8000-000000000003'
const NOW = '2026-08-27T12:00:00.000Z'
const ACTOR = `v1:${'c7'.repeat(32)}`
const PD_SOURCE = '544663c3807aab090001bad8PD.csv'
const VISIT_SOURCE = '544663c3807aab090001bad8_visits.csv'
const INVOICE_SOURCE = '544663c3807aab090001bad8_invoices.csv'
const PROFILE = Object.freeze({ firstName: 'Лёля', lastName: 'Рубежная', secondName: 'Ильинична', phone: '+7 921 555-41-73', birthday: '1987-11-09' })
const IV = Buffer.from('0102030405060708090a0b0c', 'hex')

async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-patient-history-'))
  const databasePath = join(directory, 'content.sqlite')
  await executeFile(process.execPath, [MIGRATION_SCRIPT], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${databasePath}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 10_000, maxBuffer: 1_000_000 })
  return createClient({ url: `file:${databasePath}` })
}

async function fixture() {
  const client = await database()
  await client.execute({ sql: 'INSERT INTO Patient VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [PATIENT_ID, null, null, null, NOW, NOW, NOW, NOW, null] })
  await client.execute({ sql: 'INSERT INTO Patient VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [SECOND_PATIENT_ID, null, null, null, NOW, NOW, NOW, NOW, null] })
  await client.execute({ sql: 'INSERT INTO ImportBatch VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: [BATCH_ID, 'sha256:manifest', 'sha256:plan', 'apply', 'completed', '{}', NOW, NOW] })
  const records = createPatientHistoryRecords({ client, encryptionKey: ENCRYPTION_KEY, clock: () => new Date(NOW), uuid: () => '74000000-0000-4000-8000-000000000004' })
  return Object.freeze({ client, records })
}

async function historyRows(client) {
  await client.execute({ sql: 'INSERT INTO PatientExternalIdentifier VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['75000000-0000-4000-8000-000000000005', PATIENT_ID, 'clinic_card', 'sealed-card', 'v1:card', null, 'clinic_card:v1:card', PD_SOURCE, 17, true, NOW, NOW] })
  await client.execute({ sql: 'INSERT INTO PatientContact VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['76000000-0000-4000-8000-000000000006', PATIENT_ID, 'phone', 'sealed-contact', 'v1:phone', '+7 •••••••• 41', true, PD_SOURCE, NOW, NOW, null] })
  await client.execute({ sql: 'INSERT INTO PatientNameHistory VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['77000000-0000-4000-8000-000000000007', PATIENT_ID, 'sealed-name', 'v1:name-secondary', PD_SOURCE, 'sealed-source', NOW, 'surname_change', null] })
  await client.execute({ sql: 'INSERT INTO HistoricalVisit VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [VISIT_ID, BATCH_ID, VISIT_SOURCE, 29, PATIENT_ID, 'sealed-appointment', 'v1:appointment', null, null, 'unknown', 'sealed-doctor', 'sealed-details', 'linked', 'exact_clinic_card', 'strong', NOW, null] })
  await client.execute({ sql: 'INSERT INTO ImportIssue VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['78000000-0000-4000-8000-000000000008', BATCH_ID, VISIT_SOURCE, 29, 'INVALID_START_DATE', PATIENT_ID, VISIT_ID, null, null, NOW, null] })
}

function sealed(domain, value) {
  return encryptProtectedData({ domain, value, key: ENCRYPTION_KEY, randomBytes: () => IV })
}

async function protectedRows(client) {
  const profileCiphertext = encryptPatientProfile({ profile: PROFILE, key: ENCRYPTION_KEY, randomBytes: () => IV })
  const phoneFingerprint = fingerprintContactPhone({ phone: PROFILE.phone, key: 'history-fingerprint-key-with-entropy-2026' })
  await client.execute({ sql: 'UPDATE Patient SET profileCiphertext = ?, phoneMask = ?, phoneFingerprint = ? WHERE id = ?', args: [profileCiphertext, maskContactPhone('79215554173'), phoneFingerprint, PATIENT_ID] })
  await client.execute({ sql: 'INSERT INTO PatientExternalIdentifier VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['75000000-0000-4000-8000-000000000015', PATIENT_ID, 'medesk_ehr', sealed('external_identifier', { value: '0000000000007149' }), 'v1:ehr', 'v1:global-ehr', 'medesk_ehr:v1:ehr', PD_SOURCE, 17, true, NOW, NOW] })
  await client.execute({ sql: 'INSERT INTO PatientContact VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['76000000-0000-4000-8000-000000000016', PATIENT_ID, 'email', sealed('contact', { value: 'synthetic.history@example.test' }), 'v1:email', 's••••••••@example.test', false, PD_SOURCE, NOW, NOW, null] })
  await client.execute({ sql: 'INSERT INTO PatientNameHistory VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['77000000-0000-4000-8000-000000000017', PATIENT_ID, sealed('name_history', { lastName: 'Прежняя-Синтетическая' }), 'v1:name', PD_SOURCE, sealed('external_identifier', { value: '0000000000007001' }), NOW, 'surname_change', null] })
  await client.execute({ sql: 'INSERT INTO PatientPrivateData VALUES (?, ?, ?, ?, ?, ?)', args: ['79000000-0000-4000-8000-000000000019', PATIENT_ID, sealed('private_profile', { passport: { series: '4012', number: '000149' }, address: { city: 'Синтетический город', street: 'Тестовая 7' }, contract: 'Договор-149', notes: 'Синтетическая заметка' }), NOW, NOW, null] })
  await client.execute({ sql: 'INSERT INTO PatientConsent VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: ['7a000000-0000-4000-8000-000000000020', PATIENT_ID, 'sms_notifications', 'granted', 'Vse pacienty.xlsx', NOW, NOW, NOW] })
}

async function protectedVisitRows(client) {
  await client.execute({ sql: 'INSERT INTO HistoricalVisit VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [VISIT_ID, BATCH_ID, VISIT_SOURCE, 29, PATIENT_ID, sealed('visit_details', { value: 'appointment-protected-29' }), 'v1:appointment', null, null, 'completed', sealed('visit_details', { value: 'Врач Защищённый' }), sealed('visit_details', { services: ['Приём'], cabinet: '7', comment: 'Позвонить вечером' }), 'linked', 'exact_ehr', 'exact', NOW, null] })
}

async function captured(operation) {
  try {
    await operation()
    return Object.freeze({ threw: false })
  } catch (error) {
    return Object.freeze({ threw: true, name: error.name, code: error.code, frozen: Object.isFrozen(error), message: error.message })
  }
}

describe('patient history records', () => {
  it.each([
    ['summaries', { ids: [PATIENT_ID] }],
    ['visits', { patientId: PATIENT_ID, page: 1, pageSize: 10 }],
    ['issues', { patientId: PATIENT_ID, page: 1, pageSize: 10 }],
    ['attachments', { patientId: PATIENT_ID }],
  ])('wraps a %s storage failure in one frozen value-free error', async (method, input) => {
    const secret = 'sqlite-storage-secret-value'
    const client = Object.freeze({ execute: async () => { throw new Error(secret) }, transaction: async () => undefined })
    const records = createPatientHistoryRecords({ client, encryptionKey: ENCRYPTION_KEY })
    const failure = await captured(() => records[method](input))
    expect({ failure: { ...failure, leaked: failure.message.includes(secret) } }).toEqual({ failure: { threw: true, name: 'PatientHistoryRecordError', code: 'PATIENT_HISTORY_STORAGE_INVARIANT', frozen: true, message: new PatientHistoryRecordError('PATIENT_HISTORY_STORAGE_INVARIANT').message, leaked: false } })
  })

  it('normalizes a revoked proxy thrown by patient-history storage', async () => {
    const revoked = Proxy.revocable(Object.freeze({ protected: 'value' }), Object.freeze({}))
    revoked.revoke()
    const client = Object.freeze({ execute: async () => { throw revoked.proxy }, transaction: async () => undefined })
    const records = createPatientHistoryRecords({ client, encryptionKey: ENCRYPTION_KEY })
    const failure = await captured(() => records.summaries({ ids: [PATIENT_ID] }))
    expect({ name: failure.name, code: failure.code, frozen: failure.frozen }).toEqual({ name: 'PatientHistoryRecordError', code: 'PATIENT_HISTORY_STORAGE_INVARIANT', frozen: true })
  })

  it('normalizes a forged patient-history error without reading hostile fields', async () => {
    const reads = { code: 0 }
    const forged = Object.create(PatientHistoryRecordError.prototype, { code: { get: () => { reads.code += 1; return 'PATIENT_NOT_FOUND' } } })
    const client = Object.freeze({ execute: async () => { throw forged }, transaction: async () => undefined })
    const records = createPatientHistoryRecords({ client, encryptionKey: ENCRYPTION_KEY })
    const failure = await captured(() => records.summaries({ ids: [PATIENT_ID] }))
    expect({ name: failure.name, code: failure.code, reads }).toEqual({ name: 'PatientHistoryRecordError', code: 'PATIENT_HISTORY_STORAGE_INVARIANT', reads: { code: 0 } })
  })

  it('rejects a storage row array without consulting its hostile iterator', async () => {
    const reads = { iterator: 0 }
    const storageRows = [{ patientId: PATIENT_ID, externalIdentifierCount: 0, clinicCardCount: 0, contactCount: 0, previousLastNameCount: 0, historicalVisitCount: 0, issueCount: 0, attachmentCount: 0 }]
    Object.defineProperty(storageRows, Symbol.iterator, { get: () => { reads.iterator += 1; return Array.prototype[Symbol.iterator] } })
    const client = Object.freeze({ execute: async () => ({ rows: storageRows }), transaction: async () => undefined })
    const records = createPatientHistoryRecords({ client, encryptionKey: ENCRYPTION_KEY })
    const failure = await captured(() => records.summaries({ ids: [PATIENT_ID] }))
    expect({ code: failure.code, reads }).toEqual({ code: 'PATIENT_HISTORY_STORAGE_INVARIANT', reads: { iterator: 0 } })
  })

  it('rejects an accessor storage row without invoking the accessor', async () => {
    const reads = { index: 0 }
    const storageRows = []
    Object.defineProperty(storageRows, '0', { enumerable: true, get: () => { reads.index += 1; return { patientId: PATIENT_ID } } })
    const client = Object.freeze({ execute: async () => ({ rows: storageRows }), transaction: async () => undefined })
    const records = createPatientHistoryRecords({ client, encryptionKey: ENCRYPTION_KEY })
    const failure = await captured(() => records.summaries({ ids: [PATIENT_ID] }))
    expect({ code: failure.code, reads }).toEqual({ code: 'PATIENT_HISTORY_STORAGE_INVARIANT', reads: { index: 0 } })
  })

  it('rejects a non-primitive storage count without coercing it', async () => {
    const reads = { coercions: 0 }
    const hostileCount = Object.freeze({ valueOf: () => { reads.coercions += 1; return 0 } })
    const storageRows = [{ patientId: PATIENT_ID, externalIdentifierCount: hostileCount, clinicCardCount: 0, contactCount: 0, previousLastNameCount: 0, historicalVisitCount: 0, issueCount: 0, attachmentCount: 0 }]
    const client = Object.freeze({ execute: async () => ({ rows: storageRows }), transaction: async () => undefined })
    const records = createPatientHistoryRecords({ client, encryptionKey: ENCRYPTION_KEY })
    const failure = await captured(() => records.summaries({ ids: [PATIENT_ID] }))
    expect({ code: failure.code, reads }).toEqual({ code: 'PATIENT_HISTORY_STORAGE_INVARIANT', reads: { coercions: 0 } })
  })

  it('rejects a storage count above the domain maximum', async () => {
    const storageRows = [{ patientId: PATIENT_ID, externalIdentifierCount: 50_000_001, clinicCardCount: 0, contactCount: 0, previousLastNameCount: 0, historicalVisitCount: 0, issueCount: 0, attachmentCount: 0 }]
    const client = Object.freeze({ execute: async () => ({ rows: storageRows }), transaction: async () => undefined })
    const records = createPatientHistoryRecords({ client, encryptionKey: ENCRYPTION_KEY })
    const failure = await captured(() => records.summaries({ ids: [PATIENT_ID] }))
    expect(failure.code).toBe('PATIENT_HISTORY_STORAGE_INVARIANT')
  })

  it('returns immutable safe patient-history counts without protected values', async () => {
    const { client, records } = await fixture()
    await historyRows(client)
    const result = await records.summaries({ ids: [PATIENT_ID] })
    client.close()
    expect({ result, frozen: Object.isFrozen(result) && Object.isFrozen(result[0]), leaked: /sealed|v1:card|v1:phone/.test(JSON.stringify(result)) }).toEqual({ result: [{ patientId: PATIENT_ID, externalIdentifierCount: 1, clinicCardCount: 1, contactCount: 1, previousLastNameCount: 1, historicalVisitCount: 1, issueCount: 1, attachmentCount: 0 }], frozen: true, leaked: false })
  })

  it('paginates safe historical visits by an allowlisted link status', async () => {
    const { client, records } = await fixture()
    await historyRows(client)
    const result = await records.visits({ patientId: PATIENT_ID, page: 1, pageSize: 70, status: 'linked' })
    client.close()
    expect(result).toEqual({ items: [{ id: VISIT_ID, sourceName: VISIT_SOURCE, sourceRow: 29, startsAt: null, endsAt: null, sourceStatus: 'unknown', linkStatus: 'linked', linkMethod: 'exact_clinic_card', evidenceLevel: 'strong', issueCount: 1, candidateCount: 0, protectedDetailsAvailable: true }], page: 1, pageSize: 50, total: 1, pages: 1 })
  })

  it('rejects a linked visit summary that has ambiguity candidates', async () => {
    const { client, records } = await fixture()
    await historyRows(client)
    await client.execute({ sql: 'INSERT INTO HistoricalVisitCandidate VALUES (?, ?, ?, ?, ?, ?)', args: ['7e000000-0000-4000-8000-000000000023', VISIT_ID, SECOND_PATIENT_ID, 'EXACT_CLINIC_CARD', 90, NOW] })
    const failure = await captured(() => records.visits({ patientId: PATIENT_ID, page: 1, pageSize: 10 }))
    client.close()
    expect(failure.code).toBe('PATIENT_HISTORY_STORAGE_INVARIANT')
  })

  it.each(['sourceName', 'linkMethod', 'evidenceLevel'])('rejects patient text stored in the safe historical-visit %s field', async (column) => {
    const { client, records } = await fixture()
    await historyRows(client)
    const secret = 'Пациентка Секретова Ия'
    await client.execute({ sql: `UPDATE HistoricalVisit SET ${column} = ? WHERE id = ?`, args: [secret, VISIT_ID] })
    const failure = await captured(() => records.visits({ patientId: PATIENT_ID, page: 1, pageSize: 10 }))
    client.close()
    expect({ code: failure.code, leaked: failure.message?.includes(secret) ?? false }).toEqual({ code: 'PATIENT_HISTORY_STORAGE_INVARIANT', leaked: false })
  })

  it('rejects an operational source on a historical visit', async () => {
    const { client, records } = await fixture()
    await historyRows(client)
    await client.execute({ sql: 'UPDATE HistoricalVisit SET sourceName = ? WHERE id = ?', args: ['operational', VISIT_ID] })
    const failure = await captured(() => records.visits({ patientId: PATIENT_ID, page: 1, pageSize: 10 }))
    client.close()
    expect(failure.code).toBe('PATIENT_HISTORY_STORAGE_INVARIANT')
  })

  it('returns safe issue reasons and the currently empty attachment collection', async () => {
    const { client, records } = await fixture()
    await historyRows(client)
    const issues = await records.issues({ patientId: PATIENT_ID, page: 1, pageSize: 10 })
    const attachments = await records.attachments({ patientId: PATIENT_ID })
    client.close()
    expect({ issues, attachments, frozen: Object.isFrozen(issues.items) && Object.isFrozen(attachments) }).toEqual({ issues: { items: [{ id: '78000000-0000-4000-8000-000000000008', sourceName: VISIT_SOURCE, sourceRow: 29, code: 'INVALID_START_DATE', historicalVisitId: VISIT_ID, createdAt: NOW, resolvedAt: null }], page: 1, pageSize: 10, total: 1, pages: 1 }, attachments: [], frozen: true })
  })

  it('rejects patient text stored as an import issue code', async () => {
    const { client, records } = await fixture()
    await historyRows(client)
    const secret = 'IVANOV'
    await client.execute({ sql: 'UPDATE ImportIssue SET code = ? WHERE patientId = ?', args: [secret, PATIENT_ID] })
    const failure = await captured(() => records.issues({ patientId: PATIENT_ID, page: 1, pageSize: 10 }))
    client.close()
    expect({ code: failure.code, leaked: failure.message?.includes(secret) ?? false }).toEqual({ code: 'PATIENT_HISTORY_STORAGE_INVARIANT', leaked: false })
  })

  it('rejects an operational source on an import issue', async () => {
    const { client, records } = await fixture()
    await historyRows(client)
    await client.execute({ sql: 'UPDATE ImportIssue SET sourceName = ? WHERE patientId = ?', args: ['operational', PATIENT_ID] })
    const failure = await captured(() => records.issues({ patientId: PATIENT_ID, page: 1, pageSize: 10 }))
    client.close()
    expect(failure.code).toBe('PATIENT_HISTORY_STORAGE_INVARIANT')
  })

  it('paginates unresolved visits and retains every safe candidate reason', async () => {
    const { client, records } = await fixture()
    await client.execute({ sql: 'INSERT INTO HistoricalVisit VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [VISIT_ID, BATCH_ID, VISIT_SOURCE, 31, null, null, null, null, null, 'unknown', null, null, 'ambiguous', 'exact_clinic_card', 'strong', NOW, null] })
    await client.execute({ sql: 'INSERT INTO HistoricalVisitCandidate VALUES (?, ?, ?, ?, ?, ?)', args: ['7e000000-0000-4000-8000-000000000024', VISIT_ID, PATIENT_ID, 'EXACT_CLINIC_CARD', 90, NOW] })
    await client.execute({ sql: 'INSERT INTO HistoricalVisitCandidate VALUES (?, ?, ?, ?, ?, ?)', args: ['7e000000-0000-4000-8000-000000000025', VISIT_ID, SECOND_PATIENT_ID, 'EXACT_CLINIC_CARD', 90, NOW] })
    const result = await records.linkIssues({ page: 1, pageSize: 70, status: 'ambiguous' })
    client.close()
    expect(result).toEqual({ items: [{ id: VISIT_ID, sourceName: VISIT_SOURCE, sourceRow: 31, startsAt: null, sourceStatus: 'unknown', linkStatus: 'ambiguous', linkMethod: 'exact_clinic_card', evidenceLevel: 'strong', candidates: [{ patientId: PATIENT_ID, evidenceCode: 'EXACT_CLINIC_CARD', score: 90 }, { patientId: SECOND_PATIENT_ID, evidenceCode: 'EXACT_CLINIC_CARD', score: 90 }] }], page: 1, pageSize: 50, total: 1, pages: 1 })
  })

  it('rejects an ambiguous visit with only one candidate', async () => {
    const { client, records } = await fixture()
    await client.execute({ sql: 'INSERT INTO HistoricalVisit VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [VISIT_ID, BATCH_ID, VISIT_SOURCE, 31, null, null, null, null, null, 'unknown', null, null, 'ambiguous', 'exact_clinic_card', 'strong', NOW, null] })
    await client.execute({ sql: 'INSERT INTO HistoricalVisitCandidate VALUES (?, ?, ?, ?, ?, ?)', args: ['7e000000-0000-4000-8000-000000000024', VISIT_ID, PATIENT_ID, 'EXACT_CLINIC_CARD', 90, NOW] })
    const failure = await captured(() => records.linkIssues({ page: 1, pageSize: 10, status: 'ambiguous' }))
    client.close()
    expect(failure.code).toBe('PATIENT_HISTORY_STORAGE_INVARIANT')
  })

  it('rejects unmatched candidates and mismatched linkage evidence', async () => {
    const { client, records } = await fixture()
    await client.execute({ sql: 'INSERT INTO HistoricalVisit VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [VISIT_ID, BATCH_ID, VISIT_SOURCE, 31, null, null, null, null, null, 'unknown', null, null, 'unmatched', null, 'none', NOW, null] })
    await client.execute({ sql: 'INSERT INTO HistoricalVisitCandidate VALUES (?, ?, ?, ?, ?, ?)', args: ['7e000000-0000-4000-8000-000000000024', VISIT_ID, PATIENT_ID, 'EXACT_CLINIC_CARD', 90, NOW] })
    const unmatched = await captured(() => records.linkIssues({ page: 1, pageSize: 10, status: 'unmatched' }))
    await client.execute({ sql: 'DELETE FROM HistoricalVisitCandidate WHERE historicalVisitId = ?', args: [VISIT_ID] })
    await client.execute({ sql: 'UPDATE HistoricalVisit SET linkStatus = ?, linkMethod = ?, evidenceLevel = ? WHERE id = ?', args: ['ambiguous', 'exact_clinic_card', 'exact', VISIT_ID] })
    await client.execute({ sql: 'INSERT INTO HistoricalVisitCandidate VALUES (?, ?, ?, ?, ?, ?)', args: ['7e000000-0000-4000-8000-000000000025', VISIT_ID, PATIENT_ID, 'EXACT_CLINIC_CARD', 90, NOW] })
    await client.execute({ sql: 'INSERT INTO HistoricalVisitCandidate VALUES (?, ?, ?, ?, ?, ?)', args: ['7e000000-0000-4000-8000-000000000026', VISIT_ID, SECOND_PATIENT_ID, 'EXACT_CLINIC_CARD', 90, NOW] })
    const mismatch = await captured(() => records.linkIssues({ page: 1, pageSize: 10, status: 'ambiguous' }))
    client.close()
    expect({ unmatched: unmatched.code, mismatch: mismatch.code }).toEqual({ unmatched: 'PATIENT_HISTORY_STORAGE_INVARIANT', mismatch: 'PATIENT_HISTORY_STORAGE_INVARIANT' })
  })

  it('rejects patient text stored as a visit candidate evidence code', async () => {
    const { client, records } = await fixture()
    const secret = 'IVANOV'
    await client.execute({ sql: 'INSERT INTO HistoricalVisit VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [VISIT_ID, BATCH_ID, VISIT_SOURCE, 31, null, null, null, null, null, 'unknown', null, null, 'ambiguous', 'exact_clinic_card', 'strong', NOW, null] })
    await client.execute({ sql: 'INSERT INTO HistoricalVisitCandidate VALUES (?, ?, ?, ?, ?, ?)', args: ['7e000000-0000-4000-8000-000000000024', VISIT_ID, PATIENT_ID, secret, 90, NOW] })
    await client.execute({ sql: 'INSERT INTO HistoricalVisitCandidate VALUES (?, ?, ?, ?, ?, ?)', args: ['7e000000-0000-4000-8000-000000000025', VISIT_ID, SECOND_PATIENT_ID, 'EXACT_CLINIC_CARD', 90, NOW] })
    const failure = await captured(() => records.linkIssues({ page: 1, pageSize: 10, status: 'ambiguous' }))
    client.close()
    expect({ code: failure.code, leaked: failure.message?.includes(secret) ?? false }).toEqual({ code: 'PATIENT_HISTORY_STORAGE_INVARIANT', leaked: false })
  })

  it('rejects patient text stored as an attachment kind', async () => {
    const { client, records } = await fixture()
    const secret = 'ivanov'
    await client.execute({ sql: 'INSERT INTO PatientAttachment VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['7b000000-0000-4000-8000-000000000031', PATIENT_ID, secret, null, null, 'operational', NOW, null, null] })
    const failure = await captured(() => records.attachments({ patientId: PATIENT_ID }))
    client.close()
    expect({ code: failure.code, leaked: failure.message?.includes(secret) ?? false }).toEqual({ code: 'PATIENT_HISTORY_STORAGE_INVARIANT', leaked: false })
  })

  it('rejects an imported-file source on an operational attachment', async () => {
    const { client, records } = await fixture()
    await client.execute({ sql: 'INSERT INTO PatientAttachment VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['7b000000-0000-4000-8000-000000000031', PATIENT_ID, 'external_material', null, null, PD_SOURCE, NOW, null, null] })
    const failure = await captured(() => records.attachments({ patientId: PATIENT_ID }))
    client.close()
    expect(failure.code).toBe('PATIENT_HISTORY_STORAGE_INVARIANT')
  })

  it('decrypts the complete protected identity before writing one reveal audit', async () => {
    const { client, records } = await fixture()
    await protectedRows(client)
    await protectedVisitRows(client)
    const revealed = await records.reveal({ id: PATIENT_ID, actor: ACTOR })
    const audit = await client.execute({ sql: 'SELECT action, actor FROM PatientAccess WHERE patientId = ?', args: [PATIENT_ID] })
    client.close()
    expect({ revealed, audit: audit.rows }).toEqual({ revealed: { id: PATIENT_ID, profile: { firstName: 'Лёля', lastName: 'Рубежная', secondName: 'Ильинична', phone: '79215554173', birthday: '1987-11-09' }, contacts: [{ kind: 'email', value: 'synthetic.history@example.test', mask: 's••••••••@example.test', isPrimary: false, sourceName: PD_SOURCE, firstSeenAt: NOW, lastSeenAt: NOW }], previousLastNames: [{ lastName: 'Прежняя-Синтетическая', reason: 'surname_change', sourceName: PD_SOURCE, observedAt: NOW }], externalIdentifiers: [{ system: 'medesk_ehr', value: '0000000000007149', isPrimary: true, sourceName: PD_SOURCE, sourceRow: 17 }], privateData: { passport: { series: '4012', number: '000149' }, address: { city: 'Синтетический город', street: 'Тестовая 7' }, contract: 'Договор-149', notes: 'Синтетическая заметка' }, consents: [{ type: 'sms_notifications', status: 'granted', sourceName: 'Vse pacienty.xlsx', observedAt: NOW }], attachments: [], historicalVisits: [{ id: VISIT_ID, appointmentId: 'appointment-protected-29', doctor: 'Врач Защищённый', details: { services: ['Приём'], cabinet: '7', comment: 'Позвонить вечером' } }], revealedAt: NOW }, audit: [{ action: 'reveal', actor: ACTOR }] })
  })

  it('reveals unknown observation dates as null without fabricating chronology', async () => {
    const { client, records } = await fixture()
    await protectedRows(client)
    await client.execute({ sql: 'UPDATE PatientContact SET firstSeenAt = NULL, lastSeenAt = NULL WHERE patientId = ?', args: [PATIENT_ID] })
    await client.execute({ sql: 'UPDATE PatientNameHistory SET observedAt = NULL WHERE patientId = ?', args: [PATIENT_ID] })
    await client.execute({ sql: 'UPDATE PatientConsent SET observedAt = NULL WHERE patientId = ?', args: [PATIENT_ID] })
    const revealed = await records.reveal({ id: PATIENT_ID, actor: ACTOR })
    client.close()
    expect({ contact: [revealed.contacts[0]?.firstSeenAt, revealed.contacts[0]?.lastSeenAt], name: revealed.previousLastNames[0]?.observedAt, consent: revealed.consents[0]?.observedAt }).toEqual({ contact: [null, null], name: null, consent: null })
  })

  it('returns one frozen value-free error and no audit for a corrupted child envelope', async () => {
    const { client, records } = await fixture()
    await protectedRows(client)
    const secret = 'corrupted-private-child-value'
    await client.execute({ sql: 'UPDATE PatientContact SET ciphertext = ? WHERE patientId = ?', args: [secret, PATIENT_ID] })
    const failure = await captured(() => records.reveal({ id: PATIENT_ID, actor: ACTOR }))
    const audit = await client.execute('SELECT COUNT(*) AS total FROM PatientAccess')
    client.close()
    expect({ failure: { ...failure, leaked: failure.message.includes(secret) }, audits: Number(audit.rows[0]?.total) }).toEqual({ failure: { threw: true, name: 'PatientHistoryRecordError', code: 'PATIENT_HISTORY_STORAGE_INVARIANT', frozen: true, message: new PatientHistoryRecordError('PATIENT_HISTORY_STORAGE_INVARIANT').message, leaked: false }, audits: 0 })
  })

  it('rejects patient text in a reveal source field before writing an audit', async () => {
    const { client, records } = await fixture()
    await protectedRows(client)
    const secret = 'Пациентка Секретова Ия'
    await client.execute({ sql: 'UPDATE PatientContact SET sourceName = ? WHERE patientId = ?', args: [secret, PATIENT_ID] })
    const failure = await captured(() => records.reveal({ id: PATIENT_ID, actor: ACTOR }))
    const audit = await client.execute('SELECT COUNT(*) AS total FROM PatientAccess')
    client.close()
    expect({ code: failure.code, leaked: failure.message?.includes(secret) ?? false, audits: Number(audit.rows[0]?.total) }).toEqual({ code: 'PATIENT_HISTORY_STORAGE_INVARIANT', leaked: false, audits: 0 })
  })

  it('rejects a formatted revealed contact phone before writing an audit', async () => {
    const { client, records } = await fixture()
    await protectedRows(client)
    await client.execute({ sql: 'UPDATE PatientContact SET kind = ?, ciphertext = ?, mask = ? WHERE patientId = ?', args: ['phone', sealed('contact', { value: '+7 921 555-41-73' }), '+7 •••••••• 73', PATIENT_ID] })
    const failure = await captured(() => records.reveal({ id: PATIENT_ID, actor: ACTOR }))
    const audit = await client.execute('SELECT COUNT(*) AS total FROM PatientAccess')
    client.close()
    expect({ code: failure.code, audits: Number(audit.rows[0]?.total) }).toEqual({ code: 'PATIENT_HISTORY_STORAGE_INVARIANT', audits: 0 })
  })

  it('rejects a noncanonical revealed contact email before writing an audit', async () => {
    const { client, records } = await fixture()
    await protectedRows(client)
    await client.execute({ sql: 'UPDATE PatientContact SET ciphertext = ? WHERE patientId = ?', args: [sealed('contact', { value: 'Synthetic.History@Example.Test' }), PATIENT_ID] })
    const failure = await captured(() => records.reveal({ id: PATIENT_ID, actor: ACTOR }))
    const audit = await client.execute('SELECT COUNT(*) AS total FROM PatientAccess')
    client.close()
    expect({ code: failure.code, audits: Number(audit.rows[0]?.total) }).toEqual({ code: 'PATIENT_HISTORY_STORAGE_INVARIANT', audits: 0 })
  })

  it('rejects an operational source on an imported external identifier before audit', async () => {
    const { client, records } = await fixture()
    await protectedRows(client)
    await client.execute({ sql: 'UPDATE PatientExternalIdentifier SET sourceName = ? WHERE patientId = ?', args: ['operational', PATIENT_ID] })
    const failure = await captured(() => records.reveal({ id: PATIENT_ID, actor: ACTOR }))
    const audit = await client.execute('SELECT COUNT(*) AS total FROM PatientAccess')
    client.close()
    expect({ code: failure.code, audits: Number(audit.rows[0]?.total) }).toEqual({ code: 'PATIENT_HISTORY_STORAGE_INVARIANT', audits: 0 })
  })

  it('rolls back without an audit when one historical visit envelope is corrupted', async () => {
    const { client, records } = await fixture()
    await protectedRows(client)
    await protectedVisitRows(client)
    const secret = 'corrupted-visit-detail-secret'
    await client.execute({ sql: 'UPDATE HistoricalVisit SET doctorCiphertext = ? WHERE id = ?', args: [secret, VISIT_ID] })
    const failure = await captured(() => records.reveal({ id: PATIENT_ID, actor: ACTOR }))
    const audit = await client.execute('SELECT COUNT(*) AS total FROM PatientAccess')
    client.close()
    expect({ failure: { ...failure, leaked: failure.message.includes(secret) }, audits: Number(audit.rows[0]?.total) }).toEqual({ failure: { threw: true, name: 'PatientHistoryRecordError', code: 'PATIENT_HISTORY_STORAGE_INVARIANT', frozen: true, message: new PatientHistoryRecordError('PATIENT_HISTORY_STORAGE_INVARIANT').message, leaked: false }, audits: 0 })
  })

  it('rolls back reveal before auditing an unbounded child collection', async () => {
    const profileCiphertext = encryptPatientProfile({ profile: PROFILE, key: ENCRYPTION_KEY, randomBytes: () => IV })
    const contact = Object.freeze({ kind: 'email', ciphertext: sealed('contact', { value: 'synthetic.history@example.test' }), mask: 's••••••••@example.test', isPrimary: false, sourceName: PD_SOURCE, firstSeenAt: NOW, lastSeenAt: NOW })
    const state = { audits: 0, rollbacks: 0 }
    const transaction = Object.freeze({ execute: async ({ sql }) => {
      if (sql.startsWith('SELECT id, profileCiphertext')) return { rows: [{ id: PATIENT_ID, profileCiphertext, piiDestroyedAt: null }] }
      if (sql.startsWith('SELECT kind, ciphertext')) return { rows: Array.from({ length: 1_001 }, () => contact) }
      if (sql.startsWith('INSERT INTO PatientAccess')) state.audits += 1
      return { rows: [] }
    }, commit: async () => undefined, rollback: async () => { state.rollbacks += 1 }, close: async () => undefined })
    const client = Object.freeze({ execute: async () => ({ rows: [] }), transaction: async () => transaction })
    const records = createPatientHistoryRecords({ client, encryptionKey: ENCRYPTION_KEY, clock: () => new Date(NOW), uuid: () => '74000000-0000-4000-8000-000000000004' })
    const failure = await captured(() => records.reveal({ id: PATIENT_ID, actor: ACTOR }))
    expect({ code: failure.code, audits: state.audits, rollbacks: state.rollbacks }).toEqual({ code: 'PATIENT_HISTORY_STORAGE_INVARIANT', audits: 0, rollbacks: 1 })
  })

  it('shares one child-row budget across every revealed collection', async () => {
    const profileCiphertext = encryptPatientProfile({ profile: PROFILE, key: ENCRYPTION_KEY, randomBytes: () => IV })
    const contact = Object.freeze({ kind: 'email', ciphertext: sealed('contact', { value: 'synthetic.history@example.test' }), mask: 's••••••••@example.test', isPrimary: false, sourceName: PD_SOURCE, firstSeenAt: NOW, lastSeenAt: NOW })
    const name = Object.freeze({ lastNameCiphertext: sealed('name_history', { lastName: 'Прежняя' }), sourceName: PD_SOURCE, observedAt: NOW, reason: 'surname_change' })
    const state = { audits: 0, rollbacks: 0 }
    const transaction = Object.freeze({ execute: async ({ sql }) => {
      if (sql.startsWith('SELECT id, profileCiphertext')) return { rows: [{ id: PATIENT_ID, profileCiphertext, piiDestroyedAt: null }] }
      if (sql.startsWith('SELECT kind, ciphertext')) return { rows: Array.from({ length: 600 }, () => contact) }
      if (sql.startsWith('SELECT lastNameCiphertext')) return { rows: Array.from({ length: 401 }, () => name) }
      if (sql.startsWith('INSERT INTO PatientAccess')) state.audits += 1
      return { rows: [] }
    }, commit: async () => undefined, rollback: async () => { state.rollbacks += 1 }, close: async () => undefined })
    const client = Object.freeze({ execute: async () => ({ rows: [] }), transaction: async () => transaction })
    const records = createPatientHistoryRecords({ client, encryptionKey: ENCRYPTION_KEY, clock: () => new Date(NOW), uuid: () => '74000000-0000-4000-8000-000000000004' })
    const failure = await captured(() => records.reveal({ id: PATIENT_ID, actor: ACTOR }))
    expect({ code: failure.code, audits: state.audits, rollbacks: state.rollbacks }).toEqual({ code: 'PATIENT_HISTORY_STORAGE_INVARIANT', audits: 0, rollbacks: 1 })
  })

  it('destroys every protected descendant atomically while retaining anonymized visits and issues', async () => {
    const { client, records } = await fixture()
    await protectedRows(client)
    await historyRows(client)
    await client.execute({ sql: 'INSERT INTO PatientAttachment VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['7b000000-0000-4000-8000-000000000021', PATIENT_ID, 'external_material', sealed('attachment', { url: 'https://invalid.test/file' }), sealed('attachment', { label: 'synthetic' }), 'operational', NOW, null, null] })
    await client.execute({ sql: 'INSERT INTO ImportSourceRow VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['7c000000-0000-4000-8000-000000000022', BATCH_ID, PD_SOURCE, 17, PATIENT_ID, null, sealed('source_row', { value: 'synthetic' }), 'sha256:source', NOW, null] })
    await client.execute({ sql: 'INSERT INTO HistoricalInvoice VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['7d000000-0000-4000-8000-000000000023', BATCH_ID, INVOICE_SOURCE, 2, VISIT_ID, sealed('invoice', { value: 'synthetic' }), 'incomplete_source', NOW, null] })
    await client.execute({ sql: 'UPDATE ImportIssue SET candidatesCiphertext = ?, detailsCiphertext = ? WHERE patientId = ?', args: [sealed('source_row', { candidate: 'synthetic' }), sealed('source_row', { detail: 'synthetic' }), PATIENT_ID] })
    await client.execute({ sql: 'INSERT INTO MangoCall VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['entry-history-1', PATIENT_ID, 'missed', 'sealed-caller', '+7 •••••••• 73', 'v1:caller', 1, '78127482210', null, NOW, null, null, NOW, 0, 0, null, NOW, NOW, NOW, null] })
    const destroyed = await records.destroy({ id: PATIENT_ID, actor: ACTOR })
    const snapshot = await client.execute({ sql: "SELECT (SELECT COUNT(*) FROM PatientExternalIdentifier WHERE patientId = ?) AS identifiers, (SELECT COUNT(*) FROM HistoricalVisit WHERE patientId = ?) AS visits, (SELECT COUNT(*) FROM ImportIssue WHERE patientId = ?) AS issues, (SELECT COUNT(*) FROM PatientAccess WHERE patientId = ? AND action = 'destroy') AS audits, (SELECT COUNT(*) FROM MangoCall WHERE patientId = ?) AS mango, (SELECT COUNT(*) FROM Patient WHERE id = ? AND profileCiphertext IS NULL AND phoneMask IS NULL AND phoneFingerprint IS NULL AND piiDestroyedAt IS NOT NULL) + (SELECT COUNT(*) FROM PatientContact WHERE patientId = ? AND ciphertext IS NULL AND fingerprint IS NULL AND mask IS NULL AND piiDestroyedAt IS NOT NULL) + (SELECT COUNT(*) FROM PatientNameHistory WHERE patientId = ? AND lastNameCiphertext IS NULL AND lastNameFingerprint IS NULL AND sourceIdentifierCiphertext IS NULL AND piiDestroyedAt IS NOT NULL) + (SELECT COUNT(*) FROM PatientPrivateData WHERE patientId = ? AND profileCiphertext IS NULL AND piiDestroyedAt IS NOT NULL) + (SELECT COUNT(*) FROM PatientAttachment WHERE patientId = ? AND urlCiphertext IS NULL AND metadataCiphertext IS NULL AND piiDestroyedAt IS NOT NULL) + (SELECT COUNT(*) FROM ImportSourceRow WHERE patientId = ? AND payloadCiphertext IS NULL AND piiDestroyedAt IS NOT NULL) + (SELECT COUNT(*) FROM HistoricalVisit WHERE patientId = ? AND appointmentIdCiphertext IS NULL AND appointmentIdFingerprint IS NULL AND doctorCiphertext IS NULL AND detailsCiphertext IS NULL AND piiDestroyedAt IS NOT NULL) + (SELECT COUNT(*) FROM HistoricalInvoice WHERE historicalVisitId = ? AND payloadCiphertext IS NULL AND piiDestroyedAt IS NOT NULL) + (SELECT COUNT(*) FROM ImportIssue WHERE patientId = ? AND candidatesCiphertext IS NULL AND detailsCiphertext IS NULL) AS cleared", args: [PATIENT_ID, PATIENT_ID, PATIENT_ID, PATIENT_ID, PATIENT_ID, PATIENT_ID, PATIENT_ID, PATIENT_ID, PATIENT_ID, PATIENT_ID, PATIENT_ID, PATIENT_ID, PATIENT_ID, VISIT_ID, PATIENT_ID] })
    client.close()
    expect({ destroyed, snapshot: snapshot.rows[0] }).toEqual({ destroyed: { id: PATIENT_ID, destroyedAt: NOW, alreadyDestroyed: false }, snapshot: { identifiers: 0, visits: 1, issues: 1, audits: 1, mango: 0, cleared: 9 } })
  })

  it('destroys protected descendants of visits where the patient is only an ambiguity candidate', async () => {
    const { client, records } = await fixture()
    await protectedRows(client)
    await client.execute({ sql: 'INSERT INTO HistoricalVisit VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [CANDIDATE_VISIT_ID, BATCH_ID, VISIT_SOURCE, 39, null, sealed('visit_details', { value: 'appointment-candidate-secret' }), 'v1:candidate-appointment', null, null, 'unknown', sealed('visit_details', { value: 'doctor-candidate-secret' }), sealed('visit_details', { comment: 'candidate-secret' }), 'ambiguous', 'exact_clinic_card', 'strong', NOW, null] })
    await client.execute({ sql: 'INSERT INTO HistoricalVisitCandidate VALUES (?, ?, ?, ?, ?, ?)', args: ['7e000000-0000-4000-8000-000000000034', CANDIDATE_VISIT_ID, PATIENT_ID, 'EXACT_CLINIC_CARD', 90, NOW] })
    await client.execute({ sql: 'INSERT INTO HistoricalVisitCandidate VALUES (?, ?, ?, ?, ?, ?)', args: ['7e000000-0000-4000-8000-000000000035', CANDIDATE_VISIT_ID, SECOND_PATIENT_ID, 'EXACT_CLINIC_CARD', 90, NOW] })
    await client.execute({ sql: 'INSERT INTO ImportSourceRow VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['7c000000-0000-4000-8000-000000000032', BATCH_ID, VISIT_SOURCE, 39, null, CANDIDATE_VISIT_ID, sealed('source_row', { value: 'candidate-source-secret' }), 'sha256:candidate-source', NOW, null] })
    await client.execute({ sql: 'INSERT INTO ImportIssue VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['78000000-0000-4000-8000-000000000038', BATCH_ID, VISIT_SOURCE, 39, 'INVALID_START_DATE', null, CANDIDATE_VISIT_ID, sealed('source_row', { candidate: 'candidate-secret' }), sealed('source_row', { detail: 'candidate-secret' }), NOW, null] })
    await client.execute({ sql: 'INSERT INTO HistoricalInvoice VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['7d000000-0000-4000-8000-000000000033', BATCH_ID, INVOICE_SOURCE, 3, CANDIDATE_VISIT_ID, sealed('invoice', { value: 'candidate-invoice-secret' }), 'incomplete_source', NOW, null] })
    await records.destroy({ id: PATIENT_ID, actor: ACTOR })
    const snapshot = await client.execute({ sql: 'SELECT (SELECT COUNT(*) FROM HistoricalVisit WHERE id = ?) AS visits, (SELECT COUNT(*) FROM HistoricalVisitCandidate WHERE historicalVisitId = ? AND patientId = ?) AS candidates, (SELECT COUNT(*) FROM HistoricalVisit WHERE id = ? AND appointmentIdCiphertext IS NULL AND appointmentIdFingerprint IS NULL AND doctorCiphertext IS NULL AND detailsCiphertext IS NULL AND piiDestroyedAt IS NOT NULL) + (SELECT COUNT(*) FROM ImportSourceRow WHERE historicalVisitId = ? AND payloadCiphertext IS NULL AND payloadHash = ? AND piiDestroyedAt IS NOT NULL) + (SELECT COUNT(*) FROM ImportIssue WHERE historicalVisitId = ? AND candidatesCiphertext IS NULL AND detailsCiphertext IS NULL) + (SELECT COUNT(*) FROM HistoricalInvoice WHERE historicalVisitId = ? AND payloadCiphertext IS NULL AND piiDestroyedAt IS NOT NULL) AS cleared', args: [CANDIDATE_VISIT_ID, CANDIDATE_VISIT_ID, PATIENT_ID, CANDIDATE_VISIT_ID, CANDIDATE_VISIT_ID, 'destroyed', CANDIDATE_VISIT_ID, CANDIDATE_VISIT_ID] })
    client.close()
    expect(snapshot.rows[0]).toEqual({ visits: 1, candidates: 1, cleared: 4 })
  })
})
