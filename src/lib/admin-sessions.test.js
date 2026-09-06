import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import { createAdminSessions } from './admin-sessions.js'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const SECRET = 'admin-sessions-test-secret-Ω-0123456789'
const START = new Date('2026-09-06T10:00:00.000Z')

async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-admin-sessions-'))
  const path = join(directory, 'db.sqlite')
  await executeFile(process.execPath, [join(PROJECT_ROOT, 'scripts/init-db.mjs')], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${path}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 20_000, maxBuffer: 1_000_000 })
  return createClient({ url: `file:${path}` })
}

function clock(start = START) {
  let current = start.getTime()
  return Object.freeze({ now: () => new Date(current), advance: (ms) => { current += ms } })
}

async function fixture(overrides = {}) {
  const client = await database()
  const time = overrides.clock ?? clock()
  const sessions = createAdminSessions({ client, secret: overrides.secret ?? SECRET, clock: time.now })
  return Object.freeze({ client, sessions, time })
}

describe('admin sessions', () => {
  it('issues a token that verifies while the session is alive', async () => {
    const { client, sessions } = await fixture()
    const token = await sessions.issue()
    const result = await sessions.verify(token)
    client.close()
    expect(result.valid).toBe(true)
  })

  it('rejects the token of a revoked session', async () => {
    const { client, sessions } = await fixture()
    const token = await sessions.issue()
    await sessions.revoke(sessions.sessionId(token))
    const result = await sessions.verify(token)
    client.close()
    expect(result.valid).toBe(false)
  })

  it('rejects every token after all sessions are revoked', async () => {
    const { client, sessions } = await fixture()
    const first = await sessions.issue()
    const second = await sessions.issue()
    await sessions.revokeAll()
    const results = await Promise.all([sessions.verify(first), sessions.verify(second)])
    client.close()
    expect(results.map(({ valid }) => valid)).toEqual([false, false])
  })

  it('rejects a session idle for more than sixty minutes', async () => {
    const { client, sessions, time } = await fixture()
    const token = await sessions.issue()
    time.advance(61 * 60_000)
    const result = await sessions.verify(token)
    client.close()
    expect(result.valid).toBe(false)
  })

  it('keeps a session alive while it is used within the idle window', async () => {
    const { client, sessions, time } = await fixture()
    const token = await sessions.issue()
    time.advance(45 * 60_000)
    await sessions.verify(token)
    time.advance(45 * 60_000)
    const result = await sessions.verify(token)
    client.close()
    expect(result.valid).toBe(true)
  })

  it('rejects a session older than the absolute twenty-four hour lifetime even when active', async () => {
    const { client, sessions, time } = await fixture()
    const token = await sessions.issue()
    for (let step = 0; step < 25; step += 1) {
      time.advance(59 * 60_000)
      await sessions.verify(token)
    }
    const result = await sessions.verify(token)
    client.close()
    expect(result.valid).toBe(false)
  })

  it('rejects a token signed with another secret', async () => {
    const { client, sessions } = await fixture()
    const foreign = createAdminSessions({ client, secret: 'другой-секрет-достаточной-длины-0123456789', clock: () => START })
    const result = await sessions.verify(await foreign.issue())
    client.close()
    expect(result.valid).toBe(false)
  })

  it('rejects a token whose session row does not exist', async () => {
    const { client, sessions } = await fixture()
    const token = await sessions.issue()
    await client.execute('DELETE FROM AdminSession')
    const result = await sessions.verify(token)
    client.close()
    expect(result.valid).toBe(false)
  })

  it('records authentication events with a hashed user agent', async () => {
    const { client, sessions } = await fixture()
    await sessions.record({ kind: 'login_failure', ip: '203.0.113.7', userAgent: 'Mozilla/5.0 Тест' })
    const rows = await client.execute('SELECT kind, ip, userAgentHash FROM AdminAuthEvent')
    client.close()
    expect({ kind: rows.rows[0].kind, ip: rows.rows[0].ip, hashed: /^[0-9a-f]{64}$/.test(rows.rows[0].userAgentHash) }).toEqual({ kind: 'login_failure', ip: '203.0.113.7', hashed: true })
  })

  it('counts recent login failures per address', async () => {
    const { client, sessions, time } = await fixture()
    await sessions.record({ kind: 'login_failure', ip: '203.0.113.7' })
    time.advance(20 * 60_000)
    await sessions.record({ kind: 'login_failure', ip: '203.0.113.7' })
    await sessions.record({ kind: 'login_failure', ip: '203.0.113.8' })
    const failures = await sessions.recentFailures({ ip: '203.0.113.7', windowMs: 15 * 60_000 })
    client.close()
    expect(failures).toBe(1)
  })

  it('rejects an event kind outside the allowlist', async () => {
    const { client, sessions } = await fixture()
    await expect(sessions.record({ kind: 'drop table', ip: '203.0.113.7' })).rejects.toThrow(TypeError)
    client.close()
  })
})
