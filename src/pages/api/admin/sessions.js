export const prerender = false

import { db, AnalyticsSession } from 'astro:db'
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
    const activeOnly = url.searchParams.get('active') !== 'false'
    const limit = parseInt(url.searchParams.get('limit') || '100', 10)

    const allSessions = await db.select().from(AnalyticsSession)
    const onlineThreshold = new Date(Date.now() - 5 * 60 * 1000)

    let sessions = allSessions
    if (activeOnly) {
      sessions = sessions.filter(s => new Date(s.lastActiveAt) >= onlineThreshold)
    }

    sessions = sessions
      .sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt))
      .slice(0, limit)
      .map(s => ({
        ...s,
        isOnline: new Date(s.lastActiveAt) >= onlineThreshold,
        durationSeconds: Math.round((new Date(s.lastActiveAt) - new Date(s.startedAt)) / 1000),
      }))

    return new Response(JSON.stringify({ sessions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[admin/sessions]', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
