import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequest } from './middleware.js'

function parseCsp(value) {
  return Object.fromEntries(value.split(';').map((directive) => {
    const [name, ...tokens] = directive.trim().split(/\s+/)
    return [name, tokens]
  }))
}

async function responseFor(path = '/') {
  const url = new URL(path, 'https://odintsovclinic.ru')
  const context = { url, request: new Request(url), redirect: (location) => Response.redirect(new URL(location, url)) }
  return onRequest(context, () => new Response('ok'))
}

describe('security middleware', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('limits development script, frame, and connection sources to active first-party services', async () => {
    vi.stubEnv('DEV', true)
    vi.stubEnv('MODE', 'development')
    const response = await responseFor()
    const directives = parseCsp(response.headers.get('Content-Security-Policy'))
    expect({ script: directives['script-src'], frame: directives['frame-src'], connect: directives['connect-src'] }).toEqual({ script: ["'self'", "'unsafe-inline'"], frame: ['https://yandex.ru'], connect: ["'self'", 'http://127.0.0.1:7460'] })
  })

  it('retains every production security directive and header without the retired widget origin', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('MODE', 'production')
    const response = await responseFor()
    const directives = parseCsp(response.headers.get('Content-Security-Policy'))
    const headers = Object.fromEntries(['Cross-Origin-Opener-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'X-XSS-Protection', 'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security'].map((name) => [name, response.headers.get(name)]))
    expect(directives).toEqual({ 'default-src': ["'self'"], 'script-src': ["'self'", "'unsafe-inline'"], 'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], 'font-src': ["'self'", 'https://fonts.gstatic.com'], 'img-src': ["'self'", 'data:', 'https:'], 'frame-src': ['https://yandex.ru'], 'connect-src': ["'self'"], 'object-src': ["'none'"], 'base-uri': ["'self'"], 'form-action': ["'self'"] })
    expect(headers).toEqual({ 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'X-XSS-Protection': '1; mode=block', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' })
  })
})
