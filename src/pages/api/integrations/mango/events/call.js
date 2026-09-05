export const prerender = false

import { db } from '../../../../../lib/database.js'
import { getClientIp } from '../../../../../lib/client-ip.js'
import { MangoCallEventError, normalizeMangoLiveEvent } from '../../../../../lib/mango-call-event.js'
import { createMangoCallRecords } from '../../../../../lib/mango-call-records.js'
import { MangoWebhookError, verifyMangoWebhook } from '../../../../../lib/mango-signature.js'
import { checkRateLimit } from '../../../../../lib/rate-limit.js'

const JSON_HEADERS = Object.freeze({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' })
const RATE_LIMIT_OPTIONS = Object.freeze({ namespace: 'mango-webhooks', maxRequests: 300, windowMs: 60_000 })
const ACK_OUTCOMES = new Set(['applied', 'duplicate', 'stale', 'ignored', 'removed'])
const OPTION_KEYS = Object.freeze(['normalize', 'verify', 'records', 'credentials', 'limit', 'clientIp', 'log'])

function json(payload, status, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { ...JSON_HEADERS, ...headers } })
}

function environment(name) {
  const value = process.env[name]
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} environment variable is required`)
  return value
}

function productionCredentials() {
  return Object.freeze({ apiKey: environment('MANGO_VPBX_API_KEY'), salt: environment('MANGO_VPBX_API_SALT'), inboundLines: environment('MANGO_INBOUND_LINES') })
}

function productionRecords() {
  return createMangoCallRecords({ client: db.$client, fingerprintKey: environment('CONTACT_FINGERPRINT_KEY'), encryptionKey: environment('MANGO_CALL_ENCRYPTION_KEY') })
}

function productionLog(stage) {
  console.error('[integrations/mango]', stage)
}

function safeLog(log, stage) {
  try {
    log(stage)
  } catch {
    return
  }
}

function options(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('MANGO endpoint options must be a plain object')
  const prototype = Object.getPrototypeOf(input)
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError('MANGO endpoint options must be a plain object')
  if (!Reflect.ownKeys(input).every((key) => typeof key === 'string' && OPTION_KEYS.includes(key))) throw new TypeError('MANGO endpoint options contain unknown fields')
  const configuration = { normalize: input.normalize, verify: input.verify ?? verifyMangoWebhook, records: input.records ?? productionRecords, credentials: input.credentials ?? productionCredentials, limit: input.limit ?? checkRateLimit, clientIp: input.clientIp ?? getClientIp, log: input.log ?? productionLog }
  if (!Object.values(configuration).every((value) => typeof value === 'function')) throw new TypeError('MANGO endpoint adapters must be functions')
  return Object.freeze(configuration)
}

function boundaryFailure(error) {
  if (!(error instanceof MangoWebhookError)) return null
  if (error.code === 'UNAUTHORIZED') return json({ error: error.code }, 401)
  if (error.code === 'UNSUPPORTED_MEDIA_TYPE') return json({ error: error.code }, 415)
  if (error.code === 'PAYLOAD_TOO_LARGE') return json({ error: error.code }, 413)
  if (error.code === 'INVALID_FORM' || error.code === 'INVALID_EVENT') return json({ error: error.code }, 400)
  return null
}

function unavailable() {
  return json({ error: 'MANGO_UNAVAILABLE' }, 503)
}

/**
 * Creates the authenticated transport adapter shared by MANGO webhook types.
 */
export function createMangoWebhookEndpoint(input) {
  const configuration = options(input)
  return async function mangoWebhookEndpoint({ request }) {
    let rate
    try {
      rate = configuration.limit(configuration.clientIp(request), RATE_LIMIT_OPTIONS)
    } catch {
      safeLog(configuration.log, 'RATE_LIMIT_FAILED')
      return unavailable()
    }
    if (!rate || rate.allowed !== true) return json({ error: 'RATE_LIMITED' }, 429, { 'Retry-After': String(rate?.retryAfterSec ?? 60) })
    let credentials
    try {
      credentials = configuration.credentials()
    } catch {
      safeLog(configuration.log, 'CONFIGURATION_FAILED')
      return unavailable()
    }
    let verified
    try {
      verified = await configuration.verify({ request, ...credentials })
    } catch (error) {
      const response = boundaryFailure(error)
      if (response) return response
      safeLog(configuration.log, error instanceof MangoWebhookError && error.code === 'INVALID_CONFIGURATION' ? 'CONFIGURATION_FAILED' : 'VERIFICATION_FAILED')
      return unavailable()
    }
    let command
    try {
      command = configuration.normalize(verified)
    } catch (error) {
      if (error instanceof MangoCallEventError) return json({ error: 'INVALID_EVENT' }, 400)
      safeLog(configuration.log, 'NORMALIZATION_FAILED')
      return unavailable()
    }
    try {
      const repository = configuration.records()
      if (!repository || typeof repository.apply !== 'function') throw new TypeError('MANGO call repository is invalid')
      const result = await repository.apply(command)
      if (!result || !ACK_OUTCOMES.has(result.outcome)) throw new TypeError('MANGO persistence outcome is invalid')
      return json({ data: { outcome: result.outcome } }, 200)
    } catch {
      safeLog(configuration.log, 'PERSISTENCE_FAILED')
      return unavailable()
    }
  }
}

export { normalizeMangoLiveEvent }
export const POST = createMangoWebhookEndpoint({ normalize: normalizeMangoLiveEvent })

export function ALL() {
  return json({ error: 'METHOD_NOT_ALLOWED' }, 405, { Allow: 'POST' })
}
