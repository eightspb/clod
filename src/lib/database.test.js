import { describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { AnalyticsSession, MedflexDoctorLink, createDatabase, databaseErrorCode, lazyDatabase } from './database.js'

const SESSION_TABLE = sql`CREATE TABLE "AnalyticsSession" ("id" text PRIMARY KEY, "visitorId" text NOT NULL, "ip" text, "userAgent" text, "currentPage" text, "referrer" text, "screenWidth" integer, "screenHeight" integer, "language" text, "startedAt" text NOT NULL, "lastActiveAt" text NOT NULL)`
const LINK_TABLE = sql`CREATE TABLE "MedflexDoctorLink" ("medflexDoctorId" integer PRIMARY KEY, "externalName" text NOT NULL, "localDoctorId" text, "active" integer NOT NULL, "syncedAt" text NOT NULL)`

async function memoryDatabase(statement) {
  const database = createDatabase({ ASTRO_DB_REMOTE_URL: ':memory:' })
  await database.run(statement)
  return database
}

describe('createDatabase', () => {
  it('stores date columns as ISO-8601 text exactly like the previous Astro DB layer', async () => {
    const database = await memoryDatabase(SESSION_TABLE)
    const startedAt = new Date('2026-09-05T08:15:30.123Z')
    await database.insert(AnalyticsSession).values({ id: 'сессия-Ω', visitorId: 'v-1', startedAt, lastActiveAt: startedAt })
    const raw = await database.$client.execute('SELECT startedAt FROM AnalyticsSession')
    expect(raw.rows[0].startedAt).toBe('2026-09-05T08:15:30.123Z')
  })

  it('reads date columns back as Date instances', async () => {
    const database = await memoryDatabase(SESSION_TABLE)
    const now = new Date('2026-09-05T08:15:30.123Z')
    await database.insert(AnalyticsSession).values({ id: 'id-1', visitorId: 'v-1', startedAt: now, lastActiveAt: now })
    const [row] = await database.select().from(AnalyticsSession)
    expect(row.lastActiveAt).toEqual(now)
  })

  it('stores boolean columns as integers and reads them back as booleans', async () => {
    const database = await memoryDatabase(LINK_TABLE)
    await database.insert(MedflexDoctorLink).values({ medflexDoctorId: 70120, externalName: 'Одинцов В. В.', active: true, syncedAt: '2026-09-05T00:00:00.000Z' })
    const [row] = await database.select().from(MedflexDoctorLink)
    expect(row.active).toBe(true)
  })

  it('exposes the underlying libsql client for statement level access', () => {
    const database = createDatabase({ ASTRO_DB_REMOTE_URL: ':memory:' })
    expect(typeof database.$client.execute).toBe('function')
  })

  it('fails fast when the database url is missing', () => {
    expect(() => createDatabase({})).toThrow(/ASTRO_DB_REMOTE_URL/)
  })
})

describe('databaseErrorCode', () => {
  it('reads the SQLite code from the cause of a Drizzle-wrapped error', () => {
    const wrapped = Object.assign(new Error('Failed query'), { cause: Object.assign(new Error('UNIQUE'), { code: 'SQLITE_CONSTRAINT' }) })
    expect(databaseErrorCode(wrapped)).toBe('SQLITE_CONSTRAINT')
  })

  it('falls back to the error name when no code is present', () => {
    expect(databaseErrorCode(new RangeError('Invalid time value'))).toBe('RangeError')
  })
})

describe('lazyDatabase', () => {
  it('does not open a connection until the first query', () => {
    expect(() => lazyDatabase(() => ({}))).not.toThrow()
  })

  it('fails on the first query when the environment has no database url', () => {
    const database = lazyDatabase(() => ({}))
    expect(() => database.select().from(AnalyticsSession)).toThrow(/ASTRO_DB_REMOTE_URL/)
  })
})

describe('withBusyTimeout', () => {
  it('sets the busy timeout before the first statement runs', async () => {
    const executed = []
    const { withBusyTimeout } = await import('./database.js')
    const client = withBusyTimeout({ execute: async (statement) => { executed.push(statement); return { rows: [] } } }, 5000)
    await client.execute('SELECT 1')
    expect(executed).toEqual(['PRAGMA busy_timeout = 5000', 'SELECT 1'])
  })

  it('sets the busy timeout only once across statements and batches', async () => {
    const executed = []
    const { withBusyTimeout } = await import('./database.js')
    const client = withBusyTimeout({ execute: async (statement) => { executed.push(statement); return { rows: [] } }, batch: async (statements) => { executed.push(...statements); return [] } }, 5000)
    await client.execute('SELECT 1')
    await client.batch(['SELECT 2'])
    expect(executed.filter((statement) => statement.startsWith('PRAGMA'))).toHaveLength(1)
  })

  it('applies the timeout to the real application client', async () => {
    const database = createDatabase({ ASTRO_DB_REMOTE_URL: ':memory:' })
    const result = await database.$client.execute('PRAGMA busy_timeout')
    expect(Number(result.rows[0].timeout)).toBe(5000)
  })

  it('keeps non-statement members of the client reachable', async () => {
    const { withBusyTimeout } = await import('./database.js')
    const client = withBusyTimeout({ execute: async () => ({ rows: [] }), close: () => 'closed' }, 5000)
    expect(client.close()).toBe('closed')
  })
})
