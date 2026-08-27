import { describe, expect, it, vi } from 'vitest'
import { AdminClinicQueryError } from '../lib/admin-clinic-query.js'

vi.mock('astro:db', () => ({ db: Object.freeze({ $client: Object.freeze({}) }) }))

const VISIT_ID = '72000000-0000-4000-8000-000000000002'
const PATIENT_ID = '71000000-0000-4000-8000-000000000001'
const SECOND_PATIENT_ID = '71000000-0000-4000-8000-000000000011'
const VISIT_SOURCE = '544663c3807aab090001bad8_visits.csv'
const ITEM = Object.freeze({ id: VISIT_ID, sourceName: VISIT_SOURCE, sourceRow: 29, startsAt: null, sourceStatus: 'unknown', linkStatus: 'ambiguous', linkMethod: 'exact_clinic_card', evidenceLevel: 'strong', candidates: Object.freeze([{ patientId: PATIENT_ID, evidenceCode: 'EXACT_CLINIC_CARD', score: 90 }, { patientId: SECOND_PATIENT_ID, evidenceCode: 'EXACT_CLINIC_CARD', score: 90 }]) })

function request(query = '') {
  return new Request(`https://odintsovclinic.ru/api/admin/patient-history/issues${query}`, { headers: { 'x-real-ip': '203.0.113.89' } })
}

function history(overrides = {}) {
  const calls = []
  const value = Object.freeze({ linkIssues: async (query) => { calls.push(structuredClone(query)); if (overrides.error) throw overrides.error; return overrides.page ?? { items: [ITEM], page: query.page, pageSize: query.pageSize, total: 1, pages: 1 } } })
  return Object.freeze({ calls, value })
}

async function responseValue(response) {
  return Object.freeze({ status: response.status, cache: response.headers.get('cache-control'), body: await response.json() })
}

describe('admin patient history API', () => {
  it('keeps the unresolved-history endpoint server-only and authenticated by default', async () => {
    const module = await import('../pages/api/admin/patient-history/issues.js')
    const response = await module.GET({ request: request() })
    expect({ prerender: module.prerender, status: response.status, cache: response.headers.get('cache-control') }).toEqual({ prerender: false, status: 401, cache: 'no-store' })
  })

  it('sanitizes a revoked unresolved-history guard failure with no-store', async () => {
    const module = await import('../pages/api/admin/patient-history/issues.js')
    const revoked = Proxy.revocable({}, {})
    revoked.revoke()
    const stages = []
    const guard = async () => { throw revoked.proxy }
    const endpoint = module.createPatientHistoryIssueEndpoint({ history: () => history().value, guard, log: (stage) => stages.push(stage) })
    const result = await responseValue(await endpoint({ request: request('?status=ambiguous') }))
    expect({ result, stages }).toEqual({ result: { status: 503, cache: 'no-store', body: { error: 'PATIENT_HISTORY_UNAVAILABLE', message: 'История пациентов временно недоступна' } }, stages: ['ISSUES_FAILED'] })
  })

  it('does not reinterpret an unresolved-history guard failure as query validation', async () => {
    const module = await import('../pages/api/admin/patient-history/issues.js')
    const stages = []
    const guard = async () => { throw new AdminClinicQueryError('INVALID_QUERY') }
    const endpoint = module.createPatientHistoryIssueEndpoint({ history: () => history().value, guard, log: (stage) => stages.push(stage) })
    const result = await responseValue(await endpoint({ request: request('?status=ambiguous') }))
    expect({ result, stages }).toEqual({ result: { status: 503, cache: 'no-store', body: { error: 'PATIENT_HISTORY_UNAVAILABLE', message: 'История пациентов временно недоступна' } }, stages: ['ISSUES_FAILED'] })
  })

  it('returns a bounded read-only ambiguous-visit page without protected values', async () => {
    const module = await import('../pages/api/admin/patient-history/issues.js')
    const fixture = history()
    const endpoint = module.createPatientHistoryIssueEndpoint({ history: () => fixture.value, guard: async () => undefined, log: () => undefined })
    const result = await responseValue(await endpoint({ request: request('?page=1&pageSize=80&status=ambiguous') }))
    expect({ result, calls: fixture.calls, leaked: /ciphertext|appointmentId|doctor|comment/i.test(JSON.stringify(result)) }).toEqual({ result: { status: 200, cache: 'no-store', body: { data: [ITEM], page: { number: 1, size: 50, total: 1, pages: 1 } } }, calls: [{ page: 1, pageSize: 50, status: 'ambiguous' }], leaked: false })
  })

  it('rejects a nonempty unresolved page beyond its declared last page', async () => {
    const module = await import('../pages/api/admin/patient-history/issues.js')
    const unsafe = { items: [ITEM], page: 2, pageSize: 50, total: 1, pages: 1 }
    const endpoint = module.createPatientHistoryIssueEndpoint({ history: () => history({ page: unsafe }).value, guard: async () => undefined, log: () => undefined })
    const result = await responseValue(await endpoint({ request: request('?page=2&status=ambiguous') }))
    expect(result.status).toBe(503)
  })

  it('rejects an unbounded unresolved page total', async () => {
    const module = await import('../pages/api/admin/patient-history/issues.js')
    const unsafe = { items: [], page: 1, pageSize: 50, total: Number.MAX_SAFE_INTEGER, pages: Math.ceil(Number.MAX_SAFE_INTEGER / 50) }
    const endpoint = module.createPatientHistoryIssueEndpoint({ history: () => history({ page: unsafe }).value, guard: async () => undefined, log: () => undefined })
    const result = await responseValue(await endpoint({ request: request('?status=ambiguous') }))
    expect(result.status).toBe(503)
  })

  it('rejects non-primitive page totals without coercing them', async () => {
    const module = await import('../pages/api/admin/patient-history/issues.js')
    const reads = { coercions: 0 }
    const total = Object.freeze({ valueOf: () => { reads.coercions += 1; return 1 } })
    const endpoint = module.createPatientHistoryIssueEndpoint({ history: () => history({ page: { items: [], page: 1, pageSize: 50, total, pages: 1 } }).value, guard: async () => undefined, log: () => undefined })
    const result = await responseValue(await endpoint({ request: request('?status=ambiguous') }))
    expect({ status: result.status, reads }).toEqual({ status: 503, reads: { coercions: 0 } })
  })

  it('rejects linked status before reading history storage', async () => {
    const module = await import('../pages/api/admin/patient-history/issues.js')
    const fixture = history()
    const endpoint = module.createPatientHistoryIssueEndpoint({ history: () => fixture.value, guard: async () => undefined, log: () => undefined })
    const response = await endpoint({ request: request('?status=linked') })
    expect({ status: response.status, calls: fixture.calls.length }).toEqual({ status: 400, calls: 0 })
  })

  it('sanitizes storage failures to a value-free unavailable response', async () => {
    const module = await import('../pages/api/admin/patient-history/issues.js')
    const secret = 'sqlite-secret-history-value'
    const stages = []
    const endpoint = module.createPatientHistoryIssueEndpoint({ history: () => history({ error: new Error(secret) }).value, guard: async () => undefined, log: (stage) => stages.push(stage) })
    const result = await responseValue(await endpoint({ request: request('?status=unmatched') }))
    expect({ result, stages, leaked: JSON.stringify({ result, stages }).includes(secret) }).toEqual({ result: { status: 503, cache: 'no-store', body: { error: 'PATIENT_HISTORY_UNAVAILABLE', message: 'История пациентов временно недоступна' } }, stages: ['ISSUES_FAILED'], leaked: false })
  })

  it.each([
    ['revoked proxy', () => { const value = Proxy.revocable({}, {}); value.revoke(); return value.proxy }],
    ['hostile proxy', () => new Proxy({}, { getPrototypeOf: () => { throw new Error('history-storage-secret-79215550129') } })],
  ])('sanitizes a %s thrown by history storage', async (_label, failure) => {
    const module = await import('../pages/api/admin/patient-history/issues.js')
    const stages = []
    const endpoint = module.createPatientHistoryIssueEndpoint({ history: () => history({ error: failure() }).value, guard: async () => undefined, log: (stage) => stages.push(stage) })
    const result = await responseValue(await endpoint({ request: request('?status=unmatched') }))
    expect({ result, stages, leaked: JSON.stringify({ result, stages }).includes('79215550129') }).toEqual({ result: { status: 503, cache: 'no-store', body: { error: 'PATIENT_HISTORY_UNAVAILABLE', message: 'История пациентов временно недоступна' } }, stages: ['ISSUES_FAILED'], leaked: false })
  })

  it('fails closed when candidate evidence contains patient text', async () => {
    const module = await import('../pages/api/admin/patient-history/issues.js')
    const secret = 'IVANOV'
    const unsafe = { ...ITEM, candidates: [{ ...ITEM.candidates[0], evidenceCode: secret }] }
    const endpoint = module.createPatientHistoryIssueEndpoint({ history: () => history({ page: { items: [unsafe], page: 1, pageSize: 50, total: 1, pages: 1 } }).value, guard: async () => undefined, log: () => undefined })
    const result = await responseValue(await endpoint({ request: request('?status=ambiguous') }))
    expect({ status: result.status, error: result.body.error, leaked: JSON.stringify(result).includes(secret) }).toEqual({ status: 503, error: 'PATIENT_HISTORY_UNAVAILABLE', leaked: false })
  })

  it.each([
    ['one-candidate ambiguity', { ...ITEM, candidates: [ITEM.candidates[0]] }, 'ambiguous'],
    ['candidate on an unmatched visit', { ...ITEM, linkStatus: 'unmatched', linkMethod: null, evidenceLevel: 'none', candidates: [ITEM.candidates[0]] }, 'unmatched'],
    ['method/evidence mismatch', { ...ITEM, evidenceLevel: 'exact' }, 'ambiguous'],
    ['status different from the requested page', { ...ITEM, linkStatus: 'unmatched', linkMethod: null, evidenceLevel: 'none', candidates: [] }, 'ambiguous'],
  ])('fails closed on %s', async (_label, unsafe, requestedStatus) => {
    const module = await import('../pages/api/admin/patient-history/issues.js')
    const page = { items: [unsafe], page: 1, pageSize: 50, total: 1, pages: 1 }
    const endpoint = module.createPatientHistoryIssueEndpoint({ history: () => history({ page }).value, guard: async () => undefined, log: () => undefined })
    const result = await responseValue(await endpoint({ request: request(`?status=${requestedStatus}`) }))
    expect(result.status).toBe(503)
  })

  it('fails closed when an unresolved visit claims an operational source', async () => {
    const module = await import('../pages/api/admin/patient-history/issues.js')
    const unsafe = { ...ITEM, sourceName: 'operational' }
    const endpoint = module.createPatientHistoryIssueEndpoint({ history: () => history({ page: { items: [unsafe], page: 1, pageSize: 50, total: 1, pages: 1 } }).value, guard: async () => undefined, log: () => undefined })
    const result = await responseValue(await endpoint({ request: request('?status=ambiguous') }))
    expect({ status: result.status, error: result.body.error }).toEqual({ status: 503, error: 'PATIENT_HISTORY_UNAVAILABLE' })
  })

  it('does not expose a state-changing manual resolution handler', async () => {
    const module = await import('../pages/api/admin/patient-history/issues.js')
    expect({ POST: module.POST, PUT: module.PUT, DELETE: module.DELETE }).toEqual({ POST: undefined, PUT: undefined, DELETE: undefined })
  })
})
