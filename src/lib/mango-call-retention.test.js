import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import { anonymizeOldCalls } from './mango-call-retention.js'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const CUTOFF = '2025-09-06T12:00:00.000Z'
const NOW = '2026-09-06T12:00:00.000Z'

async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-call-retention-'))
  const path = join(directory, 'db.sqlite')
  await executeFile(process.execPath, [join(PROJECT_ROOT, 'scripts/init-db.mjs')], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${path}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 20_000, maxBuffer: 1_000_000 })
  return createClient({ url: `file:${path}` })
}

async function call(client, entryId, startedAt) {
  await client.execute({ sql: 'INSERT INTO MangoCall (entryId, patientId, status, callerCiphertext, callerMask, callerFingerprint, repeatCaller, lineNumber, startedAt, waitSeconds, talkSeconds, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [entryId, null, 'answered', 'sealed', '+7 •••••••• 29', 'v1:fingerprint', 1, '78127482210', startedAt, 12, 80, startedAt, startedAt] })
  await client.execute({ sql: 'INSERT INTO MangoCallLeg (callId, entryId, maxSeq, state, eventAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [`leg-${entryId}`, entryId, 1, 'connected', startedAt, startedAt, startedAt] })
}

describe('anonymizeOldCalls', () => {
  it('strips caller identity from calls older than the cutoff while keeping their metrics', async () => {
    const client = await database()
    await call(client, 'старый', '2025-03-01T10:00:00.000Z')
    await anonymizeOldCalls({ client, cutoff: CUTOFF, now: NOW, nextUuid: () => '10000000-0000-4000-8000-000000000001' })
    const row = await client.execute('SELECT callerCiphertext, callerMask, callerFingerprint, repeatCaller, piiDestroyedAt, talkSeconds FROM MangoCall')
    client.close()
    expect(row.rows[0]).toMatchObject({ callerCiphertext: null, callerMask: null, callerFingerprint: null, repeatCaller: null, piiDestroyedAt: NOW, talkSeconds: 80 })
  })

  it('leaves recent calls untouched', async () => {
    const client = await database()
    await call(client, 'свежий', '2026-09-01T10:00:00.000Z')
    await anonymizeOldCalls({ client, cutoff: CUTOFF, now: NOW, nextUuid: () => '10000000-0000-4000-8000-000000000001' })
    const row = await client.execute('SELECT callerMask FROM MangoCall')
    client.close()
    expect(row.rows[0].callerMask).toBe('+7 •••••••• 29')
  })

  it('deletes the live leg rows of anonymised calls', async () => {
    const client = await database()
    await call(client, 'старый', '2025-03-01T10:00:00.000Z')
    await anonymizeOldCalls({ client, cutoff: CUTOFF, now: NOW, nextUuid: () => '10000000-0000-4000-8000-000000000001' })
    const legs = await client.execute('SELECT COUNT(*) AS total FROM MangoCallLeg')
    client.close()
    expect(Number(legs.rows[0].total)).toBe(0)
  })

  it('audits each anonymised call as a retention destruction', async () => {
    const client = await database()
    await call(client, 'старый', '2025-03-01T10:00:00.000Z')
    await anonymizeOldCalls({ client, cutoff: CUTOFF, now: NOW, nextUuid: () => '10000000-0000-4000-8000-000000000001' })
    const audit = await client.execute('SELECT entryId, action, actor FROM MangoCallAccess')
    client.close()
    expect(audit.rows[0]).toMatchObject({ entryId: 'старый', action: 'destroy', actor: 'retention' })
  })

  it('does not audit calls that were already destroyed', async () => {
    const client = await database()
    await call(client, 'старый', '2025-03-01T10:00:00.000Z')
    await anonymizeOldCalls({ client, cutoff: CUTOFF, now: NOW, nextUuid: () => '10000000-0000-4000-8000-000000000001' })
    const second = await anonymizeOldCalls({ client, cutoff: CUTOFF, now: NOW, nextUuid: () => '10000000-0000-4000-8000-000000000002' })
    client.close()
    expect(second.anonymized).toBe(0)
  })
})
