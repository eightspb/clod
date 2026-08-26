import { AdminClinicQueryError, parseDestroyPatientBody, parsePatientCallQuery, parsePatientId, parsePatientQuery } from './admin-clinic-query.js'
import { adminActor, guardAdminPii, guardAdminRead, readAdminJson } from './admin-api.js'
import { safeCallPage } from './admin-call-api.js'
import { PatientRecordError } from './patient-records.js'

const JSON_HEADERS = Object.freeze({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' })
const PATIENT_FIELDS = Object.freeze(['id', 'name', 'phoneMask', 'firstSeenAt', 'lastSeenAt', 'createdAt', 'updatedAt', 'piiDestroyedAt'])

function json(payload, status) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}

function failure(status, error, message) {
  return json({ error, message }, status)
}

function safePatient(value) {
  if (value === null || typeof value !== 'object' || !PATIENT_FIELDS.every((field) => Object.hasOwn(value, field))) throw new TypeError('Patient response is invalid')
  return Object.freeze(Object.fromEntries(PATIENT_FIELDS.map((field) => [field, value[field]])))
}

function page(value) {
  if (value === null || typeof value !== 'object' || !Array.isArray(value.items)) throw new TypeError('Patient page is invalid')
  const number = value.page
  const size = value.pageSize
  const total = value.total
  const pages = value.pages
  if (![number, size, total, pages].every(Number.isSafeInteger)) throw new TypeError('Patient page is invalid')
  return Object.freeze({ data: value.items.map(safePatient), page: Object.freeze({ number, size, total, pages }) })
}

function reveal(value) {
  if (value === null || typeof value !== 'object' || typeof value.id !== 'string' || typeof value.phone !== 'string' || typeof value.revealedAt !== 'string') throw new TypeError('Patient reveal is invalid')
  return Object.freeze({ id: value.id, phone: value.phone, revealedAt: value.revealedAt })
}

function destruction(value) {
  if (value === null || typeof value !== 'object' || typeof value.id !== 'string' || typeof value.destroyedAt !== 'string' || typeof value.alreadyDestroyed !== 'boolean') throw new TypeError('Patient destruction is invalid')
  return Object.freeze({ id: value.id, destroyedAt: value.destroyedAt, alreadyDestroyed: value.alreadyDestroyed })
}

function options(input, defaults) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Patient endpoint options must be a plain object')
  const records = input.records
  const guard = input.guard ?? defaults.guard
  const actor = input.actor ?? defaults.actor
  const body = input.body ?? defaults.body
  const log = input.log ?? defaults.log
  const calls = input.calls
  if (![records, guard, actor, body, log].every((value) => typeof value === 'function')) throw new TypeError('Patient endpoint adapters are invalid')
  if (calls !== undefined && typeof calls !== 'function') throw new TypeError('Patient call adapter is invalid')
  return Object.freeze({ records, guard, actor, body, log, calls })
}

function knownFailure(error) {
  if (!(error instanceof PatientRecordError)) return undefined
  if (error.code === 'PATIENT_NOT_FOUND') return failure(404, error.code, 'Пациент не найден')
  if (error.code === 'PATIENT_PII_DESTROYED') return failure(410, error.code, 'Персональные данные пациента уничтожены')
  return undefined
}

function validationFailure(error) {
  if (!(error instanceof AdminClinicQueryError)) return undefined
  const body = error.code === 'INVALID_BODY'
  return failure(400, error.code, body ? 'Проверьте подтверждение операции' : 'Проверьте параметры запроса')
}

function report(configuration, stage) {
  try {
    configuration.log(stage)
  } catch {
    return
  }
}

function endpointFailure(configuration, stage, error) {
  const validation = validationFailure(error)
  if (validation) return validation
  const known = knownFailure(error)
  if (known) return known
  report(configuration, stage)
  return failure(503, 'PATIENTS_UNAVAILABLE', 'Данные пациентов временно недоступны')
}

const DEFAULTS = Object.freeze({ guard: guardAdminRead, actor: adminActor, body: readAdminJson, log: (stage) => console.error('[admin/patients]', stage) })
const PII_DEFAULTS = Object.freeze({ ...DEFAULTS, guard: guardAdminPii })

/**
 * Creates the protected patient list endpoint.
 */
export function createPatientIndexEndpoint(input) {
  const configuration = options(input, DEFAULTS)
  return async function patientIndexEndpoint({ request }) {
    const blocked = await configuration.guard(request)
    if (blocked) return blocked
    try {
      const query = parsePatientQuery(new URL(request.url).searchParams)
      const repository = configuration.records()
      return json(page(await repository.list(query)), 200)
    } catch (error) {
      return endpointFailure(configuration, 'LIST_FAILED', error)
    }
  }
}

/**
 * Creates the protected patient detail endpoint.
 */
export function createPatientDetailEndpoint(input) {
  const configuration = options(input, DEFAULTS)
  return async function patientDetailEndpoint({ request, params }) {
    const blocked = await configuration.guard(request)
    if (blocked) return blocked
    try {
      const id = parsePatientId(params?.id)
      const query = configuration.calls === undefined ? undefined : parsePatientCallQuery(new URL(request.url).searchParams)
      const repository = configuration.records()
      const patient = safePatient(await repository.get({ id }))
      if (configuration.calls === undefined) return json({ data: patient }, 200)
      const calls = configuration.calls()
      if (!calls || typeof calls.list !== 'function') throw new TypeError('Patient call repository is invalid')
      return json({ data: patient, calls: safeCallPage(await calls.list({ ...query, patientId: id })) }, 200)
    } catch (error) {
      return endpointFailure(configuration, 'DETAIL_FAILED', error)
    }
  }
}

/**
 * Creates the separately limited and audited patient reveal endpoint.
 */
export function createPatientRevealEndpoint(input) {
  const configuration = options(input, PII_DEFAULTS)
  return async function patientRevealEndpoint({ request, params }) {
    const blocked = await configuration.guard(request)
    if (blocked) return blocked
    try {
      const id = parsePatientId(params?.id)
      const actor = await configuration.actor(request)
      const repository = configuration.records()
      return json({ data: reveal(await repository.reveal({ id, actor })) }, 200)
    } catch (error) {
      return endpointFailure(configuration, 'REVEAL_FAILED', error)
    }
  }
}

/**
 * Creates the confirmed, separately limited patient PII destruction endpoint.
 */
export function createPatientPersonalDataEndpoint(input) {
  const configuration = options(input, PII_DEFAULTS)
  return async function patientPersonalDataEndpoint({ request, params }) {
    const blocked = await configuration.guard(request)
    if (blocked) return blocked
    const parsed = await configuration.body(request)
    if (!parsed.valid) return parsed.tooLarge ? failure(413, 'BODY_TOO_LARGE', 'Тело запроса превышает допустимый размер') : failure(400, 'INVALID_JSON', 'Передайте корректный JSON')
    try {
      parseDestroyPatientBody(parsed.value)
      const id = parsePatientId(params?.id)
      const actor = await configuration.actor(request)
      const repository = configuration.records()
      return json({ data: destruction(await repository.destroy({ id, actor })) }, 200)
    } catch (error) {
      return endpointFailure(configuration, 'DESTROY_FAILED', error)
    }
  }
}
