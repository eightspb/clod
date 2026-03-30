export const prerender = false

import { db as analyticsDb, AnalyticsSession, PageView, EventLog, eq } from 'astro:db'
import { validateOrigin } from '../../../lib/auth.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const RATE_LIMIT_MAX = 100
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const MAX_ID_LENGTH = 128
const MAX_TYPE_LENGTH = 32
const MAX_PAGE_LENGTH = 200
const MAX_TARGET_LENGTH = 200
const MAX_TEXT_LENGTH = 500
const MAX_REFERRER_LENGTH = 500
const MAX_LANGUAGE_LENGTH = 32
const MAX_USER_AGENT_LENGTH = 500
const MAX_EVENT_DETAILS_LENGTH = 2000
const MAX_BATCH_EVENTS = 20
const ALLOWED_EVENT_TYPES = new Set([
  'session_start',
  'page_enter',
  'page_leave',
  'click',
  'batch',
  'form_submit',
  'navigation',
])

const analyticsRateLimit = new Map()

function jsonResponse(payload, status, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...headers,
    },
  })
}

function errorResponse(status, code, message, details, headers) {
  const payload = {
    success: false,
    error: {
      code,
      message,
    },
  }

  if (details?.length) {
    payload.error.details = details
  }

  return jsonResponse(payload, status, headers)
}

function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkAnalyticsRateLimit(ip) {
  const now = Date.now()
  const entry = analyticsRateLimit.get(ip)

  if (!entry || now > entry.resetAt) {
    analyticsRateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  entry.count += 1
  return { allowed: true }
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeString(value, maxLength) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function normalizePage(value) {
  const page = normalizeString(value, MAX_PAGE_LENGTH)
  if (!page) return ''
  return page.startsWith('/') ? page : `/${page.replace(/^\/+/, '')}`
}

function normalizeInteger(value, min, max) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return undefined
  const rounded = Math.trunc(parsed)
  if (rounded < min || rounded > max) return undefined
  return rounded
}

function safeJsonStringify(value) {
  try {
    const json = JSON.stringify(value)
    if (!json) return undefined
    return json.slice(0, MAX_EVENT_DETAILS_LENGTH)
  } catch {
    return undefined
  }
}

function validateBasePayload(body) {
  const details = []
  const type = normalizeString(body?.type, MAX_TYPE_LENGTH)
  const sessionId = normalizeString(body?.sessionId, MAX_ID_LENGTH)
  const visitorId = normalizeString(body?.visitorId, MAX_ID_LENGTH)
  const data = isRecord(body?.data) ? body.data : undefined

  if (!sessionId) {
    details.push({ field: 'sessionId', message: 'Некорректный идентификатор сессии' })
  }

  if (!visitorId) {
    details.push({ field: 'visitorId', message: 'Некорректный идентификатор посетителя' })
  }

  if (!ALLOWED_EVENT_TYPES.has(type)) {
    details.push({ field: 'type', message: 'Неизвестный тип события' })
  }

  if (!data) {
    details.push({ field: 'data', message: 'Передайте корректный payload события' })
  }

  return {
    details,
    type,
    sessionId,
    visitorId,
    data,
  }
}

function validateEventPayload(body) {
  const base = validateBasePayload(body)

  if (!base.data) {
    return {
      details: base.details,
      normalized: undefined,
    }
  }

  const details = [...base.details]
  const normalized = {
    type: base.type,
    sessionId: base.sessionId,
    visitorId: base.visitorId,
    data: {},
  }

  if (base.type === 'session_start') {
    normalized.data = {
      page: normalizePage(base.data.page),
      referrer: normalizeString(base.data.referrer, MAX_REFERRER_LENGTH) || undefined,
      userAgent: normalizeString(base.data.userAgent, MAX_USER_AGENT_LENGTH) || undefined,
      screenWidth: normalizeInteger(base.data.screenWidth, 0, 10000),
      screenHeight: normalizeInteger(base.data.screenHeight, 0, 10000),
      language: normalizeString(base.data.language, MAX_LANGUAGE_LENGTH) || undefined,
    }

    if (!normalized.data.page) {
      details.push({ field: 'data.page', message: 'Укажите страницу события' })
    }
  }

  if (base.type === 'page_enter') {
    normalized.data = {
      page: normalizePage(base.data.page),
      from: normalizePage(base.data.from) || undefined,
    }

    if (!normalized.data.page) {
      details.push({ field: 'data.page', message: 'Укажите страницу события' })
    }
  }

  if (base.type === 'page_leave') {
    normalized.data = {
      page: normalizePage(base.data.page),
      pageViewId: normalizeString(base.data.pageViewId, MAX_ID_LENGTH) || undefined,
      duration: normalizeInteger(base.data.duration, 0, 24 * 60 * 60),
    }

    if (!normalized.data.page) {
      details.push({ field: 'data.page', message: 'Укажите страницу события' })
    }
  }

  if (base.type === 'click' || base.type === 'form_submit' || base.type === 'navigation') {
    normalized.data = {
      page: normalizePage(base.data.page),
      target: normalizeString(base.data.target, MAX_TARGET_LENGTH) || undefined,
      tag: normalizeString(base.data.tag, MAX_TYPE_LENGTH) || undefined,
      id: normalizeString(base.data.id, MAX_ID_LENGTH) || undefined,
      classes: normalizeString(base.data.classes, MAX_TEXT_LENGTH) || undefined,
      href: normalizeString(base.data.href, MAX_REFERRER_LENGTH) || undefined,
      text: normalizeString(base.data.text, MAX_TEXT_LENGTH) || undefined,
      from: normalizePage(base.data.from) || undefined,
      action: normalizeString(base.data.action, MAX_REFERRER_LENGTH) || undefined,
      name: normalizeString(base.data.name, MAX_TEXT_LENGTH) || undefined,
    }

    if (!normalized.data.page) {
      details.push({ field: 'data.page', message: 'Укажите страницу события' })
    }
  }

  if (base.type === 'batch') {
    const rawEvents = Array.isArray(base.data.events) ? base.data.events : undefined

    if (!rawEvents?.length) {
      details.push({ field: 'data.events', message: 'Передайте хотя бы одно событие в batch' })
    } else if (rawEvents.length > MAX_BATCH_EVENTS) {
      details.push({ field: 'data.events', message: `Batch не должен превышать ${MAX_BATCH_EVENTS} событий` })
    }

    normalized.data = {
      events: (rawEvents || [])
        .map((event) => {
          if (!isRecord(event)) return undefined
          const eventType = normalizeString(event.type, MAX_TYPE_LENGTH)
          const page = normalizePage(event.page)

          if (!eventType || !page) return undefined

          return {
            type: eventType,
            page,
            target: normalizeString(event.target, MAX_TARGET_LENGTH) || undefined,
            details: isRecord(event.details) ? event.details : undefined,
            timestamp: normalizeInteger(event.timestamp, 0, 9999999999999) || Date.now(),
          }
        })
        .filter(Boolean),
    }

    if (!normalized.data.events.length && !details.some((item) => item.field === 'data.events')) {
      details.push({ field: 'data.events', message: 'Передайте корректные события в batch' })
    }
  }

  return {
    details,
    normalized,
  }
}

async function touchSession(sessionId, updates) {
  await analyticsDb
    .update(AnalyticsSession)
    .set(updates)
    .where(eq(AnalyticsSession.id, sessionId))
}

async function upsertSession({ sessionId, visitorId, ip, now, values }) {
  try {
    await analyticsDb.insert(AnalyticsSession).values({
      id: sessionId,
      visitorId,
      ip,
      startedAt: now,
      lastActiveAt: now,
      ...values,
    })
  } catch (error) {
    if (error?.code !== 'SQLITE_CONSTRAINT') {
      throw error
    }

    await touchSession(sessionId, {
      ...values,
      lastActiveAt: now,
    })
  }
}

async function insertEventLog(sessionId, eventType, page, target, details, createdAt) {
  await analyticsDb.insert(EventLog).values({
    id: crypto.randomUUID(),
    sessionId,
    eventType,
    page,
    target,
    details: safeJsonStringify(details),
    createdAt,
  })
}

export async function POST({ request }) {
  if (!validateOrigin(request)) {
    return errorResponse(403, 'FORBIDDEN_ORIGIN', 'Недопустимый источник запроса')
  }

  const ip = getClientIp(request)
  const { allowed, retryAfterSec } = checkAnalyticsRateLimit(ip)

  if (!allowed) {
    return errorResponse(
      429,
      'RATE_LIMITED',
      'Слишком много событий. Попробуйте позже',
      undefined,
      { 'Retry-After': String(retryAfterSec) }
    )
  }

  let body

  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'INVALID_JSON', 'Передайте корректный JSON')
  }

  const { details, normalized } = validateEventPayload(body)

  if (details.length || !normalized) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Проверьте payload события', details)
  }

  const { type, sessionId, visitorId, data } = normalized
  const now = new Date()

  try {
    if (type === 'session_start') {
      await upsertSession({
        sessionId,
        visitorId,
        ip,
        now,
        values: {
          userAgent: data.userAgent,
          currentPage: data.page,
          referrer: data.referrer,
          screenWidth: data.screenWidth,
          screenHeight: data.screenHeight,
          language: data.language,
        },
      })
    }

    if (type === 'page_enter') {
      await upsertSession({
        sessionId,
        visitorId,
        ip,
        now,
        values: {
          currentPage: data.page,
        },
      })

      await analyticsDb.insert(PageView).values({
        id: crypto.randomUUID(),
        sessionId,
        page: data.page,
        enteredAt: now,
      })

      await insertEventLog(sessionId, 'navigation', data.page, data.from, { from: data.from, to: data.page }, now)
    }

    if (type === 'page_leave') {
      await touchSession(sessionId, { lastActiveAt: now })

      if (data.pageViewId && data.duration !== undefined) {
        await analyticsDb
          .update(PageView)
          .set({ duration: data.duration })
          .where(eq(PageView.id, data.pageViewId))
      }

      await insertEventLog(sessionId, 'page_leave', data.page, undefined, { duration: data.duration }, now)
    }

    if (type === 'click' || type === 'form_submit' || type === 'navigation') {
      await touchSession(sessionId, { lastActiveAt: now, currentPage: data.page })
      await insertEventLog(sessionId, type, data.page, data.target, data, now)
    }

    if (type === 'batch') {
      await touchSession(sessionId, { lastActiveAt: now })

      for (const event of data.events) {
        await analyticsDb.insert(EventLog).values({
          id: crypto.randomUUID(),
          sessionId,
          eventType: event.type,
          page: event.page,
          target: event.target,
          details: safeJsonStringify(event.details),
          createdAt: new Date(event.timestamp),
        })
      }
    }

    return jsonResponse({ ok: true }, 200)
  } catch (error) {
    console.error('[analytics/event]', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Не удалось сохранить событие')
  }
}
