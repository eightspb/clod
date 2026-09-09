import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { getTableColumns, getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import * as drizzleSchema from '../lib/database-schema.js'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const MIGRATION_SCRIPT = join(PROJECT_ROOT, 'scripts/init-db.mjs')
const LEGACY_ANALYTICS = Object.freeze([
  "CREATE TABLE AnalyticsSession (id TEXT PRIMARY KEY, visitorId TEXT NOT NULL, ip TEXT, userAgent TEXT, currentPage TEXT, referrer TEXT, screenWidth REAL, screenHeight REAL, language TEXT, startedAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000), lastActiveAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000))",
  "CREATE TABLE Media (id TEXT PRIMARY KEY, filename TEXT NOT NULL, mimeType TEXT NOT NULL, url TEXT NOT NULL, folder TEXT NOT NULL, createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000))",
  "CREATE TABLE Doctor (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT, specialization TEXT NOT NULL, experienceYears REAL NOT NULL, bio TEXT NOT NULL, photoMediaId TEXT)",
])

async function databasePath(prefix) {
  return join(await mkdtemp(join(tmpdir(), prefix)), 'db.sqlite')
}

async function migrate(path) {
  return executeFile(process.execPath, [MIGRATION_SCRIPT], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${path}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 20_000, maxBuffer: 1_000_000 })
}

async function migrationFailure(path) {
  try {
    await migrate(path)
    return undefined
  } catch (error) {
    return String(error.stderr ?? error.message)
  }
}

async function rejects(operation) {
  try {
    await operation()
    return false
  } catch {
    return true
  }
}

describe('schema contract migration', () => {
  it('rebuilds legacy analytics and catalog tables converting epoch dates and real numbers', async () => {
    const path = await databasePath('clod-schema-legacy-')
    const legacy = createClient({ url: `file:${path}` })
    for (const statement of LEGACY_ANALYTICS) await legacy.execute(statement)
    await legacy.execute("INSERT INTO AnalyticsSession (id, visitorId, screenWidth, startedAt, lastActiveAt) VALUES ('s1', 'v1', 390.0, 1757400000000, '2026-09-09T07:00:00.000Z')")
    await legacy.execute("INSERT INTO Media (id, filename, mimeType, url, folder, createdAt) VALUES ('m1', 'odintsov.webp', 'image/webp', '/images/doctors/odintsov.webp', 'doctors', 1757400000000)")
    await legacy.execute("INSERT INTO Doctor (id, name, slug, specialization, experienceYears, bio, photoMediaId) VALUES ('d1', 'Одинцов Ю. Н.', 'odintsov', 'Маммолог', 35.0, 'Ω', 'm1')")
    legacy.close()
    await migrate(path)
    const client = createClient({ url: `file:${path}` })
    const session = await client.execute("SELECT typeof(screenWidth) AS width, startedAt, lastActiveAt FROM AnalyticsSession WHERE id = 's1'")
    const media = await client.execute("SELECT createdAt FROM Media WHERE id = 'm1'")
    const doctor = await client.execute("SELECT typeof(experienceYears) AS years FROM Doctor WHERE id = 'd1'")
    client.close()
    const converted = new Date(1757400000000).toISOString()
    expect({ ...session.rows[0], media: media.rows[0].createdAt, years: doctor.rows[0].years }).toEqual({ width: 'integer', startedAt: converted, lastActiveAt: '2026-09-09T07:00:00.000Z', media: converted, years: 'integer' })
  })

  it('rejects an appointment with a status outside the contract', async () => {
    const path = await databasePath('clod-schema-check-')
    await migrate(path)
    const client = createClient({ url: `file:${path}` })
    await client.execute("INSERT INTO Patient VALUES ('p1', NULL, NULL, NULL, NULL, NULL, '2026-09-09T07:00:00.000Z', '2026-09-09T07:00:00.000Z', NULL)")
    const rejected = await rejects(() => client.execute("INSERT INTO Appointment (id, patientId, source, status, doctorName, specialityName, startsAt, endsAt, bookingFingerprint, createdAt, updatedAt) VALUES ('a1', 'p1', 'website', 'booked', 'Ω', 'Ω', '2026-09-10T07:00:00.000Z', '2026-09-10T07:30:00.000Z', 'fp', '2026-09-09T07:00:00.000Z', '2026-09-09T07:00:00.000Z')"))
    client.close()
    expect(rejected).toBe(true)
  })

  it('rejects a page view whose session does not exist', async () => {
    const path = await databasePath('clod-schema-fk-')
    await migrate(path)
    const client = createClient({ url: `file:${path}` })
    const rejected = await rejects(() => client.execute("INSERT INTO PageView (id, sessionId, page, enteredAt) VALUES ('pv1', 'missing', '/about', '2026-09-09T07:00:00.000Z')"))
    client.close()
    expect(rejected).toBe(true)
  })

  it('names the drifted table and both shapes when a stored definition is unknown', async () => {
    const path = await databasePath('clod-schema-drift-')
    await migrate(path)
    const client = createClient({ url: `file:${path}` })
    await client.execute('DROP TABLE Service')
    await client.execute('CREATE TABLE Service (id TEXT PRIMARY KEY, title TEXT NOT NULL, direction TEXT NOT NULL, description TEXT NOT NULL, price INTEGER NOT NULL, currency TEXT)')
    client.close()
    const failure = await migrationFailure(path)
    expect(failure).toMatch(/Service table definition drift: expected CREATE TABLE SERVICE\(.*but found CREATE TABLE SERVICE\(.*CURRENCY TEXT/)
  })

  it('matches the drizzle schema column by column', async () => {
    const path = await databasePath('clod-schema-drizzle-')
    await migrate(path)
    const client = createClient({ url: `file:${path}` })
    const mismatches = []
    for (const table of Object.values(drizzleSchema)) {
      if (typeof table !== 'object' || table === null) continue
      const name = getTableName(table)
      const stored = await client.execute({ sql: 'SELECT name, type, "notnull" AS required, pk FROM pragma_table_info(?)', args: [name] })
      const actual = stored.rows.map(({ name: column, type, required, pk }) => `${column}:${String(type).toUpperCase()}:${required === 1 || pk === 1 ? 1 : 0}`)
      const expected = Object.values(getTableColumns(table)).map((column) => `${column.name}:${column.getSQLType().toUpperCase()}:${column.notNull ? 1 : 0}`)
      if (JSON.stringify(actual) !== JSON.stringify(expected)) mismatches.push({ name, actual, expected })
    }
    client.close()
    expect(mismatches).toEqual([])
  })
})
