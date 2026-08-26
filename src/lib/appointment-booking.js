import { findAppointmentHistory } from './appointment-history.js'
import { createBookingIntentRepository } from './appointment-intents.js'
import { verifyAppointmentSlot } from './appointment-schedule.js'
import { validateBookingPayload } from './appointment-validation.js'
import { createMedflexClient, MedflexError } from './medflex-client.js'
import { resolveMedflexAppointmentType, resolveMedflexDoctor } from './medflex-doctors.js'

const CONFIGURATION_KEYS = Object.freeze(['intentClient', 'intentSecret', 'appointmentRecords', 'source', 'medflex', 'clock', 'log'])
const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SLOT_FAILURE_CODES = new Set(['MEDFLEX_CONFLICT', 'MEDFLEX_SLOT_UNAVAILABLE'])

function result(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) })
}

function error(status, code, message, extra) {
  return result(status, { error: code, message, ...extra })
}

function validationError(validation) {
  return error(400, validation.error.code, 'Проверьте данные для записи', { fields: validation.error.fields })
}

function unavailable() {
  return error(503, 'BOOKING_UNAVAILABLE', 'Запись временно недоступна. Попробуйте позже')
}

function slotUnavailable() {
  return error(409, 'SLOT_UNAVAILABLE', 'Выбранное время уже недоступно', { freshIntentRequired: true, refreshSchedule: true })
}

function requestConflict() {
  return error(409, 'BOOKING_REQUEST_CONFLICT', 'Эта попытка записи не может быть повторена')
}

function pending() {
  return result(202, { data: { status: 'pending', canRetry: false } })
}

function uncertain() {
  return result(202, { data: { status: 'uncertain', canRetry: false, phoneFallback: true } })
}

function confirmed(intent, status) {
  const doctor = resolveMedflexDoctor(intent.doctorSlug)
  const appointmentType = resolveMedflexAppointmentType(intent.doctorSlug, intent.appointmentType)
  const doctorPublic = doctor.available ? { slug: doctor.slug, name: doctor.name, location: doctor.location, timeZone: doctor.timeZone } : { slug: intent.doctorSlug }
  const typePublic = appointmentType.available ? { key: appointmentType.typeKey, label: appointmentType.typeLabel } : { key: intent.appointmentType }
  return result(status, { data: { status: 'confirmed', claimId: intent.claimId, doctor: doctorPublic, appointmentType: typePublic, startsAt: intent.startsAt, endsAt: intent.endsAt, price: intent.price } })
}

function failed(intent) {
  if (intent.failureCode === 'PATIENT_REJECTED' || intent.failureCode === 'UPSTREAM_REJECTED') return error(422, 'BOOKING_REJECTED', 'Не удалось подтвердить запись')
  return unavailable()
}

function outcomeResult(outcome, confirmedStatus = 200) {
  if (!outcome || typeof outcome !== 'object' || typeof outcome.action !== 'string') return unavailable()
  if (outcome.action === 'confirmed') return confirmed(outcome.public, confirmedStatus)
  if (outcome.action === 'pending') return pending()
  if (outcome.action === 'reconcile') return uncertain()
  if (outcome.action === 'failed') return failed(outcome.public)
  if (outcome.action === 'duplicate' || outcome.action === 'mismatch') return requestConflict()
  return unavailable()
}

function safeLog(configuration, stage) {
  try {
    configuration.log(stage)
  } catch {
    return
  }
}

function preparationInput(configuration, booking, slot, identity) {
  return Object.freeze({ id: booking.intentId, source: configuration.source, profile: booking.patient, appointment: Object.freeze({ medflexLpuId: slot.lpuId, medflexDoctorId: slot.doctorId, medflexSpecialityId: slot.specialityId, medflexServiceId: null, doctorName: identity.name, specialityName: identity.typeLabel, serviceName: null, startsAt: booking.dtStart, endsAt: booking.dtEnd, priceRubles: slot.price, localDoctorId: null }) })
}

function projectionInput(booking, intent) {
  const value = { id: booking.intentId, status: intent.status }
  if (intent.status === 'confirmed') value.claimId = intent.claimId
  if (intent.status === 'failed') value.failureCode = intent.failureCode
  return Object.freeze(value)
}

async function projectLocal(configuration, booking, intent) {
  const attempts = intent.status === 'confirmed' ? 3 : 1
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await configuration.appointmentRecords.project(projectionInput(booking, intent))
      return true
    } catch {
      if (attempt === attempts - 1) safeLog(configuration, 'LOCAL_PROJECTION_FAILED')
    }
  }
  return false
}

async function projectedResult(configuration, booking, outcome, confirmedStatus = 200) {
  if (!outcome || typeof outcome !== 'object' || !outcome.public || typeof outcome.public.status !== 'string') return outcomeResult(outcome, confirmedStatus)
  if (!['confirmed', 'uncertain', 'failed'].includes(outcome.public.status)) return outcomeResult(outcome, confirmedStatus)
  const projected = await projectLocal(configuration, booking, outcome.public)
  if (projected) return outcomeResult(outcome, confirmedStatus)
  return outcome.public.status === 'failed' ? unavailable() : uncertain()
}

function localTimestamp(timestamp) {
  const milliseconds = Date.parse(timestamp)
  if (!Number.isFinite(milliseconds)) throw new TypeError('Stored appointment timestamp is invalid')
  const shifted = new Date(milliseconds + MOSCOW_OFFSET_MS).toISOString()
  return `${shifted.slice(0, 10)} ${shifted.slice(11, 16)}`
}

async function reconcile(configuration, booking, outcome) {
  try {
    const slot = await configuration.repository.reconciliationScope({ capability: outcome.capability })
    const date = slot.dtStart.slice(0, 10)
    const client = configuration.medflex()
    const history = await findAppointmentHistory({ loadPage: (page) => client.getAppointmentHistory({ dateStart: date, dateEnd: date, lpuId: slot.lpuId, page, size: 50 }), booking, slot })
    const transition = await configuration.repository.reconcile({ capability: outcome.capability, history })
    return projectedResult(configuration, booking, transition, 200)
  } catch {
    safeLog(configuration, 'HISTORY_RECONCILIATION_FAILED')
    await projectLocal(configuration, booking, outcome.public)
    return uncertain()
  }
}

function scheduleInput(booking, identity) {
  const from = localTimestamp(booking.dtStart).slice(0, 10)
  return Object.freeze({ from, query: Object.freeze({ townId: identity.townId, dateStart: from, days: 1, doctorIds: [identity.doctorId], lpuIds: [identity.lpuId], specialityIds: [identity.specialityId], page: 1 }) })
}

async function liveSlot(client, booking, identity, now) {
  const schedule = scheduleInput(booking, identity)
  const page = await client.getSchedule(schedule.query)
  return verifyAppointmentSlot({ doctorSlug: booking.doctorSlug, appointmentType: booking.appointmentType, page, dtStart: booking.dtStart, dtEnd: booking.dtEnd, birthday: booking.patient.birthday, from: schedule.from, days: 1, now })
}

function verificationFailure(verification) {
  if (verification.reason === 'DOCTOR_UNAVAILABLE') return error(404, 'DOCTOR_UNAVAILABLE', 'Онлайн-запись к этому врачу недоступна')
  if (verification.reason === 'APPOINTMENT_TYPE_UNAVAILABLE') return error(409, 'APPOINTMENT_TYPE_UNAVAILABLE', 'Выбранный тип приёма недоступен', { freshIntentRequired: true, refreshSchedule: true })
  if (verification.reason === 'AGE_NOT_ALLOWED') return error(400, 'AGE_NOT_ALLOWED', 'Этот приём недоступен для возраста пациента')
  if (verification.reason === 'SLOT_UNAVAILABLE') return slotUnavailable()
  return unavailable()
}

function createInput(booking, slot) {
  return Object.freeze({ doctor: Object.freeze({ id: slot.doctorId, lpu_id: slot.lpuId, speciality_id: slot.specialityId }), appointment: Object.freeze({ dt_start: slot.dtStart, dt_end: slot.dtEnd, comment: booking.comment, price: slot.price }), client: Object.freeze({ first_name: booking.patient.firstName, second_name: booking.patient.secondName, last_name: booking.patient.lastName, mobile_phone: booking.patient.phone, birthday: booking.patient.birthday }) })
}

async function recordFailure(configuration, capability, failureCode) {
  try {
    return await configuration.repository.fail({ capability, failureCode })
  } catch {
    safeLog(configuration, 'INTENT_FAILURE_TRANSITION_FAILED')
    return undefined
  }
}

async function recordUncertain(configuration, capability) {
  try {
    return await configuration.repository.markUncertain({ capability })
  } catch {
    safeLog(configuration, 'INTENT_UNCERTAIN_TRANSITION_FAILED')
    return undefined
  }
}

async function uncertainResult(configuration, booking, transition) {
  if (!transition) return uncertain()
  return projectedResult(configuration, booking, transition, 200)
}

async function prepareLocal(configuration, booking, slot, identity, acquired) {
  try {
    await configuration.appointmentRecords.prepare(preparationInput(configuration, booking, slot, identity))
    return true
  } catch {
    safeLog(configuration, 'LOCAL_PREPARATION_FAILED')
    await recordFailure(configuration, acquired.capability, 'LOCAL_PERSISTENCE_FAILED')
    return false
  }
}

async function dispatch(configuration, client, booking, slot, identity, acquired) {
  if (!await prepareLocal(configuration, booking, slot, identity, acquired)) return unavailable()
  let operation
  try {
    operation = client.createDoctorAppointment(createInput(booking, slot))
  } catch {
    safeLog(configuration, 'CREATE_PRE_DISPATCH_FAILED')
    const transition = await recordFailure(configuration, acquired.capability, 'UPSTREAM_NOT_ACCEPTED')
    return transition ? projectedResult(configuration, booking, transition) : unavailable()
  }
  let claim
  try {
    claim = await operation
  } catch (caught) {
    if (caught instanceof MedflexError && SLOT_FAILURE_CODES.has(caught.code) && caught.outcomeUncertain !== true) {
      safeLog(configuration, 'CREATE_SLOT_CONFLICT')
      const transition = await recordFailure(configuration, acquired.capability, 'SLOT_UNAVAILABLE')
      if (!transition) return slotUnavailable()
      await projectLocal(configuration, booking, transition.public)
      return transition.action !== 'failed' ? outcomeResult(transition) : slotUnavailable()
    }
    if (caught instanceof MedflexError && caught.outcomeUncertain !== true) {
      safeLog(configuration, 'CREATE_NOT_ACCEPTED')
      const transition = await recordFailure(configuration, acquired.capability, 'UPSTREAM_NOT_ACCEPTED')
      return transition ? projectedResult(configuration, booking, transition) : unavailable()
    }
    safeLog(configuration, 'CREATE_OUTCOME_UNCERTAIN')
    const transition = await recordUncertain(configuration, acquired.capability)
    return uncertainResult(configuration, booking, transition)
  }
  if (!claim || typeof claim.claim_id !== 'string' || !UUID_PATTERN.test(claim.claim_id)) {
    safeLog(configuration, 'CREATE_RESPONSE_UNCERTAIN')
    const transition = await recordUncertain(configuration, acquired.capability)
    return uncertainResult(configuration, booking, transition)
  }
  try {
    const transition = await configuration.repository.confirm({ capability: acquired.capability, claimId: claim.claim_id })
    if (transition.action === 'confirmed') return projectedResult(configuration, booking, transition, 201)
    if (transition.action === 'reconcile' && transition.capability) {
      const reconciled = await configuration.repository.reconcile({ capability: transition.capability, history: { found: true, claimId: claim.claim_id } })
      if (reconciled.action === 'confirmed') return projectedResult(configuration, booking, reconciled, 201)
    }
    return projectedResult(configuration, booking, transition)
  } catch {
    safeLog(configuration, 'INTENT_CONFIRM_FAILED')
    const transition = await recordUncertain(configuration, acquired.capability)
    return uncertainResult(configuration, booking, transition)
  }
}

async function validateAndDispatch(configuration, raw) {
  let now
  let strict
  try {
    now = configuration.clock()
    strict = validateBookingPayload(raw, { now })
  } catch {
    safeLog(configuration, 'BOOKING_CLOCK_FAILED')
    return unavailable()
  }
  if (!strict.valid) return validationError(strict)
  const booking = strict.value
  const identity = resolveMedflexAppointmentType(booking.doctorSlug, booking.appointmentType)
  if (!identity.available) return identity.reason === 'DOCTOR_UNAVAILABLE' ? error(404, 'DOCTOR_UNAVAILABLE', 'Онлайн-запись к этому врачу недоступна') : error(409, 'APPOINTMENT_TYPE_UNAVAILABLE', 'Выбранный тип приёма недоступен', { freshIntentRequired: true, refreshSchedule: true })
  let client
  let slot
  try {
    client = configuration.medflex()
    slot = await liveSlot(client, booking, identity, now)
  } catch {
    safeLog(configuration, 'SCHEDULE_LOOKUP_FAILED')
    return unavailable()
  }
  if (!slot.valid) return verificationFailure(slot)
  let acquired
  try {
    acquired = await configuration.repository.acquire({ booking, slot })
  } catch {
    safeLog(configuration, 'INTENT_ACQUIRE_FAILED')
    return unavailable()
  }
  if (acquired.action === 'dispatch' || acquired.action === 'retry') return dispatch(configuration, client, booking, slot, identity, acquired)
  if (acquired.action === 'reconcile' && acquired.capability) return reconcile(configuration, booking, acquired)
  return outcomeResult(acquired)
}

async function submit(configuration, raw) {
  let now
  let structural
  try {
    now = configuration.clock()
    structural = validateBookingPayload(raw, { now, mode: 'resume' })
  } catch {
    safeLog(configuration, 'BOOKING_VALIDATION_FAILED')
    return unavailable()
  }
  if (!structural.valid) return validationError(structural)
  let runtime
  try {
    const repositoryInput = { client: configuration.intentClient, clock: configuration.clock }
    if (Object.hasOwn(configuration, 'intentSecret')) repositoryInput.secret = configuration.intentSecret
    runtime = Object.freeze({ ...configuration, repository: createBookingIntentRepository(repositoryInput) })
  } catch {
    safeLog(configuration, 'INTENT_CONFIGURATION_FAILED')
    return unavailable()
  }
  let resumed
  try {
    resumed = await runtime.repository.resume({ booking: structural.value })
  } catch {
    safeLog(runtime, 'INTENT_RESUME_FAILED')
    return unavailable()
  }
  if (resumed.action === 'confirmed' || resumed.action === 'failed') return projectedResult(runtime, structural.value, resumed)
  if (resumed.action === 'pending' || resumed.action === 'duplicate' || resumed.action === 'mismatch') return outcomeResult(resumed)
  if (resumed.action === 'reconcile' && resumed.capability) return reconcile(runtime, structural.value, resumed)
  if (resumed.action !== 'validate') return unavailable()
  return validateAndDispatch(runtime, raw)
}

function readConfiguration(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Appointment booking configuration must be a plain object')
  const prototype = Object.getPrototypeOf(input)
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError('Appointment booking configuration must be a plain object')
  if (!Reflect.ownKeys(input).every((key) => typeof key === 'string' && CONFIGURATION_KEYS.includes(key))) throw new TypeError('Appointment booking configuration contains unknown fields')
  if (!Object.hasOwn(input, 'intentClient')) throw new TypeError('Appointment booking intent client is required')
  if (!Object.hasOwn(input, 'appointmentRecords')) throw new TypeError('Appointment booking record adapter is required')
  const medflex = input.medflex === undefined ? createMedflexClient : input.medflex
  const clock = input.clock === undefined ? () => new Date() : input.clock
  const log = input.log === undefined ? (stage) => console.error('[appointments/book]', stage) : input.log
  const source = input.source === undefined ? 'website' : input.source
  const appointmentRecords = input.appointmentRecords
  if (typeof medflex !== 'function' || typeof clock !== 'function' || typeof log !== 'function') throw new TypeError('Appointment booking adapters must be functions')
  if (appointmentRecords === null || typeof appointmentRecords !== 'object' || typeof appointmentRecords.prepare !== 'function' || typeof appointmentRecords.project !== 'function') throw new TypeError('Appointment booking record adapter is invalid')
  if (!['website', 'admin_medflex'].includes(source)) throw new TypeError('Appointment booking source is invalid')
  const configuration = { intentClient: input.intentClient, appointmentRecords, source, medflex, clock, log }
  if (Object.hasOwn(input, 'intentSecret')) configuration.intentSecret = input.intentSecret
  return Object.freeze(configuration)
}

/**
 * Creates a booking workflow that owns validation, intent safety, Medflex dispatch, and reconciliation.
 */
export function createAppointmentBooking(input) {
  const configuration = readConfiguration(input)
  return Object.freeze({ submit: (raw) => submit(configuration, raw) })
}
