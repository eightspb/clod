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

async function migrate(path) {
  await executeFile(process.execPath, [MIGRATION_SCRIPT], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${path}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 20_000, maxBuffer: 1_000_000 })
}

async function databasePath() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-admin-users-migration-'))
  return join(directory, 'db.sqlite')
}

describe('named administrator migration', () => {
  it('upgrades a database whose AdminSession predates the userId column', async () => {
    const path = await databasePath()
    await migrate(path)
    const client = createClient({ url: `file:${path}` })
    await client.execute('DROP INDEX AdminSession_userId_idx')
    await client.execute('ALTER TABLE AdminSession DROP COLUMN userId')
    await client.execute('DROP TABLE AdminUser')
    client.close()
    await migrate(path)
    const upgraded = createClient({ url: `file:${path}` })
    const columns = await upgraded.execute("SELECT name FROM pragma_table_info('AdminSession')")
    const users = await upgraded.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'AdminUser'")
    upgraded.close()
    expect({ userId: columns.rows.some(({ name }) => name === 'userId'), adminUser: users.rows.length }).toEqual({ userId: true, adminUser: 1 })
  })

  it('keeps the pre-migration sessions usable as sessions without a user', async () => {
    const path = await databasePath()
    await migrate(path)
    const client = createClient({ url: `file:${path}` })
    await client.execute('DROP INDEX AdminSession_userId_idx')
    await client.execute('ALTER TABLE AdminSession DROP COLUMN userId')
    await client.execute("INSERT INTO AdminSession (id, issuedAt, lastSeenAt, revokedAt) VALUES ('33333333-3333-4333-8333-333333333333', '2026-09-09T10:00:00.000Z', '2026-09-09T10:00:00.000Z', NULL)")
    client.close()
    await migrate(path)
    const upgraded = createClient({ url: `file:${path}` })
    const row = await upgraded.execute("SELECT userId FROM AdminSession WHERE id = '33333333-3333-4333-8333-333333333333'")
    upgraded.close()
    expect(row.rows[0].userId).toBe(null)
  })
})
