/**
 * Shared helpers for admin API endpoints: auth check, rate limiting, JSON responses.
 */

import { createHmac } from 'node:crypto'
import { getTokenFromCookie, getTokenSecret, isAuthenticated, validateOrigin } from './auth.js'
import { checkRateLimit } from './rate-limit.js'
import { readBoundedJson } from './bounded-json.js'
import { getClientIp } from './client-ip.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const ADMIN_READ_LIMIT = { namespace: 'admin-read', maxRequests: 60, windowMs: 60_000 }
const ADMIN_WRITE_LIMIT = { namespace: 'admin-write', maxRequests: 20, windowMs: 60_000 }
const ADMIN_PII_LIMIT = { namespace: 'admin-pii', maxRequests: 10, windowMs: 60_000 }
const ACTOR_DOMAIN = 'clod.admin-actor\0v1\0'
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

/**
 * Reads one admin JSON body with the shared four KiB bound.
 */
export async function readAdminJson(request) {
  return readBoundedJson(request, ADMIN_JSON_LIMIT)
}
