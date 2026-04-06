export const prerender = false

import {
  avg,
  count,
  countDistinct,
  db,
  desc,
  EventLog,
  gte,
  AnalyticsSession,
  PageView,
} from 'astro:db'
import { guardAdminRead } from '../../../lib/admin-api.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

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

export async function GET({ request }) {
  const blocked = await guardAdminRead(request)
  if (blocked) return blocked

  try {
    const now = new Date()
    const onlineThreshold = new Date(now.getTime() - 5 * 60 * 1000)
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      onlineNowRows,
      todayRows,
      weekRows,
      monthRows,
      avgDurationRows,
      topPagesRows,
      recentSessions,
      recentEvents,
    ] = await Promise.all([
      db.select({ count: count() }).from(AnalyticsSession).where(gte(AnalyticsSession.lastActiveAt, onlineThreshold)),
      db.select({
        sessions: count(),
        uniqueVisitors: countDistinct(AnalyticsSession.visitorId),
      }).from(AnalyticsSession).where(gte(AnalyticsSession.startedAt, todayStart)),
      db.select({
        sessions: count(),
        uniqueVisitors: countDistinct(AnalyticsSession.visitorId),
      }).from(AnalyticsSession).where(gte(AnalyticsSession.startedAt, weekStart)),
      db.select({
        sessions: count(),
        uniqueVisitors: countDistinct(AnalyticsSession.visitorId),
      }).from(AnalyticsSession).where(gte(AnalyticsSession.startedAt, monthStart)),
      db.select({ avgDuration: avg(PageView.duration) }).from(PageView),
      db.select({
        page: PageView.page,
        count: count(),
      }).from(PageView).groupBy(PageView.page).orderBy(desc(count())).limit(5),
      db.select({
        startedAt: AnalyticsSession.startedAt,
      }).from(AnalyticsSession).where(gte(AnalyticsSession.startedAt, monthStart)),
      db.select().from(EventLog).orderBy(desc(EventLog.createdAt)).limit(10),
    ])

    const dailyVisitsMap = new Map()
    for (const session of recentSessions) {
      const key = new Date(session.startedAt).toISOString().slice(0, 10)
      dailyVisitsMap.set(key, (dailyVisitsMap.get(key) || 0) + 1)
    }

    const dailyVisits = []
    for (let index = 29; index >= 0; index -= 1) {
      const day = new Date(now)
      day.setHours(0, 0, 0, 0)
      day.setDate(day.getDate() - index)
      const key = day.toISOString().slice(0, 10)
      dailyVisits.push({
        date: key,
        count: dailyVisitsMap.get(key) || 0,
      })
    }

    const today = todayRows[0] || { sessions: 0, uniqueVisitors: 0 }
    const week = weekRows[0] || { sessions: 0, uniqueVisitors: 0 }
    const month = monthRows[0] || { sessions: 0, uniqueVisitors: 0 }
    const avgDurationValue = avgDurationRows[0]?.avgDuration

    return jsonResponse({
      onlineNow: onlineNowRows[0]?.count || 0,
      today: {
        sessions: today.sessions || 0,
        uniqueVisitors: today.uniqueVisitors || 0,
      },
      week: {
        sessions: week.sessions || 0,
        uniqueVisitors: week.uniqueVisitors || 0,
      },
      month: {
        sessions: month.sessions || 0,
        uniqueVisitors: month.uniqueVisitors || 0,
      },
      avgDuration: avgDurationValue ? Math.round(Number(avgDurationValue)) : 0,
      topPages: topPagesRows.map((item) => ({
        page: item.page,
        count: Number(item.count),
      })),
      dailyVisits,
      recentEvents,
    }, 200)
  } catch (error) {
    console.error('[admin/stats]', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Не удалось загрузить статистику.')
  }
}
