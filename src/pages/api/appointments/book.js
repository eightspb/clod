export const prerender = false

import { db } from 'astro:db'
import { createAppointmentBooking } from '../../../lib/appointment-booking.js'
import { validateOrigin } from '../../../lib/auth.js'
import { getClientIp } from '../../../lib/client-ip.js'
import { checkRateLimit } from '../../../lib/rate-limit.js'

const JSON_HEADERS = Object.freeze({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' })
const JSON_MEDIA_TYPE = /^application\/(?:[a-z0-9!#$&^_.+-]+\+)?json(?:\s*;|$)/i
const BODY_LIMIT_BYTES = 16 * 1024
const RATE_LIMIT_OPTIONS = Object.freeze({ namespace: 'appointments-book', maxRequests: 5, windowMs: 15 * 60_000 })

function json(payload, status, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { ...JSON_HEADERS, ...headers } })
}

function error(status, code, message, headers) {
  return json({ error: code, message }, status, headers)
}

function unavailable() {
  return error(503, 'BOOKING_UNAVAILABLE', 'Запись временно недоступна. Попробуйте позже')
}

function safeLog(stage) {
  console.error('[appointments/book]', stage)
}

function declaredLength(request) {
  const value = request.headers.get('content-length')
  if (value === null) return Object.freeze({ valid: true, tooLarge: false })
  if (!/^(?:0|[1-9]\d*)$/.test(value)) return Object.freeze({ valid: false, tooLarge: false })
  const bytes = Number(value)
  if (!Number.isSafeInteger(bytes)) return Object.freeze({ valid: false, tooLarge: true })
  return Object.freeze({ valid: true, tooLarge: bytes > BODY_LIMIT_BYTES })
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

async function boundedJson(request) {
  if (!request.body || typeof request.body.getReader !== 'function') return Object.freeze({ valid: false, tooLarge: false })
  let reader
  try {
    reader = request.body.getReader()
  } catch {
    return Object.freeze({ valid: false, tooLarge: false })
  }
  const chunks = []
  let length = 0
  try {
    while (true) {
      const part = await reader.read()
      if (!part || typeof part !== 'object' || typeof part.done !== 'boolean') return Object.freeze({ valid: false, tooLarge: false })
      if (part.done) break
      if (!ArrayBuffer.isView(part.value)) return Object.freeze({ valid: false, tooLarge: false })
      length += part.value.byteLength
      if (length > BODY_LIMIT_BYTES) {
        await cancel(reader)
        return Object.freeze({ valid: false, tooLarge: true })
      }
      chunks.push(new Uint8Array(part.value.buffer, part.value.byteOffset, part.value.byteLength).slice())
    }
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return Object.freeze({ valid: true, tooLarge: false, value: JSON.parse(text) })
  } catch {
    return Object.freeze({ valid: false, tooLarge: false })
  } finally {
    release(reader)
  }
}

function productionWorkflow() {
  return createAppointmentBooking({ intentClient: db.$client })
}

/**
 * Creates the HTTP adapter for the appointment booking workflow.
 */
export function createBookEndpoint(workflow = productionWorkflow) {
  if (typeof workflow !== 'function') throw new TypeError('Appointment booking workflow must be a function')
  return async function bookEndpoint({ request }) {
    if (!validateOrigin(request)) return error(403, 'FORBIDDEN_ORIGIN', 'Недопустимый источник запроса')
    const mediaType = request.headers.get('content-type')
    if (typeof mediaType !== 'string' || !JSON_MEDIA_TYPE.test(mediaType)) return error(415, 'UNSUPPORTED_MEDIA_TYPE', 'Передайте данные записи в формате JSON')
    const length = declaredLength(request)
    if (length.tooLarge) return error(413, 'BODY_TOO_LARGE', 'Данные записи превышают допустимый размер')
    if (!length.valid) return error(400, 'INVALID_CONTENT_LENGTH', 'Некорректный размер данных записи')
    const rate = checkRateLimit(getClientIp(request), RATE_LIMIT_OPTIONS)
    if (!rate.allowed) return error(429, 'RATE_LIMITED', 'Слишком много попыток записи. Попробуйте позже', { 'Retry-After': String(rate.retryAfterSec) })
    const body = await boundedJson(request)
    if (body.tooLarge) return error(413, 'BODY_TOO_LARGE', 'Данные записи превышают допустимый размер')
    if (!body.valid) return error(400, 'INVALID_JSON', 'Передайте корректный JSON')
    try {
      const appointment = workflow()
      if (!appointment || typeof appointment.submit !== 'function') throw new TypeError('Appointment booking workflow is invalid')
      const response = await appointment.submit(body.value)
      return json(response.body, response.status)
    } catch {
      safeLog('WORKFLOW_UNEXPECTED_FAILURE')
      return unavailable()
    }
  }
}

export const POST = createBookEndpoint()
