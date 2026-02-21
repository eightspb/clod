export const prerender = false

import { db, EventLog, AnalyticsSession } from 'astro:db'
import { isAuthenticated } from '../../../lib/auth.js'

export async function GET({ request }) {
  if (!await isAuthenticated(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const perPage = parseInt(url.searchParams.get('perPage') || '50', 10)
    const filterType = url.searchParams.get('type') || ''
    const filterPage = url.searchParams.get('filterPage') || ''
    const filterDate = url.searchParams.get('date') || ''

    const allLogs = await db.select().from(EventLog)
    const allSessions = await db.select().from(AnalyticsSession)
    const sessionMap = Object.fromEntries(allSessions.map(s => [s.id, s]))

    let logs = allLogs
    if (filterType) logs = logs.filter(l => l.eventType === filterType)
    if (filterPage) logs = logs.filter(l => l.page.includes(filterPage))
    if (filterDate) {
      const dateStart = new Date(filterDate)
      const dateEnd = new Date(filterDate)
      dateEnd.setDate(dateEnd.getDate() + 1)
      logs = logs.filter(l => {
        const d = new Date(l.createdAt)
        return d >= dateStart && d < dateEnd
      })
    }

    logs = logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    const total = logs.length
    const offset = (page - 1) * perPage
    const paginated = logs.slice(offset, offset + perPage).map(l => ({
      ...l,
      ip: sessionMap[l.sessionId]?.ip || null,
    }))

    return new Response(JSON.stringify({
      logs: paginated,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[admin/logs]', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
