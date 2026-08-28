import { describe, expect, it, vi } from 'vitest'
import { AdminClinicQueryError } from '../lib/admin-clinic-query.js'
import { PatientHistoryRecordError } from '../lib/patient-history-records.js'
import { PatientRecordError } from '../lib/patient-records.js'

vi.mock('astro:db', () => ({ db: Object.freeze({ $client: Object.freeze({}) }) }))

const PATIENT_ID = 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f'
const ACTOR = `v1:${'a7'.repeat(32)}`
const PD_SOURCE = '544663c3807aab090001bad8PD.csv'
const VISIT_SOURCE = '544663c3807aab090001bad8_visits.csv'
const PATIENT = Object.freeze({ id: PATIENT_ID, name: 'О’Коннор-Сидорова Лёля', phoneMask: '+7 •••••••• 29', firstSeenAt: '2026-08-26T10:00:00.000Z', lastSeenAt: '2026-08-27T10:00:00.000Z', createdAt: '2026-08-26T10:00:00.000Z', updatedAt: '2026-08-27T10:00:00.000Z', piiDestroyedAt: null })
const SECOND_PATIENT = Object.freeze({ ...PATIENT, id: 'b71f16d6-9639-4f19-97f6-4ce11dd4b80a', name: 'Другая Мария' })
const COUNTS = Object.freeze({ patientId: PATIENT_ID, externalIdentifierCount: 2, clinicCardCount: 1, contactCount: 3, previousLastNameCount: 1, historicalVisitCount: 7, issueCount: 2, attachmentCount: 0 })
const SAFE_COUNTS = Object.freeze(Object.fromEntries(Object.entries(COUNTS).filter(([key]) => key !== 'patientId')))
const VISIT_PAGE = Object.freeze({ items: Object.freeze([{ id: '72000000-0000-4000-8000-000000000002', sourceName: VISIT_SOURCE, sourceRow: 29, startsAt: null, endsAt: null, sourceStatus: 'unknown', linkStatus: 'linked', linkMethod: 'exact_ehr', evidenceLevel: 'exact', issueCount: 1, candidateCount: 0, protectedDetailsAvailable: true }]), page: 2, pageSize: 7, total: 8, pages: 2 })
const ISSUE_PAGE = Object.freeze({ items: Object.freeze([{ id: '78000000-0000-4000-8000-000000000008', sourceName: VISIT_SOURCE, sourceRow: 29, code: 'INVALID_START_DATE', historicalVisitId: VISIT_PAGE.items[0].id, createdAt: '2026-08-27T10:00:00.000Z', resolvedAt: null }]), page: 3, pageSize: 6, total: 13, pages: 3 })
const REVEALED = Object.freeze({ id: PATIENT_ID, patientLastSeenAt: PATIENT.lastSeenAt, profile: Object.freeze({ firstName: 'Лёля', lastName: 'О’Коннор-Сидорова', secondName: 'Алиевна', phone: '79215550129', birthday: '1988-02-29' }), contacts: Object.freeze([{ kind: 'email', value: 'synthetic@example.test', mask: 's••••••••@example.test', isPrimary: false, sourceName: PD_SOURCE, firstSeenAt: '2026-08-26T10:00:00.000Z', lastSeenAt: '2026-08-27T10:00:00.000Z' }]), previousLastNames: Object.freeze([{ lastName: 'Прежняя', reason: 'surname_change', sourceName: PD_SOURCE, observedAt: '2026-08-26T10:00:00.000Z' }]), externalIdentifiers: Object.freeze([{ system: 'medesk_ehr', value: '0000000000007109', isPrimary: true, sourceName: PD_SOURCE, sourceRow: 17 }]), privateData: Object.freeze({ passport: Object.freeze({ series: '4012', number: '000149' }), address: Object.freeze({ city: 'Синтетический город' }), contract: 'Договор-149', notes: 'Синтетическая заметка' }), consents: Object.freeze([{ type: 'sms_notifications', status: 'granted', sourceName: 'Vse pacienty.xlsx', observedAt: '2026-08-26T10:00:00.000Z' }]), attachments: Object.freeze([]), historicalVisits: Object.freeze([{ id: VISIT_PAGE.items[0].id, appointmentId: 'appointment-protected-29', doctor: 'Врач Защищённый', details: Object.freeze({ services: Object.freeze(['Приём']), cabinet: '7', comment: 'Позвонить вечером' }) }]), revealedAt: '2026-08-27T11:00:00.000Z' })
const PUBLIC_REVEALED = Object.freeze(Object.fromEntries(Object.entries(REVEALED).filter(([key]) => key !== 'patientLastSeenAt')))

function records(overrides = {}) {
  const state = { list: [], get: [], reveal: [], destroy: [] }
  const value = {
    list: async (input) => { state.list.push(structuredClone(input)); return overrides.list ?? { items: [PATIENT], page: input.page, pageSize: input.pageSize, total: 1, pages: 1 } },
    get: async (input) => { state.get.push(structuredClone(input)); if (overrides.getError) throw overrides.getError; return overrides.get ?? PATIENT },
    reveal: async (input) => { state.reveal.push(structuredClone(input)); if (overrides.revealError) throw overrides.revealError; return overrides.reveal ?? { id: PATIENT_ID, phone: '79215550129', revealedAt: '2026-08-27T11:00:00.000Z' } },
    destroy: async (input) => { state.destroy.push(structuredClone(input)); if (overrides.destroyError) throw overrides.destroyError; return overrides.destroy ?? { id: PATIENT_ID, destroyedAt: '2026-08-27T12:00:00.000Z', alreadyDestroyed: false } },
  }
  return Object.freeze({ state, value: Object.freeze(value) })
}

function historyRecords(overrides = {}) {
  const state = { summaries: [], visits: [], issues: [], attachments: [], reveal: [], destroy: [] }
  const value = {
    summaries: async (input) => { state.summaries.push(structuredClone(input)); return overrides.summaries ?? input.ids.map((patientId) => Object.freeze({ ...COUNTS, patientId })) },
    visits: async (input) => { state.visits.push(structuredClone(input)); return overrides.visits ?? { ...VISIT_PAGE, page: input.page, pageSize: input.pageSize } },
    issues: async (input) => { state.issues.push(structuredClone(input)); return overrides.issues ?? { ...ISSUE_PAGE, page: input.page, pageSize: input.pageSize } },
    attachments: async (input) => { state.attachments.push(structuredClone(input)); return overrides.attachments ?? [] },
    reveal: async (input) => { state.reveal.push(structuredClone(input)); if (overrides.revealError) throw overrides.revealError; return overrides.reveal ?? REVEALED },
    destroy: async (input) => { state.destroy.push(structuredClone(input)); if (overrides.destroyError) throw overrides.destroyError; return overrides.destroy ?? { id: PATIENT_ID, destroyedAt: '2026-08-27T12:00:00.000Z', alreadyDestroyed: false } },
  }
  return Object.freeze({ state, value: Object.freeze(value) })
}

function request(path, { method = 'GET', body, origin = 'https://odintsovclinic.ru' } = {}) {
  const headers = new Headers({ origin, 'x-real-ip': '203.0.113.71' })
  if (body !== undefined) headers.set('content-type', 'application/json')
  return new Request(`https://odintsovclinic.ru${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
}

async function responseValue(response) {
  return Object.freeze({ status: response.status, body: await response.json() })
}

async function endpoints(fixture, overrides = {}) {
  const index = await import('../pages/api/admin/patients/index.js')
  const detail = await import('../pages/api/admin/patients/[id].js')
  const reveal = await import('../pages/api/admin/patients/[id]/reveal.js')
  const personal = await import('../pages/api/admin/patients/[id]/personal-data.js')
  const guard = overrides.guard ?? (async () => undefined)
  const actor = overrides.actor ?? (async () => ACTOR)
  const log = overrides.log ?? (() => undefined)
  return Object.freeze({
    GET_INDEX: index.createPatientIndexEndpoint({ records: () => fixture.value, history: overrides.history === undefined ? undefined : () => overrides.history.value, guard, log }),
    GET_DETAIL: detail.createPatientDetailEndpoint({ records: () => fixture.value, history: overrides.history === undefined ? undefined : () => overrides.history.value, calls: overrides.calls, guard, log }),
    POST_REVEAL: reveal.createPatientRevealEndpoint({ records: () => fixture.value, history: overrides.history === undefined ? undefined : () => overrides.history.value, guard, actor, log }),
    DELETE_PERSONAL: personal.createPatientPersonalDataEndpoint({ records: () => fixture.value, history: overrides.history === undefined ? undefined : () => overrides.history.value, guard, actor, body: overrides.body, log }),
  })
}

describe('admin patient API', () => {
  it('keeps the patient list endpoint server-only and authenticated by default', async () => {
    const module = await import('../pages/api/admin/patients/index.js')
    const response = await module.GET({ request: request('/api/admin/patients'), url: new URL('https://odintsovclinic.ru/api/admin/patients') })
    expect({ prerender: module.prerender, status: response.status }).toEqual({ prerender: false, status: 401 })
  })

  it('rejects a cross-origin reveal through the production PII guard', async () => {
    const module = await import('../pages/api/admin/patients/[id]/reveal.js')
    const response = await module.POST({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST', origin: 'https://evil.invalid' }), params: { id: PATIENT_ID } })
    expect({ status: response.status, cache: response.headers.get('cache-control') }).toEqual({ status: 403, cache: 'no-store' })
  })

  it('sanitizes a patient-list guard failure with no-store', async () => {
    const stages = []
    const guard = async () => { throw new Error('guard-secret-79215550129') }
    const { GET_INDEX } = await endpoints(records(), { guard, log: (stage) => stages.push(stage) })
    const response = await GET_INDEX({ request: request('/api/admin/patients') })
    const result = await responseValue(response)
    expect({ result, cache: response.headers.get('cache-control'), stages, leaked: JSON.stringify({ result, stages }).includes('79215550129') }).toEqual({ result: { status: 503, body: { error: 'PATIENTS_UNAVAILABLE', message: 'Данные пациентов временно недоступны' } }, cache: 'no-store', stages: ['LIST_FAILED'], leaked: false })
  })

  it('does not reinterpret a guard failure as a repository status', async () => {
    const stages = []
    const guard = async () => { throw new PatientRecordError('PATIENT_NOT_FOUND') }
    const { GET_INDEX } = await endpoints(records(), { guard, log: (stage) => stages.push(stage) })
    const response = await GET_INDEX({ request: request('/api/admin/patients') })
    const result = await responseValue(response)
    expect({ result, cache: response.headers.get('cache-control'), stages }).toEqual({ result: { status: 503, body: { error: 'PATIENTS_UNAVAILABLE', message: 'Данные пациентов временно недоступны' } }, cache: 'no-store', stages: ['LIST_FAILED'] })
  })

  it('sanitizes a revoked patient-detail guard failure with no-store', async () => {
    const revoked = Proxy.revocable({}, {})
    revoked.revoke()
    const stages = []
    const guard = async () => { throw revoked.proxy }
    const { GET_DETAIL } = await endpoints(records(), { guard, log: (stage) => stages.push(stage) })
    const response = await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}`), params: { id: PATIENT_ID } })
    const result = await responseValue(response)
    expect({ result, cache: response.headers.get('cache-control'), stages }).toEqual({ result: { status: 503, body: { error: 'PATIENTS_UNAVAILABLE', message: 'Данные пациентов временно недоступны' } }, cache: 'no-store', stages: ['DETAIL_FAILED'] })
  })

  it('sanitizes a hostile patient-reveal guard failure with no-store', async () => {
    const hostile = new Proxy({}, { get: () => { throw new Error('guard-proxy-secret-79215550129') } })
    const stages = []
    const guard = async () => { throw hostile }
    const { POST_REVEAL } = await endpoints(records(), { guard, log: (stage) => stages.push(stage) })
    const response = await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } })
    const result = await responseValue(response)
    expect({ result, cache: response.headers.get('cache-control'), stages, leaked: JSON.stringify({ result, stages }).includes('79215550129') }).toEqual({ result: { status: 503, body: { error: 'PATIENTS_UNAVAILABLE', message: 'Данные пациентов временно недоступны' } }, cache: 'no-store', stages: ['REVEAL_FAILED'], leaked: false })
  })

  it('sanitizes a patient-destruction guard failure with no-store', async () => {
    const stages = []
    const guard = async () => { throw new Error('destroy-guard-secret-79215550129') }
    const { DELETE_PERSONAL } = await endpoints(records(), { guard, log: (stage) => stages.push(stage) })
    const response = await DELETE_PERSONAL({ request: request(`/api/admin/patients/${PATIENT_ID}/personal-data`, { method: 'DELETE' }), params: { id: PATIENT_ID } })
    const result = await responseValue(response)
    expect({ result, cache: response.headers.get('cache-control'), stages, leaked: JSON.stringify({ result, stages }).includes('79215550129') }).toEqual({ result: { status: 503, body: { error: 'PATIENTS_UNAVAILABLE', message: 'Данные пациентов временно недоступны' } }, cache: 'no-store', stages: ['DESTROY_FAILED'], leaked: false })
  })

  it('sanitizes a hostile patient-destruction body failure with no-store', async () => {
    const hostile = new Proxy({}, { getOwnPropertyDescriptor: () => { throw new Error('body-proxy-secret-79215550129') } })
    const stages = []
    const body = async () => { throw hostile }
    const { DELETE_PERSONAL } = await endpoints(records(), { body, log: (stage) => stages.push(stage) })
    const response = await DELETE_PERSONAL({ request: request(`/api/admin/patients/${PATIENT_ID}/personal-data`, { method: 'DELETE' }), params: { id: PATIENT_ID } })
    const result = await responseValue(response)
    expect({ result, cache: response.headers.get('cache-control'), stages, leaked: JSON.stringify({ result, stages }).includes('79215550129') }).toEqual({ result: { status: 503, body: { error: 'PATIENTS_UNAVAILABLE', message: 'Данные пациентов временно недоступны' } }, cache: 'no-store', stages: ['DESTROY_FAILED'], leaked: false })
  })

  it('does not reinterpret a body-adapter failure as body validation', async () => {
    const stages = []
    const body = async () => { throw new AdminClinicQueryError('INVALID_BODY') }
    const { DELETE_PERSONAL } = await endpoints(records(), { body, log: (stage) => stages.push(stage) })
    const response = await DELETE_PERSONAL({ request: request(`/api/admin/patients/${PATIENT_ID}/personal-data`, { method: 'DELETE' }), params: { id: PATIENT_ID } })
    const result = await responseValue(response)
    expect({ result, cache: response.headers.get('cache-control'), stages }).toEqual({ result: { status: 503, body: { error: 'PATIENTS_UNAVAILABLE', message: 'Данные пациентов временно недоступны' } }, cache: 'no-store', stages: ['DESTROY_FAILED'] })
  })

  it('returns one safe patient page without full phone, birthday, or ciphertext', async () => {
    const fixture = records()
    const { GET_INDEX } = await endpoints(fixture)
    const url = new URL('https://odintsovclinic.ru/api/admin/patients?page=1&pageSize=7')
    const result = await responseValue(await GET_INDEX({ request: request(`${url.pathname}${url.search}`), url }))
    expect({ result, leaked: /79215550129|1988-02-29|profileCiphertext/.test(JSON.stringify(result)) }).toEqual({ result: { status: 200, body: { data: [PATIENT], page: { number: 1, size: 7, total: 1, pages: 1 } } }, leaked: false })
  })

  it('rejects accessor patient fields without invoking them', async () => {
    const reads = { name: 0 }
    const unsafe = { ...PATIENT }
    Object.defineProperty(unsafe, 'name', { enumerable: true, get: () => { reads.name += 1; return '79215550129' } })
    const { GET_DETAIL } = await endpoints(records({ get: unsafe }), { log: () => undefined })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}`), params: { id: PATIENT_ID } }))
    expect({ status: result.status, reads, leaked: JSON.stringify(result).includes('79215550129') }).toEqual({ status: 503, reads: { name: 0 }, leaked: false })
  })

  it.each([
    ['invalid UUID', { ...PATIENT, id: 'patient-7109' }],
    ['impossible timestamp', { ...PATIENT, createdAt: '2026-02-30T10:00:00.000Z' }],
    ['partial chronology', { ...PATIENT, firstSeenAt: null }],
    ['reversed chronology', { ...PATIENT, lastSeenAt: '2026-08-25T10:00:00.000Z' }],
    ['non-text name', { ...PATIENT, name: ['Пациентка'] }],
  ])('fails closed on a patient with %s', async (_label, unsafe) => {
    const { GET_DETAIL } = await endpoints(records({ get: unsafe }), { log: () => undefined })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}`), params: { id: PATIENT_ID } }))
    expect(result.status).toBe(503)
  })

  it.each([
    ['destruction before creation', '2026-08-25T10:00:00.000Z'],
    ['destruction after update', '2026-08-28T10:00:00.000Z'],
  ])('rejects patient %s', async (_label, piiDestroyedAt) => {
    const unsafe = { ...PATIENT, name: null, phoneMask: null, piiDestroyedAt }
    const { GET_DETAIL } = await endpoints(records({ get: unsafe }), { log: () => undefined })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}`), params: { id: PATIENT_ID } }))
    expect(result.status).toBe(503)
  })

  it('never returns an exact phone in the ordinary patient mask field', async () => {
    const unsafe = { ...PATIENT, phoneMask: '79215550129' }
    const { GET_DETAIL } = await endpoints(records({ get: unsafe }), { log: () => undefined })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}`), params: { id: PATIENT_ID } }))
    expect({ status: result.status, leaked: JSON.stringify(result).includes(unsafe.phoneMask) }).toEqual({ status: 503, leaked: false })
  })

  it('rejects a nonempty patient page beyond its declared last page', async () => {
    const list = { items: [PATIENT], page: 2, pageSize: 7, total: 1, pages: 1 }
    const { GET_INDEX } = await endpoints(records({ list }), { log: () => undefined })
    const result = await responseValue(await GET_INDEX({ request: request('/api/admin/patients?page=2&pageSize=7') }))
    expect(result.status).toBe(503)
  })

  it('rejects a patient page whose item count exceeds its page size', async () => {
    const list = { items: [PATIENT, SECOND_PATIENT], page: 1, pageSize: 1, total: 2, pages: 2 }
    const { GET_INDEX } = await endpoints(records({ list }), { log: () => undefined })
    const result = await responseValue(await GET_INDEX({ request: request('/api/admin/patients?pageSize=1') }))
    expect(result.status).toBe(503)
  })

  it('rejects an unbounded patient page total', async () => {
    const list = { items: [], page: 1, pageSize: 50, total: Number.MAX_SAFE_INTEGER, pages: Math.ceil(Number.MAX_SAFE_INTEGER / 50) }
    const { GET_INDEX } = await endpoints(records({ list }), { log: () => undefined })
    const result = await responseValue(await GET_INDEX({ request: request('/api/admin/patients') }))
    expect(result.status).toBe(503)
  })

  it('normalizes exact phone search before patient repository access', async () => {
    const fixture = records()
    const { GET_INDEX } = await endpoints(fixture)
    const url = new URL('https://odintsovclinic.ru/api/admin/patients?phone=8%20921%20555-01-29')
    await GET_INDEX({ request: request(`${url.pathname}${url.search}`), url })
    expect(fixture.state.list).toEqual([{ page: 1, pageSize: 50, phone: '79215550129' }])
  })

  it('rejects an unknown list filter before patient repository access', async () => {
    const fixture = records()
    const { GET_INDEX } = await endpoints(fixture)
    const url = new URL('https://odintsovclinic.ru/api/admin/patients?status=active')
    const response = await GET_INDEX({ request: request(`${url.pathname}${url.search}`), url })
    expect({ status: response.status, calls: fixture.state.list.length }).toEqual({ status: 400, calls: 0 })
  })

  it('returns a safe patient detail by canonical route identifier', async () => {
    const fixture = records()
    const { GET_DETAIL } = await endpoints(fixture)
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}`), params: { id: PATIENT_ID.toUpperCase() } }))
    expect(result).toEqual({ status: 200, body: { data: PATIENT } })
  })

  it('binds a patient detail response to the requested patient', async () => {
    const { GET_DETAIL } = await endpoints(records({ get: SECOND_PATIENT }), { log: () => undefined })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}`), params: { id: PATIENT_ID } }))
    expect(result.status).toBe(503)
  })

  it('maps a missing patient to a stable not-found response', async () => {
    const fixture = records({ getError: new PatientRecordError('PATIENT_NOT_FOUND') })
    const { GET_DETAIL } = await endpoints(fixture)
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}`), params: { id: PATIENT_ID } }))
    expect(result).toEqual({ status: 404, body: { error: 'PATIENT_NOT_FOUND', message: 'Пациент не найден' } })
  })

  it('returns a separate paginated masked call history in patient detail', async () => {
    const fixture = records()
    const list = vi.fn(async (query) => ({ items: [{ entryId: 'entry-1', patientId: PATIENT_ID, patientName: 'О’Коннор-Сидорова Лёля Алиевна', status: 'missed', callerMask: '+7 •••••••• 29', repeatCaller: false, lineNumber: '78127482210', operatorExtension: null, startedAt: '2026-08-26T10:00:00.000Z', forwardedAt: null, answeredAt: null, endedAt: '2026-08-26T10:01:00.000Z', waitSeconds: 60, talkSeconds: 0, disconnectReason: null, finalizedAt: '2026-08-26T10:01:00.000Z', createdAt: '2026-08-26T10:02:00.000Z', updatedAt: '2026-08-26T10:02:00.000Z', piiDestroyedAt: null }], page: query.page, pageSize: query.pageSize, total: 1, pages: 1 }))
    const { GET_DETAIL } = await endpoints(fixture, { calls: () => ({ list }) })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}?callsPage=1&callsPageSize=7`), params: { id: PATIENT_ID } }))
    expect({ status: result.status, calls: result.body.calls, query: list.mock.calls[0]?.[0], leaked: JSON.stringify(result).includes('79215550129') }).toEqual({ status: 200, calls: { data: [expect.objectContaining({ entryId: 'entry-1', callerMask: '+7 •••••••• 29' })], page: { number: 1, size: 7, total: 1, pages: 1 } }, query: { page: 1, pageSize: 7, patientId: PATIENT_ID }, leaked: false })
  })

  it('reveals a patient phone with a non-secret audit actor', async () => {
    const fixture = records()
    const { POST_REVEAL } = await endpoints(fixture)
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect({ result, calls: fixture.state.reveal }).toEqual({ result: { status: 200, body: { data: { id: PATIENT_ID, phone: '79215550129', revealedAt: '2026-08-27T11:00:00.000Z' } } }, calls: [{ id: PATIENT_ID, actor: ACTOR }] })
  })

  it('rejects a formatted phone returned by the patient reveal repository', async () => {
    const fixture = records({ reveal: { id: PATIENT_ID, phone: '+7 921 555-01-29', revealedAt: '2026-08-27T11:00:00.000Z' } })
    const { POST_REVEAL } = await endpoints(fixture, { log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect({ status: result.status, leaked: JSON.stringify(result).includes('+7 921 555-01-29') }).toEqual({ status: 503, leaked: false })
  })

  it('returns gone when previously destroyed patient data is revealed', async () => {
    const fixture = records({ revealError: new PatientRecordError('PATIENT_PII_DESTROYED') })
    const { POST_REVEAL } = await endpoints(fixture)
    const response = await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } })
    expect(response.status).toBe(410)
  })

  it('requires explicit confirmation before destroying patient data', async () => {
    const fixture = records()
    const { DELETE_PERSONAL } = await endpoints(fixture)
    const response = await DELETE_PERSONAL({ request: request(`/api/admin/patients/${PATIENT_ID}/personal-data`, { method: 'DELETE', body: { confirmation: 'удалить' } }), params: { id: PATIENT_ID } })
    expect({ status: response.status, calls: fixture.state.destroy.length }).toEqual({ status: 400, calls: 0 })
  })

  it('destroys confirmed patient personal data with an audit actor', async () => {
    const fixture = records()
    const { DELETE_PERSONAL } = await endpoints(fixture)
    const result = await responseValue(await DELETE_PERSONAL({ request: request(`/api/admin/patients/${PATIENT_ID}/personal-data`, { method: 'DELETE', body: { confirmation: 'УНИЧТОЖИТЬ' } }), params: { id: PATIENT_ID } }))
    expect({ result, calls: fixture.state.destroy }).toEqual({ result: { status: 200, body: { data: { id: PATIENT_ID, destroyedAt: '2026-08-27T12:00:00.000Z', alreadyDestroyed: false } } }, calls: [{ id: PATIENT_ID, actor: ACTOR }] })
  })

  it('sanitizes unexpected patient storage failures and logs only a stage code', async () => {
    const fixture = records({ getError: new Error('sqlite://token-secret patient 79215550129') })
    const stages = []
    const { GET_DETAIL } = await endpoints(fixture, { log: (stage) => stages.push(stage) })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}`), params: { id: PATIENT_ID } }))
    expect({ result, stages, leaked: JSON.stringify({ result, stages }).includes('79215550129') }).toEqual({ result: { status: 503, body: { error: 'PATIENTS_UNAVAILABLE', message: 'Данные пациентов временно недоступны' } }, stages: ['DETAIL_FAILED'], leaked: false })
  })

  it.each([
    ['revoked proxy', () => { const value = Proxy.revocable({}, {}); value.revoke(); return value.proxy }],
    ['hostile proxy', () => new Proxy({}, { getPrototypeOf: () => { throw new Error('patient-storage-secret-79215550129') } })],
  ])('sanitizes a %s thrown by patient storage', async (_label, failure) => {
    const stages = []
    const { GET_DETAIL } = await endpoints(records({ getError: failure() }), { log: (stage) => stages.push(stage) })
    const response = await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}`), params: { id: PATIENT_ID } })
    const result = await responseValue(response)
    expect({ status: result.status, cache: response.headers.get('cache-control'), stages, leaked: JSON.stringify({ result, stages }).includes('79215550129') }).toEqual({ status: 503, cache: 'no-store', stages: ['DETAIL_FAILED'], leaked: false })
  })

  it('adds safe history counts to every exact-phone match without exposing identifiers', async () => {
    const fixture = records({ list: { items: [PATIENT, SECOND_PATIENT], page: 1, pageSize: 50, total: 2, pages: 1 } })
    const history = historyRecords()
    const { GET_INDEX } = await endpoints(fixture, { history })
    const result = await responseValue(await GET_INDEX({ request: request('/api/admin/patients?phone=8%20921%20555-01-29') }))
    expect({ status: result.status, ids: result.body.data.map(({ id }) => id), counts: result.body.data.map(({ clinicCardCount }) => clinicCardCount), summaryCalls: history.state.summaries, leaked: /0000000000007109|profileCiphertext/.test(JSON.stringify(result)) }).toEqual({ status: 200, ids: [PATIENT_ID, SECOND_PATIENT.id], counts: [1, 1], summaryCalls: [{ ids: [PATIENT_ID, SECOND_PATIENT.id] }], leaked: false })
  })

  it('rejects an unbounded patient-history count that could encode a phone number', async () => {
    const history = historyRecords({ summaries: [{ ...COUNTS, externalIdentifierCount: 79_215_550_129 }] })
    const { GET_DETAIL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}?visitsPage=2&visitsPageSize=7&issuesPage=3&issuesPageSize=6`), params: { id: PATIENT_ID } }))
    expect({ status: result.status, leaked: JSON.stringify(result).includes('79215550129') }).toEqual({ status: 503, leaked: false })
  })

  it('rejects an accessor patient-history count without invoking it', async () => {
    const reads = { count: 0 }
    const summary = { ...COUNTS }
    Object.defineProperty(summary, 'historicalVisitCount', { enumerable: true, get: () => { reads.count += 1; return 79_215_550_129 } })
    const history = historyRecords({ summaries: [summary] })
    const { GET_DETAIL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}?visitsPage=2&visitsPageSize=7&issuesPage=3&issuesPageSize=6`), params: { id: PATIENT_ID } }))
    expect({ status: result.status, reads, leaked: JSON.stringify(result).includes('79215550129') }).toEqual({ status: 503, reads: { count: 0 }, leaked: false })
  })

  it('snapshots the patient-history summary array without invoking proxy reads', async () => {
    const reads = { length: 0, map: 0 }
    const summaries = new Proxy([COUNTS], { get: (target, key, receiver) => {
      if (key === 'length' || key === 'map') reads[key] += 1
      return Reflect.get(target, key, receiver)
    } })
    const history = historyRecords({ summaries })
    const { GET_DETAIL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}?visitsPageSize=7&issuesPageSize=6`), params: { id: PATIENT_ID } }))
    expect({ status: result.status, reads }).toEqual({ status: 200, reads: { length: 0, map: 0 } })
  })

  it('snapshots list summary results without invoking proxy reads', async () => {
    const reads = { length: 0, map: 0 }
    const summaries = new Proxy([COUNTS], { get: (target, key, receiver) => {
      if (key === 'length' || key === 'map') reads[key] += 1
      return Reflect.get(target, key, receiver)
    } })
    const history = historyRecords({ summaries })
    const { GET_INDEX } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await GET_INDEX({ request: request('/api/admin/patients') }))
    expect({ status: result.status, reads }).toEqual({ status: 200, reads: { length: 0, map: 0 } })
  })

  it('returns independently paginated visits, issues, and empty attachments in patient detail', async () => {
    const fixture = records()
    const history = historyRecords()
    const { GET_DETAIL } = await endpoints(fixture, { history })
    const response = await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}?visitsPage=2&visitsPageSize=7&visitsStatus=linked&issuesPage=3&issuesPageSize=6`), params: { id: PATIENT_ID } })
    const result = await responseValue(response)
    expect({ result, visits: history.state.visits, issues: history.state.issues, attachments: history.state.attachments, cache: response.headers.get('cache-control') }).toEqual({ result: { status: 200, body: { data: { ...PATIENT, ...SAFE_COUNTS }, history: { visits: { data: VISIT_PAGE.items, page: { number: 2, size: 7, total: 8, pages: 2 } }, issues: { data: ISSUE_PAGE.items, page: { number: 3, size: 6, total: 13, pages: 3 } }, attachments: [] } } }, visits: [{ patientId: PATIENT_ID, page: 2, pageSize: 7, status: 'linked' }], issues: [{ patientId: PATIENT_ID, page: 3, pageSize: 6 }], attachments: [{ patientId: PATIENT_ID }], cache: 'no-store' })
  })

  it('fails closed when the history adapter returns patient text in a safe visit enum', async () => {
    const fixture = records()
    const secret = 'Пациентка Секретова Ия'
    const history = historyRecords({ visits: { ...VISIT_PAGE, items: [{ ...VISIT_PAGE.items[0], linkMethod: secret }] } })
    const { GET_DETAIL } = await endpoints(fixture, { history, log: () => undefined })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}`), params: { id: PATIENT_ID } }))
    expect({ status: result.status, error: result.body.error, leaked: JSON.stringify(result).includes(secret) }).toEqual({ status: 503, error: 'PATIENTS_UNAVAILABLE', leaked: false })
  })

  it.each([
    ['linked visit with candidates', { candidateCount: 1 }],
    ['unmatched visit with linkage evidence', { linkStatus: 'unmatched', linkMethod: 'exact_ehr', evidenceLevel: 'exact' }],
    ['ambiguous visit with fewer than two candidates', { linkStatus: 'ambiguous', linkMethod: 'exact_clinic_card', evidenceLevel: 'strong', candidateCount: 1 }],
    ['visit with mismatched method and evidence', { linkMethod: 'exact_clinic_card', evidenceLevel: 'exact' }],
  ])('fails closed on a %s', async (_label, override) => {
    const visits = { ...VISIT_PAGE, items: [{ ...VISIT_PAGE.items[0], ...override }] }
    const { GET_DETAIL } = await endpoints(records(), { history: historyRecords({ visits }), log: () => undefined })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}?visitsPage=2&visitsPageSize=7&issuesPage=3&issuesPageSize=6`), params: { id: PATIENT_ID } }))
    expect(result.status).toBe(503)
  })

  it('fails closed when a historical visit claims an operational source', async () => {
    const fixture = records()
    const history = historyRecords({ visits: { ...VISIT_PAGE, items: [{ ...VISIT_PAGE.items[0], sourceName: 'operational' }] } })
    const { GET_DETAIL } = await endpoints(fixture, { history, log: () => undefined })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}`), params: { id: PATIENT_ID } }))
    expect({ status: result.status, error: result.body.error }).toEqual({ status: 503, error: 'PATIENTS_UNAVAILABLE' })
  })

  it('rejects a nonempty historical visit page beyond its declared last page', async () => {
    const fixture = records()
    const history = historyRecords({ visits: { ...VISIT_PAGE, page: 3 } })
    const { GET_DETAIL } = await endpoints(fixture, { history, log: () => undefined })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}`), params: { id: PATIENT_ID } }))
    expect(result.status).toBe(503)
  })

  it('fails closed when an operational attachment uses an imported source', async () => {
    const fixture = records()
    const attachment = { id: '7b000000-0000-4000-8000-000000000031', kind: 'external_material', sourceName: PD_SOURCE, createdAt: '2026-08-27T10:00:00.000Z', deletedAt: null, protectedDataAvailable: false }
    const history = historyRecords({ attachments: [attachment] })
    const { GET_DETAIL } = await endpoints(fixture, { history, log: () => undefined })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}`), params: { id: PATIENT_ID } }))
    expect({ status: result.status, error: result.body.error }).toEqual({ status: 503, error: 'PATIENTS_UNAVAILABLE' })
  })

  it('returns the expanded reveal only after the history repository audits it', async () => {
    const fixture = records()
    const history = historyRecords()
    const { POST_REVEAL } = await endpoints(fixture, { history })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect({ result, historyCalls: history.state.reveal, legacyCalls: fixture.state.reveal }).toEqual({ result: { status: 200, body: { data: PUBLIC_REVEALED } }, historyCalls: [{ id: PATIENT_ID, actor: ACTOR }], legacyCalls: [] })
  })

  it('returns a bounded identity alias in the expanded reveal', async () => {
    const alias = Object.freeze({ ...REVEALED.previousLastNames[0], reason: 'identity_alias', observedAt: null })
    const history = historyRecords({ reveal: { ...REVEALED, previousLastNames: [alias] } })
    const { POST_REVEAL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect({ status: result.status, history: result.body.data?.previousLastNames }).toEqual({ status: 200, history: [{ ...alias }] })
  })

  it('rejects a formatted phone in an expanded patient profile', async () => {
    const profile = { ...REVEALED.profile, phone: '+7 921 555-01-29' }
    const history = historyRecords({ reveal: { ...REVEALED, profile } })
    const { POST_REVEAL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect({ status: result.status, leaked: JSON.stringify(result).includes('+7 921 555-01-29') }).toEqual({ status: 503, leaked: false })
  })

  it('rejects a formatted phone in a revealed contact', async () => {
    const contact = { ...REVEALED.contacts[0], kind: 'phone', value: '+7 921 555-01-29', mask: '+7 •••••••• 29' }
    const history = historyRecords({ reveal: { ...REVEALED, contacts: [contact] } })
    const { POST_REVEAL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect({ status: result.status, leaked: JSON.stringify(result).includes('+7 921 555-01-29') }).toEqual({ status: 503, leaked: false })
  })

  it('rejects a noncanonical email in a revealed contact', async () => {
    const contact = { ...REVEALED.contacts[0], value: 'Synthetic@Example.Test' }
    const history = historyRecords({ reveal: { ...REVEALED, contacts: [contact] } })
    const { POST_REVEAL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect({ status: result.status, leaked: JSON.stringify(result).includes('Synthetic@Example.Test') }).toEqual({ status: 503, leaked: false })
  })

  it.each(['__proto__', 'constructor', 'prototype'])('rejects the dangerous %s key in revealed plain data', async (key) => {
    const privateData = Object.create(null)
    Object.defineProperty(privateData, key, { enumerable: true, value: Object.freeze({ exposed: true }) })
    const history = historyRecords({ reveal: { ...REVEALED, privateData } })
    const { POST_REVEAL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect(result.status).toBe(503)
  })

  it('reads a revealed array length only from its own data descriptor', async () => {
    const reads = { length: 0 }
    const services = new Proxy(['Приём'], { get: (target, key, receiver) => { if (key === 'length') reads.length += 1; return Reflect.get(target, key, receiver) } })
    const history = historyRecords({ reveal: { ...REVEALED, privateData: { services } } })
    const { POST_REVEAL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect({ status: result.status, reads }).toEqual({ status: 200, reads: { length: 0 } })
  })

  it('rejects extra properties on a revealed dense array', async () => {
    const services = ['Приём']
    services.secret = 'не должно читаться'
    const history = historyRecords({ reveal: { ...REVEALED, privateData: { services } } })
    const { POST_REVEAL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect(result.status).toBe(503)
  })

  it('bounds aggregate work while copying revealed plain data', async () => {
    const privateData = { groups: Array.from({ length: 6 }, () => Array.from({ length: 2_000 }, () => false)) }
    const history = historyRecords({ reveal: { ...REVEALED, privateData } })
    const { POST_REVEAL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect(result.status).toBe(503)
  })

  it('shares one plain-data work budget across every revealed attachment', async () => {
    const attachments = Array.from({ length: 6 }, (_, index) => ({ id: `7b000000-0000-4000-8000-${String(index + 31).padStart(12, '0')}`, kind: 'external_material', url: null, metadata: Array.from({ length: 2_000 }, () => false), sourceName: 'operational', createdAt: '2026-08-27T10:00:00.000Z' }))
    const history = historyRecords({ reveal: { ...REVEALED, attachments } })
    const { POST_REVEAL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect(result.status).toBe(503)
  })

  it('shares one work budget across structural collections and plain payloads', async () => {
    const size = 1_200
    const id = (index) => `7b000000-0000-4000-8000-${String(index).padStart(12, '0')}`
    const contacts = Array.from({ length: size }, () => ({ kind: 'email', value: 'a@b.c', mask: 'x', isPrimary: false, sourceName: PD_SOURCE, firstSeenAt: null, lastSeenAt: null }))
    const previousLastNames = Array.from({ length: size }, () => ({ lastName: 'Я', reason: 'surname_change', sourceName: PD_SOURCE, observedAt: null }))
    const externalIdentifiers = Array.from({ length: size }, () => ({ system: 'clinic_card', value: '1', isPrimary: false, sourceName: PD_SOURCE, sourceRow: 1 }))
    const consents = Array.from({ length: size }, () => ({ type: 'sms_notifications', status: 'not_granted', sourceName: 'Vse pacienty.xlsx', observedAt: null }))
    const attachments = Array.from({ length: size }, (_, index) => ({ id: id(index + 10), kind: 'external_material', url: null, metadata: null, sourceName: 'operational', createdAt: '2026-08-27T10:00:00.000Z' }))
    const historicalVisits = Array.from({ length: size }, (_, index) => ({ id: id(index + 2_000), appointmentId: null, doctor: null, details: null }))
    const history = historyRecords({ reveal: { ...REVEALED, contacts, previousLastNames, externalIdentifiers, privateData: {}, consents, attachments, historicalVisits } })
    const { POST_REVEAL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect(result.status).toBe(503)
  })

  it('rejects an unbounded source row in an expanded reveal', async () => {
    const externalIdentifiers = [{ ...REVEALED.externalIdentifiers[0], sourceRow: 79_215_550_129 }]
    const history = historyRecords({ reveal: { ...REVEALED, externalIdentifiers } })
    const { POST_REVEAL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect({ status: result.status, leaked: JSON.stringify(result).includes('79215550129') }).toEqual({ status: 503, leaked: false })
  })

  it('binds patient reveal and destruction responses to the requested patient', async () => {
    const history = historyRecords({ reveal: { ...REVEALED, id: SECOND_PATIENT.id }, destroy: { id: SECOND_PATIENT.id, destroyedAt: '2026-08-27T12:00:00.000Z', alreadyDestroyed: false } })
    const endpointsValue = await endpoints(records(), { history, log: () => undefined })
    const responses = await Promise.all([endpointsValue.POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }), endpointsValue.DELETE_PERSONAL({ request: request(`/api/admin/patients/${PATIENT_ID}/personal-data`, { method: 'DELETE', body: { confirmation: 'УНИЧТОЖИТЬ' } }), params: { id: PATIENT_ID } })])
    expect(responses.map(({ status }) => status)).toEqual([503, 503])
  })

  it('returns null contact chronology without fabricating import timestamps', async () => {
    const fixture = records()
    const contact = { ...REVEALED.contacts[0], firstSeenAt: null, lastSeenAt: null }
    const history = historyRecords({ reveal: { ...REVEALED, contacts: [contact] } })
    const { POST_REVEAL } = await endpoints(fixture, { history, log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect({ status: result.status, chronology: result.body.data.contacts[0] }).toMatchObject({ status: 200, chronology: { firstSeenAt: null, lastSeenAt: null } })
  })

  it('accepts the internal patient chronology needed to validate surname history without exposing it', async () => {
    const history = historyRecords({ reveal: { ...REVEALED, patientLastSeenAt: PATIENT.lastSeenAt } })
    const { POST_REVEAL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect({ status: result.status, exposed: Object.hasOwn(result.body.data ?? {}, 'patientLastSeenAt') }).toEqual({ status: 200, exposed: false })
  })

  it.each([
    ['one-sided contact chronology', { contacts: [{ ...REVEALED.contacts[0], firstSeenAt: null }] }],
    ['inverted contact chronology', { contacts: [{ ...REVEALED.contacts[0], firstSeenAt: '2026-08-28T10:00:00.000Z' }] }],
    ['surname change without chronology', { previousLastNames: [{ ...REVEALED.previousLastNames[0], observedAt: null }] }],
    ['surname change simultaneous with the current observation', { previousLastNames: [{ ...REVEALED.previousLastNames[0], observedAt: REVEALED.patientLastSeenAt }] }],
    ['surname change after the current observation', { previousLastNames: [{ ...REVEALED.previousLastNames[0], observedAt: '2026-08-28T10:00:00.000Z' }] }],
  ])('rejects %s returned by the reveal repository', async (_label, override) => {
    const history = historyRecords({ reveal: { ...REVEALED, ...override } })
    const { POST_REVEAL } = await endpoints(records(), { history, log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect(result.status).toBe(503)
  })

  it('maps corrupted expanded reveal storage to a value-free 503', async () => {
    const fixture = records()
    const secret = 'corrupt-child-secret'
    const history = historyRecords({ revealError: new PatientHistoryRecordError('PATIENT_HISTORY_STORAGE_INVARIANT') })
    const { POST_REVEAL } = await endpoints(fixture, { history })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect({ result, leaked: JSON.stringify(result).includes(secret) }).toEqual({ result: { status: 503, body: { error: 'PATIENTS_UNAVAILABLE', message: 'Данные пациентов временно недоступны' } }, leaked: false })
  })

  it('uses the complete history destruction transaction instead of the legacy root-only operation', async () => {
    const fixture = records()
    const history = historyRecords()
    const { DELETE_PERSONAL } = await endpoints(fixture, { history })
    const result = await responseValue(await DELETE_PERSONAL({ request: request(`/api/admin/patients/${PATIENT_ID}/personal-data`, { method: 'DELETE', body: { confirmation: 'УНИЧТОЖИТЬ' } }), params: { id: PATIENT_ID } }))
    expect({ result, historyCalls: history.state.destroy, legacyCalls: fixture.state.destroy }).toEqual({ result: { status: 200, body: { data: { id: PATIENT_ID, destroyedAt: '2026-08-27T12:00:00.000Z', alreadyDestroyed: false } } }, historyCalls: [{ id: PATIENT_ID, actor: ACTOR }], legacyCalls: [] })
  })

  it('preserves no-store on an origin or PII-rate-limit rejection', async () => {
    const fixture = records()
    const guard = async () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    const { POST_REVEAL } = await endpoints(fixture, { guard })
    const response = await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST', origin: 'https://evil.invalid' }), params: { id: PATIENT_ID } })
    expect({ status: response.status, cache: response.headers.get('cache-control'), calls: fixture.state.reveal.length }).toEqual({ status: 403, cache: 'no-store', calls: 0 })
  })
})
