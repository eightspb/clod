import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { migratedDatabaseUrl } from './fixtures/migrated-database.mjs'

const ORIGINAL_ENV = { ADMIN_PASSWORD: process.env.ADMIN_PASSWORD, TOKEN_SECRET: process.env.TOKEN_SECRET }

function loginRequest({ realIp, forwardedFor, body = JSON.stringify({ password: 'неверный-пароль' }) }) {
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
    const response = await POST({ request: loginRequest({ realIp: '203.0.113.92', body: JSON.stringify({ password: 'правильный-пароль-для-теста' }) }) })
    expect(response.status).toBe(429)
  })

  it('issues a __Host- session cookie for the correct password', async () => {
    const { POST } = await loadHandler()
    const response = await POST({ request: loginRequest({ realIp: '203.0.113.93', body: JSON.stringify({ password: 'правильный-пароль-для-теста' }) }) })
    expect(response.headers.get('set-cookie')).toMatch(/^__Host-admin_session=[0-9a-f-]{36}\.\d{13}\.[A-Za-z0-9_-]{43}; HttpOnly; SameSite=Strict; Path=\/; Secure; Max-Age=86400$/)
  })

  it('rejects a login body larger than four KiB before comparing passwords', async () => {
    const { POST } = await loadHandler()
    const response = await POST({ request: loginRequest({ realIp: '203.0.113.91', body: JSON.stringify({ password: 'п'.repeat(4096) }) }) })
    expect(response.status).toBe(413)
  })
})
