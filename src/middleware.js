import { defineMiddleware } from 'astro:middleware'
import { isAuthenticated } from './lib/auth.js'
import { throttleUnauthenticatedAdmin } from './lib/admin-api.js'

// Yandex Maps widget is embedded as an iframe on the Contacts page.
// Fonts are self-hosted (/fonts/), so no external font host is allowed.
// tracker.js makes fetch calls only to same-origin /api/* endpoints.
// Astro SSG hydration and JSON-LD scripts require 'unsafe-inline' for script-src.
// NOTE: 'require-trusted-types-for' is intentionally omitted — it conflicts with
// 'unsafe-inline' and provides no real enforcement when both are present.
// Trusted Types enforcement requires a nonce-based CSP migration (future work).
// In dev, connect-src allows Cursor debug ingest (127.0.0.1:7460).
function getCspDirectives() {
  const connectSrc = import.meta.env.DEV
    ? "'self' http://127.0.0.1:7460"
    : "'self'"
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: https:",
    "frame-src https://yandex.ru",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

const SECURITY_HEADERS = {
  get 'Content-Security-Policy'() {
    return getCspDirectives()
  },
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

/**
 * Applies the security and cache headers to every response, including the early
 * 401/302 answers produced before the route runs; prerendered static files bypass
 * this middleware entirely and get the same headers from nginx.
 */
function secured(response, path) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  if (import.meta.env.MODE === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  if (path.startsWith('/_astro/') || path.startsWith('/fonts/') || path.startsWith('/images/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }
  if (path.startsWith('/api/') || path.startsWith('/admin')) {
    response.headers.set('Cache-Control', 'no-store, must-revalidate')
  }
  if (process.env.NOINDEX === 'true') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return response
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname
  const isAdminRoute = path.startsWith('/admin') && path !== '/admin/login'
  const isAdminApi = path.startsWith('/api/admin')
  if (isAdminRoute || isAdminApi) {
    const authed = await isAuthenticated(context.request)
    if (!authed && isAdminApi) {
      const throttled = throttleUnauthenticatedAdmin(context.request)
      if (throttled) return secured(throttled, path)
      return secured(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } }), path)
    }
    if (!authed) {
      const redirect = context.redirect('/admin/login')
      return secured(new Response(null, { status: redirect.status, headers: new Headers(redirect.headers) }), path)
    }
  }
  return secured(await next(), path)
})
