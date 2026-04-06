/**
 * Shared helpers for admin API endpoints: auth check, rate limiting, JSON responses.
 */

import { isAuthenticated, validateOrigin } from './auth.js'
import { checkRateLimit } from './rate-limit.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const ADMIN_READ_LIMIT = { namespace: 'admin-read', maxRequests: 60, windowMs: 60_000 }
const ADMIN_WRITE_LIMIT = { namespace: 'admin-write', maxRequests: 20, windowMs: 60_000 }

function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Guard for admin GET endpoints: auth + rate limit.
 * Returns a Response if blocked, or undefined if request is allowed.
 */
export async function guardAdminRead(request) {
  if (!await isAuthenticated(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: JSON_HEADERS,
    })
  }
  const ip = getClientIp(request)
  const { allowed, retryAfterSec } = checkRateLimit(ip, ADMIN_READ_LIMIT)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...JSON_HEADERS, 'Retry-After': String(retryAfterSec) },
    })
  }
  return undefined
}

/**
 * Guard for admin state-changing endpoints: origin + auth + rate limit.
 * Returns a Response if blocked, or undefined if request is allowed.
 */
export async function guardAdminWrite(request) {
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
  const ip = getClientIp(request)
  const { allowed, retryAfterSec } = checkRateLimit(ip, ADMIN_WRITE_LIMIT)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...JSON_HEADERS, 'Retry-After': String(retryAfterSec) },
    })
  }
  return undefined
}
