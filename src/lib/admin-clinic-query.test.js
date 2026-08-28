import { describe, expect, it } from 'vitest'
import { parseAppointmentCancelBody, parseAppointmentCreateBody, parseAppointmentId, parseAppointmentQuery, parseAppointmentResolveBody, parseCallEntryId, parseCallQuery, parseDestroyCallBody, parseDestroyPatientBody, parsePatientCallQuery, parsePatientDetailQuery, parsePatientHistoryIssueQuery, parsePatientId, parsePatientQuery } from './admin-clinic-query.js'

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

  it('normalizes an exact patient deep-link identifier', () => {
    expect(parsePatientQuery(new URLSearchParams('patient=a68f05c5-8528-4e08-86e5-3bd00cc3a79f'))).toEqual({ page: 1, pageSize: 50, patientId: 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f' })
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

  it('parses the exact bounded MANGO call filters and clamps page size', () => {
    const query = parseCallQuery(new URLSearchParams('page=2&pageSize=999&status=on_hold&lineNumber=%2B7%20812%20748-22-10&operatorExtension=123&from=2026-08-26T00%3A00%3A00.000Z&to=2026-08-27T00%3A00%3A00.000Z'))
    expect(query).toEqual({ page: 2, pageSize: 50, status: 'on_hold', lineNumber: '78127482210', operatorExtension: '123', from: '2026-08-26T00:00:00.000Z', to: '2026-08-27T00:00:00.000Z' })
  })

  it('rejects unknown, repeated, wildcard, and half-open call filters', () => {
    const values = ['search=%25_', 'status=deleted', 'operatorExtension=%25', 'lineNumber=_', 'page=1&page=2', 'from=2026-08-26T00%3A00%3A00.000Z']
    expect(values.map((value) => captured(() => parseCallQuery(new URLSearchParams(value))).code)).toEqual(Array(values.length).fill('INVALID_QUERY'))
  })

  it('accepts a bounded provider entry ID and rejects ambiguous route text', () => {
    expect(parseCallEntryId('entry:clinic:1')).toBe('entry:clinic:1')
    expect(captured(() => parseCallEntryId(' entry:clinic:1 '))).toMatchObject({ threw: true, code: 'INVALID_QUERY' })
  })

  it('parses patient call pagination and exact call destruction confirmation', () => {
    expect(parsePatientCallQuery(new URLSearchParams('callsPage=3&callsPageSize=70'))).toEqual({ page: 3, pageSize: 50 })
    expect(parseDestroyCallBody({ confirmation: 'УНИЧТОЖИТЬ' })).toEqual({ confirmation: 'УНИЧТОЖИТЬ' })
  })

  it('parses independently bounded calls, visits, and issues in one patient detail query', () => {
    const query = parsePatientDetailQuery(new URLSearchParams('callsPage=2&callsPageSize=70&visitsPage=3&visitsPageSize=80&visitsStatus=ambiguous&issuesPage=4&issuesPageSize=90'))
    expect(query).toEqual({ calls: { page: 2, pageSize: 50 }, visits: { page: 3, pageSize: 50, status: 'ambiguous' }, issues: { page: 4, pageSize: 50 } })
  })

  it('accepts only unresolved visit statuses in the global history issue query', () => {
    const accepted = ['ambiguous', 'unmatched'].map((status) => parsePatientHistoryIssueQuery(new URLSearchParams(`status=${status}`)))
    const rejected = captured(() => parsePatientHistoryIssueQuery(new URLSearchParams('status=linked')))
    expect({ accepted, rejected }).toEqual({ accepted: [{ page: 1, pageSize: 50, status: 'ambiguous' }, { page: 1, pageSize: 50, status: 'unmatched' }], rejected: { threw: true, name: 'AdminClinicQueryError', code: 'INVALID_QUERY' } })
  })
})
