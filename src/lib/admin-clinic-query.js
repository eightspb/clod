import { normalizeContactPhone } from './contact-identity.js'

/** Highest page an administrator can request; 10 000 pages × 50 rows already exceeds any list in the clinic. */
export const MAX_PAGE_NUMBER = 10_000
const PATIENT_QUERY_KEYS = Object.freeze(['page', 'pageSize', 'phone', 'patient', 'piiStatus', 'history', 'issues', 'from', 'to'])
const DESTROY_KEYS = Object.freeze(['confirmation', 'patientId'])
const REVEAL_FULL_KEYS = Object.freeze(['scope', 'reason'])
const REVEAL_REASON_PATTERN = /^[\p{L}\p{N}\p{P}\p{Zs}]{5,200}$/u
const APPOINTMENT_QUERY_KEYS = Object.freeze(['page', 'pageSize', 'status', 'source', 'doctorId', 'from', 'to'])
const APPOINTMENT_CREATE_KEYS = Object.freeze(['source', 'profile', 'appointment', 'booking'])
const APPOINTMENT_CANCEL_KEYS = Object.freeze(['confirmation'])
const APPOINTMENT_RESOLVE_KEYS = Object.freeze(['claimId'])
const CALL_QUERY_KEYS = Object.freeze(['page', 'pageSize', 'status', 'lineNumber', 'operatorExtension', 'from', 'to', 'repeat', 'patientLink'])
const PATIENT_CALL_QUERY_KEYS = Object.freeze(['callsPage', 'callsPageSize'])
const PATIENT_DETAIL_QUERY_KEYS = Object.freeze(['callsPage', 'callsPageSize', 'visitsPage', 'visitsPageSize', 'visitsStatus', 'issuesPage', 'issuesPageSize'])
const PATIENT_HISTORY_ISSUE_QUERY_KEYS = Object.freeze(['page', 'pageSize', 'status'])
const CALL_STATUSES = Object.freeze(['ringing', 'queued', 'connected', 'on_hold', 'finalizing', 'answered', 'missed'])
const APPOINTMENT_STATUSES = Object.freeze(['pending', 'confirmed', 'cancelled', 'failed', 'needs_review'])
const APPOINTMENT_SOURCES = Object.freeze(['website', 'admin_medflex', 'admin_existing'])
const PATIENT_PII_STATUSES = Object.freeze(['active', 'destroyed'])
const PATIENT_HISTORY_FILTERS = Object.freeze(['with_visits', 'without_visits'])
const PATIENT_ISSUE_FILTERS = Object.freeze(['with_issues', 'without_issues'])
const CALL_REPEAT_FILTERS = Object.freeze(['first', 'repeat'])
const CALL_PATIENT_LINK_FILTERS = Object.freeze(['linked', 'unlinked', 'destroyed'])
const VISIT_STATUSES = Object.freeze(['linked', 'ambiguous', 'unmatched'])
const UNRESOLVED_VISIT_STATUSES = Object.freeze(['ambiguous', 'unmatched'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const TRUSTED_ERRORS = new WeakSet()

/**
 * Represents a safe validation failure at the administrative clinic boundary.
 */
export class AdminClinicQueryError extends Error {
  constructor(code) {
    const safeCode = code === 'INVALID_BODY' ? code : 'INVALID_QUERY'
    super(safeCode === 'INVALID_BODY' ? 'Administrative request body is invalid' : 'Administrative query is invalid')
    this.name = 'AdminClinicQueryError'
    this.code = safeCode
    TRUSTED_ERRORS.add(this)
    Object.freeze(this)
  }
}

/** Identifies only value-safe administrative query failures created here. */
export function isAdminClinicQueryError(value) {
  return value !== null && typeof value === 'object' && TRUSTED_ERRORS.has(value)
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

function pageNumber(value, fallback) {
  const number = positiveInteger(value, fallback)
  if (number > MAX_PAGE_NUMBER) throw new AdminClinicQueryError('INVALID_QUERY')
  return number
}

function plainBody(value, allowed) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new AdminClinicQueryError('INVALID_BODY')
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) throw new AdminClinicQueryError('INVALID_BODY')
  const body = Object.create(null)
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) throw new AdminClinicQueryError('INVALID_BODY')
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
  const page = pageNumber(singleValue(parameters, 'page'), 1)
  const pageSize = Math.min(positiveInteger(singleValue(parameters, 'pageSize'), 50), 50)
  const phoneValue = singleValue(parameters, 'phone')
  const patientValue = singleValue(parameters, 'patient')
  const piiStatus = optionalFilter(parameters, 'piiStatus', PATIENT_PII_STATUSES)
  const history = optionalFilter(parameters, 'history', PATIENT_HISTORY_FILTERS)
  const issues = optionalFilter(parameters, 'issues', PATIENT_ISSUE_FILTERS)
  const from = optionalTimestamp(parameters, 'from')
  const to = optionalTimestamp(parameters, 'to')
  if (phoneValue !== undefined && patientValue !== undefined) throw new AdminClinicQueryError('INVALID_QUERY')
  if ((from === undefined) !== (to === undefined) || (from !== undefined && to <= from)) throw new AdminClinicQueryError('INVALID_QUERY')
  const value = { page, pageSize }
  if (patientValue !== undefined) value.patientId = parsePatientId(patientValue)
  if (phoneValue !== undefined) {
    try { value.phone = normalizeContactPhone(phoneValue) } catch { throw new AdminClinicQueryError('INVALID_QUERY') }
  }
  if (piiStatus !== undefined) value.piiStatus = piiStatus
  if (history !== undefined) value.history = history
  if (issues !== undefined) value.issues = issues
  if (from !== undefined) { value.from = from; value.to = to }
  return Object.freeze(value)
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
/**
 * Destruction must name the patient explicitly: the typed word alone could be replayed against
 * any route, the patient ID binds the confirmation to one card.
 */
export function parseDestroyPatientBody(value) {
  const body = plainBody(value, DESTROY_KEYS)
  if (Reflect.ownKeys(body).length !== 2 || body.confirmation !== 'УНИЧТОЖИТЬ' || typeof body.patientId !== 'string' || !UUID_PATTERN.test(body.patientId)) throw new AdminClinicQueryError('INVALID_BODY')
  return Object.freeze({ confirmation: body.confirmation, patientId: body.patientId.toLowerCase() })
}

/**
 * A full dossier reveal needs an explicit scope and a human-readable reason for the audit trail.
 */
export function parseRevealFullBody(value) {
  const body = plainBody(value, REVEAL_FULL_KEYS)
  if (Reflect.ownKeys(body).length !== 2 || body.scope !== 'full' || typeof body.reason !== 'string') throw new AdminClinicQueryError('INVALID_BODY')
  const reason = body.reason.trim().normalize('NFC')
  if (!REVEAL_REASON_PATTERN.test(reason)) throw new AdminClinicQueryError('INVALID_BODY')
  return Object.freeze({ scope: 'full', reason })
}

function optionalFilter(parameters, key, allowed) {
  const value = singleValue(parameters, key)
  if (value === undefined) return undefined
  if (!allowed.includes(value)) throw new AdminClinicQueryError('INVALID_QUERY')
  return value
}

function optionalTimestamp(parameters, key) {
  const value = singleValue(parameters, key)
  if (value === undefined) return undefined
  const milliseconds = Date.parse(value)
  if (!TIMESTAMP_PATTERN.test(value) || !Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) throw new AdminClinicQueryError('INVALID_QUERY')
  return value
}

/**
 * Parses the bounded filters supported by the appointment journal.
 */
export function parseAppointmentQuery(parameters) {
  if (!(parameters instanceof URLSearchParams)) throw new AdminClinicQueryError('INVALID_QUERY')
  for (const key of parameters.keys()) if (!APPOINTMENT_QUERY_KEYS.includes(key)) throw new AdminClinicQueryError('INVALID_QUERY')
  const value = { page: pageNumber(singleValue(parameters, 'page'), 1), pageSize: Math.min(positiveInteger(singleValue(parameters, 'pageSize'), 50), 50) }
  const status = optionalFilter(parameters, 'status', APPOINTMENT_STATUSES)
  const source = optionalFilter(parameters, 'source', APPOINTMENT_SOURCES)
  const doctorValue = singleValue(parameters, 'doctorId')
  const from = optionalTimestamp(parameters, 'from')
  const to = optionalTimestamp(parameters, 'to')
  if (status !== undefined) value.status = status
  if (source !== undefined) value.source = source
  if (doctorValue !== undefined) value.doctorId = positiveInteger(doctorValue, undefined)
  if (from !== undefined) value.from = from
  if (to !== undefined) value.to = to
  if (from !== undefined && to !== undefined && to <= from) throw new AdminClinicQueryError('INVALID_QUERY')
  return Object.freeze(value)
}

/**
 * Parses an appointment UUID from an administrative route.
 */
export function parseAppointmentId(value) {
  return parsePatientId(value)
}

/**
 * Separates local-existing and Medflex-backed appointment creation bodies.
 */
export function parseAppointmentCreateBody(value) {
  const body = plainBody(value, APPOINTMENT_CREATE_KEYS)
  if (body.source === 'admin_existing' && Reflect.ownKeys(body).length === 3 && Object.hasOwn(body, 'profile') && Object.hasOwn(body, 'appointment')) return Object.freeze({ source: body.source, profile: body.profile, appointment: body.appointment })
  if (body.source === 'admin_medflex' && Reflect.ownKeys(body).length === 2 && Object.hasOwn(body, 'booking')) return Object.freeze({ source: body.source, booking: body.booking })
  throw new AdminClinicQueryError('INVALID_BODY')
}

/**
 * Requires explicit confirmation before appointment cancellation.
 */
export function parseAppointmentCancelBody(value) {
  const body = plainBody(value, APPOINTMENT_CANCEL_KEYS)
  if (Reflect.ownKeys(body).length !== 1 || body.confirmation !== 'ОТМЕНИТЬ') throw new AdminClinicQueryError('INVALID_BODY')
  return Object.freeze({ confirmation: body.confirmation })
}

/**
 * Parses the claim used for a manual needs-review resolution.
 */
export function parseAppointmentResolveBody(value) {
  const body = plainBody(value, APPOINTMENT_RESOLVE_KEYS)
  if (Reflect.ownKeys(body).length !== 1) throw new AdminClinicQueryError('INVALID_BODY')
  try {
    return Object.freeze({ claimId: parseAppointmentId(body.claimId) })
  } catch {
    throw new AdminClinicQueryError('INVALID_BODY')
  }
}

/**
 * Parses exact call-journal filters without accepting wildcard search values.
 */
export function parseCallQuery(parameters) {
  if (!(parameters instanceof URLSearchParams)) throw new AdminClinicQueryError('INVALID_QUERY')
  for (const key of parameters.keys()) if (!CALL_QUERY_KEYS.includes(key)) throw new AdminClinicQueryError('INVALID_QUERY')
  const value = { page: pageNumber(singleValue(parameters, 'page'), 1), pageSize: Math.min(positiveInteger(singleValue(parameters, 'pageSize'), 50), 50) }
  const status = optionalFilter(parameters, 'status', CALL_STATUSES)
  const line = singleValue(parameters, 'lineNumber')
  const operator = singleValue(parameters, 'operatorExtension')
  const from = optionalTimestamp(parameters, 'from')
  const to = optionalTimestamp(parameters, 'to')
  const repeat = optionalFilter(parameters, 'repeat', CALL_REPEAT_FILTERS)
  const patientLink = optionalFilter(parameters, 'patientLink', CALL_PATIENT_LINK_FILTERS)
  if ((from === undefined) !== (to === undefined) || (from !== undefined && to <= from)) throw new AdminClinicQueryError('INVALID_QUERY')
  if (status !== undefined) value.status = status
  if (line !== undefined) {
    try {
      value.lineNumber = normalizeContactPhone(line)
    } catch {
      throw new AdminClinicQueryError('INVALID_QUERY')
    }
  }
  if (operator !== undefined) {
    if (!/^[0-9]{1,32}$/.test(operator)) throw new AdminClinicQueryError('INVALID_QUERY')
    value.operatorExtension = operator
  }
  if (from !== undefined) {
    value.from = from
    value.to = to
  }
  if (repeat !== undefined) value.repeat = repeat
  if (patientLink !== undefined) value.patientLink = patientLink
  return Object.freeze(value)
}

/**
 * Parses a bounded provider call aggregate identifier from an admin route.
 */
export function parseCallEntryId(value) {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0 || Buffer.byteLength(value, 'utf8') > 128 || [...value].some((character) => character.codePointAt(0) <= 31 || character.codePointAt(0) === 127)) throw new AdminClinicQueryError('INVALID_QUERY')
  return value
}

/**
 * Parses the call-history page embedded in patient detail.
 */
export function parsePatientCallQuery(parameters) {
  if (!(parameters instanceof URLSearchParams)) throw new AdminClinicQueryError('INVALID_QUERY')
  for (const key of parameters.keys()) if (!PATIENT_CALL_QUERY_KEYS.includes(key)) throw new AdminClinicQueryError('INVALID_QUERY')
  return Object.freeze({ page: pageNumber(singleValue(parameters, 'callsPage'), 1), pageSize: Math.min(positiveInteger(singleValue(parameters, 'callsPageSize'), 10), 50) })
}

/** Parses independently bounded call, visit, and issue pages for patient detail. */
export function parsePatientDetailQuery(parameters) {
  if (!(parameters instanceof URLSearchParams)) throw new AdminClinicQueryError('INVALID_QUERY')
  for (const key of parameters.keys()) if (!PATIENT_DETAIL_QUERY_KEYS.includes(key)) throw new AdminClinicQueryError('INVALID_QUERY')
  const calls = Object.freeze({ page: pageNumber(singleValue(parameters, 'callsPage'), 1), pageSize: Math.min(positiveInteger(singleValue(parameters, 'callsPageSize'), 10), 50) })
  const visits = { page: pageNumber(singleValue(parameters, 'visitsPage'), 1), pageSize: Math.min(positiveInteger(singleValue(parameters, 'visitsPageSize'), 10), 50) }
  const visitStatus = optionalFilter(parameters, 'visitsStatus', VISIT_STATUSES)
  if (visitStatus !== undefined) visits.status = visitStatus
  const issues = Object.freeze({ page: pageNumber(singleValue(parameters, 'issuesPage'), 1), pageSize: Math.min(positiveInteger(singleValue(parameters, 'issuesPageSize'), 10), 50) })
  return Object.freeze({ calls, visits: Object.freeze(visits), issues })
}

/** Parses the read-only unresolved historical-visit queue. */
export function parsePatientHistoryIssueQuery(parameters) {
  if (!(parameters instanceof URLSearchParams)) throw new AdminClinicQueryError('INVALID_QUERY')
  for (const key of parameters.keys()) if (!PATIENT_HISTORY_ISSUE_QUERY_KEYS.includes(key)) throw new AdminClinicQueryError('INVALID_QUERY')
  const status = optionalFilter(parameters, 'status', UNRESOLVED_VISIT_STATUSES) ?? 'ambiguous'
  return Object.freeze({ page: pageNumber(singleValue(parameters, 'page'), 1), pageSize: Math.min(positiveInteger(singleValue(parameters, 'pageSize'), 50), 50), status })
}

/**
 * Requires explicit confirmation before irreversible caller PII destruction.
 */
export function parseDestroyCallBody(value) {
  const body = plainBody(value, DESTROY_KEYS)
  if (Reflect.ownKeys(body).length !== 1 || body.confirmation !== 'УНИЧТОЖИТЬ') throw new AdminClinicQueryError('INVALID_BODY')
  return Object.freeze({ confirmation: body.confirmation })
}
