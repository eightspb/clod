import { AdminAppointmentError } from './admin-appointment.js'
import { parseAppointmentCancelBody, parseAppointmentCreateBody, parseAppointmentId, parseAppointmentQuery, parseAppointmentResolveBody, AdminClinicQueryError } from './admin-clinic-query.js'
import { guardAdminRead, guardAdminWrite, readAdminJson } from './admin-api.js'
import { AppointmentRecordError } from './appointment-records.js'

const JSON_HEADERS = Object.freeze({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' })
const APPOINTMENT_FIELDS = Object.freeze(['id', 'patient', 'source', 'status', 'medflexClaimId', 'medflexLpuId', 'medflexDoctorId', 'medflexSpecialityId', 'medflexServiceId', 'doctorName', 'specialityName', 'serviceName', 'startsAt', 'endsAt', 'priceKopecks', 'failureCode', 'createdAt', 'updatedAt', 'cancelledAt'])

function json(payload, status) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}

function failure(status, error, message) {
  return json({ error, message }, status)
}

function safePatient(value) {
  if (value === null || typeof value !== 'object' || typeof value.id !== 'string' || !Object.hasOwn(value, 'name') || !Object.hasOwn(value, 'phoneMask')) throw new TypeError('Appointment patient response is invalid')
  return Object.freeze({ id: value.id, name: value.name, phoneMask: value.phoneMask })
}

function safeAppointment(value) {
  if (value === null || typeof value !== 'object' || !APPOINTMENT_FIELDS.every((field) => Object.hasOwn(value, field))) throw new TypeError('Appointment response is invalid')
  const result = Object.fromEntries(APPOINTMENT_FIELDS.map((field) => [field, field === 'patient' ? safePatient(value.patient) : value[field]]))
  return Object.freeze(result)
}

function safePage(value) {
  if (value === null || typeof value !== 'object' || !Array.isArray(value.items)) throw new TypeError('Appointment page is invalid')
  const number = value.page
  const size = value.pageSize
  const total = value.total
  const pages = value.pages
  if (![number, size, total, pages].every(Number.isSafeInteger)) throw new TypeError('Appointment page is invalid')
  return Object.freeze({ data: value.items.map(safeAppointment), page: Object.freeze({ number, size, total, pages }) })
}

function options(input, defaults) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Appointment endpoint options must be a plain object')
  const workflow = input.workflow
  const readGuard = input.readGuard ?? input.guard ?? defaults.readGuard
  const writeGuard = input.writeGuard ?? input.guard ?? defaults.writeGuard
  const body = input.body ?? defaults.body
  const log = input.log ?? defaults.log
  if (![workflow, readGuard, writeGuard, body, log].every((value) => typeof value === 'function')) throw new TypeError('Appointment endpoint adapters are invalid')
  return Object.freeze({ workflow, readGuard, writeGuard, body, log })
}

function report(configuration, stage) {
  try {
    configuration.log(stage)
  } catch {
    return
  }
}

function knownFailure(error) {
  if (error instanceof AdminClinicQueryError) return failure(400, error.code, error.code === 'INVALID_BODY' ? 'Проверьте данные операции' : 'Проверьте параметры запроса')
  if (error instanceof AppointmentRecordError && error.code === 'APPOINTMENT_NOT_FOUND') return failure(404, error.code, 'Запись не найдена')
  if (error instanceof AppointmentRecordError && ['APPOINTMENT_INVALID_TRANSITION', 'APPOINTMENT_CONFLICT', 'APPOINTMENT_DUPLICATE', 'APPOINTMENT_CLAIM_CONFLICT'].includes(error.code)) return failure(409, error.code, 'Операция с записью недоступна')
  if (error instanceof AdminAppointmentError && error.code === 'INVALID_TRANSITION') return failure(409, error.code, 'Переход статуса записи недоступен')
  if (error instanceof AdminAppointmentError && error.code === 'CANCELLATION_UNCERTAIN') return failure(502, error.code, 'Результат отмены в Medflex требует проверки')
  if (error instanceof AdminAppointmentError) return failure(502, error.code, 'Medflex не подтвердил отмену записи')
  return undefined
}

function endpointFailure(configuration, stage, error) {
  const known = knownFailure(error)
  if (known) return known
  report(configuration, stage)
  return failure(503, 'APPOINTMENTS_UNAVAILABLE', 'Данные записей временно недоступны')
}

function bodyFailure(parsed) {
  return parsed.tooLarge ? failure(413, 'BODY_TOO_LARGE', 'Тело запроса превышает допустимый размер') : failure(400, 'INVALID_JSON', 'Передайте корректный JSON')
}

function service(configuration) {
  const value = configuration.workflow()
  if (value === null || typeof value !== 'object' || !['list', 'get', 'createExisting', 'createMedflex', 'cancel', 'resolve'].every((method) => typeof value[method] === 'function')) throw new TypeError('Appointment workflow is invalid')
  return value
}

const DEFAULTS = Object.freeze({ readGuard: guardAdminRead, writeGuard: guardAdminWrite, body: readAdminJson, log: (stage) => console.error('[admin/appointments]', stage) })

/**
 * Creates the appointment list and creation endpoints.
 */
export function createAppointmentIndexEndpoint(input) {
  const configuration = options(input, DEFAULTS)
  const GET = async ({ request }) => {
    const blocked = await configuration.readGuard(request)
    if (blocked) return blocked
    try {
      const query = parseAppointmentQuery(new URL(request.url).searchParams)
      return json(safePage(await service(configuration).list(query)), 200)
    } catch (error) {
      return endpointFailure(configuration, 'LIST_FAILED', error)
    }
  }
  const POST = async ({ request }) => {
    const blocked = await configuration.writeGuard(request)
    if (blocked) return blocked
    const parsed = await configuration.body(request)
    if (!parsed.valid) return bodyFailure(parsed)
    try {
      const command = parseAppointmentCreateBody(parsed.value)
      const workflow = service(configuration)
      if (command.source === 'admin_existing') return json({ data: safeAppointment(await workflow.createExisting({ profile: command.profile, appointment: command.appointment })) }, 201)
      const result = await workflow.createMedflex(command.booking)
      if (result === null || typeof result !== 'object' || !Number.isInteger(result.status) || result.status < 100 || result.status > 599 || !Object.hasOwn(result, 'body')) throw new TypeError('Shared booking result is invalid')
      return json(result.body, result.status)
    } catch (error) {
      return endpointFailure(configuration, 'CREATE_FAILED', error)
    }
  }
  return Object.freeze({ GET, POST })
}

/**
 * Creates the masked appointment detail endpoint.
 */
export function createAppointmentDetailEndpoint(input) {
  const configuration = options(input, DEFAULTS)
  return async function appointmentDetailEndpoint({ request, params }) {
    const blocked = await configuration.readGuard(request)
    if (blocked) return blocked
    try {
      const id = parseAppointmentId(params?.id)
      return json({ data: safeAppointment(await service(configuration).get({ id })) }, 200)
    } catch (error) {
      return endpointFailure(configuration, 'DETAIL_FAILED', error)
    }
  }
}

/**
 * Creates the externally fenced appointment cancellation endpoint.
 */
export function createAppointmentCancelEndpoint(input) {
  const configuration = options(input, DEFAULTS)
  return async function appointmentCancelEndpoint({ request, params }) {
    const blocked = await configuration.writeGuard(request)
    if (blocked) return blocked
    const parsed = await configuration.body(request)
    if (!parsed.valid) return bodyFailure(parsed)
    try {
      parseAppointmentCancelBody(parsed.value)
      const id = parseAppointmentId(params?.id)
      const result = await service(configuration).cancel({ id })
      return json({ data: { appointment: safeAppointment(result.appointment), warning: result.warning } }, 200)
    } catch (error) {
      return endpointFailure(configuration, 'CANCEL_FAILED', error)
    }
  }
}

/**
 * Creates the manual needs-review resolution endpoint.
 */
export function createAppointmentResolveEndpoint(input) {
  const configuration = options(input, DEFAULTS)
  return async function appointmentResolveEndpoint({ request, params }) {
    const blocked = await configuration.writeGuard(request)
    if (blocked) return blocked
    const parsed = await configuration.body(request)
    if (!parsed.valid) return bodyFailure(parsed)
    try {
      const id = parseAppointmentId(params?.id)
      const resolution = parseAppointmentResolveBody(parsed.value)
      return json({ data: safeAppointment(await service(configuration).resolve({ id, claimId: resolution.claimId })) }, 200)
    } catch (error) {
      return endpointFailure(configuration, 'RESOLVE_FAILED', error)
    }
  }
}
