import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ADMIN_PASSWORD: process.env.ADMIN_PASSWORD, TOKEN_SECRET: process.env.TOKEN_SECRET }

function loginRequest({ realIp, forwardedFor }) {
  const headers = new Headers({ 'content-type': 'application/json', origin: 'https://odintsovclinic.ru' })
  if (realIp !== undefined) headers.set('x-real-ip', realIp)
  if (forwardedFor !== undefined) headers.set('x-forwarded-for', forwardedFor)
  return new Request('https://odintsovclinic.ru/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ password: 'неверный-пароль' }) })
}

async function loadHandler() {
  vi.resetModules()
  return import('../pages/api/auth/login.js')
}

describe('POST /api/auth/login', () => {
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
})
