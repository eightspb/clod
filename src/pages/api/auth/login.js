export const prerender = false

import {
  assertAuthConfiguration,
  buildSetCookie,
  createToken,
  getAdminPassword,
  timingSafeEqualText,
  validateOrigin,
} from '../../../lib/auth.js'
import { checkRateLimit, resetRateLimit } from '../../../lib/rate-limit.js'
import { getClientIp } from '../../../lib/client-ip.js'
import { readBoundedJson } from '../../../lib/bounded-json.js'

const RATE_LIMIT_OPTS = { namespace: 'login', maxRequests: 5, windowMs: 15 * 60 * 1000 }
const LOGIN_JSON_LIMIT = 4 * 1024


export async function POST({ request }) {
  if (!validateOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const ip = getClientIp(request)
  const { allowed, retryAfterSec } = checkRateLimit(ip, RATE_LIMIT_OPTS)

  if (!allowed) {
    return new Response(
      JSON.stringify({ error: `Слишком много попыток. Попробуйте через ${retryAfterSec} секунд.` }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSec),
        },
      }
    )
  }

  const parsed = await readBoundedJson(request, LOGIN_JSON_LIMIT)
  if (!parsed.valid) {
    return new Response(JSON.stringify({ error: parsed.tooLarge ? 'Тело запроса превышает допустимый размер' : 'Передайте корректный JSON' }), {
      status: parsed.tooLarge ? 413 : 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    assertAuthConfiguration()

    const { password } = parsed.value ?? {}
    const adminPassword = getAdminPassword()

    if (!timingSafeEqualText(password || '', adminPassword)) {
      return new Response(JSON.stringify({ error: 'Неверный пароль' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    resetRateLimit(ip, RATE_LIMIT_OPTS)

    const token = await createToken()
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildSetCookie(token),
      },
    })
  } catch (err) {
    console.error('[auth/login]', err?.code ?? err?.name ?? 'UNKNOWN')
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
