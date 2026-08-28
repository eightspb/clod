import { isAdminClinicQueryError, parseCallEntryId, parseCallQuery, parseDestroyCallBody } from './admin-clinic-query.js'
import { adminActor, guardAdminPii, guardAdminRead, readAdminJson } from './admin-api.js'
import { isMangoCallRecordError } from './mango-call-records.js'

const JSON_HEADERS = Object.freeze({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' })
const CALL_FIELDS = Object.freeze(['entryId', 'patientId', 'status', 'callerMask', 'repeatCaller', 'lineNumber', 'operatorExtension', 'startedAt', 'forwardedAt', 'answeredAt', 'endedAt', 'waitSeconds', 'talkSeconds', 'disconnectReason', 'finalizedAt', 'createdAt', 'updatedAt', 'piiDestroyedAt'])
const METRIC_FIELDS = Object.freeze(['active', 'incoming', 'answered', 'missed', 'answerRate', 'averageWaitSeconds', 'averageTalkSeconds'])
const CALL_STATUSES = Object.freeze(['ringing', 'queued', 'connected', 'on_hold', 'finalizing', 'answered', 'missed'])
const LIVE_CALL_STATUSES = Object.freeze(['ringing', 'queued', 'connected', 'on_hold', 'finalizing'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const PHONE_MASK_PATTERN = /^\+[1-9] •{5,12} [0-9]{2}$/u
const PHONE_PATTERN = /^[1-9][0-9]{7,14}$/
const EXTENSION_PATTERN = /^[0-9]{1,32}$/
const MAX_PAGE_NUMBER = 1_000_000
const MAX_PAGE_SIZE = 50
const MAX_PAGE_TOTAL = MAX_PAGE_NUMBER * MAX_PAGE_SIZE
const MAX_COUNT = 50_000_000
const MAX_DURATION_SECONDS = 86_400
const MOSCOW_OFFSET_MS = 3 * 60 * 60_000

function json(payload, status) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}

function failure(status, error, message) {
  return json({ error, message }, status)
}

function noStore(response) {
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'no-store')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export function safeCall(value, expectedEntryId) {
  const input = projected(value, CALL_FIELDS, 'Call')
  const entryId = boundedText(input.entryId, 'Call')
  const patientId = input.patientId === null ? null : safeUuid(input.patientId, 'Call')
  const status = exact(input.status, CALL_STATUSES, 'Call')
  const callerMask = input.callerMask === null ? null : exactPattern(input.callerMask, PHONE_MASK_PATTERN, 'Call')
  const repeatCaller = input.repeatCaller
  const lineNumber = exactPattern(input.lineNumber, PHONE_PATTERN, 'Call')
  const operatorExtension = input.operatorExtension === null ? null : exactPattern(input.operatorExtension, EXTENSION_PATTERN, 'Call')
  const startedAt = safeTimestamp(input.startedAt, 'Call')
  const forwardedAt = nullableTimestamp(input.forwardedAt, 'Call')
  const answeredAt = nullableTimestamp(input.answeredAt, 'Call')
  const endedAt = nullableTimestamp(input.endedAt, 'Call')
  const waitSeconds = nullableDuration(input.waitSeconds, 'Call')
  const talkSeconds = nullableDuration(input.talkSeconds, 'Call')
  const disconnectReason = input.disconnectReason === null ? null : boundedText(input.disconnectReason, 'Call')
  const finalizedAt = nullableTimestamp(input.finalizedAt, 'Call')
  const createdAt = safeTimestamp(input.createdAt, 'Call')
  const updatedAt = safeTimestamp(input.updatedAt, 'Call')
  const piiDestroyedAt = nullableTimestamp(input.piiDestroyedAt, 'Call')
  if ((expectedEntryId !== undefined && entryId !== expectedEntryId) || (piiDestroyedAt === null && (callerMask === null || typeof repeatCaller !== 'boolean')) || (piiDestroyedAt !== null && (callerMask !== null || repeatCaller !== null || patientId !== null)) || updatedAt < createdAt || (piiDestroyedAt !== null && (piiDestroyedAt < createdAt || piiDestroyedAt > updatedAt))) throw new TypeError('Call response is invalid')
  return Object.freeze({ entryId, patientId, status, callerMask, repeatCaller, lineNumber, operatorExtension, startedAt, forwardedAt, answeredAt, endedAt, waitSeconds, talkSeconds, disconnectReason, finalizedAt, createdAt, updatedAt, piiDestroyedAt })
}

export function safeCallPage(value) {
  const input = projected(value, ['items', 'page', 'pageSize', 'total', 'pages'], 'Call page')
  const items = denseArray(input.items, MAX_PAGE_SIZE, 'Call page')
  const number = positiveInteger(input.page, 'Call page')
  const size = positiveInteger(input.pageSize, 'Call page')
  const total = nonnegativeInteger(input.total, 'Call page')
  const pages = nonnegativeInteger(input.pages, 'Call page')
  const expectedPages = total === 0 ? 0 : Math.ceil(total / size)
  const remaining = number > pages ? 0 : total - ((number - 1) * size)
  if (number > MAX_PAGE_NUMBER || size > MAX_PAGE_SIZE || total > MAX_PAGE_TOTAL || pages > MAX_PAGE_NUMBER || pages !== expectedPages || items.length > Math.min(size, Math.max(0, remaining))) throw new TypeError('Call page is invalid')
  return Object.freeze({ data: Object.freeze(items.map((item) => safeCall(item))), page: Object.freeze({ number, size, total, pages }) })
}

function safeActiveCalls(value) {
  const items = denseArray(value, 1_000, 'Active calls')
  const calls = items.map((item) => safeCall(item))
  if (calls.some(({ status }) => !LIVE_CALL_STATUSES.includes(status))) throw new TypeError('Active calls response is invalid')
  return Object.freeze(calls)
}

function projected(value, fields, scope) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${scope} response is invalid`)
  const result = Object.create(null)
  for (const key of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError(`${scope} response is invalid`)
    result[key] = descriptor.value
  }
  return Object.freeze(result)
}

function denseArray(value, maximum, scope) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) throw new TypeError(`${scope} response is invalid`)
  const length = Object.getOwnPropertyDescriptor(value, 'length')?.value
  if (!Number.isSafeInteger(length) || length < 0 || length > maximum || Reflect.ownKeys(value).length !== length + 1) throw new TypeError(`${scope} response is invalid`)
  const result = []
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) throw new TypeError(`${scope} response is invalid`)
    result.push(descriptor.value)
  }
  return result
}

function prohibitedTextCharacter(value) {
  const code = value.codePointAt(0)
  return code <= 31 || code === 127
}

function boundedText(value, scope) {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0 || Buffer.byteLength(value, 'utf8') > 128 || [...value].some(prohibitedTextCharacter)) throw new TypeError(`${scope} response is invalid`)
  return value
}

function safeUuid(value, scope) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new TypeError(`${scope} response is invalid`)
  return value
}

function exact(value, allowed, scope) {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new TypeError(`${scope} response is invalid`)
  return value
}

function exactPattern(value, pattern, scope) {
  if (typeof value !== 'string' || !pattern.test(value)) throw new TypeError(`${scope} response is invalid`)
  return value
}

function safeTimestamp(value, scope) {
  const milliseconds = typeof value === 'string' ? Date.parse(value) : Number.NaN
  if (typeof value !== 'string' || !TIMESTAMP_PATTERN.test(value) || !Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) throw new TypeError(`${scope} response is invalid`)
  return value
}

function nullableTimestamp(value, scope) {
  return value === null ? null : safeTimestamp(value, scope)
}

function nullableDuration(value, scope) {
  if (value === null) return null
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_DURATION_SECONDS) throw new TypeError(`${scope} response is invalid`)
  return value
}

function positiveInteger(value, scope) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${scope} response is invalid`)
  return value
}

function nonnegativeInteger(value, scope) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_COUNT) throw new TypeError(`${scope} response is invalid`)
  return value
}

function oneDecimal(value) {
  return Math.round(value * 10) / 10 === value
}

function safeMetrics(value) {
  const input = projected(value, METRIC_FIELDS, 'Call metrics')
  const active = nonnegativeInteger(input.active, 'Call metrics')
  const incoming = nonnegativeInteger(input.incoming, 'Call metrics')
  const answered = nonnegativeInteger(input.answered, 'Call metrics')
  const missed = nonnegativeInteger(input.missed, 'Call metrics')
  const answerRate = input.answerRate
  const averageWaitSeconds = input.averageWaitSeconds
  const averageTalkSeconds = input.averageTalkSeconds
  const final = answered + missed
  const expectedRate = final === 0 ? 0 : Math.round(answered * 1_000 / final) / 10
  if (active + final !== incoming || !Number.isFinite(answerRate) || answerRate < 0 || answerRate > 100 || answerRate !== expectedRate || !Number.isFinite(averageWaitSeconds) || averageWaitSeconds < 0 || averageWaitSeconds > MAX_DURATION_SECONDS || !oneDecimal(averageWaitSeconds) || !Number.isFinite(averageTalkSeconds) || averageTalkSeconds < 0 || averageTalkSeconds > MAX_DURATION_SECONDS || !oneDecimal(averageTalkSeconds) || (final === 0 && (averageWaitSeconds !== 0 || averageTalkSeconds !== 0))) throw new TypeError('Call metrics are invalid')
  return Object.freeze({ active, incoming, answered, missed, answerRate, averageWaitSeconds, averageTalkSeconds })
}

function safeReveal(value, expectedEntryId) {
  const input = projected(value, ['entryId', 'phone', 'revealedAt'], 'Call reveal')
  const entryId = boundedText(input.entryId, 'Call reveal')
  if (entryId !== expectedEntryId) throw new TypeError('Call reveal is invalid')
  return Object.freeze({ entryId, phone: exactPattern(input.phone, PHONE_PATTERN, 'Call reveal'), revealedAt: safeTimestamp(input.revealedAt, 'Call reveal') })
}

function safeDestruction(value, expectedEntryId) {
  const input = projected(value, ['entryId', 'destroyedAt', 'alreadyDestroyed'], 'Call destruction')
  const entryId = boundedText(input.entryId, 'Call destruction')
  if (entryId !== expectedEntryId || typeof input.alreadyDestroyed !== 'boolean') throw new TypeError('Call destruction is invalid')
  return Object.freeze({ entryId, destroyedAt: safeTimestamp(input.destroyedAt, 'Call destruction'), alreadyDestroyed: input.alreadyDestroyed })
}

function options(input, defaults) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Call endpoint options must be a plain object')
  const configuration = { records: input.records, guard: input.guard ?? defaults.guard, actor: input.actor ?? defaults.actor, body: input.body ?? defaults.body, clock: input.clock ?? defaults.clock, log: input.log ?? defaults.log }
  if (!Object.values(configuration).every((value) => typeof value === 'function')) throw new TypeError('Call endpoint adapters are invalid')
  return Object.freeze(configuration)
}

function repository(configuration) {
  const value = configuration.records()
  if (value === null || typeof value !== 'object' || !['list', 'active', 'get', 'metrics', 'reveal', 'destroy'].every((method) => typeof value[method] === 'function')) throw new TypeError('Call repository is invalid')
  return value
}

function report(configuration, stage) {
  try {
    configuration.log(stage)
  } catch {
    return
  }
}

function knownFailure(error) {
  if (isAdminClinicQueryError(error)) return failure(400, error.code, error.code === 'INVALID_BODY' ? 'Проверьте подтверждение операции' : 'Проверьте параметры запроса')
  if (isMangoCallRecordError(error) && error.code === 'CALL_NOT_FOUND') return failure(404, error.code, 'Звонок не найден')
  if (isMangoCallRecordError(error) && error.code === 'CALL_PII_DESTROYED') return failure(410, error.code, 'Персональные данные звонящего уничтожены')
  if (isMangoCallRecordError(error) && error.code === 'CALL_CONFLICT') return failure(409, error.code, 'Операция со звонком недоступна')
  return undefined
}

function endpointFailure(configuration, stage, error) {
  const known = knownFailure(error)
  if (known) return known
  report(configuration, stage)
  return failure(503, 'CALLS_UNAVAILABLE', 'Данные звонков временно недоступны')
}

function metricRange(query, clock) {
  if (query.from !== undefined) return Object.freeze({ from: query.from, to: query.to })
  const now = clock()
  if (!(now instanceof Date) || !Number.isFinite(Date.prototype.getTime.call(now))) throw new TypeError('Call endpoint clock must return a valid Date')
  const moscowDate = new Date(Date.prototype.getTime.call(now) + MOSCOW_OFFSET_MS).toISOString().slice(0, 10)
  const fromMilliseconds = Date.parse(`${moscowDate}T00:00:00.000Z`) - MOSCOW_OFFSET_MS
  return Object.freeze({ from: new Date(fromMilliseconds).toISOString(), to: new Date(fromMilliseconds + 24 * 60 * 60_000).toISOString() })
}

function bodyFailure(parsed) {
  return parsed.tooLarge ? failure(413, 'BODY_TOO_LARGE', 'Тело запроса превышает допустимый размер') : failure(400, 'INVALID_JSON', 'Передайте корректный JSON')
}

const DEFAULTS = Object.freeze({ guard: guardAdminRead, actor: adminActor, body: readAdminJson, clock: () => new Date(), log: (stage) => console.error('[admin/calls]', stage) })
const PII_DEFAULTS = Object.freeze({ ...DEFAULTS, guard: guardAdminPii })

/**
 * Creates the protected call journal and metrics endpoint.
 */
export function createCallIndexEndpoint(input) {
  const configuration = options(input, DEFAULTS)
  return async function callIndexEndpoint({ request }) {
    const blocked = await configuration.guard(request)
    if (blocked) return noStore(blocked)
    try {
      const query = parseCallQuery(new URL(request.url).searchParams)
      const calls = repository(configuration)
      const [page, activeCalls, metrics] = await Promise.all([calls.list(query), calls.active(), calls.metrics(metricRange(query, configuration.clock))])
      return json({ ...safeCallPage(page), activeCalls: safeActiveCalls(activeCalls), metrics: safeMetrics(metrics) }, 200)
    } catch (error) {
      return endpointFailure(configuration, 'LIST_FAILED', error)
    }
  }
}

/**
 * Creates the masked call-detail endpoint.
 */
export function createCallDetailEndpoint(input) {
  const configuration = options(input, DEFAULTS)
  return async function callDetailEndpoint({ request, params }) {
    const blocked = await configuration.guard(request)
    if (blocked) return noStore(blocked)
    try {
      const entryId = parseCallEntryId(params?.entryId)
      return json({ data: safeCall(await repository(configuration).get({ entryId }), entryId) }, 200)
    } catch (error) {
      return endpointFailure(configuration, 'DETAIL_FAILED', error)
    }
  }
}

/**
 * Creates the separately limited and audited caller reveal endpoint.
 */
export function createCallRevealEndpoint(input) {
  const configuration = options(input, PII_DEFAULTS)
  return async function callRevealEndpoint({ request, params }) {
    const blocked = await configuration.guard(request)
    if (blocked) return noStore(blocked)
    try {
      const entryId = parseCallEntryId(params?.entryId)
      const actor = await configuration.actor(request)
      return json({ data: safeReveal(await repository(configuration).reveal({ entryId, actor }), entryId) }, 200)
    } catch (error) {
      return endpointFailure(configuration, 'REVEAL_FAILED', error)
    }
  }
}

/**
 * Creates the confirmed, audited caller PII destruction endpoint.
 */
export function createCallCallerEndpoint(input) {
  const configuration = options(input, PII_DEFAULTS)
  return async function callCallerEndpoint({ request, params }) {
    const blocked = await configuration.guard(request)
    if (blocked) return noStore(blocked)
    const parsed = await configuration.body(request)
    if (!parsed.valid) return bodyFailure(parsed)
    try {
      parseDestroyCallBody(parsed.value)
      const entryId = parseCallEntryId(params?.entryId)
      const actor = await configuration.actor(request)
      return json({ data: safeDestruction(await repository(configuration).destroy({ entryId, actor }), entryId) }, 200)
    } catch (error) {
      return endpointFailure(configuration, 'DESTROY_FAILED', error)
    }
  }
}
