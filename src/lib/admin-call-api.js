import { AdminClinicQueryError, parseCallEntryId, parseCallQuery, parseDestroyCallBody } from './admin-clinic-query.js'
import { adminActor, guardAdminPii, guardAdminRead, readAdminJson } from './admin-api.js'
import { MangoCallRecordError } from './mango-call-records.js'

const JSON_HEADERS = Object.freeze({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' })
const CALL_FIELDS = Object.freeze(['entryId', 'patientId', 'status', 'callerMask', 'repeatCaller', 'lineNumber', 'operatorExtension', 'startedAt', 'forwardedAt', 'answeredAt', 'endedAt', 'waitSeconds', 'talkSeconds', 'disconnectReason', 'finalizedAt', 'createdAt', 'updatedAt', 'piiDestroyedAt'])
const METRIC_FIELDS = Object.freeze(['active', 'incoming', 'answered', 'missed', 'answerRate', 'averageWaitSeconds', 'averageTalkSeconds'])
const MOSCOW_OFFSET_MS = 3 * 60 * 60_000

function json(payload, status) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}

function failure(status, error, message) {
  return json({ error, message }, status)
}

export function safeCall(value) {
  if (value === null || typeof value !== 'object' || !CALL_FIELDS.every((field) => Object.hasOwn(value, field))) throw new TypeError('Call response is invalid')
  return Object.freeze(Object.fromEntries(CALL_FIELDS.map((field) => [field, value[field]])))
}

export function safeCallPage(value) {
  if (value === null || typeof value !== 'object' || !Array.isArray(value.items)) throw new TypeError('Call page is invalid')
  const number = value.page
  const size = value.pageSize
  const total = value.total
  const pages = value.pages
  if (![number, size, total, pages].every(Number.isSafeInteger)) throw new TypeError('Call page is invalid')
  return Object.freeze({ data: value.items.map(safeCall), page: Object.freeze({ number, size, total, pages }) })
}

function safeMetrics(value) {
  if (value === null || typeof value !== 'object' || !METRIC_FIELDS.every((field) => Object.hasOwn(value, field)) || !METRIC_FIELDS.every((field) => Number.isFinite(value[field]))) throw new TypeError('Call metrics are invalid')
  return Object.freeze(Object.fromEntries(METRIC_FIELDS.map((field) => [field, value[field]])))
}

function safeReveal(value) {
  if (value === null || typeof value !== 'object' || typeof value.entryId !== 'string' || typeof value.phone !== 'string' || typeof value.revealedAt !== 'string') throw new TypeError('Call reveal is invalid')
  return Object.freeze({ entryId: value.entryId, phone: value.phone, revealedAt: value.revealedAt })
}

function safeDestruction(value) {
  if (value === null || typeof value !== 'object' || typeof value.entryId !== 'string' || typeof value.destroyedAt !== 'string' || typeof value.alreadyDestroyed !== 'boolean') throw new TypeError('Call destruction is invalid')
  return Object.freeze({ entryId: value.entryId, destroyedAt: value.destroyedAt, alreadyDestroyed: value.alreadyDestroyed })
}

function options(input, defaults) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Call endpoint options must be a plain object')
  const configuration = { records: input.records, guard: input.guard ?? defaults.guard, actor: input.actor ?? defaults.actor, body: input.body ?? defaults.body, clock: input.clock ?? defaults.clock, log: input.log ?? defaults.log }
  if (!Object.values(configuration).every((value) => typeof value === 'function')) throw new TypeError('Call endpoint adapters are invalid')
  return Object.freeze(configuration)
}

function repository(configuration) {
  const value = configuration.records()
  if (value === null || typeof value !== 'object' || !['list', 'get', 'metrics', 'reveal', 'destroy'].every((method) => typeof value[method] === 'function')) throw new TypeError('Call repository is invalid')
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
  if (error instanceof AdminClinicQueryError) return failure(400, error.code, error.code === 'INVALID_BODY' ? 'Проверьте подтверждение операции' : 'Проверьте параметры запроса')
  if (error instanceof MangoCallRecordError && error.code === 'CALL_NOT_FOUND') return failure(404, error.code, 'Звонок не найден')
  if (error instanceof MangoCallRecordError && error.code === 'CALL_PII_DESTROYED') return failure(410, error.code, 'Персональные данные звонящего уничтожены')
  if (error instanceof MangoCallRecordError && error.code === 'CALL_CONFLICT') return failure(409, error.code, 'Операция со звонком недоступна')
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
    if (blocked) return blocked
    try {
      const query = parseCallQuery(new URL(request.url).searchParams)
      const calls = repository(configuration)
      const [page, metrics] = await Promise.all([calls.list(query), calls.metrics(metricRange(query, configuration.clock))])
      return json({ ...safeCallPage(page), metrics: safeMetrics(metrics) }, 200)
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
    if (blocked) return blocked
    try {
      const entryId = parseCallEntryId(params?.entryId)
      return json({ data: safeCall(await repository(configuration).get({ entryId })) }, 200)
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
    if (blocked) return blocked
    try {
      const entryId = parseCallEntryId(params?.entryId)
      const actor = await configuration.actor(request)
      return json({ data: safeReveal(await repository(configuration).reveal({ entryId, actor })) }, 200)
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
    if (blocked) return blocked
    const parsed = await configuration.body(request)
    if (!parsed.valid) return bodyFailure(parsed)
    try {
      parseDestroyCallBody(parsed.value)
      const entryId = parseCallEntryId(params?.entryId)
      const actor = await configuration.actor(request)
      return json({ data: safeDestruction(await repository(configuration).destroy({ entryId, actor })) }, 200)
    } catch (error) {
      return endpointFailure(configuration, 'DESTROY_FAILED', error)
    }
  }
}
