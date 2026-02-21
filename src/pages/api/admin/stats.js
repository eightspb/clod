export const prerender = false

import { db, AnalyticsSession, PageView, EventLog } from 'astro:db'
import { isAuthenticated } from '../../../lib/auth.js'

export async function GET({ request }) {
  if (!await isAuthenticated(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const now = new Date()
    const onlineThreshold = new Date(now.getTime() - 5 * 60 * 1000) // 5 min
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const allSessions = await db.select().from(AnalyticsSession)
    const allPageViews = await db.select().from(PageView)

    const onlineNow = allSessions.filter(s => new Date(s.lastActiveAt) >= onlineThreshold).length

    const todaySessions = allSessions.filter(s => new Date(s.startedAt) >= todayStart)
    const weekSessions = allSessions.filter(s => new Date(s.startedAt) >= weekStart)
    const monthSessions = allSessions.filter(s => new Date(s.startedAt) >= monthStart)

    const uniqueVisitorsToday = new Set(todaySessions.map(s => s.visitorId)).size
    const uniqueVisitorsWeek = new Set(weekSessions.map(s => s.visitorId)).size
    const uniqueVisitorsMonth = new Set(monthSessions.map(s => s.visitorId)).size

    const completedViews = allPageViews.filter(pv => pv.duration != null)
    const avgDuration = completedViews.length > 0
      ? Math.round(completedViews.reduce((sum, pv) => sum + pv.duration, 0) / completedViews.length)
      : 0

    const pageCounts = {}
    for (const pv of allPageViews) {
      pageCounts[pv.page] = (pageCounts[pv.page] || 0) + 1
    }
    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([page, count]) => ({ page, count }))

    // Daily visits for last 30 days
    const dailyVisits = []
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now)
      dayStart.setHours(0, 0, 0, 0)
      dayStart.setDate(dayStart.getDate() - i)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)
      const count = allSessions.filter(s => {
        const d = new Date(s.startedAt)
        return d >= dayStart && d < dayEnd
      }).length
      dailyVisits.push({
        date: dayStart.toISOString().slice(0, 10),
        count,
      })
    }

    const recentEvents = await db.select().from(EventLog)
    const sortedEvents = recentEvents
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)

    return new Response(JSON.stringify({
      onlineNow,
      today: { sessions: todaySessions.length, uniqueVisitors: uniqueVisitorsToday },
      week: { sessions: weekSessions.length, uniqueVisitors: uniqueVisitorsWeek },
      month: { sessions: monthSessions.length, uniqueVisitors: uniqueVisitorsMonth },
      avgDuration,
      topPages,
      dailyVisits,
      recentEvents: sortedEvents,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[admin/stats]', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
