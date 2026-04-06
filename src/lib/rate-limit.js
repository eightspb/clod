/**
 * In-memory rate limiter keyed by arbitrary string (IP, session, etc.).
 * Returns { allowed, retryAfterSec } — caller decides the HTTP response.
 */

const stores = new Map()

function getStore(namespace) {
  if (!stores.has(namespace)) {
    stores.set(namespace, new Map())
  }
  return stores.get(namespace)
}

export function checkRateLimit(key, { namespace = 'default', maxRequests = 10, windowMs = 60_000 } = {}) {
  const store = getStore(namespace)
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    }
  }
  entry.count += 1
  return { allowed: true }
}

export function resetRateLimit(key, { namespace = 'default' } = {}) {
  const store = getStore(namespace)
  store.delete(key)
}
