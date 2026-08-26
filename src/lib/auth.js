import { timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'admin_session'
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000

function getEnvValue(name) {
  return import.meta.env[name] || process.env[name] || ''
}

export function getTokenSecret() {
  const secret = getEnvValue('TOKEN_SECRET')
  if (!secret) throw new Error('TOKEN_SECRET environment variable is required')
  return secret
}

export function getAdminPassword() {
  const password = getEnvValue('ADMIN_PASSWORD')
  if (!password) throw new Error('ADMIN_PASSWORD environment variable is required')
  return password
}

export function assertAuthConfiguration() {
  getAdminPassword()
  getTokenSecret()
}

export function timingSafeEqualText(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false

  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

async function hmacSign(data, secret) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

async function hmacVerify(data, signature, secret) {
  const expected = await hmacSign(data, secret)
  return timingSafeEqualText(expected, signature)
}

export async function createToken() {
  const secret = getTokenSecret()
  const timestamp = Date.now().toString()
  const sig = await hmacSign(timestamp, secret)
  return `${timestamp}.${sig}`
}

export async function verifyToken(token) {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [timestamp, sig] = parts
  const ts = parseInt(timestamp, 10)
  if (isNaN(ts)) return false
  if (ts > Date.now() + MAX_CLOCK_SKEW_MS) return false
  if (Date.now() - ts > TOKEN_TTL_MS) return false
  let secret
  try {
    secret = getTokenSecret()
  } catch {
    return false
  }

  return hmacVerify(timestamp, sig, secret)
}

export function getTokenFromCookie(request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=')
      return [k, v.join('=')]
    })
  )
  return cookies[COOKIE_NAME] || null
}

export async function isAuthenticated(request) {
  const token = getTokenFromCookie(request)
  return verifyToken(token)
}

function getCookieSecuritySuffix() {
  const isProduction = process.env.NODE_ENV === 'production' || import.meta.env.MODE === 'production'
  return isProduction ? '; Secure' : ''
}

export function buildSetCookie(token) {
  const secureFlag = getCookieSecuritySuffix()
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/${secureFlag}; Max-Age=${TOKEN_TTL_MS / 1000}`
}

export function buildClearCookie() {
  const secureFlag = getCookieSecuritySuffix()
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/${secureFlag}; Max-Age=0`
}

const FORWARDED_PORT_BY_PROTOCOL = Object.freeze({ http: '80', https: '443' })

function normalizeHeader(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function exactOrigin(value) {
  if (typeof value !== 'string' || value.length === 0) return ''
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return ''
    return url.origin
  } catch {
    return ''
  }
}

function proxyOrigin(request, current) {
  const rawProto = normalizeHeader(request.headers.get('x-forwarded-proto'))
  const rawForwardedHost = normalizeHeader(request.headers.get('x-forwarded-host'))
  const rawPort = normalizeHeader(request.headers.get('x-forwarded-port'))
  if (!rawProto && !rawForwardedHost && !rawPort) return Object.freeze({ valid: true, origin: '' })
  if (!rawProto || !rawPort || rawProto.includes(',') || rawPort.includes(',') || (rawForwardedHost && rawForwardedHost.includes(','))) return Object.freeze({ valid: false, origin: '' })
  const configuredPort = FORWARDED_PORT_BY_PROTOCOL[rawProto]
  if (!configuredPort || rawPort !== configuredPort) return Object.freeze({ valid: false, origin: '' })
  const host = normalizeHeader(request.headers.get('host'))
  const forwardedHost = rawForwardedHost || host
  if (!forwardedHost || /[\s/?#@\\]/.test(forwardedHost)) return Object.freeze({ valid: false, origin: '' })
  const origin = exactOrigin(`${rawProto}://${forwardedHost}`)
  if (!origin || (rawForwardedHost && rawForwardedHost !== host)) return Object.freeze({ valid: false, origin: '' })
  const originUrl = new URL(origin)
  if ((originUrl.port || configuredPort) !== rawPort || origin !== current) return Object.freeze({ valid: false, origin: '' })
  return Object.freeze({ valid: true, origin })
}

export function validateOrigin(request) {
  const current = exactOrigin(request.url)
  const proxy = proxyOrigin(request, current)
  if (!proxy.valid) return false
  const allowed = new Set([current, proxy.origin].filter(Boolean))
  const source = request.headers.get('origin') || request.headers.get('referer')
  if (!source) return normalizeHeader(request.headers.get('sec-fetch-site')) === 'same-origin' && allowed.size > 0
  const origin = exactOrigin(source)
  return origin.length > 0 && allowed.has(origin)
}

export function validatePassword(password, expectedPassword) {
  return timingSafeEqualText(password, expectedPassword)
}
