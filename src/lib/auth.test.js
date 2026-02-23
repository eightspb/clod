import { describe, it, expect } from 'vitest'
import { validateOrigin, getTokenFromCookie, buildSetCookie, buildClearCookie } from './auth.js'

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
  })

  describe('buildClearCookie', () => {
    it('returns cookie string that clears the session', () => {
      const s = buildClearCookie()
      expect(s).toContain('admin_session=')
      expect(s).toContain('Max-Age=0')
    })
  })
})
