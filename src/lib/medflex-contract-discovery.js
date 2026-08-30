const MEDFLEX_ORIGIN = 'https://api.medflex.ru'
const LPU_ID = 34871
const TOWN_ID = 1260
const DETAIL_DOCTOR_ID = 70120
const RESPONSE_LIMIT_BYTES = 1_048_576
const REQUEST_TIMEOUT_MS = 20_000
const MAX_RETRY_AFTER_SECONDS = 30
const JSON_CONTENT_TYPE = /^application\/(?:[a-z0-9!#$&^_.+-]+\+)?json(?:\s*;|$)/i
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DETAIL_FIELDS = Object.freeze(['avatar', 'description', 'doctor_url', 'education_and_experience', 'rating', 'review_count', 'reviews', 'video_card'])
const INPUT_KEYS = Object.freeze(['date', 'fetchImpl', 'includePaidDoctorDetail', 'token'])

function freezeQuery(entries = []) {
  return Object.freeze(entries.map(([name, value]) => Object.freeze([name, String(value)])))
}

function contractOperation(method, path, query = [], collection = 'page') {
  return Object.freeze({ method, path, query: freezeQuery(query), collection, probe: method === 'POST' ? 'invalid_body' : 'read' })
}

function contractOperations(date) {
  return Object.freeze([
    contractOperation('POST', '/direct_appointment/doctor/cancel/', [], 'none'),
    contractOperation('POST', '/direct_appointment/doctor/execute/', [], 'none'),
    contractOperation('GET', '/direct_appointment/history/', [['date_start', date], ['date_end', date], ['lpu_id', LPU_ID], ['page', 1], ['size', 1]]),
    contractOperation('GET', '/models/district/', [['town_id', TOWN_ID], ['page', 1]]),
    contractOperation('GET', '/models/doctor/', [['detailed', false], ['doctor_ids', DETAIL_DOCTOR_ID], ['lpu_ids', LPU_ID], ['page', 1], ['size', 1]]),
    contractOperation('GET', '/models/doctor/all/', [['detailed', false], ['doctor_ids', DETAIL_DOCTOR_ID], ['lpu_ids', LPU_ID], ['page', 1], ['size', 1]]),
    contractOperation('GET', '/models/lpu/', [['lpu_ids', LPU_ID]]),
    contractOperation('GET', '/models/lpu_group/'),
    contractOperation('GET', '/models/metro/', [['town_id', TOWN_ID], ['page', 1]]),
    contractOperation('GET', '/models/metro_line/', [['town_id', TOWN_ID], ['page', 1]]),
    contractOperation('GET', '/models/region/', [['page', 1]]),
    contractOperation('GET', '/models/speciality/', [['page', 1], ['size', 1]]),
    contractOperation('GET', '/models/town/', [['page', 1]]),
    contractOperation('GET', '/schedule/', [['town_id', TOWN_ID], ['date_start', date], ['days', 1], ['lpu_ids', LPU_ID], ['page', 1]]),
    contractOperation('GET', '/schedule/lpu/', [['lpu_ids', LPU_ID], ['page', 1]]),
    contractOperation('GET', '/services/categories/', [['lpu_id', LPU_ID]], 'categories'),
    contractOperation('GET', '/services/prices/', [['lpu_id', LPU_ID]], 'services'),
    contractOperation('GET', '/webhooks/', [], 'webhooks'),
    contractOperation('POST', '/webhooks/', [], 'none'),
  ])
}

function detailOperation() {
  return contractOperation('GET', '/models/doctor/', [['detailed', true], ['doctor_ids', DETAIL_DOCTOR_ID], ['lpu_ids', LPU_ID], ['page', 1], ['size', 1]])
}

function readInput(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input) || Object.getPrototypeOf(input) !== Object.prototype) throw new TypeError('Medflex discovery input must be a plain object')
  if (!Reflect.ownKeys(input).every((key) => typeof key === 'string' && INPUT_KEYS.includes(key))) throw new TypeError('Medflex discovery input contains unknown fields')
  if (!INPUT_KEYS.every((key) => Object.hasOwn(input, key))) throw new TypeError('Medflex discovery input is missing required fields')
  if (typeof input.fetchImpl !== 'function') throw new TypeError('Medflex discovery fetch implementation must be a function')
  if (typeof input.token !== 'string' || !input.token.trim()) throw new TypeError('Medflex discovery token is required')
  if (typeof input.includePaidDoctorDetail !== 'boolean') throw new TypeError('Medflex discovery paid detail choice must be boolean')
  return Object.freeze({ fetchImpl: input.fetchImpl, token: input.token.trim(), date: normalizeDate(input.date), includePaidDoctorDetail: input.includePaidDoctorDetail })
}

function normalizeDate(value) {
  if (typeof value !== 'string') throw new TypeError('Medflex discovery date must be a real date')
  const match = DATE_PATTERN.exec(value)
  if (!match) throw new TypeError('Medflex discovery date must be a real date')
  const date = new Date(0)
  date.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (date.toISOString().slice(0, 10) !== value) throw new TypeError('Medflex discovery date must be a real date')
  return value
}

function urlFor(operation) {
  const url = new URL(operation.path, MEDFLEX_ORIGIN)
  for (const [name, value] of operation.query) url.searchParams.set(name, value)
  return url.toString()
}

function requestOptions(operation, token, signal) {
  const headers = { Accept: 'application/json', Authorization: `Token ${token}` }
  const options = { method: operation.method, headers, redirect: 'error', signal }
  if (operation.method === 'POST') {
    headers['Content-Type'] = 'application/json'
    options.body = '{}'
  }
  return options
}

function cancelBody(response) {
  try {
    if (response?.body && typeof response.body.cancel === 'function') void Promise.resolve(response.body.cancel()).catch(() => undefined)
  } catch {
    return
  }
}

async function boundedText(response) {
  const declared = response.headers.get('Content-Length')
  if (typeof declared === 'string' && /^\d+$/.test(declared) && Number(declared) > RESPONSE_LIMIT_BYTES) throw new TypeError('Medflex discovery response is too large')
  const text = await response.text()
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > RESPONSE_LIMIT_BYTES) throw new TypeError('Medflex discovery response is too large')
  return text
}

async function jsonPayload(response) {
  const contentType = response.headers.get('Content-Type')
  if (typeof contentType !== 'string' || !JSON_CONTENT_TYPE.test(contentType.trim())) throw new TypeError('Medflex discovery response is not JSON')
  try {
    return JSON.parse(await boundedText(response))
  } catch {
    throw new TypeError('Medflex discovery response is invalid')
  }
}

function record(input) {
  return input !== null && typeof input === 'object' && !Array.isArray(input) && Object.getPrototypeOf(input) === Object.prototype
}

function collection(payload, kind) {
  if (kind === 'webhooks') {
    if (!Array.isArray(payload)) throw new TypeError('Medflex discovery webhook response is invalid')
    return Array.isArray(payload[0]) ? payload.flat(1) : payload
  }
  if (!record(payload) || !record(payload.data) && !Array.isArray(payload.data)) throw new TypeError('Medflex discovery page response is invalid')
  if (kind === 'categories') return record(payload.data) && Array.isArray(payload.data.categories) ? payload.data.categories : invalidCollection()
  if (kind === 'services') return record(payload.data) && Array.isArray(payload.data.services) ? payload.data.services : invalidCollection()
  return Array.isArray(payload.data) ? payload.data : invalidCollection()
}

function invalidCollection() {
  throw new TypeError('Medflex discovery collection response is invalid')
}

function objectKeys(input) {
  if (input === undefined) return Object.freeze([])
  if (!record(input)) throw new TypeError('Medflex discovery collection item is invalid')
  return Object.freeze(Object.keys(input).sort())
}

function summarize(payload, kind) {
  const items = collection(payload, kind)
  if (!items.every(record)) throw new TypeError('Medflex discovery collection items are invalid')
  const count = kind !== 'webhooks' && Number.isSafeInteger(payload.count) && payload.count >= 0 ? payload.count : items.length
  return Object.freeze({ objectCount: count, firstObjectKeys: objectKeys(items[0]) })
}

function operationReport(operation, status, summary = Object.freeze({ objectCount: 0, firstObjectKeys: Object.freeze([]) })) {
  return Object.freeze({ method: operation.method, path: operation.path, probe: operation.probe, status, objectCount: summary.objectCount, firstObjectKeys: summary.firstObjectKeys })
}

function retryAfter(response) {
  const value = response.headers.get('Retry-After')
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)$/.test(value)) return undefined
  const seconds = Number(value)
  return Number.isSafeInteger(seconds) && seconds <= MAX_RETRY_AFTER_SECONDS ? seconds : undefined
}

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function probeOnce(configuration, operation) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await configuration.fetchImpl(urlFor(operation), requestOptions(operation, configuration.token, controller.signal))
    if (response === null || typeof response !== 'object' || !Number.isInteger(response.status) || !response.headers || typeof response.headers.get !== 'function') throw new TypeError('Medflex discovery transport response is invalid')
    if (operation.probe === 'invalid_body' || response.status < 200 || response.status >= 300 || response.status === 204) {
      const delay = response.status === 429 ? retryAfter(response) : undefined
      cancelBody(response)
      return Object.freeze({ report: operationReport(operation, response.status), retryAfterSeconds: delay })
    }
    return Object.freeze({ report: operationReport(operation, response.status, summarize(await jsonPayload(response), operation.collection)), retryAfterSeconds: undefined })
  } catch {
    return Object.freeze({ report: operationReport(operation, 'transport_error'), retryAfterSeconds: undefined })
  } finally {
    clearTimeout(timer)
  }
}

async function probe(configuration, operation, retry = true) {
  const first = await probeOnce(configuration, operation)
  if (!retry || operation.method !== 'GET' || first.report.status !== 429 || first.retryAfterSeconds === undefined) return first.report
  await pause(first.retryAfterSeconds * 1_000)
  return (await probeOnce(configuration, operation)).report
}

function detailReport(report) {
  if (report.status !== 200) return Object.freeze({ status: report.status, presentFields: Object.freeze([]), absentFields: Object.freeze([]) })
  const keys = new Set(report.firstObjectKeys)
  return Object.freeze({ status: report.status, objectCount: report.objectCount, firstObjectKeys: report.firstObjectKeys, presentFields: Object.freeze(DETAIL_FIELDS.filter((field) => keys.has(field))), absentFields: Object.freeze(DETAIL_FIELDS.filter((field) => !keys.has(field))) })
}

/**
 * Probes the fixed clinic-token contract and returns metadata without upstream values.
 */
export async function discoverMedflexContract(input) {
  const configuration = readInput(input)
  const operations = []
  for (const operation of contractOperations(configuration.date)) operations.push(await probe(configuration, operation))
  const doctorDetail = configuration.includePaidDoctorDetail ? detailReport(await probe(configuration, detailOperation(), false)) : Object.freeze({ status: 'not_requested', presentFields: Object.freeze([]), absentFields: Object.freeze([]) })
  return Object.freeze({ contractPaths: new Set(operations.map((operation) => operation.path)).size, httpOperations: operations.length, operations: Object.freeze(operations), doctorDetail })
}
