import { describe, expect, it } from 'vitest'
import { createAdminAppointment } from './admin-appointment.js'
import { MedflexError } from './medflex-client.js'

const APPOINTMENT_ID = 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f'
const CLAIM_ID = 'd1c060a0-8375-4ff9-bce5-9bb03029256f'
const PATIENT = Object.freeze({ id: '10000000-0000-4000-8000-000000000001', name: 'О’Коннор-Сидорова Лёля', phoneMask: '+7 •••••••• 29' })

function appointment(overrides = {}) {
  return Object.freeze({ id: APPOINTMENT_ID, patient: PATIENT, source: 'website', status: 'confirmed', medflexClaimId: CLAIM_ID, doctorName: 'Одинцов Владислав Александрович', specialityName: 'Маммолог', startsAt: '2026-08-27T07:20:00.000Z', endsAt: '2026-08-27T08:00:00.000Z', cancelledAt: null, ...overrides })
}

function fixture(overrides = {}) {
  const state = { events: [], list: [], get: [], existing: [], projects: [], cancellations: [], bookings: [], external: [] }
  const current = overrides.current ?? appointment()
  const cancelled = appointment({ ...current, status: 'cancelled', cancelledAt: '2026-08-27T12:00:00.000Z' })
  const records = Object.freeze({
    list: async (input) => { state.list.push(structuredClone(input)); return { items: [current], page: input.page, pageSize: input.pageSize, total: 1, pages: 1 } },
    get: async (input) => { state.get.push(structuredClone(input)); return current },
    createExisting: async (input) => { state.events.push('local-create'); state.existing.push(structuredClone(input)); return appointment({ source: 'admin_existing', medflexClaimId: null }) },
    project: async (input) => { state.events.push('local-project'); state.projects.push(structuredClone(input)); return appointment({ status: 'confirmed', medflexClaimId: input.claimId }) },
    cancel: async (input) => { state.events.push('local-cancel'); state.cancellations.push(structuredClone(input)); return cancelled },
  })
  const booking = Object.freeze({ submit: async (input) => {
    state.events.push('booking-submit')
    state.bookings.push(structuredClone(input))
    return overrides.bookingResult ?? { status: 201, body: { data: { status: 'confirmed', claimId: CLAIM_ID } } }
  } })
  const medflex = () => Object.freeze({ cancelDoctorAppointment: async (input) => { state.events.push('medflex-cancel'); state.external.push(structuredClone(input)); if (overrides.cancelError) throw overrides.cancelError; return { cancelled: true } } })
  const service = createAdminAppointment({ records, booking, medflex, uuid: () => APPOINTMENT_ID })
  return Object.freeze({ state, service })
}

async function captured(operation) {
  try {
    return Object.freeze({ threw: false, value: await operation() })
  } catch (error) {
    return Object.freeze({ threw: true, name: error.name, code: error.code })
  }
}

describe('admin appointment workflows', () => {
  it('delegates bounded appointment filters to the masked repository', async () => {
    const { state, service } = fixture()
    const page = await service.list({ page: 2, pageSize: 17, status: 'confirmed' })
    expect({ calls: state.list, page: { number: page.page, name: page.items[0].patient.name } }).toEqual({ calls: [{ page: 2, pageSize: 17, status: 'confirmed' }], page: { number: 2, name: PATIENT.name } })
  })

  it('creates a local existing appointment without constructing Medflex', async () => {
    const { state, service } = fixture()
    const profile = { firstName: 'Лёля', lastName: 'О’Коннор-Сидорова', secondName: '', phone: '+7 921 555-01-29', birthday: null }
    await service.createExisting({ profile, appointment: { doctorName: 'Врач из МИС' } })
    expect({ events: state.events, input: state.existing[0] }).toEqual({ events: ['local-create'], input: { id: APPOINTMENT_ID, profile, appointment: { doctorName: 'Врач из МИС' } } })
  })

  it('delegates an admin Medflex create to the shared fenced booking service', async () => {
    const { state, service } = fixture()
    const booking = { intentId: APPOINTMENT_ID, patient: { phone: '79215550129' } }
    const result = await service.createMedflex(booking)
    expect({ events: state.events, inputs: state.bookings, result }).toEqual({ events: ['booking-submit'], inputs: [booking], result: { status: 201, body: { data: { status: 'confirmed', claimId: CLAIM_ID } } } })
  })

  it('cancels a Medflex appointment externally before changing local state', async () => {
    const { state, service } = fixture()
    const result = await service.cancel({ id: APPOINTMENT_ID })
    expect({ events: state.events, external: state.external, local: state.cancellations, warning: result.warning }).toEqual({ events: ['medflex-cancel', 'local-cancel'], external: [{ uuid: CLAIM_ID }], local: [{ id: APPOINTMENT_ID }], warning: null })
  })

  it('cancels an imported appointment only locally with an explicit warning', async () => {
    const current = appointment({ source: 'admin_existing', medflexClaimId: null })
    const { state, service } = fixture({ current })
    const result = await service.cancel({ id: APPOINTMENT_ID })
    expect({ events: state.events, warning: result.warning }).toEqual({ events: ['local-cancel'], warning: 'LOCAL_ONLY' })
  })

  it('does not change local state after an ambiguous Medflex cancellation failure', async () => {
    const error = new MedflexError('MEDFLEX_TIMEOUT', { outcomeUncertain: true })
    const { state, service } = fixture({ cancelError: error })
    const result = await captured(() => service.cancel({ id: APPOINTMENT_ID }))
    expect({ result, events: state.events }).toEqual({ result: { threw: true, name: 'AdminAppointmentError', code: 'CANCELLATION_UNCERTAIN' }, events: ['medflex-cancel'] })
  })

  it('treats Medflex not-found as an idempotently absent external appointment', async () => {
    const error = new MedflexError('MEDFLEX_NOT_FOUND', { status: 404 })
    const { state, service } = fixture({ cancelError: error })
    const result = await service.cancel({ id: APPOINTMENT_ID })
    expect({ events: state.events, status: result.appointment.status }).toEqual({ events: ['medflex-cancel', 'local-cancel'], status: 'cancelled' })
  })

  it('returns an already cancelled appointment without another external request', async () => {
    const current = appointment({ status: 'cancelled', cancelledAt: '2026-08-27T12:00:00.000Z' })
    const { state, service } = fixture({ current })
    const result = await service.cancel({ id: APPOINTMENT_ID })
    expect({ events: state.events, status: result.appointment.status }).toEqual({ events: [], status: 'cancelled' })
  })

  it('manually confirms only a needs-review appointment with a claim identity', async () => {
    const current = appointment({ status: 'needs_review', medflexClaimId: null })
    const { state, service } = fixture({ current })
    const result = await service.resolve({ id: APPOINTMENT_ID, claimId: CLAIM_ID })
    expect({ projects: state.projects, status: result.status }).toEqual({ projects: [{ id: APPOINTMENT_ID, status: 'confirmed', claimId: CLAIM_ID }], status: 'confirmed' })
  })

  it('rejects manual confirmation from an already confirmed state', async () => {
    const { state, service } = fixture()
    const result = await captured(() => service.resolve({ id: APPOINTMENT_ID, claimId: CLAIM_ID }))
    expect({ result, projects: state.projects.length }).toEqual({ result: { threw: true, name: 'AdminAppointmentError', code: 'INVALID_TRANSITION' }, projects: 0 })
  })
})
