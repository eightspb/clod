import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { migratedDatabaseUrl } from './fixtures/migrated-database.mjs'

const ORIGINAL_ENV = { ADMIN_PASSWORD: process.env.ADMIN_PASSWORD, TOKEN_SECRET: process.env.TOKEN_SECRET }

function loginRequest({ realIp, forwardedFor, body = JSON.stringify({ login: 'admin', password: 'неверный-пароль' }) }) {
  const headers = new Headers({ 'content-type': 'application/json', origin: 'https://odintsovclinic.ru' })
  if (realIp !== undefined) headers.set('x-real-ip', realIp)
  if (forwardedFor !== undefined) headers.set('x-forwarded-for', forwardedFor)
  return new Request('https://odintsovclinic.ru/api/auth/login', { method: 'POST', headers, body })
}

async function loadHandler() {
  vi.resetModules()
  return import('../pages/api/auth/login.js')
}

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    process.env.ASTRO_DB_REMOTE_URL = await migratedDatabaseUrl('clod-login-')
  })

  beforeEach(() => {
    process.env.ADMIN_PASSWORD = 'правильный-пароль-для-теста'
    process.env.TOKEN_SECRET = 'login-test-secret-with-enough-entropy-0123456789'
  })

  afterEach(() => {
    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it('rate-limits password guesses by the proxy real IP even when the forwarded chain rotates', async () => {
    const { POST } = await loadHandler()
    const statuses = []
    for (let index = 0; index < 6; index += 1) statuses.push((await POST({ request: loginRequest({ realIp: '203.0.113.90', forwardedFor: `10.0.0.${index + 1}` }) })).status)
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429])
  })

  it('keeps the lockout after the server module is reloaded, as after a redeploy', async () => {
    const first = await loadHandler()
    for (let index = 0; index < 5; index += 1) await first.POST({ request: loginRequest({ realIp: '203.0.113.92' }) })
    const { POST } = await loadHandler()
    const response = await POST({ request: loginRequest({ realIp: '203.0.113.92', body: JSON.stringify({ login: 'admin', password: 'правильный-пароль-для-теста' }) }) })
    expect(response.status).toBe(429)
  })

  it('issues a __Host- session cookie for the correct password', async () => {
    const { POST } = await loadHandler()
    const response = await POST({ request: loginRequest({ realIp: '203.0.113.93', body: JSON.stringify({ login: 'admin', password: 'правильный-пароль-для-теста' }) }) })
    expect(response.headers.get('set-cookie')).toMatch(/^__Host-admin_session=[0-9a-f-]{36}\.\d{13}\.[A-Za-z0-9_-]{43}; HttpOnly; SameSite=Strict; Path=\/; Secure; Max-Age=86400$/)
  })

  it('rejects a login body larger than four KiB before comparing passwords', async () => {
    const { POST } = await loadHandler()
    const response = await POST({ request: loginRequest({ realIp: '203.0.113.91', body: JSON.stringify({ login: 'admin', password: 'п'.repeat(4096) }) }) })
    expect(response.status).toBe(413)
  })

  it('bootstraps the built-in admin account from ADMIN_PASSWORD on the first login', async () => {
    const { POST } = await loadHandler()
    await POST({ request: loginRequest({ realIp: '203.0.113.94', body: JSON.stringify({ login: 'admin', password: 'правильный-пароль-для-теста' }) }) })
    const { adminUsers } = await import('../lib/auth.js')
    const [admin] = (await adminUsers().list()).filter((user) => user.login === 'admin')
    expect(admin.role).toBe('admin')
  })

  it('rejects the admin password under an unknown user name', async () => {
    const { POST } = await loadHandler()
    const response = await POST({ request: loginRequest({ realIp: '203.0.113.95', body: JSON.stringify({ login: 'root', password: 'правильный-пароль-для-теста' }) }) })
    expect(response.status).toBe(401)
  })

  it('signs in a staff user with their own password and records their user id as actor', async () => {
    const { POST } = await loadHandler()
    const { adminUsers } = await import('../lib/auth.js')
    const staff = await adminUsers().create({ login: 'olga.staff', displayName: 'Ольга', role: 'staff', password: 'пароль-сотрудника-Ω-2026' })
    const response = await POST({ request: loginRequest({ realIp: '203.0.113.96', body: JSON.stringify({ login: 'Olga.Staff', password: 'пароль-сотрудника-Ω-2026' }) }) })
    const { db } = await import('../lib/database.js')
    const events = await db.$client.execute({ sql: "SELECT actor FROM AdminAuthEvent WHERE kind = 'login_success' AND actor = ?", args: [`u:${staff.id}`] })
    expect({ status: response.status, recorded: events.rows.length }).toEqual({ status: 200, recorded: 1 })
  })
})
