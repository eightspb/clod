export const prerender = false

import { db as analyticsDb, AnalyticsSession, databaseErrorCode, eq } from '../../../lib/database.js'
import { validateOrigin } from '../../../lib/auth.js'
import { checkRateLimit } from '../../../lib/rate-limit.js'
import { getClientIp } from '../../../lib/client-ip.js'
import { readBoundedJson } from '../../../lib/bounded-json.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const RATE_LIMIT_OPTS = { namespace: 'analytics-heartbeat', maxRequests: 120, windowMs: 60_000 }
const ANALYTICS_JSON_LIMIT = 32 * 1024
const MAX_ID_LENGTH = 128
const MAX_PAGE_LENGTH = 200

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
    details.push({ field: 'sessionId', message: 'Некорректный идентификатор сессии' })
  }

  if (!page) {
    details.push({ field: 'page', message: 'Укажите текущую страницу' })
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
    return errorResponse(403, 'FORBIDDEN_ORIGIN', 'Недопустимый источник запроса')
  }

  const ip = getClientIp(request)
  const { allowed, retryAfterSec } = checkRateLimit(ip, RATE_LIMIT_OPTS)

  if (!allowed) {
    return errorResponse(
      429,
      'RATE_LIMITED',
      'Слишком много событий. Попробуйте позже',
      undefined,
      { 'Retry-After': String(retryAfterSec) }
    )
  }

  const parsed = await readBoundedJson(request, ANALYTICS_JSON_LIMIT)

  if (!parsed.valid) {
    if (parsed.tooLarge) return errorResponse(413, 'BODY_TOO_LARGE', 'Тело запроса превышает допустимый размер')
    return errorResponse(400, 'INVALID_JSON', 'Передайте корректный JSON')
  }

  const body = parsed.value

  const { details, normalized } = validateHeartbeatPayload(body)

  if (details.length || !normalized) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Проверьте payload heartbeat', details)
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
    console.error('[analytics/heartbeat]', databaseErrorCode(error))
    return errorResponse(500, 'INTERNAL_ERROR', 'Не удалось обновить heartbeat')
  }
}
