import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { migratedDatabaseUrl } from './fixtures/migrated-database.mjs'

const ORIGINAL_SECRET = process.env.TOKEN_SECRET
const PASSWORD = 'пароль-для-теста-Ω-2026'
let counter = 0

beforeAll(async () => {
  process.env.ASTRO_DB_REMOTE_URL = await migratedDatabaseUrl('clod-users-api-')
})

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.TOKEN_SECRET
  else process.env.TOKEN_SECRET = ORIGINAL_SECRET
})

async function session(role) {
  process.env.TOKEN_SECRET = 'users-api-test-secret-with-enough-entropy'
  const { adminUsers, createToken } = await import('../lib/auth.js')
  counter += 1
  const user = await adminUsers().create({ login: `${role}-${counter}`, displayName: 'Тест', role, password: PASSWORD })
  return Object.freeze({ user, cookie: `__Host-admin_session=${await createToken(user.id)}` })
}

function request(path, { method = 'GET', cookie, body, ip = '203.0.113.150' } = {}) {
  const headers = new Headers({ origin: 'https://odintsovclinic.ru', 'x-real-ip': ip })
  if (cookie) headers.set('cookie', cookie)
  if (body !== undefined) headers.set('content-type', 'application/json')
  return new Request(`https://odintsovclinic.ru${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
}

async function endpoints() {
  const index = await import('../pages/api/admin/users/index.js')
  const update = await import('../pages/api/admin/users/[id].js')
  return Object.freeze({ GET: index.GET, POST: index.POST, PATCH: update.PATCH })
}

describe('admin users API', () => {
  it('answers 403 to staff listing users', async () => {
    const { cookie } = await session('staff')
    const { GET } = await endpoints()
    expect((await GET({ request: request('/api/admin/users', { cookie }) })).status).toBe(403)
  })

  it('lists users without password hashes for the admin', async () => {
    const { cookie } = await session('admin')
    const { GET } = await endpoints()
    const payload = await (await GET({ request: request('/api/admin/users', { cookie }) })).json()
    expect(payload.data.every((user) => !('passwordHash' in user))).toBe(true)
  })

  it('creates a staff user with a normalized login', async () => {
    const { cookie } = await session('admin')
    const { POST } = await endpoints()
    const response = await POST({ request: request('/api/admin/users', { method: 'POST', cookie, body: { login: ' Olga.Nova ', displayName: 'Ольга Новая', password: PASSWORD } }) })
    expect({ status: response.status, user: (await response.json()).data }).toMatchObject({ status: 201, user: { login: 'olga.nova', role: 'staff' } })
  })

  it('rejects a short password with a machine-readable code', async () => {
    const { cookie } = await session('admin')
    const { POST } = await endpoints()
    const response = await POST({ request: request('/api/admin/users', { method: 'POST', cookie, body: { login: 'short.pass', displayName: 'Тест', password: 'коротко' } }) })
    expect({ status: response.status, code: (await response.json()).code }).toEqual({ status: 400, code: 'WEAK_PASSWORD' })
  })

  it('blocks a staff user and ends their sessions', async () => {
    const admin = await session('admin')
    const staff = await session('staff')
    const { PATCH } = await endpoints()
    await PATCH({ request: request(`/api/admin/users/${staff.user.id}`, { method: 'PATCH', cookie: admin.cookie, body: { disabled: true } }), params: { id: staff.user.id } })
    const { isAuthenticated } = await import('../lib/auth.js')
    expect(await isAuthenticated(request('/admin', { cookie: staff.cookie }))).toBe(false)
  })

  it('refuses to block the caller themself', async () => {
    const admin = await session('admin')
    const { PATCH } = await endpoints()
    const response = await PATCH({ request: request(`/api/admin/users/${admin.user.id}`, { method: 'PATCH', cookie: admin.cookie, body: { disabled: true } }), params: { id: admin.user.id } })
    expect(response.status).toBe(409)
  })

  it('changes a staff password so the new one signs in', async () => {
    const admin = await session('admin')
    const staff = await session('staff')
    const { PATCH } = await endpoints()
    await PATCH({ request: request(`/api/admin/users/${staff.user.id}`, { method: 'PATCH', cookie: admin.cookie, body: { password: 'новый-пароль-Ω-2027' } }), params: { id: staff.user.id } })
    const { adminUsers } = await import('../lib/auth.js')
    const signedIn = await adminUsers().authenticate({ login: staff.user.login, password: 'новый-пароль-Ω-2027' })
    expect(signedIn?.id).toBe(staff.user.id)
  })

  it('keeps the admin session alive after changing their own password', async () => {
    const admin = await session('admin')
    const { PATCH } = await endpoints()
    await PATCH({ request: request(`/api/admin/users/${admin.user.id}`, { method: 'PATCH', cookie: admin.cookie, body: { password: 'новый-пароль-Ω-2028' } }), params: { id: admin.user.id } })
    const { isAuthenticated } = await import('../lib/auth.js')
    expect(await isAuthenticated(request('/admin', { cookie: admin.cookie }))).toBe(true)
  })
})
