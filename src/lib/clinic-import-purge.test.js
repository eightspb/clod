import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import { purgeSourceRows, vacuumDatabase } from './clinic-import-purge.js'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const BATCH_ID = '73000000-0000-4000-8000-000000000003'
const OTHER_BATCH_ID = '73000000-0000-4000-8000-000000000004'
const NOW = '2026-09-09T12:00:00.000Z'

async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-import-purge-'))
  const path = join(directory, 'db.sqlite')
  await executeFile(process.execPath, [join(PROJECT_ROOT, 'scripts/init-db.mjs')], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${path}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 20_000, maxBuffer: 1_000_000 })
  const client = createClient({ url: `file:${path}` })
  for (const [id, status] of [[BATCH_ID, 'completed'], [OTHER_BATCH_ID, 'applying']]) await client.execute({ sql: 'INSERT INTO ImportBatch VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: [id, `sha256:${id}`, 'sha256:plan', 'apply', status, '{}', NOW, NOW] })
  for (const [id, batchId, row] of [['row-1', BATCH_ID, 1], ['row-2', BATCH_ID, 2], ['row-3', OTHER_BATCH_ID, 1]]) await client.execute({ sql: 'INSERT INTO ImportSourceRow (id, batchId, sourceName, sourceRow, payloadCiphertext, payloadHash, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [id, batchId, '544663c3807aab090001bad8PD.csv', row, 'зашифровано-Ω', 'sha256:payload', NOW] })
  return client
}

describe('purgeSourceRows', () => {
  it('reports rows and bytes without changing anything in dry-run', async () => {
    const client = await database()
    const result = await purgeSourceRows({ client, batchId: BATCH_ID })
    const kept = await client.execute('SELECT COUNT(*) AS total FROM ImportSourceRow WHERE payloadCiphertext IS NOT NULL')
    client.close()
    expect({ ...result, kept: Number(kept.rows[0].total) }).toEqual({ mode: 'dry-run', batchId: BATCH_ID, rows: 2, bytes: 50, purged: 0, kept: 3 })
  })

  it('drops the ciphertext of the batch only and keeps the payload hash', async () => {
    const client = await database()
    const result = await purgeSourceRows({ client, batchId: BATCH_ID, apply: true, now: NOW })
    const rows = await client.execute('SELECT id, payloadCiphertext, payloadHash, piiDestroyedAt FROM ImportSourceRow ORDER BY id')
    client.close()
    expect({ purged: result.purged, rows: rows.rows }).toEqual({ purged: 2, rows: [{ id: 'row-1', payloadCiphertext: null, payloadHash: 'sha256:payload', piiDestroyedAt: NOW }, { id: 'row-2', payloadCiphertext: null, payloadHash: 'sha256:payload', piiDestroyedAt: NOW }, { id: 'row-3', payloadCiphertext: 'зашифровано-Ω', payloadHash: 'sha256:payload', piiDestroyedAt: null }] })
  })

  it('refuses a batch that has not completed', async () => {
    const client = await database()
    await expect(purgeSourceRows({ client, batchId: OTHER_BATCH_ID, apply: true })).rejects.toBeInstanceOf(TypeError)
    client.close()
  })

  it('vacuums the file and reports page counts', async () => {
    const client = await database()
    const result = await vacuumDatabase({ client })
    client.close()
    expect(result.pagesAfter > 0 && result.pagesAfter <= result.pagesBefore).toBe(true)
  })
})
