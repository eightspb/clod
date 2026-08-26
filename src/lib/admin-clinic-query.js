import { normalizeContactPhone } from './contact-identity.js'

const PATIENT_QUERY_KEYS = Object.freeze(['page', 'pageSize', 'phone'])
const DESTROY_KEYS = Object.freeze(['confirmation'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Represents a safe validation failure at the administrative clinic boundary.
 */
export class AdminClinicQueryError extends Error {
  constructor(code) {
    const safeCode = code === 'INVALID_BODY' ? code : 'INVALID_QUERY'
    super(safeCode === 'INVALID_BODY' ? 'Administrative request body is invalid' : 'Administrative query is invalid')
    this.name = 'AdminClinicQueryError'
    this.code = safeCode
    Object.freeze(this)
  }
}

function singleValue(parameters, key) {
  const values = parameters.getAll(key)
  if (values.length > 1) throw new AdminClinicQueryError('INVALID_QUERY')
  return values.length === 0 ? undefined : values[0]
}

function positiveInteger(value, fallback) {
  if (value === undefined) return fallback
  if (!/^\d+$/.test(value)) throw new AdminClinicQueryError('INVALID_QUERY')
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 1 || number > 1_000_000) throw new AdminClinicQueryError('INVALID_QUERY')
  return number
}

function plainBody(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new AdminClinicQueryError('INVALID_BODY')
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) throw new AdminClinicQueryError('INVALID_BODY')
  const body = Object.create(null)
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !DESTROY_KEYS.includes(key)) throw new AdminClinicQueryError('INVALID_BODY')
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new AdminClinicQueryError('INVALID_BODY')
    body[key] = descriptor.value
  }
  return body
}

/**
 * Parses the exact, bounded filters supported by the patient journal.
 */
export function parsePatientQuery(parameters) {
  if (!(parameters instanceof URLSearchParams)) throw new AdminClinicQueryError('INVALID_QUERY')
  for (const key of parameters.keys()) if (!PATIENT_QUERY_KEYS.includes(key)) throw new AdminClinicQueryError('INVALID_QUERY')
  const page = positiveInteger(singleValue(parameters, 'page'), 1)
  const pageSize = Math.min(positiveInteger(singleValue(parameters, 'pageSize'), 50), 50)
  const phoneValue = singleValue(parameters, 'phone')
  if (phoneValue === undefined) return Object.freeze({ page, pageSize })
  try {
    return Object.freeze({ page, pageSize, phone: normalizeContactPhone(phoneValue) })
  } catch {
    throw new AdminClinicQueryError('INVALID_QUERY')
  }
}

/**
 * Parses a patient UUID without accepting alternate path identifier forms.
 */
export function parsePatientId(value) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new AdminClinicQueryError('INVALID_QUERY')
  return value.toLowerCase()
}

/**
 * Requires an explicit Russian confirmation before irreversible PII destruction.
 */
export function parseDestroyPatientBody(value) {
  const body = plainBody(value)
  if (Reflect.ownKeys(body).length !== 1 || body.confirmation !== 'УНИЧТОЖИТЬ') throw new AdminClinicQueryError('INVALID_BODY')
  return Object.freeze({ confirmation: body.confirmation })
}
