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

async function migratedDatabase() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-sqlite-concurrency-'))
  const path = join(directory, 'db.sqlite')
  await executeFile(process.execPath, [MIGRATION_SCRIPT], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${path}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 20_000, maxBuffer: 1_000_000 })
  return createClient({ url: `file:${path}` })
}

async function indexNames(client, table) {
  const result = await client.execute({ sql: "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND name NOT LIKE 'sqlite_%' ORDER BY name", args: [table] })
  return result.rows.map(({ name }) => name)
}

describe('SQLite concurrency migration', () => {
  it('switches the database file to write-ahead logging', async () => {
    const client = await migratedDatabase()
    const result = await client.execute('PRAGMA journal_mode')
    client.close()
    expect(String(result.rows[0].journal_mode).toLowerCase()).toBe('wal')
  })

  it('indexes the analytics event log for the dashboard feed and filters', async () => {
    const client = await migratedDatabase()
    const names = await indexNames(client, 'EventLog')
    client.close()
    expect(names).toEqual(['EventLog_createdAt_idx', 'EventLog_eventType_createdAt_idx', 'EventLog_sessionId_idx'])
  })

  it('indexes page views by session and page', async () => {
    const client = await migratedDatabase()
    const names = await indexNames(client, 'PageView')
    client.close()
    expect(names).toEqual(['PageView_page_idx', 'PageView_sessionId_idx'])
  })

  it('indexes analytics sessions by both activity timestamps', async () => {
    const client = await migratedDatabase()
    const names = await indexNames(client, 'AnalyticsSession')
    client.close()
    expect(names).toEqual(['AnalyticsSession_lastActiveAt_idx', 'AnalyticsSession_startedAt_idx'])
  })

  it('serves the newest events through the index instead of a full scan', async () => {
    const client = await migratedDatabase()
    const plan = await client.execute('EXPLAIN QUERY PLAN SELECT * FROM EventLog ORDER BY createdAt DESC LIMIT 50')
    client.close()
    expect(plan.rows.map(({ detail }) => detail).join(' ')).toContain('USING INDEX EventLog_createdAt_idx')
  })
})
