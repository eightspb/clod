import { isAdminClinicQueryError, parsePatientHistoryIssueQuery } from './admin-clinic-query.js'
import { guardAdminRead } from './admin-api.js'
import { PATIENT_HISTORY_CANDIDATE_EVIDENCE_CODES as CANDIDATE_EVIDENCE_CODES, PATIENT_HISTORY_EVIDENCE_LEVELS as EVIDENCE_LEVELS, PATIENT_HISTORY_LINK_METHODS as LINK_METHODS, PATIENT_HISTORY_SOURCE_STATUSES as SOURCE_STATUSES, PATIENT_HISTORY_VISIT_SOURCES as VISIT_SOURCE_NAMES } from './patient-history-contract.js'

const JSON_HEADERS = Object.freeze({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' })
const ITEM_FIELDS = Object.freeze(['id', 'sourceName', 'sourceRow', 'startsAt', 'sourceStatus', 'linkStatus', 'linkMethod', 'evidenceLevel', 'candidates'])
const CANDIDATE_FIELDS = Object.freeze(['patientId', 'evidenceCode', 'score'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const MAX_PAGE_NUMBER = 1_000_000
const MAX_PAGE_SIZE = 50
const MAX_PAGE_TOTAL = MAX_PAGE_NUMBER * MAX_PAGE_SIZE
const MAX_COUNT = 50_000_000
const MAX_CANDIDATES_PER_VISIT = 2_048
const LINK_EVIDENCE = Object.freeze({ exact_ehr: Object.freeze({ level: 'exact', code: 'EXACT_EHR', score: 100, ambiguous: false }), exact_clinic_card: Object.freeze({ level: 'strong', code: 'EXACT_CLINIC_CARD', score: 90, ambiguous: true }), leading_zero_clinic_card: Object.freeze({ level: 'strong', code: 'LEADING_ZERO_CLINIC_CARD', score: 80, ambiguous: false }), phone_compatible_name: Object.freeze({ level: 'strong', code: 'PHONE_COMPATIBLE_NAME', score: 70, ambiguous: true }), exact_full_name: Object.freeze({ level: 'moderate', code: 'EXACT_FULL_NAME', score: 60, ambiguous: true }), conflicting_comment_evidence: Object.freeze({ level: 'moderate', code: 'CONFLICTING_COMMENT_EVIDENCE', score: 50, ambiguous: true }) })

function json(payload, status) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}

function noStore(response) {
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'no-store')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

function failure(status, error, message) {
  return json({ error, message }, status)
}

function properties(value, required) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Patient history response is invalid')
  const result = Object.create(null)
  for (const key of required) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError('Patient history response is invalid')
    result[key] = descriptor.value
  }
  return result
}

function exact(value, allowed) {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new TypeError('Patient history response is invalid')
  return value
}

function safeUuid(value) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new TypeError('Patient history response is invalid')
  return value
}

function nullableExact(value, allowed) {
  return value === null ? null : exact(value, allowed)
}

function denseArray(value, maximum) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) throw new TypeError('Patient history response is invalid')
  const length = Object.getOwnPropertyDescriptor(value, 'length')?.value
  if (!Number.isSafeInteger(length) || length < 0 || length > maximum || Reflect.ownKeys(value).length !== length + 1) throw new TypeError('Patient history response is invalid')
  const result = []
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) throw new TypeError('Patient history response is invalid')
    result.push(descriptor.value)
  }
  return result
}

function candidate(value) {
  const input = properties(value, CANDIDATE_FIELDS)
  if (!Number.isSafeInteger(input.score) || input.score < 0 || input.score > 100) throw new TypeError('Patient history response is invalid')
  return Object.freeze({ patientId: safeUuid(input.patientId), evidenceCode: exact(input.evidenceCode, CANDIDATE_EVIDENCE_CODES), score: input.score })
}

function item(value, expectedStatus) {
  const input = properties(value, ITEM_FIELDS)
  if (!Number.isSafeInteger(input.sourceRow) || input.sourceRow < 1 || input.sourceRow > MAX_COUNT || input.linkStatus !== expectedStatus) throw new TypeError('Patient history response is invalid')
  if (input.startsAt !== null && (typeof input.startsAt !== 'string' || !TIMESTAMP_PATTERN.test(input.startsAt) || new Date(input.startsAt).toISOString() !== input.startsAt)) throw new TypeError('Patient history response is invalid')
  const linkMethod = nullableExact(input.linkMethod, LINK_METHODS)
  const evidenceLevel = nullableExact(input.evidenceLevel, EVIDENCE_LEVELS)
  const candidates = Object.freeze(denseArray(input.candidates, MAX_CANDIDATES_PER_VISIT).map(candidate))
  if (input.linkStatus === 'unmatched' && (linkMethod !== null || evidenceLevel !== 'none' || candidates.length !== 0)) throw new TypeError('Patient history response is invalid')
  const evidence = linkMethod === null ? undefined : LINK_EVIDENCE[linkMethod]
  if (input.linkStatus === 'ambiguous' && (!evidence?.ambiguous || evidenceLevel !== evidence.level || candidates.length < 2 || new Set(candidates.map(({ patientId }) => patientId)).size !== candidates.length || candidates.some(({ evidenceCode, score }) => evidenceCode !== evidence.code || score !== evidence.score))) throw new TypeError('Patient history response is invalid')
  return Object.freeze({ id: safeUuid(input.id), sourceName: exact(input.sourceName, VISIT_SOURCE_NAMES), sourceRow: input.sourceRow, startsAt: input.startsAt, sourceStatus: exact(input.sourceStatus, SOURCE_STATUSES), linkStatus: input.linkStatus, linkMethod, evidenceLevel, candidates })
}

function page(value, expectedStatus) {
  const input = properties(value, ['items', 'page', 'pageSize', 'total', 'pages'])
  const items = denseArray(input.items, MAX_PAGE_SIZE)
  const integers = [input.page, input.pageSize, input.total, input.pages]
  if (!integers.every(Number.isSafeInteger)) throw new TypeError('Patient history page is invalid')
  const expectedPages = input.total === 0 ? 0 : Math.ceil(input.total / input.pageSize)
  const remaining = input.page > input.pages ? 0 : input.total - ((input.page - 1) * input.pageSize)
  if (input.page < 1 || input.page > MAX_PAGE_NUMBER || input.pageSize < 1 || input.pageSize > MAX_PAGE_SIZE || input.total < 0 || input.total > MAX_PAGE_TOTAL || input.pages < 0 || input.pages > MAX_PAGE_NUMBER || input.pages !== expectedPages || items.length > Math.min(input.pageSize, Math.max(0, remaining))) throw new TypeError('Patient history page is invalid')
  return Object.freeze({ data: Object.freeze(items.map((value) => item(value, expectedStatus))), page: Object.freeze({ number: input.page, size: input.pageSize, total: input.total, pages: input.pages }) })
}

function configuration(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Patient history endpoint options are invalid')
  const history = Object.getOwnPropertyDescriptor(value, 'history')?.value
  const guard = Object.getOwnPropertyDescriptor(value, 'guard')?.value ?? guardAdminRead
  const log = Object.getOwnPropertyDescriptor(value, 'log')?.value ?? ((stage) => console.error('[admin/patient-history]', stage))
  if (![history, guard, log].every((adapter) => typeof adapter === 'function')) throw new TypeError('Patient history endpoint adapters are invalid')
  return Object.freeze({ history, guard, log })
}

function report(options, stage) {
  try {
    options.log(stage)
  } catch {
    return
  }
}

function unavailable(options) {
  report(options, 'ISSUES_FAILED')
  return failure(503, 'PATIENT_HISTORY_UNAVAILABLE', 'История пациентов временно недоступна')
}

async function guarded(options, request) {
  try {
    const blocked = await options.guard(request)
    return blocked ? noStore(blocked) : undefined
  } catch {
    return unavailable(options)
  }
}

/** Creates the authenticated read-only unresolved historical-visit endpoint. */
export function createPatientHistoryIssueEndpoint(value) {
  const options = configuration(value)
  return async function patientHistoryIssueEndpoint({ request }) {
    const blocked = await guarded(options, request)
    if (blocked) return blocked
    try {
      const query = parsePatientHistoryIssueQuery(new URL(request.url).searchParams)
      const repository = options.history()
      if (repository === null || typeof repository !== 'object' || typeof repository.linkIssues !== 'function') throw new TypeError('Patient history repository is invalid')
      return json(page(await repository.linkIssues(query), query.status), 200)
    } catch (error) {
      if (isAdminClinicQueryError(error)) return failure(400, error.code, 'Проверьте параметры запроса')
      return unavailable(options)
    }
  }
}
