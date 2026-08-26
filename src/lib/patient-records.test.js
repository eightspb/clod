import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const MIGRATION_SCRIPT = join(PROJECT_ROOT, 'scripts/init-db.mjs')
const FINGERPRINT_KEY = 'patient-fingerprint-Ω-secret-with-enough-entropy-2026'
const ENCRYPTION_KEY = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64')
const OTHER_ENCRYPTION_KEY = Buffer.from('abcdef0123456789abcdef0123456789').toString('base64')
const FIRST_ID = '10000000-0000-4000-8000-000000000001'
const SECOND_ID = '20000000-0000-4000-8000-000000000002'
const FIRST_ACCESS_ID = '30000000-0000-4000-8000-000000000003'
const SECOND_ACCESS_ID = '40000000-0000-4000-8000-000000000004'
const ACTOR = `v1:${'a7'.repeat(32)}`
const FIRST_TIME = new Date('2026-08-26T10:00:00.000Z')
const SECOND_TIME = new Date('2026-08-27T11:30:00.000Z')
const FIRST_PROFILE = Object.freeze({ firstName: 'Лёля', lastName: 'О’Коннор-Сидорова', secondName: 'Алиевна', phone: '+7 (921) 555-01-29', birthday: '1988-02-29' })
const UPDATED_PROFILE = Object.freeze({ firstName: 'Лилия', lastName: 'О’Коннор-Сидорова', secondName: '', phone: '8 921 555-01-29', birthday: '1988-02-29' })
const OTHER_PROFILE = Object.freeze({ firstName: 'Мария', lastName: 'Кюри', secondName: 'Склодовская', phone: '+7 921 555-83-47', birthday: null })

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
  const records = factory({ client, fingerprintKey: overrides.fingerprintKey ?? FINGERPRINT_KEY, encryptionKey: overrides.encryptionKey ?? ENCRYPTION_KEY, clock: overrides.clock ?? sequence([FIRST_TIME, SECOND_TIME]), uuid: overrides.uuid ?? sequence([FIRST_ID, FIRST_ACCESS_ID, SECOND_ID, SECOND_ACCESS_ID]) })
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
    expect({ firstId: first.id, second, total: Number(count.rows[0]?.total) }).toEqual({ firstId: FIRST_ID, second: { id: FIRST_ID, name: 'О’Коннор-Сидорова Лилия', phoneMask: '+7 •••••••• 29', firstSeenAt: FIRST_TIME.toISOString(), lastSeenAt: SECOND_TIME.toISOString(), createdAt: FIRST_TIME.toISOString(), updatedAt: SECOND_TIME.toISOString(), piiDestroyedAt: null }, total: 1 })
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

  it('finds an exact phone by fingerprint without decrypting unrelated patients', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'upsert', { profile: FIRST_PROFILE })
    await invoke(records, 'upsert', { profile: OTHER_PROFILE })
    const page = await invoke(records, 'list', { page: 1, pageSize: 50, phone: '+7 (921) 555-83-47' })
    client.close()
    expect(page.items?.map(({ id, name }) => ({ id, name }))).toEqual([{ id: FIRST_ACCESS_ID, name: 'Кюри Мария Склодовская' }])
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
    client.close()
    expect({ destroyed, row: row.rows[0], audit: audit.rows[0] }).toEqual({ destroyed: { id: FIRST_ID, destroyedAt: SECOND_TIME.toISOString(), alreadyDestroyed: false }, row: { profileCiphertext: null, phoneMask: null, phoneFingerprint: null, piiDestroyedAt: SECOND_TIME.toISOString() }, audit: { action: 'destroy', actor: ACTOR } })
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
})
