import { createHash, timingSafeEqual } from 'node:crypto'
import { normalizeContactPhone } from './contact-identity.js'

const BODY_LIMIT = 64 * 1024
const MEDIA_TYPE = /^application\/x-www-form-urlencoded(?:\s*;\s*charset=utf-8\s*)?$/i
const SIGNATURE = /^[0-9a-f]{64}$/
const API_KEY = /^[A-Za-z0-9._-]{1,256}$/
const FORM_KEYS = Object.freeze(['vpbx_api_key', 'sign', 'json'])
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const ERROR_MESSAGES = Object.freeze({ INVALID_CONFIGURATION: 'MANGO webhook configuration is invalid', UNSUPPORTED_MEDIA_TYPE: 'MANGO webhook media type is unsupported', PAYLOAD_TOO_LARGE: 'MANGO webhook payload is too large', INVALID_FORM: 'MANGO webhook form is invalid', UNAUTHORIZED: 'MANGO webhook authentication failed', INVALID_EVENT: 'MANGO webhook event is invalid' })

/**
 * Represents a safe MANGO boundary failure without reflecting provider input.
 */
export class MangoWebhookError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(ERROR_MESSAGES, code) ? code : 'INVALID_EVENT'
    super(ERROR_MESSAGES[safeCode])
    this.name = 'MangoWebhookError'
    this.code = safeCode
    Object.freeze(this)
  }
}

function configuration(apiKey, salt, inboundLines, compare) {
  if (typeof apiKey !== 'string' || !API_KEY.test(apiKey) || typeof salt !== 'string' || salt.trim() !== salt || Buffer.byteLength(salt, 'utf8') < 16 || Buffer.byteLength(salt, 'utf8') > 4_096 || typeof inboundLines !== 'string' || typeof compare !== 'function') throw new MangoWebhookError('INVALID_CONFIGURATION')
  const rawLines = inboundLines.split(',').map((line) => line.trim())
  if (rawLines.length === 0 || rawLines.some((line) => line.length === 0)) throw new MangoWebhookError('INVALID_CONFIGURATION')
  let lines
  try {
    lines = rawLines.map(normalizeContactPhone)
  } catch {
    throw new MangoWebhookError('INVALID_CONFIGURATION')
  }
  if (new Set(lines).size !== lines.length) throw new MangoWebhookError('INVALID_CONFIGURATION')
  return Object.freeze({ apiKey, salt, inboundLines: Object.freeze(lines), compare })
}

function declaredLength(request) {
  const value = request.headers.get('content-length')
  if (value === null) return
  if (!/^(?:0|[1-9]\d*)$/.test(value)) throw new MangoWebhookError('INVALID_FORM')
  const bytes = Number(value)
  if (!Number.isSafeInteger(bytes) || bytes > BODY_LIMIT) throw new MangoWebhookError('PAYLOAD_TOO_LARGE')
}

async function cancel(reader) {
  try {
    await reader.cancel()
  } catch {
    return
  }
}

function release(reader) {
  try {
    reader.releaseLock()
  } catch {
    return
  }
}

async function readBody(request) {
  declaredLength(request)
  if (!request.body || typeof request.body.getReader !== 'function') throw new MangoWebhookError('INVALID_FORM')
  let reader
  try {
    reader = request.body.getReader()
  } catch {
    throw new MangoWebhookError('INVALID_FORM')
  }
  const chunks = []
  let length = 0
  try {
    while (true) {
      const part = await reader.read()
      if (!part || typeof part !== 'object' || typeof part.done !== 'boolean') throw new MangoWebhookError('INVALID_FORM')
      if (part.done) break
      if (!ArrayBuffer.isView(part.value)) throw new MangoWebhookError('INVALID_FORM')
      length += part.value.byteLength
      if (length > BODY_LIMIT) {
        await cancel(reader)
        throw new MangoWebhookError('PAYLOAD_TOO_LARGE')
      }
      chunks.push(new Uint8Array(part.value.buffer, part.value.byteOffset, part.value.byteLength).slice())
    }
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch (error) {
    if (error instanceof MangoWebhookError) throw error
    throw new MangoWebhookError('INVALID_FORM')
  } finally {
    release(reader)
  }
}

function decodedFormPart(value) {
  if (/%(?![0-9a-f]{2})/i.test(value)) throw new MangoWebhookError('INVALID_FORM')
  try {
    return decodeURIComponent(value.replaceAll('+', ' '))
  } catch {
    throw new MangoWebhookError('INVALID_FORM')
  }
}

function parseForm(body) {
  const fields = Object.create(null)
  const parts = body.split('&')
  if (parts.length !== FORM_KEYS.length) throw new MangoWebhookError('INVALID_FORM')
  for (const part of parts) {
    const separator = part.indexOf('=')
    if (separator < 1) throw new MangoWebhookError('INVALID_FORM')
    const key = decodedFormPart(part.slice(0, separator))
    const value = decodedFormPart(part.slice(separator + 1))
    if (!FORM_KEYS.includes(key) || Object.hasOwn(fields, key)) throw new MangoWebhookError('INVALID_FORM')
    fields[key] = value
  }
  if (!FORM_KEYS.every((key) => Object.hasOwn(fields, key))) throw new MangoWebhookError('INVALID_FORM')
  return fields
}

function secureEqual(left, right, compare) {
  const leftBytes = Buffer.from(left)
  const rightBytes = Buffer.from(right)
  return leftBytes.length === rightBytes.length && compare(leftBytes, rightBytes)
}

function validateEventValue(value, depth, counter) {
  counter.nodes += 1
  if (counter.nodes > 2_048 || depth > 12) throw new MangoWebhookError('INVALID_EVENT')
  if (value === null || typeof value === 'boolean') return
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new MangoWebhookError('INVALID_EVENT')
    return
  }
  if (typeof value === 'string') {
    if ([...value].length > 8_192) throw new MangoWebhookError('INVALID_EVENT')
    return
  }
  if (Array.isArray(value)) {
    if (value.length > 512) throw new MangoWebhookError('INVALID_EVENT')
    for (const item of value) validateEventValue(item, depth + 1, counter)
    Object.freeze(value)
    return
  }
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) throw new MangoWebhookError('INVALID_EVENT')
  for (const key of Object.keys(value)) {
    if (RESERVED_KEYS.has(key) || [...key].length === 0 || [...key].length > 128) throw new MangoWebhookError('INVALID_EVENT')
    validateEventValue(value[key], depth + 1, counter)
  }
  Object.freeze(value)
}

function parseEvent(json) {
  let event
  try {
    event = JSON.parse(json)
  } catch {
    throw new MangoWebhookError('INVALID_EVENT')
  }
  if (event === null || typeof event !== 'object' || Array.isArray(event)) throw new MangoWebhookError('INVALID_EVENT')
  validateEventValue(event, 0, { nodes: 0 })
  return event
}

/**
 * Authenticates a bounded raw MANGO form before exposing a parsed event.
 */
export async function verifyMangoWebhook({ request, apiKey, salt, inboundLines, compare = timingSafeEqual }) {
  const config = configuration(apiKey, salt, inboundLines, compare)
  if (!(request instanceof Request)) throw new MangoWebhookError('INVALID_FORM')
  const mediaType = request.headers.get('content-type')
  if (typeof mediaType !== 'string' || !MEDIA_TYPE.test(mediaType)) throw new MangoWebhookError('UNSUPPORTED_MEDIA_TYPE')
  const fields = parseForm(await readBody(request))
  if (!secureEqual(fields.vpbx_api_key, config.apiKey, config.compare) || !SIGNATURE.test(fields.sign)) throw new MangoWebhookError('UNAUTHORIZED')
  const expected = createHash('sha256').update(`${config.apiKey}${fields.json}${config.salt}`, 'utf8').digest()
  const provided = Buffer.from(fields.sign, 'hex')
  if (!secureEqual(provided, expected, config.compare)) throw new MangoWebhookError('UNAUTHORIZED')
  return Object.freeze({ event: parseEvent(fields.json), inboundLines: config.inboundLines })
}
