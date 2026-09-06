import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createRequestFromNodeRequest } from 'astro/app/node'
import {
  buildClearCookie,
  buildSetCookie,
  createToken,
  getTokenFromCookie,
  validateOrigin,
  verifyToken,
} from './auth.js'
import { POST as loginPost } from '../pages/api/auth/login.js'
import { POST as logoutPost } from '../pages/api/auth/logout.js'
import { POST as logoutAllPost } from '../pages/api/auth/logout-all.js'
import { migratedDatabaseUrl } from '../test/fixtures/migrated-database.mjs'

const ORIGINAL_ENV = {
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  TOKEN_SECRET: process.env.TOKEN_SECRET,
  NODE_ENV: process.env.NODE_ENV,
}

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key]
      continue
    }

    process.env[key] = value
  }
}

function makeJsonRequest({ origin = 'http://localhost:4321', referer = null, body = {}, cookie = '', ip = '203.0.113.200' } = {}) {
  const headers = new Headers({ 'Content-Type': 'application/json', 'x-real-ip': ip })
  if (origin) headers.set('origin', origin)
  if (referer) headers.set('referer', referer)
  if (cookie) headers.set('cookie', cookie)

  return new Request('http://localhost:4321/api/test', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

/** Mirrors @astrojs/node: the URL comes from the plain Host header, never from X-Forwarded-* */
function makeAstroProxyRequest(origin, headers) {
  return createRequestFromNodeRequest({ method: 'POST', url: '/api/test', headers: { origin, ...headers }, socket: {}, on() {}, once() {}, off() {} }, { skipBody: true })
}

beforeAll(async () => {
  process.env.ASTRO_DB_REMOTE_URL = await migratedDatabaseUrl('clod-auth-')
})

beforeEach(() => {
  process.env.ADMIN_PASSWORD = 'top-secret-password'
  process.env.TOKEN_SECRET = 'unit-test-token-secret'
  delete process.env.NODE_ENV
})

afterEach(() => {
  restoreEnv()
})

describe('auth.js', () => {
  describe('validateOrigin', () => {
    function makeRequest(origin, referer, extras = {}) {
      return {
        url: extras.url || 'https://odintsovclinic.ru/api/test',
        headers: {
          get: (name) =>
            name === 'origin'
              ? origin
              : name === 'referer'
                ? referer
                : extras[name] ?? null,
        },
      }
    }

    it('rejects a request addressed to another host than SITE_DOMAIN in production', () => {
      process.env.NODE_ENV = 'production'
      process.env.SITE_DOMAIN = 'new.odintsovclinic.ru'
      const result = validateOrigin(makeRequest('https://odintsovclinic.ru', null))
      delete process.env.SITE_DOMAIN
      expect(result).toBe(false)
    })

    it('accepts the request addressed to SITE_DOMAIN itself in production', () => {
      process.env.NODE_ENV = 'production'
      process.env.SITE_DOMAIN = 'odintsovclinic.ru'
      const result = validateOrigin(makeRequest('https://odintsovclinic.ru', null))
      delete process.env.SITE_DOMAIN
      expect(result).toBe(true)
    })

    it('accepts odintsovclinic.ru', () => {
      expect(validateOrigin(makeRequest('https://odintsovclinic.ru/', null))).toBe(true)
    })

    it('accepts www.odintsovclinic.ru', () => {
      expect(validateOrigin(makeRequest('https://www.odintsovclinic.ru/', null, { url: 'https://www.odintsovclinic.ru/api/test' }))).toBe(true)
    })

    it('accepts localhost:4321', () => {
      expect(validateOrigin(makeRequest('http://localhost:4321/', null, { url: 'http://localhost:4321/api/test' }))).toBe(true)
    })

    it('accepts referer when origin is missing', () => {
      expect(validateOrigin(makeRequest(null, 'https://localhost:4321/page', { url: 'https://localhost:4321/api/test' }))).toBe(true)
    })

    it('accepts the current request host even when it is not in the static allowlist', () => {
      expect(
        validateOrigin(
          makeRequest('https://app.odintsovclinic.ru/', null, {
            host: 'app.odintsovclinic.ru',
            url: 'https://app.odintsovclinic.ru/api/test',
          })
        )
      ).toBe(true)
    })

    it('accepts same-origin requests without origin when fetch metadata is present', () => {
      expect(
        validateOrigin(
          makeRequest(null, null, {
            host: 'odintsovclinic.ru',
            'sec-fetch-site': 'same-origin',
          })
        )
      ).toBe(true)
    })

    it('accepts the HTTPS origin when the adapter derives a plain HTTP url from the nginx Host header', () => {
      const request = makeAstroProxyRequest('https://odintsovclinic.ru', { host: 'odintsovclinic.ru', 'x-forwarded-host': '', 'x-forwarded-proto': 'https', 'x-forwarded-port': '443' })
      expect({ url: request.url, valid: validateOrigin(request) }).toEqual({ url: 'http://odintsovclinic.ru/api/test', valid: true })
    })

    it('accepts the exact HTTP origin behind the configured port 80 proxy', () => {
      const request = makeAstroProxyRequest('http://127.0.0.1', { host: '127.0.0.1', 'x-forwarded-proto': 'http', 'x-forwarded-port': '80' })
      expect({ url: request.url, valid: validateOrigin(request) }).toEqual({ url: 'http://127.0.0.1/api/test', valid: true })
    })

    it('rejects an HTTP source for the HTTPS production request', () => {
      const request = makeRequest('http://odintsovclinic.ru', null, { url: 'https://odintsovclinic.ru/api/test', host: 'odintsovclinic.ru' })
      expect(validateOrigin(request)).toBe(false)
    })

    it('rejects a source using another port even when Host is forged to match it', () => {
      const request = makeRequest('https://odintsovclinic.ru:444', null, { url: 'https://odintsovclinic.ru/api/test', host: 'odintsovclinic.ru:444' })
      expect(validateOrigin(request)).toBe(false)
    })

    it.each(['https://odintsovclinic.ru', 'https://odintsovclinic.ru:444'])('rejects %s when Astro receives a forged forwarded port 444', (origin) => {
      const request = makeAstroProxyRequest(origin, { host: 'odintsovclinic.ru', 'x-forwarded-proto': 'https', 'x-forwarded-port': '444' })
      expect({ url: request.url, valid: validateOrigin(request) }).toEqual({ url: 'http://odintsovclinic.ru/api/test', valid: false })
    })

    it.each(['https://odintsovclinic.ru', 'https://odintsovclinic.ru:444'])('rejects %s when the forwarded port is ambiguous', (origin) => {
      const request = makeAstroProxyRequest(origin, { host: 'odintsovclinic.ru', 'x-forwarded-proto': 'https', 'x-forwarded-port': '443, 444' })
      expect(validateOrigin(request)).toBe(false)
    })

    it.each([
      ['a missing forwarded port', { host: 'odintsovclinic.ru', 'x-forwarded-proto': 'https' }],
      ['a port inconsistent with HTTPS', { host: 'odintsovclinic.ru', 'x-forwarded-proto': 'https', 'x-forwarded-port': '80' }],
      ['a nonconfigured HTTPS port', { host: 'odintsovclinic.ru', 'x-forwarded-proto': 'https', 'x-forwarded-port': '8443' }],
    ])('rejects %s', (_label, headers) => {
      const request = makeAstroProxyRequest('https://odintsovclinic.ru', headers)
      expect(validateOrigin(request)).toBe(false)
    })

    it('rejects a forged forwarded host that differs from the proxy Host', () => {
      const request = makeAstroProxyRequest('https://evil.example', { host: 'odintsovclinic.ru', 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https', 'x-forwarded-port': '443' })
      expect(validateOrigin(request)).toBe(false)
    })

    it('rejects a forged forwarded host even when it names an allowed production origin', () => {
      const request = makeAstroProxyRequest('https://odintsovclinic.ru', { host: 'evil.example', 'x-forwarded-host': 'odintsovclinic.ru', 'x-forwarded-proto': 'https', 'x-forwarded-port': '443' })
      expect(validateOrigin(request)).toBe(false)
    })

    it('rejects same-site metadata without origin or referer evidence', () => {
      const request = makeRequest(null, null, { host: 'odintsovclinic.ru', 'sec-fetch-site': 'same-site' })
      expect(validateOrigin(request)).toBe(false)
    })

    it('rejects unknown origin', () => {
      expect(validateOrigin(makeRequest('https://evil.com/', null))).toBe(false)
    })

    it('rejects when neither origin nor referer', () => {
      expect(validateOrigin(makeRequest(null, null))).toBe(false)
    })
  })

  describe('getTokenFromCookie', () => {
    it('extracts cookie value', () => {
      const req = { headers: { get: () => '__Host-admin_session=abc123; other=val' } }
      expect(getTokenFromCookie(req)).toBe('abc123')
    })

    it('treats a duplicated session cookie as no session', () => {
      const req = { headers: { get: () => '__Host-admin_session=abc123; __Host-admin_session=xyz789' } }
      expect(getTokenFromCookie(req)).toBe(null)
    })

    it('returns null when cookie absent', () => {
      const req = { headers: { get: () => '' } }
      expect(getTokenFromCookie(req)).toBe(null)
    })

    it('handles cookie with equals in value', () => {
      const req = { headers: { get: () => '__Host-admin_session=a.b.c' } }
      expect(getTokenFromCookie(req)).toBe('a.b.c')
    })
  })

  describe('buildSetCookie', () => {
    it('returns cookie string with token', () => {
      const s = buildSetCookie('my-token')
      expect(s).toContain('__Host-admin_session=my-token')
      expect(s).toContain('HttpOnly')
      expect(s).toContain('SameSite=Strict')
      expect(s).toContain('Path=/')
      expect(s).toContain('Max-Age=')
    })

    it('always marks the cookie Secure so the __Host- prefix is honoured', () => {
      expect(buildSetCookie('my-token')).toContain('Secure')
    })
  })

  describe('buildClearCookie', () => {
    it('returns cookie string that clears the session', () => {
      const s = buildClearCookie()
      expect(s).toContain('__Host-admin_session=')
      expect(s).toContain('Max-Age=0')
    })

    it('always marks the clearing cookie Secure', () => {
      expect(buildClearCookie()).toContain('Secure')
    })
  })

  describe('token signing', () => {
    it('creates and verifies a token with TOKEN_SECRET', async () => {
      const token = await createToken()

      await expect(verifyToken(token)).resolves.toBe(true)
    })

    it('fails fast when TOKEN_SECRET is missing even if ADMIN_PASSWORD exists', async () => {
      delete process.env.TOKEN_SECRET

      await expect(createToken()).rejects.toThrow('TOKEN_SECRET environment variable is required')
    })

    it('rejects a tampered signature', async () => {
      const token = await createToken()
      const [sessionId, issuedAt] = token.split('.')
      const tampered = `${sessionId}.${issuedAt}.${'A'.repeat(43)}`

      await expect(verifyToken(tampered)).resolves.toBe(false)
    })

    it('rejects the token of a session ended by logout', async () => {
      const token = await createToken()
      await logoutPost({ request: makeJsonRequest({ cookie: `__Host-admin_session=${token}` }) })

      await expect(verifyToken(token)).resolves.toBe(false)
    })

    it('rejects every token after ending all sessions', async () => {
      const first = await createToken()
      const second = await createToken()
      await logoutAllPost({ request: makeJsonRequest({ cookie: `__Host-admin_session=${first}`, ip: '203.0.113.201' }) })

      await expect(Promise.all([verifyToken(first), verifyToken(second)])).resolves.toEqual([false, false])
    })
  })

  describe('auth endpoints', () => {
    it('returns 500 for login when auth secrets are misconfigured', async () => {
      delete process.env.TOKEN_SECRET

      const response = await loginPost({
        request: makeJsonRequest({ body: { password: 'top-secret-password' } }),
      })

      expect(response.status).toBe(500)
      await expect(response.json()).resolves.toEqual({ error: 'Internal error' })
    })

    it('rejects logout from disallowed origin', async () => {
      const response = await logoutPost({
        request: makeJsonRequest({
          origin: 'https://evil.example',
        }),
      })

      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toEqual({ error: 'Forbidden' })
    })
  })
})
