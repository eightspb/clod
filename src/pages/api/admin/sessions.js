export const prerender = false

import { db, databaseErrorCode, desc, gte, AnalyticsSession } from '../../../lib/database.js'
import { guardAdminRead } from '../../../lib/admin-api.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  })
}

function errorResponse(status, code, message) {
  return jsonResponse(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    status
  )
}

function parseLimit(value) {
  const limit = Number.parseInt(value || `${DEFAULT_LIMIT}`, 10)
  if (!Number.isFinite(limit) || limit <= 0) return DEFAULT_LIMIT
  return Math.min(limit, MAX_LIMIT)
}

export async function GET({ request }) {
  const blocked = await guardAdminRead(request)
  if (blocked) return blocked

  try {
    const url = new URL(request.url)
    const activeOnly = url.searchParams.get('active') !== 'false'
    const limit = parseLimit(url.searchParams.get('limit'))
    const onlineThreshold = new Date(Date.now() - 5 * 60 * 1000)

    const query = db
      .select()
      .from(AnalyticsSession)
      .orderBy(desc(AnalyticsSession.lastActiveAt))
      .limit(limit)

    const sessions = activeOnly
      ? await query.where(gte(AnalyticsSession.lastActiveAt, onlineThreshold))
      : await query

    return jsonResponse({
      sessions: sessions.map((session) => ({
        ...session,
        isOnline: new Date(session.lastActiveAt) >= onlineThreshold,
        durationSeconds: Math.max(
          0,
          Math.round((new Date(session.lastActiveAt) - new Date(session.startedAt)) / 1000)
        ),
      })),
    }, 200)
  } catch (error) {
    console.error('[admin/sessions]', databaseErrorCode(error))
    return errorResponse(500, 'INTERNAL_ERROR', 'Не удалось загрузить сессии.')
  }
}
