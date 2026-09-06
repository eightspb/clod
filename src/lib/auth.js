import { createHash, timingSafeEqual } from 'node:crypto'
import { createAdminSessions, SESSION_TTL_MS } from './admin-sessions.js'
import { db } from './database.js'

const COOKIE_NAME = '__Host-admin_session'

function getEnvValue(name) {
  return process.env[name] || ''
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

/**
 * Compares two strings in constant time through fixed-length SHA-256 digests, so neither the
 * length nor the first differing byte of the secret leaks through timing.
 */
export function timingSafeEqualText(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  const leftDigest = createHash('sha256').update(left, 'utf8').digest()
  const rightDigest = createHash('sha256').update(right, 'utf8').digest()
  return timingSafeEqual(leftDigest, rightDigest) && left === right
}

/**
 * Server-side session store bound to the application database and the current TOKEN_SECRET.
 */
export function adminSessions() {
  return createAdminSessions({ client: db.$client, secret: getTokenSecret() })
}

export async function createToken() {
  return adminSessions().issue()
}

export async function verifyToken(token) {
  if (!token) return false
  try {
    return (await adminSessions().verify(token)).valid
  } catch {
    return false
  }
}

/**
 * Reads the session cookie; a duplicated cookie name is treated as no session because a
 * second value can only come from an attacker-controlled path or domain.
 */
export function getTokenFromCookie(request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const values = cookieHeader.split(';').map((part) => part.trim()).filter((part) => part.startsWith(`${COOKIE_NAME}=`)).map((part) => part.slice(COOKIE_NAME.length + 1))
  return values.length === 1 && values[0] ? values[0] : null
}

export async function isAuthenticated(request) {
  const token = getTokenFromCookie(request)
  return verifyToken(token)
}

export function buildSetCookie(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Secure; Max-Age=${SESSION_TTL_MS / 1000}`
}

export function buildClearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Secure; Max-Age=0`
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

/**
 * The adapter derives request.url from the plain Host header, so behind the TLS-terminating
 * nginx hop the URL is http:// while the forwarded headers describe the real https:// origin;
 * only the hostname has to agree between the two.
 */
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
  if ((originUrl.port || configuredPort) !== rawPort || !current || new URL(current).hostname !== originUrl.hostname) return Object.freeze({ valid: false, origin: '' })
  return Object.freeze({ valid: true, origin })
}

function siteDomainMatches(current) {
  const domain = normalizeHeader(process.env.SITE_DOMAIN)
  if (!domain || process.env.NODE_ENV !== 'production') return true
  return current.length > 0 && new URL(current).hostname === domain
}

/**
 * In production the request must address SITE_DOMAIN itself: a spoofed Host header cannot turn
 * an attacker's origin into an allowed one.
 */
export function validateOrigin(request) {
  const current = exactOrigin(request.url)
  if (!siteDomainMatches(current)) return false
  const proxy = proxyOrigin(request, current)
  if (!proxy.valid) return false
  const allowed = new Set([current, proxy.origin].filter(Boolean))
  const source = request.headers.get('origin') || request.headers.get('referer')
  if (!source) return normalizeHeader(request.headers.get('sec-fetch-site')) === 'same-origin' && allowed.size > 0
  const origin = exactOrigin(source)
  return origin.length > 0 && allowed.has(origin)
}
