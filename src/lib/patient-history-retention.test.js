import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import { anonymizeUnmatchedHistory, runUnmatchedHistoryRetention } from './patient-history-retention.js'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const BATCH_ID = '73000000-0000-4000-8000-000000000003'
const PATIENT_ID = '71000000-0000-4000-8000-000000000001'
const VISIT_SOURCE = '544663c3807aab090001bad8_visits.csv'
const NOW = '2026-09-09T12:00:00.000Z'
const CUTOFF = '2026-09-01T00:00:00.000Z'

async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-history-retention-'))
  const path = join(directory, 'db.sqlite')
  await executeFile(process.execPath, [join(PROJECT_ROOT, 'scripts/init-db.mjs')], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${path}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 20_000, maxBuffer: 1_000_000 })
  const client = createClient({ url: `file:${path}` })
  await client.execute({ sql: 'INSERT INTO ImportBatch VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: [BATCH_ID, 'sha256:manifest', 'sha256:plan', 'apply', 'completed', '{}', '2026-08-28T08:00:00.000Z', '2026-08-28T08:00:00.000Z'] })
  await client.execute({ sql: 'INSERT INTO Patient VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [PATIENT_ID, null, null, null, NOW, NOW, NOW, NOW, null] })
  return client
}

let sourceRow = 0

async function visit(client, id, { linkStatus, createdAt, patientId = null }) {
  sourceRow += 1
  const method = linkStatus === 'linked' ? 'exact_ehr' : null
  const level = linkStatus === 'linked' ? 'exact' : 'none'
  await client.execute({ sql: 'INSERT INTO HistoricalVisit (id, batchId, sourceName, sourceRow, patientId, appointmentIdCiphertext, doctorCiphertext, detailsCiphertext, sourceStatus, linkStatus, linkMethod, evidenceLevel, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [id, BATCH_ID, VISIT_SOURCE, sourceRow, patientId, 'sealed-appointment', 'sealed-doctor', 'sealed-details', 'completed', linkStatus, method, level, createdAt] })
  await client.execute({ sql: 'INSERT INTO ImportSourceRow (id, batchId, sourceName, sourceRow, patientId, historicalVisitId, payloadCiphertext, payloadHash, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [`row-${id}`, BATCH_ID, VISIT_SOURCE, sourceRow, patientId, id, 'sealed-payload', 'sha256:payload', createdAt] })
}

describe('anonymizeUnmatchedHistory', () => {
  it('strips protected details from old unmatched visits and their source rows', async () => {
    const client = await database()
    await visit(client, 'old-unmatched', { linkStatus: 'unmatched', createdAt: '2026-08-28T08:49:38.822Z' })
    const result = await anonymizeUnmatchedHistory({ client, cutoff: CUTOFF, now: NOW })
    const rows = await client.execute("SELECT v.doctorCiphertext, v.piiDestroyedAt, r.payloadCiphertext, r.payloadHash FROM HistoricalVisit v JOIN ImportSourceRow r ON r.historicalVisitId = v.id WHERE v.id = 'old-unmatched'")
    client.close()
    expect({ ...result, ...rows.rows[0] }).toEqual({ anonymized: 1, doctorCiphertext: null, piiDestroyedAt: NOW, payloadCiphertext: null, payloadHash: 'destroyed' })
  })

  it('keeps linked visits and recent unmatched visits intact', async () => {
    const client = await database()
    await visit(client, 'old-linked', { linkStatus: 'linked', createdAt: '2026-08-28T08:49:38.822Z', patientId: PATIENT_ID })
    await visit(client, 'new-unmatched', { linkStatus: 'unmatched', createdAt: '2026-09-05T08:49:38.822Z' })
    await anonymizeUnmatchedHistory({ client, cutoff: CUTOFF, now: NOW })
    const rows = await client.execute('SELECT id FROM HistoricalVisit WHERE doctorCiphertext IS NOT NULL ORDER BY id')
    client.close()
    expect(rows.rows.map(({ id }) => id)).toEqual(['new-unmatched', 'old-linked'])
  })

  it('reads the retention window from the environment with a one-year default', async () => {
    const client = await database()
    await visit(client, 'unmatched-13-months', { linkStatus: 'unmatched', createdAt: '2025-08-01T08:00:00.000Z' })
    const result = await runUnmatchedHistoryRetention({ client, env: {}, now: new Date(NOW) })
    client.close()
    expect(result).toEqual({ days: 365, anonymized: 1 })
  })

  it('rejects a retention window shorter than thirty days', async () => {
    const client = await database()
    await expect(runUnmatchedHistoryRetention({ client, env: { UNMATCHED_HISTORY_RETENTION_DAYS: '7' } })).rejects.toBeInstanceOf(TypeError)
    client.close()
  })
})
