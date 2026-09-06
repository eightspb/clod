export const prerender = false

import {
  and,
  Appointment,
  avg,
  count,
  countDistinct,
  db,
  desc,
  eq,
  EventLog,
  gte,
  inArray,
  isNull,
  lt,
  MangoCall,
  AnalyticsSession,
  PageView,
  Patient,
  sql,
} from '../../../lib/database.js'
import { guardAdminRead } from '../../../lib/admin-api.js'
import { moscowDayBounds } from '../../../lib/clinic-time.js'
import { readMonitorStatus } from '../../../lib/monitor-status.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const ACTIVE_APPOINTMENT_STATUSES = Object.freeze(['pending', 'confirmed', 'needs_review'])
const ACTIVE_CALL_STATUSES = Object.freeze(['ringing', 'queued', 'connected', 'on_hold', 'finalizing'])
const FINAL_CALL_STATUSES = Object.freeze(['answered', 'missed'])

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

function aggregateCount(rows) {
  const value = Number(rows[0]?.count ?? 0)
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

function aggregateAverage(rows, key) {
  const value = Number(rows[0]?.[key] ?? 0)
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0
}

function answerRate(answered, missed) {
  const finalCalls = answered + missed
  return finalCalls > 0 ? Math.round((answered * 1000) / finalCalls) / 10 : 0
}

export async function GET({ request }) {
  const blocked = await guardAdminRead(request)
  if (blocked) return blocked

  try {
    const now = new Date()
    const onlineThreshold = new Date(now.getTime() - 5 * 60 * 1000)
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const clinicDay = moscowDayBounds(now)
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      onlineNowRows,
      todayRows,
      weekRows,
      monthRows,
      avgDurationRows,
      topPagesRows,
      dailyVisitRows,
      recentEvents,
      todayAppointmentRows,
      upcomingAppointmentRows,
      needsReviewAppointmentRows,
      activePatientRows,
      activeCallRows,
      incomingCallRows,
      answeredCallRows,
      missedCallRows,
      callAverageRows,
      lastCallEventRows,
      monitor,
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
        day: sql`substr(${AnalyticsSession.startedAt}, 1, 10)`,
        count: count(),
      }).from(AnalyticsSession).where(gte(AnalyticsSession.startedAt, monthStart)).groupBy(sql`substr(${AnalyticsSession.startedAt}, 1, 10)`),
      db.select().from(EventLog).orderBy(desc(EventLog.createdAt)).limit(10),
      db.select({ count: count() }).from(Appointment).where(and(gte(Appointment.startsAt, clinicDay.start), lt(Appointment.startsAt, clinicDay.end), inArray(Appointment.status, ACTIVE_APPOINTMENT_STATUSES))),
      db.select({ count: count() }).from(Appointment).where(and(gte(Appointment.startsAt, now.toISOString()), inArray(Appointment.status, ACTIVE_APPOINTMENT_STATUSES))),
      db.select({ count: count() }).from(Appointment).where(eq(Appointment.status, 'needs_review')),
      db.select({ count: count() }).from(Patient).where(isNull(Patient.piiDestroyedAt)),
      db.select({ count: count() }).from(MangoCall).where(inArray(MangoCall.status, ACTIVE_CALL_STATUSES)),
      db.select({ count: count() }).from(MangoCall).where(and(gte(MangoCall.startedAt, clinicDay.start), lt(MangoCall.startedAt, clinicDay.end))),
      db.select({ count: count() }).from(MangoCall).where(and(gte(MangoCall.startedAt, clinicDay.start), lt(MangoCall.startedAt, clinicDay.end), eq(MangoCall.status, 'answered'))),
      db.select({ count: count() }).from(MangoCall).where(and(gte(MangoCall.startedAt, clinicDay.start), lt(MangoCall.startedAt, clinicDay.end), eq(MangoCall.status, 'missed'))),
      db.select({ averageWait: avg(MangoCall.waitSeconds), averageTalk: avg(MangoCall.talkSeconds) }).from(MangoCall).where(and(gte(MangoCall.startedAt, clinicDay.start), lt(MangoCall.startedAt, clinicDay.end), inArray(MangoCall.status, FINAL_CALL_STATUSES))),
      db.select({ updatedAt: MangoCall.updatedAt }).from(MangoCall).orderBy(desc(MangoCall.updatedAt)).limit(1),
      readMonitorStatus({ path: process.env.MONITOR_STATUS_FILE || undefined, now }),
    ])

    const dailyVisitsMap = new Map(dailyVisitRows.map((row) => [row.day, Number(row.count)]))

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
    const answeredToday = aggregateCount(answeredCallRows)
    const missedToday = aggregateCount(missedCallRows)

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
      clinic: {
        todayAppointments: aggregateCount(todayAppointmentRows),
        upcomingAppointments: aggregateCount(upcomingAppointmentRows),
        needsReviewAppointments: aggregateCount(needsReviewAppointmentRows),
        activePatients: aggregateCount(activePatientRows),
      },
      calls: {
        active: aggregateCount(activeCallRows),
        incomingToday: aggregateCount(incomingCallRows),
        answeredToday,
        missedToday,
        answerRate: answerRate(answeredToday, missedToday),
        averageWaitSeconds: aggregateAverage(callAverageRows, 'averageWait'),
        averageTalkSeconds: aggregateAverage(callAverageRows, 'averageTalk'),
        lastEventAt: typeof lastCallEventRows[0]?.updatedAt === 'string' ? lastCallEventRows[0].updatedAt : null,
      },
      monitor,
    }, 200)
  } catch {
    console.error('[admin/stats]', 'QUERY_FAILED')
    return errorResponse(500, 'INTERNAL_ERROR', 'Не удалось загрузить статистику.')
  }
}
