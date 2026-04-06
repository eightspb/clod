import { defineMiddleware } from 'astro:middleware'
import { isAuthenticated } from './lib/auth.js'

// Yandex Maps widget is embedded as an iframe on the Contacts page.
// Primary fonts are self-hosted (/fonts/); Google Fonts are loaded dynamically
// by ThemeSwitcher for alternative font selection — fonts.googleapis.com (CSS)
// and fonts.gstatic.com (woff2 files) must be allowed.
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
    "script-src 'self' 'unsafe-inline' https://booking.medflex.ru",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "frame-src https://yandex.ru https://booking.medflex.ru",
    `connect-src ${connectSrc} https://booking.medflex.ru`,
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
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname
  // Determine adminui vs admin api access
  const isAdminRoute = path.startsWith('/admin') && path !== '/admin/login'
  const isAdminApi = path.startsWith('/api/admin')

  // Auth check: protect admin UI routes and admin API endpoints
  if (isAdminRoute || isAdminApi) {
    const authed = await isAuthenticated(context.request)
    if (!authed) {
      if (isAdminApi) {
        // For API calls, do not redirect - return 401
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      // For UI navigation, redirect to login page
      return context.redirect('/admin/login')
    }
  }

  const response = await next()

  const isProduction = import.meta.env.MODE === 'production'

  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  if (isProduction) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // Долгое кэширование статики (Lighthouse — «выбирайте эффективный период хранения кеша»)
  if (path.startsWith('/_astro/') || path.startsWith('/fonts/') || path.startsWith('/images/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }

  // Запрет кэширования API-ответов — предотвращает утечку данных через прокси и браузерный кэш
  if (path.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store')
  }

  // Запрет индексации для staging/preview-поддоменов (NOINDEX=true в .env на сервере).
  // process.env читается в runtime — работает с @astrojs/node адаптером.
  // Другие адаптеры (Vercel, Cloudflare) могут требовать import.meta.env или env binding
  if (process.env.NOINDEX === 'true') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
})
