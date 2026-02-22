export const prerender = false

import { db, AnalyticsSession, PageView, EventLog } from 'astro:db'
import { eq } from 'astro:db'

function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST({ request }) {
  try {
    const body = await request.json()
    const { type, sessionId, visitorId, data } = body

    if (!sessionId || !visitorId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId or visitorId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const ip = getClientIp(request)
    const now = new Date()

    if (type === 'session_start') {
      try {
        await db.insert(AnalyticsSession).values({
          id: sessionId,
          visitorId,
          ip,
          userAgent: data.userAgent || null,
          currentPage: data.page || null,
          referrer: data.referrer || null,
          screenWidth: data.screenWidth || null,
          screenHeight: data.screenHeight || null,
          language: data.language || null,
          startedAt: now,
          lastActiveAt: now,
        })
      } catch (e) {
        // Already exists (race with page_enter) - update with richer data
        if (e.code === 'SQLITE_CONSTRAINT') {
          await db
            .update(AnalyticsSession)
            .set({
              userAgent: data.userAgent || undefined,
              referrer: data.referrer || undefined,
              screenWidth: data.screenWidth || undefined,
              screenHeight: data.screenHeight || undefined,
              language: data.language || undefined,
              lastActiveAt: now,
            })
            .where(eq(AnalyticsSession.id, sessionId))
        } else {
          throw e
        }
      }
    } else if (type === 'page_enter') {
      // Ensure session exists (handles race between session_start and page_enter)
      try {
        await db.insert(AnalyticsSession).values({
          id: sessionId,
          visitorId,
          ip,
          userAgent: null,
          currentPage: data.page || null,
          referrer: null,
          screenWidth: null,
          screenHeight: null,
          language: null,
          startedAt: now,
          lastActiveAt: now,
        })
      } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT') {
          await db
            .update(AnalyticsSession)
            .set({ currentPage: data.page, lastActiveAt: now })
            .where(eq(AnalyticsSession.id, sessionId))
        } else {
          throw e
        }
      }

      await db.insert(PageView).values({
        id: crypto.randomUUID(),
        sessionId,
        page: data.page,
        enteredAt: now,
        duration: null,
      })

      await db.insert(EventLog).values({
        id: crypto.randomUUID(),
        sessionId,
        eventType: 'navigation',
        page: data.page,
        target: data.from || null,
        details: JSON.stringify({ from: data.from, to: data.page }),
        createdAt: now,
      })
    } else if (type === 'page_leave') {
      await db
        .update(AnalyticsSession)
        .set({ lastActiveAt: now })
        .where(eq(AnalyticsSession.id, sessionId))

      if (data.pageViewId && data.duration != null) {
        await db
          .update(PageView)
          .set({ duration: data.duration })
          .where(eq(PageView.id, data.pageViewId))
      }

      await db.insert(EventLog).values({
        id: crypto.randomUUID(),
        sessionId,
        eventType: 'page_leave',
        page: data.page,
        target: null,
        details: JSON.stringify({ duration: data.duration }),
        createdAt: now,
      })
    } else if (type === 'click') {
      await db
        .update(AnalyticsSession)
        .set({ lastActiveAt: now })
        .where(eq(AnalyticsSession.id, sessionId))

      await db.insert(EventLog).values({
        id: crypto.randomUUID(),
        sessionId,
        eventType: 'click',
        page: data.page,
        target: data.target || null,
        details: JSON.stringify({
          tag: data.tag,
          id: data.id,
          classes: data.classes,
          href: data.href,
          text: data.text,
        }),
        createdAt: now,
      })
    } else if (type === 'batch') {
      await db
        .update(AnalyticsSession)
        .set({ lastActiveAt: now })
        .where(eq(AnalyticsSession.id, sessionId))

      if (Array.isArray(data.events)) {
        for (const evt of data.events) {
          await db.insert(EventLog).values({
            id: crypto.randomUUID(),
            sessionId,
            eventType: evt.type || 'unknown',
            page: evt.page || '',
            target: evt.target || null,
            details: evt.details ? JSON.stringify(evt.details) : null,
            createdAt: new Date(evt.timestamp || Date.now()),
          })
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[analytics/event]', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
