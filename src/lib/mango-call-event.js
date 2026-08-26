import { normalizeContactPhone } from './contact-identity.js'

const LIVE_STATES = Object.freeze({ Appeared: 'ringing', Connected: 'connected', OnHold: 'on_hold', Disconnected: 'finalizing' })
const LOCATIONS = new Set(['ivr', 'queue', 'abonent'])
const INTEGER_TEXT = /^(?:0|[1-9]\d*)$/
const MAX_TIMESTAMP = 253_402_300_799
const MAX_CALL_SECONDS = 86_400
const ERROR_MESSAGES = Object.freeze({ INVALID_LIVE_EVENT: 'MANGO live call event is invalid', INVALID_SUMMARY_EVENT: 'MANGO call summary event is invalid' })

/**
 * Represents a safe failure in the normalized MANGO call domain.
 */
export class MangoCallEventError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(ERROR_MESSAGES, code) ? code : 'INVALID_LIVE_EVENT'
    super(ERROR_MESSAGES[safeCode])
    this.name = 'MangoCallEventError'
    this.code = safeCode
    Object.freeze(this)
  }
}

function plain(value, code) {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new MangoCallEventError(code)
  return value
}

function prohibitedTextCharacter(value) {
  const code = value.codePointAt(0)
  return code <= 31 || code === 127
}

function identifier(value, code) {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0 || Buffer.byteLength(value, 'utf8') > 128 || [...value].some(prohibitedTextCharacter)) throw new MangoCallEventError(code)
  return value
}

function integer(value, code, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const number = typeof value === 'string' && INTEGER_TEXT.test(value) ? Number(value) : value
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) throw new MangoCallEventError(code)
  return number
}

function timestamp(value, code, allowZero = false) {
  const seconds = integer(value, code, allowZero ? 0 : 1, MAX_TIMESTAMP)
  if (allowZero && seconds === 0) return null
  return Object.freeze({ seconds, iso: new Date(seconds * 1_000).toISOString() })
}

function extension(value, code) {
  if (value === undefined || value === null || value === '') return null
  const text = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value
  if (typeof text !== 'string' || !/^[0-9]{1,32}$/.test(text)) throw new MangoCallEventError(code)
  return text
}

function reason(value, code) {
  if (value === undefined || value === null || value === '') return null
  const text = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value
  if (typeof text !== 'string' || text.trim() !== text || text.length === 0 || Buffer.byteLength(text, 'utf8') > 128 || [...text].some(prohibitedTextCharacter)) throw new MangoCallEventError(code)
  return text
}

function phone(value, code) {
  try {
    return normalizeContactPhone(value)
  } catch {
    throw new MangoCallEventError(code)
  }
}

function lines(value, code) {
  if (!Array.isArray(value) || value.length === 0 || value.some((line) => typeof line !== 'string' || !/^[1-9][0-9]{7,14}$/.test(line))) throw new MangoCallEventError(code)
  return new Set(value)
}

function party(value, code) {
  return plain(value, code)
}

function direction(value, code) {
  return integer(value, code, 0, 2)
}

/**
 * Normalizes a supported inbound MANGO live-leg event into a persistence command.
 */
export function normalizeMangoLiveEvent({ event, inboundLines }) {
  const code = 'INVALID_LIVE_EVENT'
  const input = plain(event, code)
  const entryId = identifier(input.entry_id, code)
  const callId = identifier(input.call_id, code)
  const seq = integer(input.seq, code, 1)
  const eventTime = timestamp(input.timestamp, code)
  if (!Object.hasOwn(LIVE_STATES, input.call_state) || !LOCATIONS.has(input.location)) throw new MangoCallEventError(code)
  const to = party(input.to, code)
  const rawLine = to.line_number ?? input.line_number
  if (rawLine === undefined || rawLine === null || rawLine === '') return Object.freeze({ kind: 'ignore', reason: 'LINE_UNKNOWN', entryId })
  const lineNumber = phone(rawLine, code)
  if (!lines(inboundLines, code).has(lineNumber)) return Object.freeze({ kind: 'ignore', reason: 'LINE_NOT_ALLOWED', entryId })
  const callerPhone = phone(party(input.from, code).number, code)
  const state = input.call_state === 'Appeared' && input.location === 'queue' ? 'queued' : LIVE_STATES[input.call_state]
  return Object.freeze({ kind: 'apply_live', entryId, callId, seq, state, location: input.location, eventAt: eventTime.iso, callerPhone, lineNumber, operatorExtension: extension(to.extension, code), disconnectReason: reason(input.disconnect_reason, code) })
}

/**
 * Normalizes a final MANGO summary and makes talk_time the answer source of truth.
 */
export function normalizeMangoSummaryEvent({ event, inboundLines }) {
  const code = 'INVALID_SUMMARY_EVENT'
  const input = plain(event, code)
  const entryId = identifier(input.entry_id, code)
  const callDirection = direction(input.call_direction, code)
  if (callDirection !== 1) return Object.freeze({ kind: 'remove_non_inbound', entryId })
  const lineNumber = phone(input.line_number, code)
  if (!lines(inboundLines, code).has(lineNumber)) return Object.freeze({ kind: 'ignore', reason: 'LINE_NOT_ALLOWED', entryId })
  const callerPhone = phone(party(input.from, code).number, code)
  const operatorExtension = extension(party(input.to, code).extension, code)
  const started = timestamp(input.create_time, code)
  const forwarded = timestamp(input.forward_time, code, true)
  const answered = timestamp(input.talk_time, code, true)
  const ended = timestamp(input.end_time, code)
  integer(input.entry_result, code, 0, 1)
  if (ended.seconds < started.seconds || ended.seconds - started.seconds > MAX_CALL_SECONDS) throw new MangoCallEventError(code)
  if (forwarded && (forwarded.seconds < started.seconds || forwarded.seconds > ended.seconds)) throw new MangoCallEventError(code)
  if (answered && (answered.seconds < started.seconds || answered.seconds > ended.seconds || (forwarded && forwarded.seconds > answered.seconds))) throw new MangoCallEventError(code)
  const status = answered ? 'answered' : 'missed'
  const waitSeconds = (answered ?? ended).seconds - started.seconds
  const talkSeconds = answered ? ended.seconds - answered.seconds : 0
  return Object.freeze({ kind: 'finalize', entryId, status, callerPhone, lineNumber, operatorExtension, startedAt: started.iso, forwardedAt: forwarded?.iso ?? null, answeredAt: answered?.iso ?? null, endedAt: ended.iso, waitSeconds, talkSeconds, disconnectReason: reason(input.disconnect_reason, code), finalizedAt: ended.iso })
}
