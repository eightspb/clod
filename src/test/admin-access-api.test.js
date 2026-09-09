import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { migratedDatabaseUrl } from './fixtures/migrated-database.mjs'

const ORIGINAL_SECRET = process.env.TOKEN_SECRET
const PATIENT_ID = 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f'
let counter = 0

beforeAll(async () => {
  process.env.ASTRO_DB_REMOTE_URL = await migratedDatabaseUrl('clod-access-api-')
})

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.TOKEN_SECRET
  else process.env.TOKEN_SECRET = ORIGINAL_SECRET
})

async function session(role) {
  process.env.TOKEN_SECRET = 'access-api-test-secret-with-enough-entropy'
  const { adminUsers, createToken } = await import('../lib/auth.js')
  counter += 1
  const user = await adminUsers().create({ login: `${role}-${counter}`, displayName: `Пользователь ${counter}`, role, password: 'пароль-для-теста-Ω-2026' })
  return Object.freeze({ user, cookie: `__Host-admin_session=${await createToken(user.id)}` })
}

function request(path, cookie) {
  return new Request(`https://odintsovclinic.ru${path}`, { headers: new Headers({ 'x-real-ip': '203.0.113.160', cookie }) })
}

async function seed(rows) {
  const { db } = await import('../lib/database.js')
  await db.$client.execute({ sql: 'INSERT OR IGNORE INTO Patient VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [PATIENT_ID, null, null, null, null, null, '2026-09-09T09:00:00.000Z', '2026-09-09T09:00:00.000Z', null] })
  for (const row of rows) await db.$client.execute({ sql: 'INSERT INTO PatientAccess (id, patientId, action, actor, createdAt, reason) VALUES (?, ?, ?, ?, ?, ?)', args: row })
}

describe('admin access journal API', () => {
  it('answers 403 to the staff role', async () => {
    const { cookie } = await session('staff')
    const { GET } = await import('../pages/api/admin/access.js')
    expect((await GET({ request: request('/api/admin/access', cookie) })).status).toBe(403)
  })

  it('resolves the user name behind a reveal entry', async () => {
    const admin = await session('admin')
    await seed([['10000000-0000-4000-8000-000000000001', PATIENT_ID, 'reveal_full', `u:${admin.user.id}`, '2026-09-09T10:00:00.000Z', 'Проверка записи']])
    const { GET } = await import('../pages/api/admin/access.js')
    const payload = await (await GET({ request: request(`/api/admin/access?patientId=${PATIENT_ID}`, admin.cookie) })).json()
    expect(payload.data.find((entry) => entry.id === '10000000-0000-4000-8000-000000000001')).toMatchObject({ action: 'reveal_full', reason: 'Проверка записи', user: { login: admin.user.login, displayName: admin.user.displayName } })
  })

  it('labels entries from sessions before named accounts', async () => {
    const admin = await session('admin')
    await seed([['10000000-0000-4000-8000-000000000002', PATIENT_ID, 'reveal', `v1:${'a'.repeat(64)}`, '2026-09-08T10:00:00.000Z', null]])
    const { GET } = await import('../pages/api/admin/access.js')
    const payload = await (await GET({ request: request(`/api/admin/access?patientId=${PATIENT_ID}`, admin.cookie) })).json()
    expect(payload.data.find((entry) => entry.id === '10000000-0000-4000-8000-000000000002').user.login).toBe(undefined)
  })

  it('rejects a malformed patient filter', async () => {
    const admin = await session('admin')
    const { GET } = await import('../pages/api/admin/access.js')
    expect((await GET({ request: request('/api/admin/access?patientId=%27%20OR%201', admin.cookie) })).status).toBe(400)
  })
})
