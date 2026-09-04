/**
 * Shared helpers for admin API endpoints: auth check, rate limiting, JSON responses.
 */

import { createHmac } from 'node:crypto'
import { getTokenFromCookie, getTokenSecret, isAuthenticated, validateOrigin } from './auth.js'
import { checkRateLimit } from './rate-limit.js'
import { getClientIp } from './client-ip.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const ADMIN_READ_LIMIT = { namespace: 'admin-read', maxRequests: 60, windowMs: 60_000 }
const ADMIN_WRITE_LIMIT = { namespace: 'admin-write', maxRequests: 20, windowMs: 60_000 }
const ADMIN_PII_LIMIT = { namespace: 'admin-pii', maxRequests: 10, windowMs: 60_000 }
const ACTOR_DOMAIN = 'clod.admin-actor\0v1\0'
const JSON_MEDIA_TYPE = /^application\/(?:[a-z0-9!#$&^_.+-]+\+)?json(?:\s*;|$)/i
const ADMIN_JSON_LIMIT = 4 * 1024


/**
 * Guard for admin GET endpoints: rate limit (by IP) + auth.
 * Rate limit runs first so unauthenticated brute-force attempts are throttled.
 * Returns a Response if blocked, or undefined if request is allowed.
 */
export async function guardAdminRead(request) {
  const ip = getClientIp(request)
  const { allowed, retryAfterSec } = checkRateLimit(ip, ADMIN_READ_LIMIT)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...JSON_HEADERS, 'Retry-After': String(retryAfterSec) },
    })
  }
  if (!await isAuthenticated(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: JSON_HEADERS,
    })
  }
  return undefined
}

/**
 * Guard for admin state-changing endpoints: rate limit (by IP) + origin + auth.
 * Rate limit runs first so unauthenticated brute-force attempts are throttled.
 * Returns a Response if blocked, or undefined if request is allowed.
 */
export async function guardAdminWrite(request) {
  const ip = getClientIp(request)
  const { allowed, retryAfterSec } = checkRateLimit(ip, ADMIN_WRITE_LIMIT)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...JSON_HEADERS, 'Retry-After': String(retryAfterSec) },
    })
  }
  if (!validateOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: JSON_HEADERS,
    })
  }
  if (!await isAuthenticated(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: JSON_HEADERS,
    })
  }
  return undefined
}

/**
 * Derives a stable audit identity from a valid session without exposing its token.
 */
export async function adminActor(request) {
  if (!await isAuthenticated(request)) throw new TypeError('Authenticated admin session is required')
  const token = getTokenFromCookie(request)
  if (typeof token !== 'string' || token.length === 0) throw new TypeError('Authenticated admin session is required')
  const digest = createHmac('sha256', getTokenSecret()).update(ACTOR_DOMAIN, 'utf8').update(token, 'utf8').digest('hex')
  return `v1:${digest}`
}

/**
 * Guards audited PII mutations with the normal write checks and a session budget.
 */
export async function guardAdminPii(request) {
  const blocked = await guardAdminWrite(request)
  if (blocked) return blocked
  const actor = await adminActor(request)
  const { allowed, retryAfterSec } = checkRateLimit(actor, ADMIN_PII_LIMIT)
  if (allowed) return undefined
  return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { ...JSON_HEADERS, 'Retry-After': String(retryAfterSec) } })
}

function declaredLength(request) {
  const value = request.headers.get('content-length')
  if (value === null) return Object.freeze({ valid: true, tooLarge: false })
  if (!/^(?:0|[1-9]\d*)$/.test(value)) return Object.freeze({ valid: false, tooLarge: false })
  const bytes = Number(value)
  if (!Number.isSafeInteger(bytes)) return Object.freeze({ valid: false, tooLarge: true })
  if (bytes > ADMIN_JSON_LIMIT) return Object.freeze({ valid: false, tooLarge: true })
  return Object.freeze({ valid: true, tooLarge: false })
}

async function cancel(reader) {
  try {
    await reader.cancel()
  } catch {
    return
  }
}

function release(reader) {
  try {
    reader.releaseLock()
  } catch {
    return
  }
}

async function streamedJson(request) {
  if (!request.body || typeof request.body.getReader !== 'function') return Object.freeze({ valid: false, tooLarge: false })
  let reader
  try {
    reader = request.body.getReader()
  } catch {
    return Object.freeze({ valid: false, tooLarge: false })
  }
  const chunks = []
  let length = 0
  try {
    while (true) {
      const part = await reader.read()
      if (!part || typeof part !== 'object' || typeof part.done !== 'boolean') return Object.freeze({ valid: false, tooLarge: false })
      if (part.done) break
      if (!ArrayBuffer.isView(part.value)) return Object.freeze({ valid: false, tooLarge: false })
      length += part.value.byteLength
      if (length > ADMIN_JSON_LIMIT) {
        await cancel(reader)
        return Object.freeze({ valid: false, tooLarge: true })
      }
      chunks.push(new Uint8Array(part.value.buffer, part.value.byteOffset, part.value.byteLength).slice())
    }
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return Object.freeze({ valid: true, tooLarge: false, value: JSON.parse(text) })
  } catch {
    return Object.freeze({ valid: false, tooLarge: false })
  } finally {
    release(reader)
  }
}

/**
 * Reads a JSON request with strict media type, declared length, and streamed byte bounds.
 */
export async function readAdminJson(request) {
  const mediaType = request.headers.get('content-type')
  if (typeof mediaType !== 'string' || !JSON_MEDIA_TYPE.test(mediaType)) return Object.freeze({ valid: false, tooLarge: false })
  const length = declaredLength(request)
  if (!length.valid || length.tooLarge) return length
  return streamedJson(request)
}
