import { describe, expect, it } from 'vitest'
import { parseAppointmentCancelBody, parseAppointmentCreateBody, parseAppointmentId, parseAppointmentQuery, parseAppointmentResolveBody, parseDestroyPatientBody, parsePatientId, parsePatientQuery } from './admin-clinic-query.js'

const PATIENT_ID = 'A68F05C5-8528-4E08-86E5-3BD00CC3A79F'

function captured(operation) {
  try {
    return Object.freeze({ threw: false, value: operation() })
  } catch (error) {
    return Object.freeze({ threw: true, name: error.name, code: error.code })
  }
}

describe('admin clinic query', () => {
  it('coerces a patient page and clamps its size to fifty rows', () => {
    const query = parsePatientQuery(new URLSearchParams('page=003&pageSize=900'))
    expect(query).toEqual({ page: 3, pageSize: 50 })
  })

  it('uses the first patient page with a fifty-row default', () => {
    expect(parsePatientQuery(new URLSearchParams())).toEqual({ page: 1, pageSize: 50 })
  })

  it('rejects an unknown patient filter before repository access', () => {
    expect(captured(() => parsePatientQuery(new URLSearchParams('name=%D0%9B%D1%91%D0%BB%D1%8F')))).toEqual({ threw: true, name: 'AdminClinicQueryError', code: 'INVALID_QUERY' })
  })

  it('normalizes an exact domestic phone filter', () => {
    expect(parsePatientQuery(new URLSearchParams('phone=8%20921%20555-01-29'))).toEqual({ page: 1, pageSize: 50, phone: '79215550129' })
  })

  it('rejects SQL wildcard characters instead of broadening phone search', () => {
    expect(captured(() => parsePatientQuery(new URLSearchParams('phone=%25_')))).toEqual({ threw: true, name: 'AdminClinicQueryError', code: 'INVALID_QUERY' })
  })

  it('rejects repeated patient query fields', () => {
    expect(captured(() => parsePatientQuery(new URLSearchParams('page=1&page=2')))).toEqual({ threw: true, name: 'AdminClinicQueryError', code: 'INVALID_QUERY' })
  })

  it('canonicalizes a patient identifier from route parameters', () => {
    expect(parsePatientId(PATIENT_ID)).toBe(PATIENT_ID.toLowerCase())
  })

  it('requires an exact destructive confirmation object', () => {
    expect(parseDestroyPatientBody({ confirmation: 'УНИЧТОЖИТЬ' })).toEqual({ confirmation: 'УНИЧТОЖИТЬ' })
  })

  it('rejects extra destruction fields', () => {
    expect(captured(() => parseDestroyPatientBody({ confirmation: 'УНИЧТОЖИТЬ', patientId: PATIENT_ID }))).toEqual({ threw: true, name: 'AdminClinicQueryError', code: 'INVALID_BODY' })
  })

  it('parses the complete bounded appointment filter set', () => {
    const query = parseAppointmentQuery(new URLSearchParams('page=2&pageSize=70&status=needs_review&source=admin_medflex&doctorId=70120&from=2026-08-26T00%3A00%3A00.000Z&to=2026-08-27T00%3A00%3A00.000Z'))
    expect(query).toEqual({ page: 2, pageSize: 50, status: 'needs_review', source: 'admin_medflex', doctorId: 70120, from: '2026-08-26T00:00:00.000Z', to: '2026-08-27T00:00:00.000Z' })
  })

  it('rejects an unsupported appointment status filter', () => {
    expect(captured(() => parseAppointmentQuery(new URLSearchParams('status=deleted')))).toEqual({ threw: true, name: 'AdminClinicQueryError', code: 'INVALID_QUERY' })
  })

  it('canonicalizes an appointment route identifier', () => {
    expect(parseAppointmentId(PATIENT_ID)).toBe(PATIENT_ID.toLowerCase())
  })

  it('accepts only the two explicit appointment creation modes', () => {
    const body = parseAppointmentCreateBody({ source: 'admin_existing', profile: { firstName: 'Лёля' }, appointment: { doctorName: 'Врач из МИС' } })
    expect(body).toEqual({ source: 'admin_existing', profile: { firstName: 'Лёля' }, appointment: { doctorName: 'Врач из МИС' } })
  })

  it('requires explicit appointment cancellation confirmation', () => {
    expect(parseAppointmentCancelBody({ confirmation: 'ОТМЕНИТЬ' })).toEqual({ confirmation: 'ОТМЕНИТЬ' })
  })

  it('normalizes a manual resolution claim identity', () => {
    expect(parseAppointmentResolveBody({ claimId: PATIENT_ID })).toEqual({ claimId: PATIENT_ID.toLowerCase() })
  })
})
