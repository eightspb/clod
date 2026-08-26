import { describe, expect, it, vi } from 'vitest'
import { PatientRecordError } from '../lib/patient-records.js'

vi.mock('astro:db', () => ({ db: Object.freeze({ $client: Object.freeze({}) }) }))

const PATIENT_ID = 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f'
const ACTOR = `v1:${'a7'.repeat(32)}`
const PATIENT = Object.freeze({ id: PATIENT_ID, name: 'О’Коннор-Сидорова Лёля', phoneMask: '+7 •••••••• 29', firstSeenAt: '2026-08-26T10:00:00.000Z', lastSeenAt: '2026-08-27T10:00:00.000Z', createdAt: '2026-08-26T10:00:00.000Z', updatedAt: '2026-08-27T10:00:00.000Z', piiDestroyedAt: null })

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
    GET_INDEX: index.createPatientIndexEndpoint({ records: () => fixture.value, guard, log }),
    GET_DETAIL: detail.createPatientDetailEndpoint({ records: () => fixture.value, guard, log }),
    POST_REVEAL: reveal.createPatientRevealEndpoint({ records: () => fixture.value, guard, actor, log }),
    DELETE_PERSONAL: personal.createPatientPersonalDataEndpoint({ records: () => fixture.value, guard, actor, log }),
  })
}

describe('admin patient API', () => {
  it('keeps the patient list endpoint server-only and authenticated by default', async () => {
    const module = await import('../pages/api/admin/patients/index.js')
    const response = await module.GET({ request: request('/api/admin/patients'), url: new URL('https://odintsovclinic.ru/api/admin/patients') })
    expect({ prerender: module.prerender, status: response.status }).toEqual({ prerender: false, status: 401 })
  })

  it('returns one safe patient page without full phone, birthday, or ciphertext', async () => {
    const fixture = records()
    const { GET_INDEX } = await endpoints(fixture)
    const url = new URL('https://odintsovclinic.ru/api/admin/patients?page=2&pageSize=7')
    const result = await responseValue(await GET_INDEX({ request: request(`${url.pathname}${url.search}`), url }))
    expect({ result, leaked: /79215550129|1988-02-29|profileCiphertext/.test(JSON.stringify(result)) }).toEqual({ result: { status: 200, body: { data: [PATIENT], page: { number: 2, size: 7, total: 1, pages: 1 } } }, leaked: false })
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

  it('maps a missing patient to a stable not-found response', async () => {
    const fixture = records({ getError: new PatientRecordError('PATIENT_NOT_FOUND') })
    const { GET_DETAIL } = await endpoints(fixture)
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/patients/${PATIENT_ID}`), params: { id: PATIENT_ID } }))
    expect(result).toEqual({ status: 404, body: { error: 'PATIENT_NOT_FOUND', message: 'Пациент не найден' } })
  })

  it('reveals a patient phone with a non-secret audit actor', async () => {
    const fixture = records()
    const { POST_REVEAL } = await endpoints(fixture)
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/patients/${PATIENT_ID}/reveal`, { method: 'POST' }), params: { id: PATIENT_ID } }))
    expect({ result, calls: fixture.state.reveal }).toEqual({ result: { status: 200, body: { data: { id: PATIENT_ID, phone: '79215550129', revealedAt: '2026-08-27T11:00:00.000Z' } } }, calls: [{ id: PATIENT_ID, actor: ACTOR }] })
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
})
