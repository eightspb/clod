import { isIP } from 'node:net'

const UNKNOWN_CLIENT_IP = 'unknown'

function readHeaders(source) {
  if (source instanceof Headers) return { valid: true, value: source }
  if (!source || typeof source !== 'object') return { valid: false }
  const headers = source.headers
  if (headers && typeof headers.get === 'function') return { valid: true, value: headers }
  if (typeof source.get === 'function') return { valid: true, value: source }
  return { valid: false }
}

function readHeader(headers, name) {
  const value = headers.get(name)
  if (typeof value !== 'string') return { present: false, value: '' }
  return { present: true, value }
}

function normalizeIp(candidate) {
  const value = candidate.trim()
  if (!value || value.includes(',') || value.includes('%')) return ''
  const family = isIP(value)
  if (!family) return ''
  if (family === 4) return value
  const hostname = new URL(`http://[${value}]/`).hostname
  return hostname.slice(1, -1).toLowerCase()
}

function findNearestForwardedIp(value) {
  const candidates = value.split(',')
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const address = normalizeIp(candidates[index])
    if (address) return address
  }
  return UNKNOWN_CLIENT_IP
}

/**
 * Resolves a stable rate-limit IP from proxy-controlled request headers.
 */
export function getClientIp(source) {
  const headers = readHeaders(source)
  if (!headers.valid) return UNKNOWN_CLIENT_IP
  const realIp = readHeader(headers.value, 'x-real-ip')
  if (realIp.present) return normalizeIp(realIp.value) || UNKNOWN_CLIENT_IP
  const forwardedFor = readHeader(headers.value, 'x-forwarded-for')
  if (!forwardedFor.present) return UNKNOWN_CLIENT_IP
  return findNearestForwardedIp(forwardedFor.value)
}
