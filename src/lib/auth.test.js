import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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

function makeJsonRequest({ origin = 'http://localhost:4321', referer = null, body = {}, cookie = '' } = {}) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (origin) headers.set('origin', origin)
  if (referer) headers.set('referer', referer)
  if (cookie) headers.set('cookie', cookie)

  return new Request('http://localhost:4321/api/test', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

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
    function makeRequest(origin, referer) {
      return {
        headers: {
          get: (name) => (name === 'origin' ? origin : name === 'referer' ? referer : null),
        },
      }
    }

    it('accepts odintsovclinic.ru', () => {
      expect(validateOrigin(makeRequest('https://odintsovclinic.ru/', null))).toBe(true)
    })

    it('accepts www.odintsovclinic.ru', () => {
      expect(validateOrigin(makeRequest('https://www.odintsovclinic.ru/', null))).toBe(true)
    })

    it('accepts localhost:4321', () => {
      expect(validateOrigin(makeRequest('http://localhost:4321/', null))).toBe(true)
    })

    it('accepts referer when origin is missing', () => {
      expect(validateOrigin(makeRequest(null, 'https://localhost:4321/page'))).toBe(true)
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
      const req = { headers: { get: () => 'admin_session=abc123; other=val' } }
      expect(getTokenFromCookie(req)).toBe('abc123')
    })

    it('returns null when cookie absent', () => {
      const req = { headers: { get: () => '' } }
      expect(getTokenFromCookie(req)).toBe(null)
    })

    it('handles cookie with equals in value', () => {
      const req = { headers: { get: () => 'admin_session=a.b.c' } }
      expect(getTokenFromCookie(req)).toBe('a.b.c')
    })
  })

  describe('buildSetCookie', () => {
    it('returns cookie string with token', () => {
      const s = buildSetCookie('my-token')
      expect(s).toContain('admin_session=my-token')
      expect(s).toContain('HttpOnly')
      expect(s).toContain('SameSite=Strict')
      expect(s).toContain('Path=/')
      expect(s).toContain('Max-Age=')
    })

    it('adds Secure in production', () => {
      process.env.NODE_ENV = 'production'

      expect(buildSetCookie('my-token')).toContain('Secure')
    })
  })

  describe('buildClearCookie', () => {
    it('returns cookie string that clears the session', () => {
      const s = buildClearCookie()
      expect(s).toContain('admin_session=')
      expect(s).toContain('Max-Age=0')
    })

    it('adds Secure in production', () => {
      process.env.NODE_ENV = 'production'

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
      const [timestamp] = token.split('.')
      const tampered = `${timestamp}.tampered-signature`

      await expect(verifyToken(tampered)).resolves.toBe(false)
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
