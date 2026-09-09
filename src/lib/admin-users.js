import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { PASSWORD_MIN_LENGTH } from './admin-password-policy.js'

const scrypt = promisify(scryptCallback)
export const ADMIN_ROLES = Object.freeze(['admin', 'staff'])
export const BOOTSTRAP_LOGIN = 'admin'
export { PASSWORD_MIN_LENGTH }
const PASSWORD_MAX_LENGTH = 200
const LOGIN_PATTERN = /^[a-z0-9._-]{3,32}$/
const DISPLAY_NAME_MAX_LENGTH = 80
const SCRYPT = Object.freeze({ N: 16384, r: 8, p: 1, keyLength: 64 })
const USER_COLUMNS = 'id, login, displayName, role, createdAt, disabledAt, passwordChangedAt'

/** Error with a machine-readable code for the API layer. */
export class AdminUserError extends Error {
  constructor(code) {
    super(code)
    this.name = 'AdminUserError'
    this.code = code
  }
}

function ensureClient(client) {
  if (!client || typeof client.execute !== 'function') throw new TypeError('Admin users require a libsql client with execute')
  return client
}

function login(value) {
  if (typeof value !== 'string' || !LOGIN_PATTERN.test(value)) throw new AdminUserError('INVALID_LOGIN')
  return value
}

function displayName(value) {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (trimmed.length === 0 || trimmed.length > DISPLAY_NAME_MAX_LENGTH || /[\p{Cc}]/u.test(trimmed)) throw new AdminUserError('INVALID_DISPLAY_NAME')
  return trimmed
}

function role(value) {
  if (!ADMIN_ROLES.includes(value)) throw new AdminUserError('INVALID_ROLE')
  return value
}

function password(value) {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) throw new AdminUserError('WEAK_PASSWORD')
  return value
}

function identifier(value) {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/.test(value)) throw new AdminUserError('USER_NOT_FOUND')
  return value
}

/**
 * scrypt password hash serialized as `scrypt$N$r$p$salt$hash` so the parameters travel with the row.
 */
export async function hashPassword(plain) {
  const salt = randomBytes(16)
  const derived = await scrypt(password(plain), salt, SCRYPT.keyLength, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p })
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

/**
 * Constant-time check of a plain password against a serialized scrypt hash.
 */
export async function verifyPassword(plain, stored) {
  if (typeof plain !== 'string' || typeof stored !== 'string') return false
  const [scheme, N, r, p, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64url')
  const derived = await scrypt(plain, Buffer.from(salt, 'base64url'), expected.length, { N: Number(N), r: Number(r), p: Number(p) })
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}

function publicUser(row) {
  return Object.freeze({ id: row.id, login: row.login, displayName: row.displayName, role: row.role, createdAt: row.createdAt, disabledAt: row.disabledAt ?? undefined })
}

/**
 * Named administrator accounts. `admin` manages `staff` users; `staff` works with the clinic
 * journals but cannot destroy personal data, end all sessions, generate blog posters or manage users.
 */
export function createAdminUsers({ client, clock = () => new Date(), uuid = randomUUID }) {
  const storage = ensureClient(client)
  async function count() {
    const result = await storage.execute('SELECT COUNT(*) AS total FROM AdminUser')
    return Number(result.rows[0]?.total ?? 0)
  }
  async function create(input) {
    const user = { id: uuid(), login: login(input.login), displayName: displayName(input.displayName), role: role(input.role) }
    const passwordHash = await hashPassword(input.password)
    const now = clock().toISOString()
    try {
      await storage.execute({ sql: 'INSERT INTO AdminUser (id, login, displayName, role, passwordHash, createdAt, disabledAt, passwordChangedAt) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)', args: [user.id, user.login, user.displayName, user.role, passwordHash, now, now] })
    } catch (error) {
      if (String(error?.code ?? error?.cause?.code ?? '').includes('SQLITE_CONSTRAINT')) throw new AdminUserError('LOGIN_TAKEN')
      throw error
    }
    return publicUser({ ...user, createdAt: now, disabledAt: null })
  }
  /** Creates the built-in `admin` account from ADMIN_PASSWORD when the table is still empty. */
  async function bootstrap(input) {
    if (await count() > 0) return undefined
    return create({ login: BOOTSTRAP_LOGIN, displayName: 'Администратор', role: 'admin', password: input.password })
  }
  async function authenticate(input) {
    if (typeof input.login !== 'string' || !LOGIN_PATTERN.test(input.login)) return undefined
    const result = await storage.execute({ sql: `SELECT ${USER_COLUMNS}, passwordHash FROM AdminUser WHERE login = ? LIMIT 1`, args: [input.login] })
    const row = result.rows[0]
    if (!row || row.disabledAt !== null) return undefined
    return await verifyPassword(input.password, row.passwordHash) ? publicUser(row) : undefined
  }
  async function byId(id) {
    const result = await storage.execute({ sql: `SELECT ${USER_COLUMNS} FROM AdminUser WHERE id = ? LIMIT 1`, args: [identifier(id)] })
    return result.rows[0] ? publicUser(result.rows[0]) : undefined
  }
  async function list() {
    const result = await storage.execute(`SELECT ${USER_COLUMNS} FROM AdminUser ORDER BY role ASC, createdAt ASC`)
    return Object.freeze(result.rows.map(publicUser))
  }
  async function setPassword(input) {
    const user = await byId(input.id)
    if (!user) throw new AdminUserError('USER_NOT_FOUND')
    const passwordHash = await hashPassword(input.password)
    await storage.execute({ sql: 'UPDATE AdminUser SET passwordHash = ?, passwordChangedAt = ? WHERE id = ?', args: [passwordHash, clock().toISOString(), user.id] })
    return user
  }
  async function setDisabled(input) {
    const user = await byId(input.id)
    if (!user) throw new AdminUserError('USER_NOT_FOUND')
    if (user.role === 'admin') throw new AdminUserError('ADMIN_PROTECTED')
    await storage.execute({ sql: 'UPDATE AdminUser SET disabledAt = ? WHERE id = ?', args: [input.disabled ? clock().toISOString() : null, user.id] })
    return byId(user.id)
  }
  return Object.freeze({ count, create, bootstrap, authenticate, byId, list, setPassword, setDisabled })
}
