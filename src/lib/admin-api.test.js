import { afterEach, describe, expect, it, vi } from 'vitest'
import { createToken } from './auth.js'
import { adminActor, guardAdminPii, guardAdminRead, guardAdminWrite, readAdminJson } from './admin-api.js'

const ORIGINAL_SECRET = process.env.TOKEN_SECRET

function request({ method = 'GET', ip = '203.0.113.41', origin, cookie, body, contentLength } = {}) {
  const headers = new Headers()
  headers.set('x-real-ip', ip)
  if (origin !== undefined) headers.set('origin', origin)
  if (cookie !== undefined) headers.set('cookie', cookie)
  if (body !== undefined) headers.set('content-type', 'application/json')
  if (contentLength !== undefined) headers.set('content-length', String(contentLength))
  return new Request('https://odintsovclinic.ru/api/admin/patients', { method, headers, body })
}

async function authorized(overrides = {}) {
  process.env.TOKEN_SECRET = overrides.secret ?? 'admin-api-test-secret-with-enough-entropy'
  const token = await createToken()
  return Object.freeze({ token, request: request({ method: overrides.method ?? 'POST', ip: overrides.ip, origin: overrides.origin ?? 'https://odintsovclinic.ru', cookie: `admin_session=${token}`, body: overrides.body }) })
}

afterEach(() => {
  vi.useRealTimers()
  if (ORIGINAL_SECRET === undefined) delete process.env.TOKEN_SECRET
  else process.env.TOKEN_SECRET = ORIGINAL_SECRET
})

describe('admin API security', () => {
  it('derives the same non-secret audit actor for one authenticated session', async () => {
    const fixture = await authorized({ ip: '203.0.113.42' })
    const first = await adminActor(fixture.request)
    const second = await adminActor(fixture.request)
    expect({ equal: first === second, format: /^v1:[0-9a-f]{64}$/.test(first), leaked: first.includes(fixture.token) }).toEqual({ equal: true, format: true, leaked: false })
  })

  it('rate-limits unauthenticated reads before authentication work can continue', async () => {
    const statuses = []
    for (let index = 0; index < 61; index += 1) statuses.push((await guardAdminRead(request({ ip: '203.0.113.43' })))?.status)
    expect({ unauthorized: statuses.filter((status) => status === 401).length, final: statuses.at(-1) }).toEqual({ unauthorized: 60, final: 429 })
  })

  it('rejects a cross-origin write before authenticated mutation', async () => {
    const fixture = await authorized({ ip: '203.0.113.44', origin: 'https://evil.invalid' })
    expect((await guardAdminWrite(fixture.request))?.status).toBe(403)
  })

  it('applies the reveal budget to the administrative session', async () => {
    const fixture = await authorized({ ip: '203.0.113.45' })
    const statuses = []
    for (let index = 0; index < 11; index += 1) {
      const current = request({ method: 'POST', ip: `203.0.113.${100 + index}`, origin: 'https://odintsovclinic.ru', cookie: `admin_session=${fixture.token}` })
      statuses.push((await guardAdminPii(current))?.status ?? 204)
    }
    expect({ allowed: statuses.filter((status) => status === 204).length, final: statuses.at(-1) }).toEqual({ allowed: 10, final: 429 })
  })

  it('rejects a declared JSON body larger than four KiB without reading it', async () => {
    const parsed = await readAdminJson(request({ method: 'DELETE', body: '{}', contentLength: 4097 }))
    expect(parsed).toEqual({ valid: false, tooLarge: true })
  })

  it('reads one bounded JSON object', async () => {
    const parsed = await readAdminJson(request({ method: 'DELETE', body: JSON.stringify({ confirmation: 'УНИЧТОЖИТЬ' }) }))
    expect(parsed).toEqual({ valid: true, tooLarge: false, value: { confirmation: 'УНИЧТОЖИТЬ' } })
  })
})
