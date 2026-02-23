export const prerender = false

import { db as analyticsDb, AnalyticsSession } from 'astro:db'
import { eq } from 'astro:db'

const RATE_LIMIT_MAX = 120 // 2 per second for 60s heartbeat
const RATE_LIMIT_WINDOW_MS = 60 * 1000

const heartbeatRateLimit = new Map()

function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkHeartbeatRateLimit(ip) {
  const now = Date.now()
  const entry = heartbeatRateLimit.get(ip)

  if (!entry || now > entry.resetAt) {
    heartbeatRateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfterSec }
  }

  entry.count++
  return { allowed: true }
}

export async function POST({ request }) {
  const ip = getClientIp(request)
  const { allowed, retryAfterSec } = checkHeartbeatRateLimit(ip)

  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    })
  }

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
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
