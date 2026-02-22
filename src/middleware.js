import { defineMiddleware } from 'astro:middleware'

// Yandex Maps widget is embedded as an iframe on the Contacts page.
// Fonts are self-hosted (/fonts/inter-var.woff2) - no external font CDN on public pages.
// tracker.js makes fetch calls only to same-origin /api/* endpoints.
// Astro hydration and inline scripts require 'unsafe-inline' for script-src.
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: https:",
  "frame-src https://yandex.ru",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP_DIRECTIVES,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next()

  const isProduction = import.meta.env.MODE === 'production'

  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  if (isProduction) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  return response
})
