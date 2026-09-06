import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import { encryptImportedPatientProfile, encryptPatientProfile, fingerprintContactPhone } from './contact-identity.js'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const MIGRATION_SCRIPT = join(PROJECT_ROOT, 'scripts/init-db.mjs')
const FINGERPRINT_KEY = 'patient-fingerprint-Ω-secret-with-enough-entropy-2026'
const ENCRYPTION_KEY = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64')
const OTHER_ENCRYPTION_KEY = Buffer.from('abcdef0123456789abcdef0123456789').toString('base64')
const FIRST_ID = '10000000-0000-4000-8000-000000000001'
const SECOND_ID = '20000000-0000-4000-8000-000000000002'
const THIRD_ID = '70000000-0000-4000-8000-000000000007'
const FIRST_ACCESS_ID = '30000000-0000-4000-8000-000000000003'
const SECOND_ACCESS_ID = '40000000-0000-4000-8000-000000000004'
const FIRST_CONTACT_ID = '50000000-0000-4000-8000-000000000005'
const SECOND_CONTACT_ID = '60000000-0000-4000-8000-000000000006'
const ACTOR = `v1:${'a7'.repeat(32)}`
const FIRST_TIME = new Date('2026-08-26T10:00:00.000Z')
const SECOND_TIME = new Date('2026-08-27T11:30:00.000Z')
const FIRST_PROFILE = Object.freeze({ firstName: 'Лёля', lastName: 'О’Коннор-Сидорова', secondName: 'Алиевна', phone: '+7 (921) 555-01-29', birthday: '1988-02-29' })
const UPDATED_PROFILE = Object.freeze({ firstName: 'Лёля', lastName: 'О’Коннор-Сидорова', secondName: '', phone: '8 921 555-01-29', birthday: '1988-02-29' })
const OTHER_PROFILE = Object.freeze({ firstName: 'Мария', lastName: 'Кюри', secondName: 'Склодовская', phone: '+7 921 555-83-47', birthday: null })
const SHARED_PHONE_PROFILE = Object.freeze({ ...OTHER_PROFILE, phone: FIRST_PROFILE.phone })

function sequence(values) {
  let index = 0
  return () => values[Math.min(index++, values.length - 1)]
}

async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-patient-records-'))
  const path = join(directory, 'content.sqlite')
  await executeFile(process.execPath, [MIGRATION_SCRIPT], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${path}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 10_000, maxBuffer: 1_000_000 })
  return createClient({ url: `file:${path}` })
}

async function moduleValue() {
  return import('./patient-records.js')
}

async function fixture(overrides = {}) {
  const client = overrides.client ?? await database()
  const module = await moduleValue()
  const factory = typeof module.createPatientRecords === 'function' ? module.createPatientRecords : () => Object.freeze({})
  const records = factory({ client, fingerprintKey: overrides.fingerprintKey ?? FINGERPRINT_KEY, encryptionKey: overrides.encryptionKey ?? ENCRYPTION_KEY, clock: overrides.clock ?? sequence([FIRST_TIME, SECOND_TIME]), uuid: overrides.uuid ?? sequence([FIRST_ID, FIRST_CONTACT_ID, FIRST_ACCESS_ID, SECOND_ID, SECOND_CONTACT_ID, SECOND_ACCESS_ID]) })
  return Object.freeze({ client, records })
}

async function invoke(records, method, input) {
  return typeof records[method] === 'function' ? records[method](input) : Object.freeze({ missing: method })
}

async function captured(operation) {
  try {
    await operation()
    return Object.freeze({ threw: false })
  } catch (error) {
    return Object.freeze({ threw: true, name: error.name, code: error.code })
  }
}

async function capturedMessage(operation) {
  try {
    await operation()
    return Object.freeze({ threw: false })
  } catch (error) {
    return Object.freeze({ threw: true, name: error.name, code: error.code, message: error.message })
  }
}

async function capturedInvariant(operation, secret) {
  try {
    await operation()
    return Object.freeze({ threw: false })
  } catch (error) {
    return Object.freeze({ threw: true, name: error.name, code: error.code, message: error.message, frozen: Object.isFrozen(error), leaked: error.message.includes(secret) })
  }
}

describe('patient list query shape', () => {
  it('lists patients without DISTINCT when no contact join is needed', async () => {
    const statements = []
    const client = Object.freeze({ execute: async ({ sql }) => { statements.push(sql); return { rows: sql.startsWith('SELECT COUNT') ? [{ total: 0 }] : [] } }, transaction: async () => { throw new Error('unused') } })
    const { records } = await fixture({ client })
    await invoke(records, 'list', { page: 1, pageSize: 10 })
    expect(statements.some((sql) => /SELECT DISTINCT/.test(sql))).toBe(false)
  })

  it('keeps DISTINCT for the phone search that joins contacts', async () => {
    const statements = []
    const client = Object.freeze({ execute: async ({ sql }) => { statements.push(sql); return { rows: sql.startsWith('SELECT COUNT') ? [{ total: 0 }] : [] } }, transaction: async () => { throw new Error('unused') } })
    const { records } = await fixture({ client })
    await invoke(records, 'list', { page: 1, pageSize: 10, phone: '+7 921 555-01-29' })
    expect(statements.some((sql) => /SELECT DISTINCT p\.id/.test(sql))).toBe(true)
  })
})

describe('patient records', () => {
  it('inserts one encrypted patient without returning full contact data', async () => {
    const { client, records } = await fixture()
    const patient = await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    const stored = await client.execute({ sql: 'SELECT profileCiphertext, phoneMask, phoneFingerprint FROM Patient WHERE id = ?', args: [FIRST_ID] })
    client.close()
    const row = stored.rows[0] ?? {}
    expect({ patient, stored: { cipherVersion: row.profileCiphertext?.slice(0, 3), plaintext: row.profileCiphertext?.includes('Лёля'), mask: row.phoneMask, fingerprintVersion: row.phoneFingerprint?.slice(0, 3) } }).toEqual({ patient: { id: FIRST_ID, name: 'О’Коннор-Сидорова Лёля Алиевна', phoneMask: '+7 •••••••• 29', firstSeenAt: FIRST_TIME.toISOString(), lastSeenAt: FIRST_TIME.toISOString(), createdAt: FIRST_TIME.toISOString(), updatedAt: FIRST_TIME.toISOString(), piiDestroyedAt: null }, stored: { cipherVersion: 'v1.', plaintext: false, mask: '+7 •••••••• 29', fingerprintVersion: 'v1:' } })
  })

  it('updates a repeated phone without creating a duplicate patient', async () => {
    const { client, records } = await fixture()
    const first = await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    const second = await invoke(records, 'upsert', { profile: UPDATED_PROFILE })
    const count = await client.execute('SELECT COUNT(*) AS total FROM Patient')
    client.close()
    expect({ firstId: first.id, second, total: Number(count.rows[0]?.total) }).toEqual({ firstId: FIRST_ID, second: { id: FIRST_ID, name: 'О’Коннор-Сидорова Лёля', phoneMask: '+7 •••••••• 29', firstSeenAt: FIRST_TIME.toISOString(), lastSeenAt: SECOND_TIME.toISOString(), createdAt: FIRST_TIME.toISOString(), updatedAt: SECOND_TIME.toISOString(), piiDestroyedAt: null }, total: 1 })
  })

  it('lazily projects a compatible legacy root phone into PatientContact without duplicating the patient', async () => {
    const { client, records } = await fixture()
    const ciphertext = encryptPatientProfile({ profile: FIRST_PROFILE, key: ENCRYPTION_KEY })
    const fingerprint = fingerprintContactPhone({ phone: FIRST_PROFILE.phone, key: FINGERPRINT_KEY })
    await client.execute({ sql: 'INSERT INTO Patient VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [SECOND_ID, ciphertext, '+7 •••••••• 29', fingerprint, FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), null] })
    const before = await invoke(records, 'list', { page: 1, pageSize: 50, phone: FIRST_PROFILE.phone })
    const patient = await invoke(records, 'upsert', { profile: UPDATED_PROFILE })
    const rows = await client.execute('SELECT patientId FROM PatientContact')
    client.close()
    expect({ before: before.items.map(({ id }) => id), patientId: patient.id, contacts: rows.rows }).toEqual({ before: [SECOND_ID], patientId: SECOND_ID, contacts: [{ patientId: SECOND_ID }] })
  })

  it('creates separate patient identities when different people share one phone', async () => {
    const { client, records } = await fixture()
    const first = await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    const second = await invoke(records, 'upsert', { profile: SHARED_PHONE_PROFILE })
    const contacts = await client.execute('SELECT patientId, fingerprint FROM PatientContact ORDER BY patientId')
    const page = await invoke(records, 'list', { page: 1, pageSize: 50, phone: FIRST_PROFILE.phone })
    client.close()
    expect({ ids: [first.id, second.id], contacts: contacts.rows.length, fingerprints: new Set(contacts.rows.map(({ fingerprint }) => fingerprint)).size, found: page.items.map(({ id }) => id).sort() }).toEqual({ ids: [FIRST_ID, FIRST_ACCESS_ID], contacts: 2, fingerprints: 1, found: [FIRST_ID, FIRST_ACCESS_ID].sort() })
  })

  it('updates the primary phone projection without deleting an imported secondary contact', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    await client.execute({ sql: 'INSERT INTO PatientContact (id, patientId, kind, ciphertext, fingerprint, mask, isPrimary, sourceName, firstSeenAt, lastSeenAt, piiDestroyedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [SECOND_CONTACT_ID, FIRST_ID, 'phone', 'v1.synthetic', `v1:${'b4'.repeat(32)}`, '+7 •••••••• 47', 0, 'synthetic_import', FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), null] })
    await invoke(records, 'upsert', { profile: UPDATED_PROFILE })
    const contacts = await client.execute('SELECT isPrimary, sourceName FROM PatientContact WHERE patientId = ? ORDER BY isPrimary DESC', [FIRST_ID])
    client.close()
    expect(contacts.rows).toEqual([{ isPrimary: 1, sourceName: 'operational' }, { isPrimary: 0, sourceName: 'synthetic_import' }])
  })

  it('fails closed when one phone has multiple compatible active patient candidates', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    await client.execute({ sql: 'INSERT INTO Patient SELECT ?, profileCiphertext, phoneMask, phoneFingerprint, firstSeenAt, lastSeenAt, createdAt, updatedAt, piiDestroyedAt FROM Patient WHERE id = ?', args: [SECOND_ID, FIRST_ID] })
    await client.execute({ sql: 'INSERT INTO PatientContact SELECT ?, ?, kind, ciphertext, fingerprint, mask, isPrimary, sourceName, firstSeenAt, lastSeenAt, piiDestroyedAt FROM PatientContact WHERE patientId = ?', args: [SECOND_CONTACT_ID, SECOND_ID, FIRST_ID] })
    const failure = await captured(() => records.upsert({ profile: FIRST_PROFILE }))
    const count = await client.execute('SELECT COUNT(*) AS total FROM Patient')
    client.close()
    expect({ failure, patients: Number(count.rows[0]?.total), leaked: JSON.stringify(failure).includes('Лёля') }).toEqual({ failure: { threw: true, name: 'PatientRecordError', code: 'PATIENT_STORAGE_INVARIANT' }, patients: 2, leaked: false })
  })

  it('keeps patient activity timestamps monotonic when the runtime clock moves backwards', async () => {
    const clock = sequence([SECOND_TIME, FIRST_TIME])
    const { client, records } = await fixture({ clock })
    await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    const patient = await invoke(records, 'upsert', { profile: UPDATED_PROFILE })
    client.close()
    expect({ lastSeenAt: patient.lastSeenAt, updatedAt: patient.updatedAt }).toEqual({ lastSeenAt: SECOND_TIME.toISOString(), updatedAt: SECOND_TIME.toISOString() })
  })

  it('returns authorized patient names and masks without phone, birthday, or ciphertext', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    const page = await invoke(records, 'list', { page: 1, pageSize: 99 })
    client.close()
    expect({ page, leaked: JSON.stringify(page).includes('79215550129') || JSON.stringify(page).includes('1988-02-29') || JSON.stringify(page).includes('profileCiphertext') }).toEqual({ page: { items: [{ id: FIRST_ID, name: 'О’Коннор-Сидорова Лёля Алиевна', phoneMask: '+7 •••••••• 29', firstSeenAt: FIRST_TIME.toISOString(), lastSeenAt: FIRST_TIME.toISOString(), createdAt: FIRST_TIME.toISOString(), updatedAt: FIRST_TIME.toISOString(), piiDestroyedAt: null }], page: 1, pageSize: 50, total: 1, pages: 1 }, leaked: false })
  })

  it('reads an active imported profile with an incomplete name and no phone without placeholders', async () => {
    const { client, records } = await fixture()
    const profile = Object.freeze({ firstName: 'Ия', lastName: null, secondName: null, phone: null, birthday: null })
    const ciphertext = encryptImportedPatientProfile({ profile, key: ENCRYPTION_KEY })
    await client.execute({ sql: 'INSERT INTO Patient VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [FIRST_ID, ciphertext, null, null, FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), null] })
    const patient = await invoke(records, 'get', { id: FIRST_ID })
    client.close()
    expect(patient).toEqual({ id: FIRST_ID, name: 'Ия', phoneMask: null, firstSeenAt: FIRST_TIME.toISOString(), lastSeenAt: FIRST_TIME.toISOString(), createdAt: FIRST_TIME.toISOString(), updatedAt: FIRST_TIME.toISOString(), piiDestroyedAt: null })
  })

  it('keeps unknown import chronology null until a real operational encounter', async () => {
    const { client, records } = await fixture()
    const ciphertext = encryptImportedPatientProfile({ profile: FIRST_PROFILE, key: ENCRYPTION_KEY })
    const fingerprint = fingerprintContactPhone({ phone: FIRST_PROFILE.phone, key: FINGERPRINT_KEY })
    await client.execute({ sql: 'INSERT INTO Patient VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [FIRST_ID, ciphertext, '+7 •••••••• 29', fingerprint, null, null, FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), null] })
    await client.execute({ sql: 'INSERT INTO PatientContact VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [FIRST_CONTACT_ID, FIRST_ID, 'phone', 'v1.synthetic', fingerprint, '+7 •••••••• 29', 1, 'medesk.csv', null, null, null] })
    const imported = await invoke(records, 'get', { id: FIRST_ID })
    const observed = await invoke(records, 'upsert', { profile: UPDATED_PROFILE })
    const contact = await client.execute({ sql: 'SELECT firstSeenAt, lastSeenAt FROM PatientContact WHERE id = ?', args: [FIRST_CONTACT_ID] })
    client.close()
    expect({ imported: [imported.firstSeenAt, imported.lastSeenAt], observed: [observed.firstSeenAt, observed.lastSeenAt], contact: contact.rows[0] }).toEqual({ imported: [null, null], observed: [FIRST_TIME.toISOString(), FIRST_TIME.toISOString()], contact: { firstSeenAt: FIRST_TIME.toISOString(), lastSeenAt: FIRST_TIME.toISOString() } })
  })

  it('finds an exact phone by fingerprint without decrypting unrelated patients', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    await invoke(records, 'upsert', { profile: OTHER_PROFILE })
    const page = await invoke(records, 'list', { page: 1, pageSize: 50, phone: '+7 (921) 555-83-47' })
    client.close()
    expect(page.items?.map(({ id, name }) => ({ id, name }))).toEqual([{ id: FIRST_ACCESS_ID, name: 'Кюри Мария Склодовская' }])
  })

  it('finds one patient by its exact deep-link identifier', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    await invoke(records, 'upsert', { profile: OTHER_PROFILE })
    const page = await invoke(records, 'list', { page: 1, pageSize: 50, patientId: FIRST_ACCESS_ID })
    client.close()
    expect(page.items?.map(({ id }) => id)).toEqual([FIRST_ACCESS_ID])
  })

  it('filters patients by data state, activity, visits, and matching issues', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    await invoke(records, 'upsert', { profile: OTHER_PROFILE })
    await client.execute({ sql: 'INSERT INTO Patient VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [THIRD_ID, null, null, null, FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), FIRST_TIME.toISOString()] })
    await client.execute({ sql: 'INSERT INTO HistoricalVisit (id, batchId, sourceName, sourceRow, patientId, appointmentIdCiphertext, appointmentIdFingerprint, startsAt, endsAt, sourceStatus, doctorCiphertext, detailsCiphertext, linkStatus, linkMethod, evidenceLevel, createdAt, piiDestroyedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['80000000-0000-4000-8000-000000000008', 'batch-filter', 'medesk.csv', 29, FIRST_ID, null, null, FIRST_TIME.toISOString(), null, 'completed', null, null, 'linked', 'exact_ehr', 'exact', FIRST_TIME.toISOString(), null] })
    await client.execute({ sql: 'INSERT INTO ImportIssue (id, batchId, sourceName, sourceRow, code, patientId, historicalVisitId, candidatesCiphertext, detailsCiphertext, createdAt, resolvedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['90000000-0000-4000-8000-000000000009', 'batch-filter', 'medesk.csv', 29, 'missing_birthday', FIRST_ID, null, null, null, FIRST_TIME.toISOString(), null] })
    const pages = await Promise.all([{ piiStatus: 'destroyed' }, { history: 'without_visits' }, { issues: 'with_issues' }, { from: '2026-08-26T00:00:00.000Z', to: '2026-08-27T00:00:00.000Z' }].map((filter) => invoke(records, 'list', { page: 1, pageSize: 50, ...filter })))
    client.close()
    expect(pages.map(({ items }) => items.map(({ id }) => id))).toEqual([[THIRD_ID], [FIRST_ACCESS_ID, THIRD_ID], [FIRST_ID], [FIRST_ID, THIRD_ID]])
  })

  it('reveals a phone and writes an audit record in the same transaction', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    const revealed = await invoke(records, 'reveal', { id: FIRST_ID, actor: ACTOR })
    const audit = await client.execute({ sql: 'SELECT patientId, action, actor, createdAt FROM PatientAccess WHERE patientId = ?', args: [FIRST_ID] })
    client.close()
    expect({ revealed, audit: audit.rows[0] }).toEqual({ revealed: { id: FIRST_ID, phone: '79215550129', revealedAt: SECOND_TIME.toISOString() }, audit: { patientId: FIRST_ID, action: 'reveal', actor: ACTOR, createdAt: SECOND_TIME.toISOString() } })
  })

  it('does not audit a reveal when the configured encryption key cannot open the profile', async () => {
    const shared = await database()
    const first = await fixture({ client: shared, clock: () => FIRST_TIME, uuid: () => FIRST_ID })
    await invoke(first.records, 'upsert', { profile: FIRST_PROFILE })
    const second = await fixture({ client: shared, encryptionKey: OTHER_ENCRYPTION_KEY, clock: () => SECOND_TIME, uuid: () => FIRST_ACCESS_ID })
    const failure = await captured(() => second.records.reveal({ id: FIRST_ID, actor: ACTOR }))
    const audit = await shared.execute('SELECT COUNT(*) AS total FROM PatientAccess')
    shared.close()
    expect({ failure, audits: Number(audit.rows[0]?.total) }).toEqual({ failure: { threw: true, name: 'ContactIdentityError', code: 'DECRYPTION_FAILED' }, audits: 0 })
  })

  it('destroys patient PII while retaining an anonymized patient identity and audit', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    const destroyed = await invoke(records, 'destroy', { id: FIRST_ID, actor: ACTOR })
    const row = await client.execute({ sql: 'SELECT profileCiphertext, phoneMask, phoneFingerprint, piiDestroyedAt FROM Patient WHERE id = ?', args: [FIRST_ID] })
    const audit = await client.execute({ sql: 'SELECT action, actor FROM PatientAccess WHERE patientId = ?', args: [FIRST_ID] })
    const found = await invoke(records, 'list', { page: 1, pageSize: 50, phone: FIRST_PROFILE.phone })
    client.close()
    expect({ destroyed, row: row.rows[0], audit: audit.rows[0], found: found.items }).toEqual({ destroyed: { id: FIRST_ID, destroyedAt: SECOND_TIME.toISOString(), alreadyDestroyed: false }, row: { profileCiphertext: null, phoneMask: null, phoneFingerprint: null, piiDestroyedAt: SECOND_TIME.toISOString() }, audit: { action: 'destroy', actor: ACTOR }, found: [] })
  })

  it('makes repeated patient destruction idempotent without duplicate audit events', async () => {
    const clock = sequence([FIRST_TIME, SECOND_TIME, new Date('2026-08-28T12:00:00.000Z')])
    const { client, records } = await fixture({ clock })
    await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    await invoke(records, 'destroy', { id: FIRST_ID, actor: ACTOR })
    const second = await invoke(records, 'destroy', { id: FIRST_ID, actor: ACTOR })
    const audit = await client.execute('SELECT COUNT(*) AS total FROM PatientAccess')
    client.close()
    expect({ second, audits: Number(audit.rows[0]?.total) }).toEqual({ second: { id: FIRST_ID, destroyedAt: SECOND_TIME.toISOString(), alreadyDestroyed: true }, audits: 1 })
  })

  it('creates a new active patient when an earlier matching profile was destroyed', async () => {
    const clock = sequence([FIRST_TIME, SECOND_TIME, new Date('2026-08-28T12:00:00.000Z')])
    const uuid = sequence([FIRST_ID, FIRST_ACCESS_ID, SECOND_ID])
    const { client, records } = await fixture({ clock, uuid })
    await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    await invoke(records, 'destroy', { id: FIRST_ID, actor: ACTOR })
    const patient = await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    const counts = await client.execute('SELECT COUNT(*) AS total, COUNT(phoneFingerprint) AS active FROM Patient')
    client.close()
    expect({ id: patient.id, total: Number(counts.rows[0]?.total), active: Number(counts.rows[0]?.active) }).toEqual({ id: SECOND_ID, total: 2, active: 1 })
  })

  it('rejects a patient phone accessor without invoking it before profile validation', async () => {
    const { client, records } = await fixture()
    const profile = { ...FIRST_PROFILE }
    Object.defineProperty(profile, 'phone', { enumerable: true, get: () => { throw new Error('unsafe getter invoked') } })
    const result = await captured(() => records.upsert({ profile }))
    client.close()
    expect(result).toEqual({ threw: true, name: 'TypeError', code: undefined })
  })

  it('maps a hostile patient-upsert proxy failure to a fixed value-free boundary error', async () => {
    const { client, records } = await fixture()
    const secret = 'Лёля-секрет-прокси'
    const input = new Proxy({}, { getPrototypeOf: () => { throw new Error(secret) } })
    const result = await capturedMessage(() => records.upsert(input))
    client.close()
    expect(result).toEqual({ threw: true, name: 'TypeError', code: undefined, message: 'Patient upsert must be a plain data object' })
  })

  it('maps a hostile storage-result proxy failure to a fixed value-free invariant', async () => {
    const secret = 'Кюри-секрет-хранилища'
    const result = new Proxy({}, { getOwnPropertyDescriptor: () => { throw new Error(secret) } })
    const client = { execute: async () => result, transaction: async () => ({}) }
    const { records } = await fixture({ client })
    const failure = await capturedMessage(() => records.list({ page: 1, pageSize: 10 }))
    expect(failure).toEqual({ threw: true, name: 'PatientRecordError', code: 'PATIENT_STORAGE_INVARIANT', message: 'Patient storage contains an invalid record' })
  })

  it.each(['rows array', 'nested row'])('maps a revoked storage %s proxy to a frozen value-free invariant', async (kind) => {
    const secret = 'patient-revoked-storage-secret'
    const revoked = Proxy.revocable(kind === 'rows array' ? [] : {}, {})
    revoked.revoke()
    const rows = kind === 'rows array' ? revoked.proxy : Object.freeze([revoked.proxy])
    const client = { execute: async () => Object.freeze({ rows }), transaction: async () => ({}) }
    const { records } = await fixture({ client })
    const failure = await capturedInvariant(() => records.list({ page: 1, pageSize: 10 }), secret)
    expect(failure).toEqual({ threw: true, name: 'PatientRecordError', code: 'PATIENT_STORAGE_INVARIANT', message: 'Patient storage contains an invalid record', frozen: true, leaked: false })
  })

  it('backfills every active matching MANGO call when a patient is created later', async () => {
    const { client, records } = await fixture()
    const fingerprint = fingerprintContactPhone({ phone: FIRST_PROFILE.phone, key: FINGERPRINT_KEY })
    const values = ['entry-older', 'entry-newer'].map((entryId, index) => [entryId, null, 'missed', 'sealed', '+7 •••••••• 29', fingerprint, index, '78127482210', null, `2026-08-2${index + 4}T10:00:00.000Z`, null, null, `2026-08-2${index + 4}T10:01:00.000Z`, 60, 0, null, `2026-08-2${index + 4}T10:01:00.000Z`, FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), null])
    for (const args of values) await client.execute({ sql: 'INSERT INTO MangoCall VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args })
    await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    const calls = await client.execute('SELECT entryId, patientId FROM MangoCall ORDER BY entryId')
    client.close()
    expect(calls.rows).toEqual([{ entryId: 'entry-newer', patientId: FIRST_ID }, { entryId: 'entry-older', patientId: FIRST_ID }])
  })

  it('clears earlier automatic MANGO links when a second active patient shares the phone', async () => {
    const { client, records } = await fixture()
    const fingerprint = fingerprintContactPhone({ phone: FIRST_PROFILE.phone, key: FINGERPRINT_KEY })
    const args = ['entry-shared', null, 'missed', 'sealed', '+7 •••••••• 29', fingerprint, 0, '78127482210', null, FIRST_TIME.toISOString(), null, null, FIRST_TIME.toISOString(), 0, 0, null, FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), null]
    await client.execute({ sql: 'INSERT INTO MangoCall VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args })
    await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    await invoke(records, 'upsert', { profile: SHARED_PHONE_PROFILE })
    const row = await client.execute('SELECT patientId FROM MangoCall WHERE entryId = ?', ['entry-shared'])
    client.close()
    expect(row.rows[0]).toEqual({ patientId: null })
  })

  it('relinks a shared-phone MANGO call after one candidate is destroyed', async () => {
    const clock = sequence([FIRST_TIME, SECOND_TIME, new Date('2026-08-28T12:00:00.000Z')])
    const { client, records } = await fixture({ clock })
    const fingerprint = fingerprintContactPhone({ phone: FIRST_PROFILE.phone, key: FINGERPRINT_KEY })
    const args = ['entry-destroyed', null, 'missed', 'sealed', '+7 •••••••• 29', fingerprint, 0, '78127482210', null, FIRST_TIME.toISOString(), null, null, FIRST_TIME.toISOString(), 0, 0, null, FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), null]
    await client.execute({ sql: 'INSERT INTO MangoCall VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args })
    const first = await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    const second = await invoke(records, 'upsert', { profile: SHARED_PHONE_PROFILE })
    await invoke(records, 'destroy', { id: second.id, actor: ACTOR })
    const row = await client.execute('SELECT patientId FROM MangoCall WHERE entryId = ?', ['entry-destroyed'])
    client.close()
    expect({ first: first.id, linked: row.rows[0]?.patientId }).toEqual({ first: FIRST_ID, linked: FIRST_ID })
  })

  it('resynchronizes a legacy root-only phone fingerprint when destroying its patient', async () => {
    const { client, records } = await fixture({ clock: () => SECOND_TIME, uuid: () => FIRST_ACCESS_ID })
    const fingerprint = fingerprintContactPhone({ phone: FIRST_PROFILE.phone, key: FINGERPRINT_KEY })
    const ciphertext = encryptPatientProfile({ profile: FIRST_PROFILE, key: ENCRYPTION_KEY })
    await client.execute({ sql: 'INSERT INTO Patient VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [FIRST_ID, ciphertext, '+7 •••••••• 29', fingerprint, FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), null] })
    await client.execute({ sql: 'INSERT INTO MangoCall VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: ['entry-legacy-destroy', FIRST_ID, 'missed', 'sealed', '+7 •••••••• 29', fingerprint, 0, '78127482210', null, FIRST_TIME.toISOString(), null, null, FIRST_TIME.toISOString(), 0, 0, null, FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), FIRST_TIME.toISOString(), null] })
    await invoke(records, 'destroy', { id: FIRST_ID, actor: ACTOR })
    const row = await client.execute('SELECT patientId FROM MangoCall WHERE entryId = ?', ['entry-legacy-destroy'])
    client.close()
    expect(row.rows[0]).toEqual({ patientId: null })
  })
})
