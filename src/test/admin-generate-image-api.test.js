import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createToken } from '../lib/auth.js'
import { migratedDatabaseUrl } from './fixtures/migrated-database.mjs'

beforeAll(async () => {
  process.env.ASTRO_DB_REMOTE_URL = await migratedDatabaseUrl('clod-generate-image-')
})

const ORIGINAL_SECRET = process.env.TOKEN_SECRET

function request({ method = 'GET', ip, cookie, body } = {}) {
  const headers = new Headers({ origin: 'https://odintsovclinic.ru', 'x-real-ip': ip })
  if (cookie !== undefined) headers.set('cookie', cookie)
  if (body !== undefined) headers.set('content-type', 'application/json')
  return new Request('https://odintsovclinic.ru/api/admin/generate-image', { method, headers, body })
}

async function loadHandlers() {
  vi.resetModules()
  return import('../pages/api/admin/generate-image.js')
}

async function sessionCookie() {
  process.env.TOKEN_SECRET = 'generate-image-test-secret-with-enough-entropy'
  return `__Host-admin_session=${await createToken()}`
}

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.TOKEN_SECRET
  else process.env.TOKEN_SECRET = ORIGINAL_SECRET
})

describe('admin generate-image API', () => {
  it('rejects an unauthenticated status read', async () => {
    process.env.TOKEN_SECRET = 'generate-image-test-secret-with-enough-entropy'
    const { GET } = await loadHandlers()
    expect((await GET({ request: request({ ip: '203.0.113.101' }) })).status).toBe(401)
  })

  it('rejects an unauthenticated generation request', async () => {
    process.env.TOKEN_SECRET = 'generate-image-test-secret-with-enough-entropy'
    const { POST } = await loadHandlers()
    expect((await POST({ request: request({ method: 'POST', ip: '203.0.113.102', body: '{"slug":"vab-ili-operatsiya"}' }) })).status).toBe(401)
  })

  it('rejects a traversal slug before touching the filesystem', async () => {
    const cookie = await sessionCookie()
    const { POST } = await loadHandlers()
    expect((await POST({ request: request({ method: 'POST', ip: '203.0.113.103', cookie, body: '{"slug":"../../../etc/passwd"}' }) })).status).toBe(400)
  })

  it('rejects applying an unknown slug to article frontmatter', async () => {
    const cookie = await sessionCookie()
    const { PATCH } = await loadHandlers()
    expect((await PATCH({ request: request({ method: 'PATCH', ip: '203.0.113.104', cookie, body: '{"slugs":["../README"]}' }) })).status).toBe(400)
  })
})
