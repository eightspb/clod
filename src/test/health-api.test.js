import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('../lib/database.js', () => ({
  db: { get: getMock },
  sql: (strings) => strings.join(''),
}))

const REQUIRED = {
  ADMIN_PASSWORD: 'пароль-Ω',
  TOKEN_SECRET: 'секрет-Ω',
  ASTRO_DB_REMOTE_URL: 'file:/data/db.sqlite',
  BOOKING_INTENT_SECRET: 'intent-Ω',
  CONTACT_FINGERPRINT_KEY: 'fingerprint-Ω',
  PATIENT_ENCRYPTION_KEY: 'encryption-Ω',
}

async function loadHandler() {
  const module = await import('../pages/api/health.js')
  return module.GET
}

describe('GET /api/health', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...REQUIRED }
    getMock.mockReset()
    getMock.mockResolvedValue({ present: 1 })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('is rendered on demand instead of prerendered', async () => {
    const module = await import('../pages/api/health.js')
    expect(module.prerender).toBe(false)
  })

  it('answers 200 when the schema is reachable and required variables are present', async () => {
    const response = await (await loadHandler())({ request: new Request('http://localhost/api/health') })
    expect(response.status).toBe(200)
  })

  it('reports ok in the body on success', async () => {
    const response = await (await loadHandler())({ request: new Request('http://localhost/api/health') })
    expect(await response.json()).toEqual({ ok: true })
  })

  it('forbids caching of the probe result', async () => {
    const response = await (await loadHandler())({ request: new Request('http://localhost/api/health') })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('answers 503 when the database query fails', async () => {
    getMock.mockRejectedValue(new Error('SQLITE_CANTOPEN'))
    const response = await (await loadHandler())({ request: new Request('http://localhost/api/health') })
    expect(response.status).toBe(503)
  })

  it('names the database as the failing dependency without leaking the error', async () => {
    getMock.mockRejectedValue(new Error('SQLITE_CANTOPEN /data/db.sqlite'))
    const response = await (await loadHandler())({ request: new Request('http://localhost/api/health') })
    expect(await response.json()).toEqual({ ok: false, reason: 'database' })
  })

  it('answers 503 when the Patient table is absent', async () => {
    getMock.mockResolvedValue(undefined)
    const response = await (await loadHandler())({ request: new Request('http://localhost/api/health') })
    expect(response.status).toBe(503)
  })

  it('answers 503 when a required variable is missing', async () => {
    delete process.env.PATIENT_ENCRYPTION_KEY
    const response = await (await loadHandler())({ request: new Request('http://localhost/api/health') })
    expect(response.status).toBe(503)
  })

  it('names the environment as the failing dependency without listing variables', async () => {
    delete process.env.TOKEN_SECRET
    const response = await (await loadHandler())({ request: new Request('http://localhost/api/health') })
    expect(await response.json()).toEqual({ ok: false, reason: 'environment' })
  })

  it('does not touch the database when the environment is incomplete', async () => {
    delete process.env.ADMIN_PASSWORD
    await (await loadHandler())({ request: new Request('http://localhost/api/health') })
    expect(getMock).not.toHaveBeenCalled()
  })
})
