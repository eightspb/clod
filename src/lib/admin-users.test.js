import { describe, expect, it } from 'vitest'
import { createClient } from '@libsql/client'
import { AdminUserError, createAdminUsers, hashPassword, verifyPassword } from './admin-users.js'
import { migratedDatabaseUrl } from '../test/fixtures/migrated-database.mjs'

const PASSWORD = 'пароль-с-запасом-Ω-2026'

async function fixture() {
  const client = createClient({ url: await migratedDatabaseUrl('clod-admin-users-') })
  return Object.freeze({ client, users: createAdminUsers({ client }) })
}

describe('admin password hashing', () => {
  it('verifies the password it hashed', async () => {
    expect(await verifyPassword(PASSWORD, await hashPassword(PASSWORD))).toBe(true)
  })

  it('rejects a different password', async () => {
    expect(await verifyPassword('другой-пароль-Ω-2026', await hashPassword(PASSWORD))).toBe(false)
  })

  it('refuses to hash a password shorter than twelve characters', async () => {
    await expect(hashPassword('коротко')).rejects.toMatchObject({ code: 'WEAK_PASSWORD' })
  })
})

describe('admin users', () => {
  it('bootstraps the built-in admin account only into an empty table', async () => {
    const { client, users } = await fixture()
    const first = await users.bootstrap({ password: PASSWORD })
    const second = await users.bootstrap({ password: PASSWORD })
    client.close()
    expect({ firstRole: first.role, firstLogin: first.login, second }).toEqual({ firstRole: 'admin', firstLogin: 'admin', second: undefined })
  })

  it('authenticates a staff user by login and password', async () => {
    const { client, users } = await fixture()
    await users.create({ login: 'olga.ivanova', displayName: 'Ольга Иванова', role: 'staff', password: PASSWORD })
    const user = await users.authenticate({ login: 'olga.ivanova', password: PASSWORD })
    client.close()
    expect(user.role).toBe('staff')
  })

  it('does not authenticate a wrong password', async () => {
    const { client, users } = await fixture()
    await users.create({ login: 'olga.ivanova', displayName: 'Ольга Иванова', role: 'staff', password: PASSWORD })
    const user = await users.authenticate({ login: 'olga.ivanova', password: 'не-тот-пароль-Ω-2026' })
    client.close()
    expect(user).toBe(undefined)
  })

  it('does not authenticate a disabled user', async () => {
    const { client, users } = await fixture()
    const created = await users.create({ login: 'olga.ivanova', displayName: 'Ольга Иванова', role: 'staff', password: PASSWORD })
    await users.setDisabled({ id: created.id, disabled: true })
    const user = await users.authenticate({ login: 'olga.ivanova', password: PASSWORD })
    client.close()
    expect(user).toBe(undefined)
  })

  it('authenticates again after the user is enabled', async () => {
    const { client, users } = await fixture()
    const created = await users.create({ login: 'olga.ivanova', displayName: 'Ольга Иванова', role: 'staff', password: PASSWORD })
    await users.setDisabled({ id: created.id, disabled: true })
    await users.setDisabled({ id: created.id, disabled: false })
    const user = await users.authenticate({ login: 'olga.ivanova', password: PASSWORD })
    client.close()
    expect(user.id).toBe(created.id)
  })

  it('refuses to disable the admin account', async () => {
    const { client, users } = await fixture()
    const admin = await users.bootstrap({ password: PASSWORD })
    await expect(users.setDisabled({ id: admin.id, disabled: true })).rejects.toMatchObject({ code: 'ADMIN_PROTECTED' })
    client.close()
  })

  it('rejects a duplicate login', async () => {
    const { client, users } = await fixture()
    await users.create({ login: 'olga.ivanova', displayName: 'Ольга', role: 'staff', password: PASSWORD })
    await expect(users.create({ login: 'olga.ivanova', displayName: 'Другая Ольга', role: 'staff', password: PASSWORD })).rejects.toMatchObject({ code: 'LOGIN_TAKEN' })
    client.close()
  })

  it('rejects a login with uppercase or spaces', async () => {
    const { client, users } = await fixture()
    await expect(users.create({ login: 'Ольга Иванова', displayName: 'Ольга', role: 'staff', password: PASSWORD })).rejects.toBeInstanceOf(AdminUserError)
    client.close()
  })

  it('authenticates with the new password after it is changed', async () => {
    const { client, users } = await fixture()
    const created = await users.create({ login: 'olga.ivanova', displayName: 'Ольга', role: 'staff', password: PASSWORD })
    await users.setPassword({ id: created.id, password: 'новый-пароль-Ω-2027' })
    const user = await users.authenticate({ login: 'olga.ivanova', password: 'новый-пароль-Ω-2027' })
    client.close()
    expect(user.id).toBe(created.id)
  })

  it('lists users without password hashes', async () => {
    const { client, users } = await fixture()
    await users.bootstrap({ password: PASSWORD })
    const [admin] = await users.list()
    client.close()
    expect(Object.keys(admin).sort()).toEqual(['createdAt', 'disabledAt', 'displayName', 'id', 'login', 'role'])
  })
})
