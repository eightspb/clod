export const prerender = false

import { db as analyticsDb, AnalyticsSession } from 'astro:db'
import { eq } from 'astro:db'

export async function POST({ request }) {
  let debugSessionId = null
  try {
    const body = await request.json()
    const { sessionId, page } = body
    debugSessionId = sessionId || null

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const now = new Date()
    await analyticsDb
      .update(AnalyticsSession)
      .set({ lastActiveAt: now, currentPage: page || undefined })
      .where(eq(AnalyticsSession.id, sessionId))

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[analytics/heartbeat]', err)
    const isDebugSession = request.headers.get('x-debug-session-id') === '42da84'
    const errorPayload = isDebugSession
      ? {
          error: 'Internal error',
          debug: {
            sessionId: debugSessionId,
            name: err?.name || null,
            code: err?.code || null,
            message: err?.message || null,
            stack: err?.stack || null,
          },
        }
      : { error: 'Internal error' }
    return new Response(JSON.stringify(errorPayload), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
