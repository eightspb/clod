export const prerender = false

import { db as analyticsDb, AnalyticsSession, eq } from 'astro:db'
import { validateOrigin } from '../../../lib/auth.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const RATE_LIMIT_MAX = 120
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const MAX_ID_LENGTH = 128
const MAX_PAGE_LENGTH = 200

const heartbeatRateLimit = new Map()

function jsonResponse(payload, status, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...headers,
    },
  })
}

function errorResponse(status, code, message, details, headers) {
  const payload = {
    success: false,
    error: {
      code,
      message,
    },
  }

  if (details?.length) {
    payload.error.details = details
  }

  return jsonResponse(payload, status, headers)
}

function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkHeartbeatRateLimit(ip) {
  const now = Date.now()
  const entry = heartbeatRateLimit.get(ip)

  if (!entry || now > entry.resetAt) {
    heartbeatRateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  entry.count += 1
  return { allowed: true }
}

function normalizeString(value, maxLength) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function normalizePage(value) {
  const page = normalizeString(value, MAX_PAGE_LENGTH)
  if (!page) return ''
  return page.startsWith('/') ? page : `/${page.replace(/^\/+/, '')}`
}

function validateHeartbeatPayload(body) {
  const details = []
  const sessionId = normalizeString(body?.sessionId, MAX_ID_LENGTH)
  const page = normalizePage(body?.page)

  if (!sessionId) {
    details.push({ field: 'sessionId', message: 'Некорректный идентификатор сессии.' })
  }

  if (!page) {
    details.push({ field: 'page', message: 'Укажите текущую страницу.' })
  }

  return {
    details,
    normalized: details.length
      ? null
      : {
          sessionId,
          page,
        },
  }
}

export async function POST({ request }) {
  if (!validateOrigin(request)) {
    return errorResponse(403, 'FORBIDDEN_ORIGIN', 'Недопустимый источник запроса.')
  }

  const ip = getClientIp(request)
  const { allowed, retryAfterSec } = checkHeartbeatRateLimit(ip)

  if (!allowed) {
    return errorResponse(
      429,
      'RATE_LIMITED',
      'Слишком много событий. Попробуйте позже.',
      undefined,
      { 'Retry-After': String(retryAfterSec) }
    )
  }

  let body

  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'INVALID_JSON', 'Передайте корректный JSON.')
  }

  const { details, normalized } = validateHeartbeatPayload(body)

  if (details.length || !normalized) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Проверьте payload heartbeat.', details)
  }

  try {
    await analyticsDb
      .update(AnalyticsSession)
      .set({
        lastActiveAt: new Date(),
        currentPage: normalized.page,
      })
      .where(eq(AnalyticsSession.id, normalized.sessionId))

    return jsonResponse({ ok: true }, 200)
  } catch (error) {
    console.error('[analytics/heartbeat]', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Не удалось обновить heartbeat.')
  }
}
