import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import { minimizeStoredAnalytics, pruneAnalytics, retentionCutoff } from './analytics-retention.js'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const NOW = new Date('2026-09-06T12:00:00.000Z')

async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-analytics-retention-'))
  const path = join(directory, 'db.sqlite')
  await executeFile(process.execPath, [join(PROJECT_ROOT, 'scripts/init-db.mjs')], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${path}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 20_000, maxBuffer: 1_000_000 })
  return createClient({ url: `file:${path}` })
}

async function seed(client, id, lastActiveAt, extra = {}) {
  await client.execute({ sql: 'INSERT INTO AnalyticsSession (id, visitorId, ip, referrer, startedAt, lastActiveAt) VALUES (?, ?, ?, ?, ?, ?)', args: [id, `visitor-${id}`, extra.ip ?? '203.0.113.0/24', extra.referrer ?? null, lastActiveAt, lastActiveAt] })
  await client.execute({ sql: 'INSERT INTO PageView (id, sessionId, page, enteredAt) VALUES (?, ?, ?, ?)', args: [`view-${id}`, id, '/gipotireoz', lastActiveAt] })
  await client.execute({ sql: 'INSERT INTO EventLog (id, sessionId, eventType, page, createdAt) VALUES (?, ?, ?, ?, ?)', args: [`event-${id}`, id, 'click', '/gipotireoz', lastActiveAt] })
}

async function counts(client) {
  const [sessions, views, events] = await Promise.all(['AnalyticsSession', 'PageView', 'EventLog'].map((table) => client.execute(`SELECT COUNT(*) AS total FROM ${table}`)))
  return { sessions: Number(sessions.rows[0].total), views: Number(views.rows[0].total), events: Number(events.rows[0].total) }
}

describe('retentionCutoff', () => {
  it('subtracts whole days from the current moment', () => {
    expect(retentionCutoff({ now: NOW, days: 90 })).toBe('2026-06-08T12:00:00.000Z')
  })

  it('rejects a retention window that is not a positive integer', () => {
    expect(() => retentionCutoff({ now: NOW, days: 0 })).toThrow(TypeError)
  })
})

describe('pruneAnalytics', () => {
  it('deletes sessions, page views, and events older than the cutoff together', async () => {
    const client = await database()
    await seed(client, 'старая', '2026-05-01T10:00:00.000Z')
    await seed(client, 'свежая', '2026-09-01T10:00:00.000Z')
    await pruneAnalytics({ client, cutoff: '2026-06-08T12:00:00.000Z' })
    const result = await counts(client)
    client.close()
    expect(result).toEqual({ sessions: 1, views: 1, events: 1 })
  })

  it('reports how many rows each table lost', async () => {
    const client = await database()
    await seed(client, 'старая', '2026-05-01T10:00:00.000Z')
    const result = await pruneAnalytics({ client, cutoff: '2026-06-08T12:00:00.000Z' })
    client.close()
    expect(result).toEqual({ sessions: 1, views: 1, events: 1 })
  })
})

describe('minimizeStoredAnalytics', () => {
  it('truncates full addresses stored before minimisation and keeps referrer origins only', async () => {
    const client = await database()
    await seed(client, 'legacy', '2026-09-01T10:00:00.000Z', { ip: '203.0.113.71', referrer: 'https://yandex.ru/search/?text=мастопатия' })
    await minimizeStoredAnalytics({ client })
    const row = await client.execute('SELECT ip, referrer FROM AnalyticsSession')
    client.close()
    expect(row.rows[0]).toMatchObject({ ip: '203.0.113.0/24', referrer: 'https://yandex.ru' })
  })

  it('nulls values that cannot be minimised', async () => {
    const client = await database()
    await seed(client, 'odd', '2026-09-01T10:00:00.000Z', { ip: 'unknown', referrer: 'android-app://com.google' })
    await minimizeStoredAnalytics({ client })
    const row = await client.execute('SELECT ip, referrer FROM AnalyticsSession')
    client.close()
    expect(row.rows[0]).toMatchObject({ ip: null, referrer: null })
  })
})
