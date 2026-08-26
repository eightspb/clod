const MEDFLEX_ORIGIN = 'https://api.medflex.ru'
const DEFAULT_TIMEOUT_MS = 65_000
const MAX_TIMEOUT_MS = 120_000
const MAX_RESPONSE_BYTES = 1_048_576
const MAX_ID_LIST_LENGTH = 100
const MAX_RETRY_AFTER_SECONDS = 86_400
const MAX_JSON_DEPTH = 40
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/
const JSON_CONTENT_TYPE = /^application\/(?:[a-z0-9!#$&^_.+-]+\+)?json(?:\s*;|$)/i
const FACTORY_KEYS = Object.freeze(['fetchImpl', 'token', 'timeoutMs'])
const DOCTOR_KEYS = Object.freeze(['doctorIds', 'lpuIds', 'page', 'size', 'specialityIds'])
const SCHEDULE_KEYS = Object.freeze(['dateStart', 'days', 'doctorIds', 'lpuIds', 'page', 'specialityIds', 'townId'])
const HISTORY_KEYS = Object.freeze(['dateEnd', 'dateStart', 'lpuId', 'page', 'size', 'uuid'])
const CREATE_KEYS = Object.freeze(['appointment', 'call_trackings', 'client', 'doctor'])
const CREATE_DOCTOR_KEYS = Object.freeze(['id', 'lpu_id', 'speciality_id'])
const CREATE_APPOINTMENT_KEYS = Object.freeze(['comment', 'dt_end', 'dt_start', 'price'])
const CREATE_CLIENT_KEYS = Object.freeze(['birthday', 'first_name', 'last_name', 'mobile_phone', 'second_name'])
const CALL_TRACKING_KEYS = Object.freeze(['uis_id'])
const CANCEL_KEYS = Object.freeze(['uuid'])
const INVALID_JSON = Symbol('invalid-json')
const INTERNAL_ERRORS = new WeakSet()
const ERROR_MESSAGES = Object.freeze({
  MEDFLEX_AUTH: 'Medflex authentication failed',
  MEDFLEX_CONFIG: 'Medflex client configuration is invalid',
  MEDFLEX_CONFLICT: 'Medflex appointment conflicts with an existing appointment',
  MEDFLEX_HTTP_ERROR: 'Medflex request failed',
  MEDFLEX_INVALID_RESPONSE: 'Medflex returned an invalid response',
  MEDFLEX_NETWORK: 'Medflex network request failed',
  MEDFLEX_NOT_FOUND: 'Medflex resource was not found',
  MEDFLEX_RATE_LIMITED: 'Medflex request was rate limited',
  MEDFLEX_REJECTED: 'Medflex rejected the request',
  MEDFLEX_SLOT_UNAVAILABLE: 'Medflex appointment slot is unavailable',
  MEDFLEX_TIMEOUT: 'Medflex request timed out',
  MEDFLEX_UNAVAILABLE: 'Medflex service is unavailable',
})

function normalizeErrorCode(code) {
  return typeof code === 'string' && Object.hasOwn(ERROR_MESSAGES, code) ? code : 'MEDFLEX_HTTP_ERROR'
}

function sanitizeErrorMetadata(input) {
  try {
    const record = readRecord(input)
    return record.valid ? record.value : Object.freeze(Object.create(null))
  } catch {
    return Object.freeze(Object.create(null))
  }
}

/**
 * Represents a sanitized failure at the Medflex transport boundary.
 */
export class MedflexError extends Error {
  constructor(code, metadata = {}) {
    const normalizedCode = normalizeErrorCode(code)
    const normalizedMetadata = sanitizeErrorMetadata(metadata)
    super(ERROR_MESSAGES[normalizedCode])
    this.name = 'MedflexError'
    this.code = normalizedCode
    this.retryable = normalizedMetadata.retryable === true
    this.outcomeUncertain = normalizedMetadata.outcomeUncertain === true
    if (Number.isInteger(normalizedMetadata.status) && normalizedMetadata.status >= 100 && normalizedMetadata.status <= 599) this.status = normalizedMetadata.status
    if (Number.isInteger(normalizedMetadata.retryAfterSeconds) && normalizedMetadata.retryAfterSeconds >= 0 && normalizedMetadata.retryAfterSeconds <= MAX_RETRY_AFTER_SECONDS) this.retryAfterSeconds = normalizedMetadata.retryAfterSeconds
    Object.freeze(this)
  }
}

function medflexFailure(code, metadata = {}) {
  const error = new MedflexError(code, metadata)
  INTERNAL_ERRORS.add(error)
  return error
}

function readRecord(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return { valid: false }
  const prototype = Object.getPrototypeOf(input)
  if (prototype !== Object.prototype && prototype !== null) return { valid: false }
  const value = Object.create(null)
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string') return { valid: false }
    const descriptor = Object.getOwnPropertyDescriptor(input, key)
    if (!descriptor || 'get' in descriptor || 'set' in descriptor) return { valid: false }
    Object.defineProperty(value, key, { enumerable: true, value: descriptor.value })
  }
  return { valid: true, value: Object.freeze(value) }
}

function readOptions(input, allowed, scope) {
  const record = readRecord(input)
  if (!record.valid) throw new TypeError(`${scope} must be a plain data object`)
  if (!Reflect.ownKeys(record.value).every((key) => allowed.includes(key))) throw new TypeError(`${scope} contains unknown fields`)
  return record.value
}

function requireFields(record, required, scope) {
  if (!required.every((key) => Object.hasOwn(record, key))) throw new TypeError(`${scope} is missing required fields`)
}

function normalizePositiveInteger(value, scope, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new TypeError(`${scope} must be a positive integer within range`)
  return value
}

function normalizeOptionalInteger(value, scope, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return undefined
  return normalizePositiveInteger(value, scope, maximum)
}

function normalizeIdList(value, scope) {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ID_LIST_LENGTH) throw new TypeError(`${scope} must be a bounded identifier array`)
  const identifiers = new Array(value.length)
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) throw new TypeError(`${scope} must be a dense identifier array`)
    identifiers[index] = normalizePositiveInteger(value[index], scope)
  }
  if (new Set(identifiers).size !== identifiers.length) throw new TypeError(`${scope} must not contain duplicate identifiers`)
  return Object.freeze([...identifiers].sort((left, right) => left - right))
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year, month) {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return days[month - 1] || 0
}

function hasValidDateParts(year, month, day) {
  return year >= 1 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
}

function normalizeDate(value, scope) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must be a real YYYY-MM-DD date`)
  const match = DATE_PATTERN.exec(value)
  if (!match || !hasValidDateParts(Number(match[1]), Number(match[2]), Number(match[3]))) throw new TypeError(`${scope} must be a real YYYY-MM-DD date`)
  return value
}

function normalizeOptionalDate(value, scope) {
  if (value === undefined) return undefined
  return normalizeDate(value, scope)
}

function hasValidTimezone(value) {
  if (value === undefined || value === 'Z') return true
  const hours = Number(value.slice(1, 3))
  const minutes = Number(value.slice(4, 6))
  return hours <= 14 && minutes <= 59 && (hours < 14 || minutes === 0)
}

function dateTimeMilliseconds(match) {
  const milliseconds = match[7] === undefined ? 0 : Number(match[7].padEnd(3, '0'))
  const date = new Date(0)
  date.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  date.setUTCHours(Number(match[4]), Number(match[5]), Number(match[6] || 0), milliseconds)
  const timestamp = date.getTime()
  if (match[8] === undefined || match[8] === 'Z') return timestamp
  const offset = (Number(match[8].slice(1, 3)) * 60 + Number(match[8].slice(4, 6))) * 60_000
  return match[8][0] === '+' ? timestamp - offset : timestamp + offset
}

function normalizeDateTime(value, scope) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must be a valid appointment timestamp`)
  const match = DATETIME_PATTERN.exec(value)
  const validDate = match && hasValidDateParts(Number(match[1]), Number(match[2]), Number(match[3]))
  const validTime = match && Number(match[4]) <= 23 && Number(match[5]) <= 59 && (match[6] === undefined || Number(match[6]) <= 59)
  if (!match || !validDate || !validTime || !hasValidTimezone(match[8])) throw new TypeError(`${scope} must be a valid appointment timestamp`)
  return Object.freeze({ value, milliseconds: dateTimeMilliseconds(match) })
}

function normalizeBoundedText(value, scope, minimum, maximum) {
  if (typeof value !== 'string') throw new TypeError(`${scope} must be bounded text`)
  const normalized = value.normalize('NFC').trim()
  if ([...normalized].length < minimum || [...normalized].length > maximum) throw new TypeError(`${scope} must be bounded text`)
  return normalized
}

function normalizeUuid(value, scope) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new TypeError(`${scope} must be a UUID`)
  return value.toLowerCase()
}

function appendOptional(query, name, value) {
  if (value !== undefined) query.set(name, String(value))
}

function appendIdentifiers(query, name, value) {
  if (value !== undefined) query.set(name, value.join(','))
}

function doctorQuery(input) {
  const options = readOptions(input, DOCTOR_KEYS, 'Medflex doctor options')
  const query = new URLSearchParams()
  query.set('detailed', 'false')
  appendOptional(query, 'page', normalizeOptionalInteger(options.page, 'Medflex doctor page'))
  appendOptional(query, 'size', normalizeOptionalInteger(options.size, 'Medflex doctor size', 50))
  appendIdentifiers(query, 'doctor_ids', normalizeIdList(options.doctorIds, 'Medflex doctor IDs'))
  appendIdentifiers(query, 'lpu_ids', normalizeIdList(options.lpuIds, 'Medflex doctor LPU IDs'))
  appendIdentifiers(query, 'speciality_ids', normalizeIdList(options.specialityIds, 'Medflex doctor speciality IDs'))
  return query
}

function scheduleQuery(input) {
  const options = readOptions(input, SCHEDULE_KEYS, 'Medflex schedule options')
  const query = new URLSearchParams()
  query.set('town_id', String(normalizePositiveInteger(options.townId, 'Medflex schedule town ID')))
  appendOptional(query, 'date_start', normalizeOptionalDate(options.dateStart, 'Medflex schedule date'))
  appendOptional(query, 'days', normalizeOptionalInteger(options.days, 'Medflex schedule days', 30))
  appendIdentifiers(query, 'doctor_ids', normalizeIdList(options.doctorIds, 'Medflex schedule doctor IDs'))
  appendIdentifiers(query, 'lpu_ids', normalizeIdList(options.lpuIds, 'Medflex schedule LPU IDs'))
  appendIdentifiers(query, 'speciality_ids', normalizeIdList(options.specialityIds, 'Medflex schedule speciality IDs'))
  appendOptional(query, 'page', normalizeOptionalInteger(options.page, 'Medflex schedule page'))
  return query
}

function historyQuery(input) {
  const options = readOptions(input, HISTORY_KEYS, 'Medflex appointment history options')
  const dateStart = normalizeOptionalDate(options.dateStart, 'Medflex history start date')
  const dateEnd = normalizeOptionalDate(options.dateEnd, 'Medflex history end date')
  if (dateStart !== undefined && dateEnd !== undefined && dateEnd < dateStart) throw new TypeError('Medflex history date range is reversed')
  const query = new URLSearchParams()
  appendOptional(query, 'date_start', dateStart)
  appendOptional(query, 'date_end', dateEnd)
  appendOptional(query, 'lpu_id', normalizeOptionalInteger(options.lpuId, 'Medflex history LPU ID'))
  appendOptional(query, 'uuid', options.uuid === undefined ? undefined : normalizeUuid(options.uuid, 'Medflex history UUID'))
  appendOptional(query, 'page', normalizeOptionalInteger(options.page, 'Medflex history page'))
  appendOptional(query, 'size', normalizeOptionalInteger(options.size, 'Medflex history size', 50))
  return query
}

function normalizeDoctor(input) {
  const doctor = readOptions(input, CREATE_DOCTOR_KEYS, 'Medflex appointment doctor')
  requireFields(doctor, CREATE_DOCTOR_KEYS, 'Medflex appointment doctor')
  return Object.freeze({
    id: normalizePositiveInteger(doctor.id, 'Medflex appointment doctor ID'),
    lpu_id: normalizePositiveInteger(doctor.lpu_id, 'Medflex appointment LPU ID'),
    speciality_id: normalizePositiveInteger(doctor.speciality_id, 'Medflex appointment speciality ID'),
  })
}

function normalizeAppointment(input) {
  const appointment = readOptions(input, CREATE_APPOINTMENT_KEYS, 'Medflex appointment details')
  requireFields(appointment, ['dt_end', 'dt_start', 'price'], 'Medflex appointment details')
  if (typeof appointment.price !== 'number' || !Number.isFinite(appointment.price) || appointment.price < 0) throw new TypeError('Medflex appointment price must be a finite nonnegative number')
  const start = normalizeDateTime(appointment.dt_start, 'Medflex appointment start')
  const end = normalizeDateTime(appointment.dt_end, 'Medflex appointment end')
  if (end.milliseconds <= start.milliseconds) throw new TypeError('Medflex appointment end must follow its start')
  return Object.freeze({
    dt_start: start.value,
    dt_end: end.value,
    comment: appointment.comment === undefined ? '' : normalizeBoundedText(appointment.comment, 'Medflex appointment comment', 0, 300),
    price: appointment.price,
  })
}

function normalizeClient(input) {
  const client = readOptions(input, CREATE_CLIENT_KEYS, 'Medflex appointment patient')
  requireFields(client, CREATE_CLIENT_KEYS, 'Medflex appointment patient')
  if (typeof client.mobile_phone !== 'string' || !/^7\d{10,12}$/.test(client.mobile_phone)) throw new TypeError('Medflex appointment phone must use the API format')
  return Object.freeze({
    first_name: normalizeBoundedText(client.first_name, 'Medflex appointment first name', 1, 100),
    second_name: normalizeBoundedText(client.second_name, 'Medflex appointment second name', 0, 100),
    last_name: normalizeBoundedText(client.last_name, 'Medflex appointment last name', 1, 100),
    mobile_phone: client.mobile_phone,
    birthday: normalizeDate(client.birthday, 'Medflex appointment birthday'),
  })
}

function normalizeCallTracking(input) {
  if (input === null) return null
  const tracking = readOptions(input, CALL_TRACKING_KEYS, 'Medflex appointment call tracking')
  const value = {}
  if (tracking.uis_id !== undefined) value.uis_id = normalizeBoundedText(tracking.uis_id, 'Medflex appointment call tracking ID', 0, 50)
  return Object.freeze(value)
}

function normalizeCreateBody(input) {
  const body = readOptions(input, CREATE_KEYS, 'Medflex appointment input')
  requireFields(body, ['appointment', 'client', 'doctor'], 'Medflex appointment input')
  const value = {
    doctor: normalizeDoctor(body.doctor),
    appointment: normalizeAppointment(body.appointment),
    client: normalizeClient(body.client),
  }
  if (Object.hasOwn(body, 'call_trackings')) value.call_trackings = normalizeCallTracking(body.call_trackings)
  return Object.freeze(value)
}

function normalizeCancelBody(input) {
  const body = readOptions(input, CANCEL_KEYS, 'Medflex appointment cancellation')
  requireFields(body, CANCEL_KEYS, 'Medflex appointment cancellation')
  return Object.freeze({ uuid: normalizeUuid(body.uuid, 'Medflex cancellation UUID') })
}

function runtimeToken() {
  if (typeof process !== 'undefined' && typeof process.env?.MEDFLEX_CLINIC_TOKEN === 'string') return process.env.MEDFLEX_CLINIC_TOKEN
  return undefined
}

function resolveConfiguration(input) {
  const options = readOptions(input, FACTORY_KEYS, 'Medflex client options')
  const fetchImpl = options.fetchImpl === undefined ? globalThis.fetch : options.fetchImpl
  const token = (Object.hasOwn(options, 'token') ? options.token : runtimeToken())
  const timeoutMs = options.timeoutMs === undefined ? DEFAULT_TIMEOUT_MS : options.timeoutMs
  if (typeof fetchImpl !== 'function') throw new TypeError('Medflex fetch implementation must be a function')
  if (typeof token !== 'string' || !token.trim()) throw medflexFailure('MEDFLEX_CONFIG', { retryable: false })
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) throw new TypeError('Medflex timeout must be a positive integer within range')
  return Object.freeze({ fetchImpl, token: token.trim(), timeoutMs })
}

function buildUrl(path, query) {
  const url = new URL(path, MEDFLEX_ORIGIN)
  const serialized = query?.toString()
  if (serialized) url.search = serialized
  return url.toString()
}

function retryAfter(response) {
  const value = response.headers.get('Retry-After')
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)$/.test(value)) return undefined
  const seconds = Number(value)
  if (!Number.isSafeInteger(seconds) || seconds > MAX_RETRY_AFTER_SECONDS) return undefined
  return seconds
}

function httpError(response, outcomeUncertain) {
  const metadata = { status: response.status, retryable: false, outcomeUncertain: false }
  const delay = retryAfter(response)
  if (delay !== undefined) metadata.retryAfterSeconds = delay
  if (response.status === 400) return medflexFailure('MEDFLEX_REJECTED', metadata)
  if (response.status === 401 || response.status === 403) return medflexFailure('MEDFLEX_AUTH', metadata)
  if (response.status === 404) return medflexFailure('MEDFLEX_NOT_FOUND', metadata)
  if (response.status === 409) return medflexFailure('MEDFLEX_CONFLICT', metadata)
  if (response.status === 423) return medflexFailure('MEDFLEX_SLOT_UNAVAILABLE', metadata)
  if (response.status === 429) return medflexFailure('MEDFLEX_RATE_LIMITED', { ...metadata, retryable: true })
  if (response.status >= 500) return medflexFailure('MEDFLEX_UNAVAILABLE', { ...metadata, retryable: !outcomeUncertain, outcomeUncertain })
  return medflexFailure('MEDFLEX_HTTP_ERROR', metadata)
}

function invalidResponse(status, outcomeUncertain) {
  return medflexFailure('MEDFLEX_INVALID_RESPONSE', { status, retryable: !outcomeUncertain, outcomeUncertain })
}

function validateResponse(response, outcomeUncertain) {
  if (response === null || typeof response !== 'object') throw invalidResponse(undefined, outcomeUncertain)
  if (!Number.isInteger(response.status) || response.status < 100 || response.status > 599) throw invalidResponse(undefined, outcomeUncertain)
  if (!response.headers || typeof response.headers.get !== 'function') throw invalidResponse(response.status, outcomeUncertain)
}

function cancelReadable(readable) {
  try {
    if (readable && typeof readable.cancel === 'function') void Promise.resolve(readable.cancel()).catch(() => undefined)
  } catch {
    return
  }
}

function cancelResponseBody(response) {
  try {
    cancelReadable(response.body)
  } catch {
    return
  }
}

async function readStream(stream, status, outcomeUncertain) {
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let bytes = 0
  let text = ''
  let reachedEnd = false
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) {
        reachedEnd = true
        break
      }
      if (!ArrayBuffer.isView(chunk.value)) throw invalidResponse(status, outcomeUncertain)
      bytes += chunk.value.byteLength
      if (bytes > MAX_RESPONSE_BYTES) throw invalidResponse(status, outcomeUncertain)
      try {
        text += decoder.decode(chunk.value, { stream: true })
      } catch (error) {
        if (error instanceof TypeError) throw invalidResponse(status, outcomeUncertain)
        throw error
      }
    }
    try {
      return text + decoder.decode()
    } catch (error) {
      if (error instanceof TypeError) throw invalidResponse(status, outcomeUncertain)
      throw error
    }
  } catch (error) {
    if (!reachedEnd) cancelReadable(reader)
    throw error
  } finally {
    reader.releaseLock()
  }
}

async function readBoundedText(response, outcomeUncertain) {
  const length = response.headers.get('Content-Length')
  if (typeof length === 'string' && /^\d+$/.test(length) && Number(length) > MAX_RESPONSE_BYTES) {
    const error = invalidResponse(response.status, outcomeUncertain)
    cancelResponseBody(response)
    throw error
  }
  if (response.body && typeof response.body.getReader === 'function') return readStream(response.body, response.status, outcomeUncertain)
  if (typeof response.text !== 'function') throw invalidResponse(response.status, outcomeUncertain)
  const text = await response.text()
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) throw invalidResponse(response.status, outcomeUncertain)
  return text
}

async function readJson(response, outcomeUncertain) {
  const contentType = response.headers.get('Content-Type')
  if (typeof contentType !== 'string' || !JSON_CONTENT_TYPE.test(contentType.trim())) {
    const error = invalidResponse(response.status, outcomeUncertain)
    cancelResponseBody(response)
    throw error
  }
  const text = await readBoundedText(response, outcomeUncertain)
  try {
    return JSON.parse(text)
  } catch (error) {
    if (error instanceof SyntaxError) throw invalidResponse(response.status, outcomeUncertain)
    throw error
  }
}

function cloneJson(value, depth = 0) {
  if (depth > MAX_JSON_DEPTH) return INVALID_JSON
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : INVALID_JSON
  if (Array.isArray(value)) {
    const items = value.map((item) => cloneJson(item, depth + 1))
    return items.includes(INVALID_JSON) ? INVALID_JSON : Object.freeze(items)
  }
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return INVALID_JSON
  const result = {}
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') return INVALID_JSON
    const cloned = cloneJson(value[key], depth + 1)
    if (cloned === INVALID_JSON) return INVALID_JSON
    Object.defineProperty(result, key, { configurable: false, enumerable: true, value: cloned, writable: false })
  }
  return Object.freeze(result)
}

function normalizePage(payload, status, outcomeUncertain) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload) || Object.getPrototypeOf(payload) !== Object.prototype) throw invalidResponse(status, outcomeUncertain)
  if (!['data', 'count', 'num_pages'].every((key) => Object.hasOwn(payload, key)) || !Array.isArray(payload.data)) throw invalidResponse(status, outcomeUncertain)
  if (!Number.isSafeInteger(payload.count) || payload.count < 0 || !Number.isSafeInteger(payload.num_pages) || payload.num_pages < 0) throw invalidResponse(status, outcomeUncertain)
  if (!payload.data.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item) && Object.getPrototypeOf(item) === Object.prototype)) throw invalidResponse(status, outcomeUncertain)
  const data = cloneJson(payload.data)
  if (data === INVALID_JSON) throw invalidResponse(status, outcomeUncertain)
  return Object.freeze({ data, count: payload.count, num_pages: payload.num_pages })
}

function normalizeClaim(payload, status) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload) || Object.getPrototypeOf(payload) !== Object.prototype) throw invalidResponse(status, true)
  if (Reflect.ownKeys(payload).length !== 1 || !Object.hasOwn(payload, 'claim_id') || typeof payload.claim_id !== 'string' || !UUID_PATTERN.test(payload.claim_id)) throw invalidResponse(status, true)
  return Object.freeze({ claim_id: payload.claim_id.toLowerCase() })
}

function normalizeTransportFailure(error, signal, outcomeUncertain) {
  if (signal.aborted) return medflexFailure('MEDFLEX_TIMEOUT', { retryable: !outcomeUncertain, outcomeUncertain })
  if (INTERNAL_ERRORS.has(error)) return error
  return medflexFailure('MEDFLEX_NETWORK', { retryable: !outcomeUncertain, outcomeUncertain })
}

function requestOptions(method, token, signal, body) {
  const headers = { Accept: 'application/json', Authorization: `Token ${token}` }
  if (method === 'POST') headers['Content-Type'] = 'application/json'
  const options = { method, headers, redirect: 'error', signal }
  if (method === 'POST') options.body = JSON.stringify(body)
  return options
}

async function request(configuration, operation) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), configuration.timeoutMs)
  const outcomeUncertain = operation.method === 'POST'
  try {
    const response = await configuration.fetchImpl(buildUrl(operation.path, operation.query), requestOptions(operation.method, configuration.token, controller.signal, operation.body))
    if (controller.signal.aborted) throw new DOMException('Timed out', 'AbortError')
    validateResponse(response, outcomeUncertain)
    if (response.status < 200 || response.status >= 300) {
      const error = httpError(response, outcomeUncertain)
      cancelResponseBody(response)
      throw error
    }
    if (operation.shape === 'empty') {
      if (response.status !== 204) {
        const error = invalidResponse(response.status, outcomeUncertain)
        cancelResponseBody(response)
        throw error
      }
      return Object.freeze({ cancelled: true })
    }
    const payload = await readJson(response, outcomeUncertain)
    if (controller.signal.aborted) throw new DOMException('Timed out', 'AbortError')
    return operation.shape === 'claim' ? normalizeClaim(payload, response.status) : normalizePage(payload, response.status, outcomeUncertain)
  } catch (error) {
    throw normalizeTransportFailure(error, controller.signal, outcomeUncertain)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Creates a fixed-origin server client whose JSON responses are capped at one mebibyte.
 */
export function createMedflexClient(options = {}) {
  const configuration = resolveConfiguration(options)
  return Object.freeze({
    listLpus: (input = {}) => {
      readOptions(input, [], 'Medflex LPU options')
      return request(configuration, { method: 'GET', path: '/models/lpu/', shape: 'page' })
    },
    listDoctors: (input = {}) => request(configuration, { method: 'GET', path: '/models/doctor/', query: doctorQuery(input), shape: 'page' }),
    getSchedule: (input = {}) => request(configuration, { method: 'GET', path: '/schedule/', query: scheduleQuery(input), shape: 'page' }),
    createDoctorAppointment: (input) => request(configuration, { method: 'POST', path: '/direct_appointment/doctor/execute/', body: normalizeCreateBody(input), shape: 'claim' }),
    cancelDoctorAppointment: (input) => request(configuration, { method: 'POST', path: '/direct_appointment/doctor/cancel/', body: normalizeCancelBody(input), shape: 'empty' }),
    getAppointmentHistory: (input = {}) => request(configuration, { method: 'GET', path: '/direct_appointment/history/', query: historyQuery(input), shape: 'page' }),
  })
}
