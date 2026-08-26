/**
 * In-memory rate limiter keyed by arbitrary string (IP, session, etc.).
 * Returns { allowed, retryAfterSec } — caller decides the HTTP response.
 */

const STORE_CAPACITY = 2_048
const NAMESPACE_CAPACITY = 32
const CLEANUP_BUDGET = 16
const stores = new Map()

function getStore(namespace) {
  const existing = stores.get(namespace)
  if (existing) {
    stores.delete(namespace)
    stores.set(namespace, existing)
    return existing
  }
  if (stores.size >= NAMESPACE_CAPACITY) stores.delete(stores.keys().next().value)
  const store = new Map()
  stores.set(namespace, store)
  return store
}

function evictExpired(store, now) {
  let scanned = 0
  for (const [key, entry] of store) {
    if (scanned >= CLEANUP_BUDGET) return
    if (now >= entry.resetAt) store.delete(key)
    scanned += 1
  }
}

function setEntry(store, key, entry) {
  store.delete(key)
  if (store.size >= STORE_CAPACITY) store.delete(store.keys().next().value)
  store.set(key, Object.freeze(entry))
}

export function checkRateLimit(key, { namespace = 'default', maxRequests = 10, windowMs = 60_000 } = {}) {
  const store = getStore(namespace)
  const now = Date.now()
  evictExpired(store, now)
  const entry = store.get(key)
  if (!entry || now >= entry.resetAt) {
    setEntry(store, key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }
  if (entry.count >= maxRequests) {
    setEntry(store, key, entry)
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    }
  }
  setEntry(store, key, { count: entry.count + 1, resetAt: entry.resetAt })
  return { allowed: true }
}

export function resetRateLimit(key, { namespace = 'default' } = {}) {
  stores.get(namespace)?.delete(key)
}
