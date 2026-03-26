export const prerender = false

import {
  and,
  count,
  db,
  desc,
  eq,
  EventLog,
  gte,
  ilike,
  inArray,
  lte,
  AnalyticsSession,
} from 'astro:db'
import { isAuthenticated } from '../../../lib/auth.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 50
const MAX_PER_PAGE = 100
const MAX_FILTER_LENGTH = 100

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

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value || `${fallback}`, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

function buildWhereClause(searchParams) {
  const filterType = (searchParams.get('type') || '').trim().slice(0, MAX_FILTER_LENGTH)
  const filterPage = (searchParams.get('filterPage') || '').trim().slice(0, MAX_FILTER_LENGTH)
  const filterDate = (searchParams.get('date') || '').trim()
  const clauses = []

  if (filterType) {
    clauses.push(eq(EventLog.eventType, filterType))
  }

  if (filterPage) {
    clauses.push(ilike(EventLog.page, `%${filterPage}%`))
  }

  if (filterDate) {
    const dateStart = new Date(filterDate)
    const dateEnd = new Date(filterDate)
    if (Number.isFinite(dateStart.valueOf())) {
      dateStart.setHours(0, 0, 0, 0)
      dateEnd.setHours(23, 59, 59, 999)
      clauses.push(gte(EventLog.createdAt, dateStart))
      clauses.push(lte(EventLog.createdAt, dateEnd))
    }
  }

  if (!clauses.length) return undefined
  if (clauses.length === 1) return clauses[0]
  return and(...clauses)
}

export async function GET({ request }) {
  if (!await isAuthenticated(request)) {
    return errorResponse(401, 'UNAUTHORIZED', 'Требуется авторизация.')
  }

  try {
    const url = new URL(request.url)
    const page = parsePositiveInt(url.searchParams.get('page'), DEFAULT_PAGE)
    const perPage = Math.min(parsePositiveInt(url.searchParams.get('perPage'), DEFAULT_PER_PAGE), MAX_PER_PAGE)
    const whereClause = buildWhereClause(url.searchParams)
    const offset = (page - 1) * perPage

    const baseCountQuery = db.select({ total: count() }).from(EventLog)
    const baseLogsQuery = db
      .select()
      .from(EventLog)
      .orderBy(desc(EventLog.createdAt))
      .limit(perPage)
      .offset(offset)

    const [{ total = 0 } = { total: 0 }, logs] = await Promise.all([
      whereClause ? baseCountQuery.where(whereClause) : baseCountQuery,
      whereClause ? baseLogsQuery.where(whereClause) : baseLogsQuery,
    ])

    const sessionIds = [...new Set(logs.map((log) => log.sessionId).filter(Boolean))]
    const sessions = sessionIds.length
      ? await db
          .select({
            id: AnalyticsSession.id,
            ip: AnalyticsSession.ip,
          })
          .from(AnalyticsSession)
          .where(inArray(AnalyticsSession.id, sessionIds))
      : []

    const sessionMap = Object.fromEntries(sessions.map((session) => [session.id, session]))
    const totalPages = Math.max(1, Math.ceil(Number(total) / perPage))

    return jsonResponse({
      logs: logs.map((log) => ({
        ...log,
        ip: sessionMap[log.sessionId]?.ip || null,
      })),
      total: Number(total),
      page,
      perPage,
      totalPages,
    }, 200)
  } catch (error) {
    console.error('[admin/logs]', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Не удалось загрузить логи.')
  }
}
