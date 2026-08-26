import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import { createPatientRecords } from './patient-records.js'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const MIGRATION_SCRIPT = join(PROJECT_ROOT, 'scripts/init-db.mjs')
const FINGERPRINT_KEY = 'mango-fingerprint-Ω-secret-with-enough-entropy-2026'
const ENCRYPTION_KEY = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64')
const OTHER_ENCRYPTION_KEY = Buffer.from('abcdef0123456789abcdef0123456789').toString('base64')
const PATIENT_ID = '10000000-0000-4000-8000-000000000001'
const ACCESS_ID = '20000000-0000-4000-8000-000000000002'
const OTHER_ACCESS_ID = '30000000-0000-4000-8000-000000000003'
const ACTOR = `v1:${'a7'.repeat(32)}`
const PHONE = '79215550129'
const OTHER_PHONE = '79215558347'
const LINE = '78127482210'
const NOW = new Date('2026-08-26T12:00:00.000Z')
const PROFILE = Object.freeze({ firstName: 'Лёля', lastName: 'О’Коннор-Сидорова', secondName: 'Алиевна', phone: PHONE, birthday: '1988-02-29' })

function sequence(values) {
  let index = 0
  return () => values[Math.min(index++, values.length - 1)]
}

async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-mango-call-records-'))
  const path = join(directory, 'content.sqlite')
  await executeFile(process.execPath, [MIGRATION_SCRIPT], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${path}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 10_000, maxBuffer: 1_000_000 })
  return Object.freeze({ client: createClient({ url: `file:${path}` }), url: `file:${path}` })
}

async function fixture(overrides = {}) {
  const storage = overrides.storage ?? await database()
  const module = await import('./mango-call-records.js').catch(() => Object.freeze({}))
  const factory = typeof module.createMangoCallRecords === 'function' ? module.createMangoCallRecords : () => Object.freeze({})
  const records = factory({ client: storage.client, fingerprintKey: FINGERPRINT_KEY, encryptionKey: overrides.encryptionKey ?? ENCRYPTION_KEY, clock: overrides.clock ?? (() => NOW), uuid: overrides.uuid ?? sequence([ACCESS_ID, OTHER_ACCESS_ID]) })
  return Object.freeze({ ...storage, records })
}

function live(overrides = {}) {
  return Object.freeze({ kind: 'apply_live', entryId: 'entry-1', callId: 'leg-1', seq: 1, state: 'ringing', location: 'ivr', eventAt: '2026-08-26T10:00:00.000Z', callerPhone: PHONE, lineNumber: LINE, operatorExtension: null, disconnectReason: null, ...overrides })
}

function summary(overrides = {}) {
  return Object.freeze({ kind: 'finalize', entryId: 'entry-1', status: 'answered', callerPhone: PHONE, lineNumber: LINE, operatorExtension: '123', startedAt: '2026-08-26T10:00:00.000Z', forwardedAt: '2026-08-26T10:00:05.000Z', answeredAt: '2026-08-26T10:00:10.000Z', endedAt: '2026-08-26T10:01:10.000Z', waitSeconds: 10, talkSeconds: 60, disconnectReason: '1100', finalizedAt: '2026-08-26T10:01:10.000Z', ...overrides })
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

describe('MANGO call records', () => {
  it('inserts the first live aggregate and leg with protected caller identity', async () => {
    const { client, records } = await fixture()
    const result = await invoke(records, 'apply', live())
    const stored = await client.execute('SELECT status, callerCiphertext, callerMask, callerFingerprint, repeatCaller, patientId FROM MangoCall')
    const leg = await client.execute('SELECT callId, entryId, maxSeq, state, location FROM MangoCallLeg')
    client.close()
    expect({ result, call: { ...stored.rows[0], callerCiphertext: stored.rows[0]?.callerCiphertext?.slice(0, 3), callerFingerprint: stored.rows[0]?.callerFingerprint?.slice(0, 3) }, leg: leg.rows[0] }).toEqual({ result: { outcome: 'applied', entryId: 'entry-1' }, call: { status: 'ringing', callerCiphertext: 'v1.', callerMask: '+7 •••••••• 29', callerFingerprint: 'v1:', repeatCaller: 0, patientId: null }, leg: { callId: 'leg-1', entryId: 'entry-1', maxSeq: 1, state: 'ringing', location: 'ivr' } })
    expect(JSON.stringify(stored.rows[0])).not.toContain(PHONE)
  })

  it('rejects duplicate and stale leg events while a higher sequence updates atomically', async () => {
    const { client, records } = await fixture()
    const first = await invoke(records, 'apply', live({ seq: 2, state: 'queued', location: 'queue' }))
    const duplicate = await invoke(records, 'apply', live({ seq: 2, state: 'connected', location: 'abonent' }))
    const stale = await invoke(records, 'apply', live({ seq: 1, state: 'connected', location: 'abonent' }))
    const higher = await invoke(records, 'apply', live({ seq: 100_000, state: 'connected', location: 'abonent', operatorExtension: '123', eventAt: '2026-08-26T10:00:10.000Z' }))
    const row = await client.execute('SELECT c.status, c.operatorExtension, l.maxSeq, l.state FROM MangoCall c JOIN MangoCallLeg l ON l.entryId = c.entryId')
    client.close()
    expect({ outcomes: [first.outcome, duplicate.outcome, stale.outcome, higher.outcome], row: row.rows[0] }).toEqual({ outcomes: ['applied', 'duplicate', 'stale', 'applied'], row: { status: 'connected', operatorExtension: '123', maxSeq: 100_000, state: 'connected' } })
  })

  it('tracks independent sequenced legs under one call aggregate', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'apply', live())
    await invoke(records, 'apply', live({ callId: 'leg-2', seq: 7, state: 'connected', location: 'abonent', operatorExtension: '321' }))
    const legs = await client.execute('SELECT callId, maxSeq FROM MangoCallLeg ORDER BY callId')
    const count = await client.execute('SELECT COUNT(*) AS total FROM MangoCall')
    client.close()
    expect({ legs: legs.rows, calls: Number(count.rows[0]?.total) }).toEqual({ legs: [{ callId: 'leg-1', maxSeq: 1 }, { callId: 'leg-2', maxSeq: 7 }], calls: 1 })
  })

  it('links an existing patient but never creates one for an unknown caller', async () => {
    const { client, records } = await fixture()
    const patients = createPatientRecords({ client, fingerprintKey: FINGERPRINT_KEY, encryptionKey: ENCRYPTION_KEY, clock: () => NOW, uuid: () => PATIENT_ID })
    await patients.upsert({ profile: PROFILE })
    await invoke(records, 'apply', live())
    await invoke(records, 'apply', live({ entryId: 'entry-2', callId: 'leg-2', callerPhone: OTHER_PHONE }))
    const calls = await client.execute('SELECT entryId, patientId FROM MangoCall ORDER BY entryId')
    const count = await client.execute('SELECT COUNT(*) AS total FROM Patient')
    client.close()
    expect({ calls: calls.rows, patients: Number(count.rows[0]?.total) }).toEqual({ calls: [{ entryId: 'entry-1', patientId: PATIENT_ID }, { entryId: 'entry-2', patientId: null }], patients: 1 })
  })

  it('marks a caller as repeated only after an earlier finalized call', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'apply', summary())
    await invoke(records, 'apply', live({ entryId: 'entry-2', callId: 'leg-2' }))
    const rows = await client.execute('SELECT entryId, repeatCaller FROM MangoCall ORDER BY entryId')
    client.close()
    expect(rows.rows).toEqual([{ entryId: 'entry-1', repeatCaller: 0 }, { entryId: 'entry-2', repeatCaller: 1 }])
  })

  it('finalizes idempotently, overrides provisional status, and fences late live events', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'apply', live())
    const finalized = await invoke(records, 'apply', summary())
    const duplicate = await invoke(records, 'apply', summary())
    const late = await invoke(records, 'apply', live({ seq: 99, state: 'on_hold', location: 'abonent', eventAt: '2026-08-26T10:02:00.000Z' }))
    const row = await client.execute('SELECT status, waitSeconds, talkSeconds, finalizedAt FROM MangoCall')
    client.close()
    expect({ outcomes: [finalized.outcome, duplicate.outcome, late.outcome], row: row.rows[0] }).toEqual({ outcomes: ['applied', 'duplicate', 'stale'], row: { status: 'answered', waitSeconds: 10, talkSeconds: 60, finalizedAt: '2026-08-26T10:01:10.000Z' } })
  })

  it('keeps the normalized talk-time truth when finalizing a missed call', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'apply', summary({ status: 'missed', answeredAt: null, waitSeconds: 70, talkSeconds: 0 }))
    const row = await client.execute('SELECT status, answeredAt, waitSeconds, talkSeconds FROM MangoCall')
    client.close()
    expect(row.rows[0]).toEqual({ status: 'missed', answeredAt: null, waitSeconds: 70, talkSeconds: 0 })
  })

  it('accepts an answered call that ends within the same timestamp second', async () => {
    const { client, records } = await fixture()
    const result = await invoke(records, 'apply', summary({ endedAt: '2026-08-26T10:00:10.000Z', finalizedAt: '2026-08-26T10:00:10.000Z', talkSeconds: 0 }))
    const row = await client.execute('SELECT status, answeredAt, talkSeconds FROM MangoCall')
    client.close()
    expect({ result, row: row.rows[0] }).toEqual({ result: { outcome: 'applied', entryId: 'entry-1' }, row: { status: 'answered', answeredAt: '2026-08-26T10:00:10.000Z', talkSeconds: 0 } })
  })

  it('removes provisional data when a summary proves the call is not inbound', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'apply', live())
    const result = await invoke(records, 'apply', { kind: 'remove_non_inbound', entryId: 'entry-1' })
    const counts = await client.execute('SELECT (SELECT COUNT(*) FROM MangoCall) AS calls, (SELECT COUNT(*) FROM MangoCallLeg) AS legs')
    client.close()
    expect({ result, counts: counts.rows[0] }).toEqual({ result: { outcome: 'removed', entryId: 'entry-1' }, counts: { calls: 0, legs: 0 } })
  })

  it('serializes concurrent deliveries so the highest leg sequence wins', async () => {
    const storage = await database()
    const first = await fixture({ storage })
    const secondClient = createClient({ url: storage.url })
    const second = await fixture({ storage: { client: secondClient, url: storage.url } })
    const results = await Promise.all([first.records.apply(live({ seq: 4, state: 'queued', location: 'queue' })), second.records.apply(live({ seq: 9, state: 'connected', location: 'abonent' }))])
    const row = await storage.client.execute('SELECT c.status, l.maxSeq FROM MangoCall c JOIN MangoCallLeg l ON l.entryId = c.entryId')
    storage.client.close()
    secondClient.close()
    expect({ applied: results.filter(({ outcome }) => outcome === 'applied').length, row: row.rows[0] }).toEqual({ applied: 2, row: { status: 'connected', maxSeq: 9 } })
  })

  it('lists only masked fields with strict filters and clamps page size to fifty', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'apply', summary())
    await invoke(records, 'apply', summary({ entryId: 'entry-2', status: 'missed', callerPhone: OTHER_PHONE, operatorExtension: '321', answeredAt: null, waitSeconds: 70, talkSeconds: 0 }))
    const page = await invoke(records, 'list', { page: 1, pageSize: 99, status: 'missed', lineNumber: LINE, operatorExtension: '321', from: '2026-08-26T09:00:00.000Z', to: '2026-08-26T11:00:00.000Z' })
    client.close()
    expect({ page: { ...page, items: page.items?.map(({ entryId, status, callerMask }) => ({ entryId, status, callerMask })) }, leaked: JSON.stringify(page).includes(OTHER_PHONE) || JSON.stringify(page).includes('callerCiphertext') || JSON.stringify(page).includes('callerFingerprint') }).toEqual({ page: { items: [{ entryId: 'entry-2', status: 'missed', callerMask: '+7 •••••••• 47' }], page: 1, pageSize: 50, total: 1, pages: 1 }, leaked: false })
  })

  it('returns safe detail and aggregate call metrics', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'apply', summary())
    await invoke(records, 'apply', summary({ entryId: 'entry-2', status: 'missed', callerPhone: OTHER_PHONE, answeredAt: null, waitSeconds: 30, talkSeconds: 0 }))
    await invoke(records, 'apply', live({ entryId: 'entry-3', callId: 'leg-3' }))
    const detail = await invoke(records, 'get', { entryId: 'entry-1' })
    const metrics = await invoke(records, 'metrics', { from: '2026-08-26T09:00:00.000Z', to: '2026-08-26T11:00:00.000Z' })
    client.close()
    expect({ detail: { entryId: detail.entryId, callerMask: detail.callerMask, patientId: detail.patientId }, metrics }).toEqual({ detail: { entryId: 'entry-1', callerMask: '+7 •••••••• 29', patientId: null }, metrics: { active: 1, incoming: 3, answered: 1, missed: 1, answerRate: 50, averageWaitSeconds: 20, averageTalkSeconds: 30 } })
  })

  it('reveals a caller and writes its audit in the same transaction', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'apply', live())
    const revealed = await invoke(records, 'reveal', { entryId: 'entry-1', actor: ACTOR })
    const audit = await client.execute('SELECT entryId, action, actor FROM MangoCallAccess')
    client.close()
    expect({ revealed, audit: audit.rows[0] }).toEqual({ revealed: { entryId: 'entry-1', phone: PHONE, revealedAt: NOW.toISOString() }, audit: { entryId: 'entry-1', action: 'reveal', actor: ACTOR } })
  })

  it('rolls back reveal auditing when the encryption key is wrong', async () => {
    const shared = await database()
    const first = await fixture({ storage: shared })
    await invoke(first.records, 'apply', live())
    const second = await fixture({ storage: shared, encryptionKey: OTHER_ENCRYPTION_KEY })
    const failure = await captured(() => second.records.reveal({ entryId: 'entry-1', actor: ACTOR }))
    const audit = await shared.client.execute('SELECT COUNT(*) AS total FROM MangoCallAccess')
    shared.client.close()
    expect({ failure, audits: Number(audit.rows[0]?.total) }).toEqual({ failure: { threw: true, name: 'ContactIdentityError', code: 'DECRYPTION_FAILED' }, audits: 0 })
  })

  it('destroys caller PII and identity links while retaining anonymized metrics', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'apply', summary())
    const destroyed = await invoke(records, 'destroy', { entryId: 'entry-1', actor: ACTOR })
    const row = await client.execute('SELECT patientId, callerCiphertext, callerMask, callerFingerprint, repeatCaller, status, talkSeconds, piiDestroyedAt FROM MangoCall')
    const audit = await client.execute('SELECT action FROM MangoCallAccess')
    client.close()
    expect({ destroyed, row: row.rows[0], audit: audit.rows[0] }).toEqual({ destroyed: { entryId: 'entry-1', destroyedAt: NOW.toISOString(), alreadyDestroyed: false }, row: { patientId: null, callerCiphertext: null, callerMask: null, callerFingerprint: null, repeatCaller: null, status: 'answered', talkSeconds: 60, piiDestroyedAt: NOW.toISOString() }, audit: { action: 'destroy' } })
  })
})
