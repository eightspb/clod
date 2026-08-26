import { describe, expect, it, vi } from 'vitest'

vi.mock('astro:db', () => ({ db: Object.freeze({ $client: Object.freeze({}) }) }))

const APPOINTMENT_ID = 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f'
const CLAIM_ID = 'd1c060a0-8375-4ff9-bce5-9bb03029256f'
const APPOINTMENT = Object.freeze({ id: APPOINTMENT_ID, patient: Object.freeze({ id: '10000000-0000-4000-8000-000000000001', name: 'О’Коннор-Сидорова Лёля', phoneMask: '+7 •••••••• 29' }), source: 'admin_existing', status: 'confirmed', medflexClaimId: null, medflexLpuId: null, medflexDoctorId: null, medflexSpecialityId: null, medflexServiceId: null, doctorName: 'Врач из МИС', specialityName: 'Консультация', serviceName: null, startsAt: '2026-08-27T07:20:00.000Z', endsAt: '2026-08-27T08:00:00.000Z', priceKopecks: null, failureCode: null, createdAt: '2026-08-26T10:00:00.000Z', updatedAt: '2026-08-26T10:00:00.000Z', cancelledAt: null })

function service(overrides = {}) {
  const state = { list: [], get: [], existing: [], medflex: [], cancel: [], resolve: [] }
  const value = Object.freeze({
    list: async (input) => { state.list.push(structuredClone(input)); if (overrides.listError) throw overrides.listError; return { items: [APPOINTMENT], page: input.page, pageSize: input.pageSize, total: 1, pages: 1 } },
    get: async (input) => { state.get.push(structuredClone(input)); if (overrides.getError) throw overrides.getError; return APPOINTMENT },
    createExisting: async (input) => { state.existing.push(structuredClone(input)); return APPOINTMENT },
    createMedflex: async (input) => { state.medflex.push(structuredClone(input)); return { status: 202, body: { data: { status: 'uncertain', canRetry: false } } } },
    cancel: async (input) => { state.cancel.push(structuredClone(input)); return { appointment: { ...APPOINTMENT, status: 'cancelled', cancelledAt: '2026-08-27T12:00:00.000Z' }, warning: 'LOCAL_ONLY' } },
    resolve: async (input) => { state.resolve.push(structuredClone(input)); return { ...APPOINTMENT, source: 'website', status: 'confirmed', medflexClaimId: CLAIM_ID } },
  })
  return Object.freeze({ state, value })
}

function request(path, { method = 'GET', body, origin = 'https://odintsovclinic.ru', contentLength } = {}) {
  const headers = new Headers({ origin, 'x-real-ip': '203.0.113.81' })
  if (body !== undefined) headers.set('content-type', 'application/json')
  if (contentLength !== undefined) headers.set('content-length', String(contentLength))
  return new Request(`https://odintsovclinic.ru${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
}

async function responseValue(response) {
  return Object.freeze({ status: response.status, body: await response.json() })
}

async function endpoints(fixture, overrides = {}) {
  const index = await import('../pages/api/admin/appointments/index.js')
  const detail = await import('../pages/api/admin/appointments/[id].js')
  const cancel = await import('../pages/api/admin/appointments/[id]/cancel.js')
  const resolve = await import('../pages/api/admin/appointments/[id]/resolve.js')
  const guard = overrides.guard ?? (async () => undefined)
  const log = overrides.log ?? (() => undefined)
  return Object.freeze({
    GET_INDEX: index.createAppointmentIndexEndpoint({ workflow: () => fixture.value, readGuard: guard, writeGuard: guard, log }),
    POST_INDEX: index.createAppointmentIndexEndpoint({ workflow: () => fixture.value, readGuard: guard, writeGuard: guard, log }).POST,
    GET_DETAIL: detail.createAppointmentDetailEndpoint({ workflow: () => fixture.value, guard, log }),
    POST_CANCEL: cancel.createAppointmentCancelEndpoint({ workflow: () => fixture.value, guard, log }),
    POST_RESOLVE: resolve.createAppointmentResolveEndpoint({ workflow: () => fixture.value, guard, log }),
  })
}

describe('admin appointment API', () => {
  it('keeps the appointment list endpoint server-only and authenticated by default', async () => {
    const module = await import('../pages/api/admin/appointments/index.js')
    const response = await module.GET({ request: request('/api/admin/appointments') })
    expect({ prerender: module.prerender, status: response.status }).toEqual({ prerender: false, status: 401 })
  })

  it('returns a filtered masked appointment page', async () => {
    const fixture = service()
    const handlers = await endpoints(fixture)
    const url = new URL('https://odintsovclinic.ru/api/admin/appointments?page=2&status=confirmed&source=admin_existing')
    const result = await responseValue(await handlers.GET_INDEX.GET({ request: request(`${url.pathname}${url.search}`) }))
    expect({ result, calls: fixture.state.list, leaked: JSON.stringify(result).includes('79215550129') }).toEqual({ result: { status: 200, body: { data: [APPOINTMENT], page: { number: 2, size: 50, total: 1, pages: 1 } } }, calls: [{ page: 2, pageSize: 50, status: 'confirmed', source: 'admin_existing' }], leaked: false })
  })

  it('returns one appointment detail by canonical identifier', async () => {
    const fixture = service()
    const handlers = await endpoints(fixture)
    const result = await responseValue(await handlers.GET_DETAIL({ request: request(`/api/admin/appointments/${APPOINTMENT_ID}`), params: { id: APPOINTMENT_ID.toUpperCase() } }))
    expect({ result, calls: fixture.state.get }).toEqual({ result: { status: 200, body: { data: APPOINTMENT } }, calls: [{ id: APPOINTMENT_ID }] })
  })

  it('creates a local existing appointment without a Medflex booking payload', async () => {
    const fixture = service()
    const handlers = await endpoints(fixture)
    const body = { source: 'admin_existing', profile: { firstName: 'Лёля' }, appointment: { doctorName: 'Врач из МИС' } }
    const result = await responseValue(await handlers.POST_INDEX({ request: request('/api/admin/appointments', { method: 'POST', body }) }))
    expect({ result, calls: fixture.state.existing }).toEqual({ result: { status: 201, body: { data: APPOINTMENT } }, calls: [{ profile: body.profile, appointment: body.appointment }] })
  })

  it('returns the shared booking result for an admin Medflex create', async () => {
    const fixture = service()
    const handlers = await endpoints(fixture)
    const booking = { intentId: APPOINTMENT_ID, patient: { phone: '79215550129' } }
    const result = await responseValue(await handlers.POST_INDEX({ request: request('/api/admin/appointments', { method: 'POST', body: { source: 'admin_medflex', booking } }) }))
    expect({ result, calls: fixture.state.medflex }).toEqual({ result: { status: 202, body: { data: { status: 'uncertain', canRetry: false } } }, calls: [booking] })
  })

  it('rejects an oversized appointment mutation before workflow construction', async () => {
    const fixture = service()
    const handlers = await endpoints(fixture)
    const response = await handlers.POST_INDEX({ request: request('/api/admin/appointments', { method: 'POST', body: {}, contentLength: 4097 }) })
    expect({ status: response.status, calls: fixture.state.existing.length + fixture.state.medflex.length }).toEqual({ status: 413, calls: 0 })
  })

  it('returns an explicit local-only warning from appointment cancellation', async () => {
    const fixture = service()
    const handlers = await endpoints(fixture)
    const body = { confirmation: 'ОТМЕНИТЬ' }
    const result = await responseValue(await handlers.POST_CANCEL({ request: request(`/api/admin/appointments/${APPOINTMENT_ID}/cancel`, { method: 'POST', body }), params: { id: APPOINTMENT_ID } }))
    expect({ result, calls: fixture.state.cancel }).toEqual({ result: { status: 200, body: { data: { appointment: { ...APPOINTMENT, status: 'cancelled', cancelledAt: '2026-08-27T12:00:00.000Z' }, warning: 'LOCAL_ONLY' } } }, calls: [{ id: APPOINTMENT_ID }] })
  })

  it('rejects cross-origin cancellation before authentication or mutation', async () => {
    const module = await import('../pages/api/admin/appointments/[id]/cancel.js')
    const response = await module.POST({ request: request(`/api/admin/appointments/${APPOINTMENT_ID}/cancel`, { method: 'POST', body: { confirmation: 'ОТМЕНИТЬ' }, origin: 'https://evil.invalid' }), params: { id: APPOINTMENT_ID } })
    expect(response.status).toBe(403)
  })

  it('manually resolves a needs-review appointment with a canonical claim', async () => {
    const fixture = service()
    const handlers = await endpoints(fixture)
    const result = await responseValue(await handlers.POST_RESOLVE({ request: request(`/api/admin/appointments/${APPOINTMENT_ID}/resolve`, { method: 'POST', body: { claimId: CLAIM_ID.toUpperCase() } }), params: { id: APPOINTMENT_ID } }))
    expect({ result, calls: fixture.state.resolve }).toEqual({ result: { status: 200, body: { data: { ...APPOINTMENT, source: 'website', status: 'confirmed', medflexClaimId: CLAIM_ID } } }, calls: [{ id: APPOINTMENT_ID, claimId: CLAIM_ID }] })
  })

  it('sanitizes unexpected appointment storage failures and logs only a stage', async () => {
    const fixture = service({ listError: new Error('sqlite://secret phone 79215550129') })
    const stages = []
    const handlers = await endpoints(fixture, { log: (stage) => stages.push(stage) })
    const result = await responseValue(await handlers.GET_INDEX.GET({ request: request('/api/admin/appointments') }))
    expect({ result, stages, leaked: JSON.stringify({ result, stages }).includes('79215550129') }).toEqual({ result: { status: 503, body: { error: 'APPOINTMENTS_UNAVAILABLE', message: 'Данные записей временно недоступны' } }, stages: ['LIST_FAILED'], leaked: false })
  })
})
