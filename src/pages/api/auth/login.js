export const prerender = false

import {
  assertAuthConfiguration,
  buildSetCookie,
  createToken,
  getAdminPassword,
  timingSafeEqualText,
  validateOrigin,
} from '../../../lib/auth.js'

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

const loginAttempts = new Map()

function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkRateLimit(ip) {
  const now = Date.now()
  const entry = loginAttempts.get(ip)

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfterSec }
  }

  entry.count++
  return { allowed: true }
}

export async function POST({ request }) {
  if (!validateOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const ip = getClientIp(request)
  const { allowed, retryAfterSec } = checkRateLimit(ip)

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

  try {
    assertAuthConfiguration()

    const body = await request.json()
    const { password } = body
    const adminPassword = getAdminPassword()

    if (!timingSafeEqualText(password || '', adminPassword)) {
      return new Response(JSON.stringify({ error: 'Неверный пароль' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    loginAttempts.delete(ip)

    const token = await createToken()
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildSetCookie(token),
      },
    })
  } catch (err) {
    console.error('[auth/login]', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
