export const prerender = false

import {
  adminSessions,
  assertAuthConfiguration,
  buildSetCookie,
  getAdminPassword,
  timingSafeEqualText,
  validateOrigin,
} from '../../../lib/auth.js'
import { getClientIp } from '../../../lib/client-ip.js'
import { readBoundedJson } from '../../../lib/bounded-json.js'

const LOGIN_JSON_LIMIT = 4 * 1024
const MAX_FAILURES = 5
const FAILURE_WINDOW_MS = 15 * 60 * 1000
const JSON_HEADERS = { 'Content-Type': 'application/json' }

function json(payload, status, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { ...JSON_HEADERS, ...headers } })
}

/**
 * Password login. Failed attempts are counted from AdminAuthEvent, so the lockout survives a
 * container restart instead of resetting with the in-memory limiter.
 */
export async function POST({ request }) {
  if (!validateOrigin(request)) return json({ error: 'Forbidden' }, 403)
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent') ?? ''
  const parsed = await readBoundedJson(request, LOGIN_JSON_LIMIT)
  if (!parsed.valid) return json({ error: parsed.tooLarge ? 'Тело запроса превышает допустимый размер' : 'Передайте корректный JSON' }, parsed.tooLarge ? 413 : 400)
  try {
    assertAuthConfiguration()
    const sessions = adminSessions()
    if (await sessions.recentFailures({ ip, windowMs: FAILURE_WINDOW_MS }) >= MAX_FAILURES) {
      await sessions.record({ kind: 'login_limited', ip, userAgent })
      const retryAfterSec = Math.ceil(FAILURE_WINDOW_MS / 1000)
      return json({ error: `Слишком много попыток. Попробуйте через ${retryAfterSec} секунд.` }, 429, { 'Retry-After': String(retryAfterSec) })
    }
    const { password } = parsed.value ?? {}
    if (!timingSafeEqualText(typeof password === 'string' ? password : '', getAdminPassword())) {
      await sessions.record({ kind: 'login_failure', ip, userAgent })
      return json({ error: 'Неверный пароль' }, 401)
    }
    const token = await sessions.issue()
    await sessions.record({ kind: 'login_success', actor: sessions.sessionId(token), ip, userAgent })
    return json({ ok: true }, 200, { 'Set-Cookie': buildSetCookie(token) })
  } catch (err) {
    console.error('[auth/login]', err?.code ?? err?.name ?? 'UNKNOWN')
    return json({ error: 'Internal error' }, 500)
  }
}
