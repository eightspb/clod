import { AdminUserError } from './admin-users.js'
import { adminSessions, adminUsers, currentAdmin } from './auth.js'
import { guardAdminRead, guardAdminRole, readAdminJson } from './admin-api.js'

const JSON_HEADERS = Object.freeze({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
const ERROR_STATUS = Object.freeze({ INVALID_LOGIN: 400, INVALID_DISPLAY_NAME: 400, INVALID_ROLE: 400, WEAK_PASSWORD: 400, USER_NOT_FOUND: 404, LOGIN_TAKEN: 409, ADMIN_PROTECTED: 409 })
const ERROR_MESSAGE = Object.freeze({
  INVALID_LOGIN: 'Имя пользователя: от 3 до 32 строчных латинских букв, цифр, точек, дефисов или подчёркиваний',
  INVALID_DISPLAY_NAME: 'Укажите отображаемое имя до 80 символов',
  INVALID_ROLE: 'Недопустимая роль',
  WEAK_PASSWORD: 'Пароль должен быть не короче 12 символов',
  USER_NOT_FOUND: 'Пользователь не найден',
  LOGIN_TAKEN: 'Такое имя пользователя уже занято',
  ADMIN_PROTECTED: 'Учётную запись администратора нельзя отключить',
})
const DEFAULTS = Object.freeze({ users: adminUsers, sessions: adminSessions, viewer: currentAdmin, body: readAdminJson, log: (stage) => console.error('[admin/users]', stage) })

function json(payload, status) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}

function failure(code) {
  return json({ error: ERROR_MESSAGE[code] ?? 'Ошибка', code }, ERROR_STATUS[code] ?? 400)
}

function options(input = {}) {
  const configuration = { ...DEFAULTS, ...input }
  configuration.readGuard = input.readGuard ?? ((request) => guardAdminRole(request, { guard: guardAdminRead }))
  configuration.writeGuard = input.writeGuard ?? ((request) => guardAdminRole(request))
  return Object.freeze(configuration)
}

async function handled(configuration, stage, work) {
  try {
    return await work()
  } catch (error) {
    if (error instanceof AdminUserError) return failure(error.code)
    configuration.log(`${stage}:${error?.code ?? error?.name ?? 'UNKNOWN'}`)
    return json({ error: 'Internal error' }, 500)
  }
}

/** GET /api/admin/users: every account without hashes, plus the caller's own id. */
export function createUserIndexEndpoint(input) {
  const configuration = options(input)
  return async function userIndexEndpoint({ request }) {
    const blocked = await configuration.readGuard(request)
    if (blocked) return blocked
    return handled(configuration, 'LIST_FAILED', async () => {
      const viewer = await configuration.viewer(request)
      return json({ data: await configuration.users().list(), me: viewer?.id }, 200)
    })
  }
}

/** POST /api/admin/users: creates a staff account. */
export function createUserCreateEndpoint(input) {
  const configuration = options(input)
  return async function userCreateEndpoint({ request }) {
    const blocked = await configuration.writeGuard(request)
    if (blocked) return blocked
    const parsed = await configuration.body(request)
    if (!parsed.valid) return json({ error: parsed.tooLarge ? 'Тело запроса превышает допустимый размер' : 'Передайте корректный JSON', code: parsed.tooLarge ? 'BODY_TOO_LARGE' : 'INVALID_JSON' }, parsed.tooLarge ? 413 : 400)
    return handled(configuration, 'CREATE_FAILED', async () => {
      const body = parsed.value ?? {}
      const user = await configuration.users().create({ login: typeof body.login === 'string' ? body.login.trim().toLowerCase() : body.login, displayName: body.displayName, role: 'staff', password: body.password })
      return json({ data: user }, 201)
    })
  }
}

/**
 * PATCH /api/admin/users/[id]: `{ password }` sets a new password, `{ disabled }` blocks or
 * unblocks. Either change revokes the target's sessions unless the caller edits themself.
 */
export function createUserUpdateEndpoint(input) {
  const configuration = options(input)
  return async function userUpdateEndpoint({ request, params }) {
    const blocked = await configuration.writeGuard(request)
    if (blocked) return blocked
    const parsed = await configuration.body(request)
    if (!parsed.valid) return json({ error: parsed.tooLarge ? 'Тело запроса превышает допустимый размер' : 'Передайте корректный JSON', code: parsed.tooLarge ? 'BODY_TOO_LARGE' : 'INVALID_JSON' }, parsed.tooLarge ? 413 : 400)
    return handled(configuration, 'UPDATE_FAILED', async () => {
      const body = parsed.value ?? {}
      const users = configuration.users()
      const id = typeof params?.id === 'string' ? params.id : ''
      if (typeof body.password !== 'string' && typeof body.disabled !== 'boolean') return json({ error: 'Передайте новый пароль или признак блокировки', code: 'INVALID_BODY' }, 400)
      const viewer = await configuration.viewer(request)
      if (typeof body.disabled === 'boolean' && viewer?.id === id) return json({ error: 'Нельзя заблокировать собственную учётную запись', code: 'SELF_PROTECTED' }, 409)
      if (typeof body.password === 'string') await users.setPassword({ id, password: body.password })
      else await users.setDisabled({ id, disabled: body.disabled })
      if (viewer?.id !== id) await configuration.sessions().revokeUser(id)
      return json({ data: await users.byId(id) }, 200)
    })
  }
}
