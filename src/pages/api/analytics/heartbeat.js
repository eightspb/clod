export const prerender = false

import { db, AnalyticsSession } from 'astro:db'
import { eq } from 'astro:db'

export async function POST({ request }) {
  try {
    const body = await request.json()
    const { sessionId, page } = body

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const now = new Date()
    await db
      .update(AnalyticsSession)
      .set({ lastActiveAt: now, currentPage: page || undefined })
      .where(eq(AnalyticsSession.id, sessionId))

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[analytics/heartbeat]', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
