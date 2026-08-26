import { randomUUID } from 'node:crypto'
import { MedflexError } from './medflex-client.js'

const FACTORY_KEYS = Object.freeze(['records', 'booking', 'medflex', 'uuid'])
const EXISTING_KEYS = Object.freeze(['profile', 'appointment'])
const ID_KEYS = Object.freeze(['id'])
const RESOLVE_KEYS = Object.freeze(['id', 'claimId'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ERROR_MESSAGES = Object.freeze({
  INVALID_TRANSITION: 'Administrative appointment transition is not allowed',
  CANCELLATION_REJECTED: 'Medflex rejected the appointment cancellation',
  CANCELLATION_UNCERTAIN: 'Medflex cancellation outcome is uncertain',
})

/**
 * Represents a safe administrative appointment workflow failure.
 */
export class AdminAppointmentError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(ERROR_MESSAGES, code) ? code : 'CANCELLATION_REJECTED'
    super(ERROR_MESSAGES[safeCode])
    this.name = 'AdminAppointmentError'
    this.code = safeCode
    Object.freeze(this)
  }
}

function record(input, allowed, required, scope) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`${scope} must be a plain object`)
  const prototype = Object.getPrototypeOf(input)
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${scope} must be a plain object`)
  const value = Object.create(null)
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !allowed.includes(key)) throw new TypeError(`${scope} contains unknown fields`)
    const descriptor = Object.getOwnPropertyDescriptor(input, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError(`${scope} must contain data fields only`)
    value[key] = descriptor.value
  }
  if (!required.every((key) => Object.hasOwn(value, key))) throw new TypeError(`${scope} is missing required fields`)
  return value
}

function uuid(value, scope) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new TypeError(`${scope} must be a UUID`)
  return value.toLowerCase()
}

function configuration(input) {
  const options = record(input, FACTORY_KEYS, ['records', 'booking', 'medflex'], 'Admin appointment options')
  const runtimeUuid = options.uuid ?? randomUUID
  const records = options.records
  const booking = options.booking
  if (records === null || typeof records !== 'object' || !['list', 'get', 'createExisting', 'project', 'cancel'].every((method) => typeof records[method] === 'function')) throw new TypeError('Admin appointment record adapter is invalid')
  if (booking === null || typeof booking !== 'object' || typeof booking.submit !== 'function' || typeof options.medflex !== 'function' || typeof runtimeUuid !== 'function') throw new TypeError('Admin appointment external adapters are invalid')
  return Object.freeze({ records, booking, medflex: options.medflex, uuid: runtimeUuid })
}

async function createExisting(runtime, raw) {
  const input = record(raw, EXISTING_KEYS, EXISTING_KEYS, 'Existing appointment input')
  const id = uuid(runtime.uuid(), 'Generated appointment ID')
  return runtime.records.createExisting({ id, profile: input.profile, appointment: input.appointment })
}

async function cancelExternal(runtime, appointment) {
  if (typeof appointment.medflexClaimId !== 'string') throw new AdminAppointmentError('INVALID_TRANSITION')
  try {
    const client = runtime.medflex()
    if (client === null || typeof client !== 'object' || typeof client.cancelDoctorAppointment !== 'function') throw new TypeError('Medflex cancellation adapter is invalid')
    await client.cancelDoctorAppointment({ uuid: appointment.medflexClaimId })
  } catch (error) {
    if (error instanceof MedflexError && error.code === 'MEDFLEX_NOT_FOUND') return
    if (error instanceof MedflexError && error.outcomeUncertain === true) throw new AdminAppointmentError('CANCELLATION_UNCERTAIN')
    throw new AdminAppointmentError('CANCELLATION_REJECTED')
  }
}

async function cancel(runtime, raw) {
  const input = record(raw, ID_KEYS, ID_KEYS, 'Appointment cancellation')
  const id = uuid(input.id, 'Appointment ID')
  const current = await runtime.records.get({ id })
  if (current.status === 'cancelled') return Object.freeze({ appointment: current, warning: null })
  if (current.status !== 'confirmed') throw new AdminAppointmentError('INVALID_TRANSITION')
  if (current.source === 'admin_existing') return Object.freeze({ appointment: await runtime.records.cancel({ id }), warning: 'LOCAL_ONLY' })
  if (!['website', 'admin_medflex'].includes(current.source)) throw new AdminAppointmentError('INVALID_TRANSITION')
  await cancelExternal(runtime, current)
  return Object.freeze({ appointment: await runtime.records.cancel({ id }), warning: null })
}

async function resolve(runtime, raw) {
  const input = record(raw, RESOLVE_KEYS, RESOLVE_KEYS, 'Appointment resolution')
  const id = uuid(input.id, 'Appointment ID')
  const claimId = uuid(input.claimId, 'Medflex claim ID')
  const current = await runtime.records.get({ id })
  if (current.status !== 'needs_review') throw new AdminAppointmentError('INVALID_TRANSITION')
  return runtime.records.project({ id, status: 'confirmed', claimId })
}

/**
 * Creates administrative appointment workflows over the existing booking and record modules.
 */
export function createAdminAppointment(input) {
  const runtime = configuration(input)
  return Object.freeze({ list: (raw) => runtime.records.list(raw), get: (raw) => runtime.records.get(raw), createExisting: (raw) => createExisting(runtime, raw), createMedflex: (raw) => runtime.booking.submit(raw), cancel: (raw) => cancel(runtime, raw), resolve: (raw) => resolve(runtime, raw) })
}
