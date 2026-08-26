import { describe, expect, it, vi } from 'vitest'
import { MangoCallRecordError } from '../lib/mango-call-records.js'

vi.mock('astro:db', () => ({ db: Object.freeze({ $client: Object.freeze({}) }) }))

const ENTRY_ID = 'entry:clinic:1'
const PATIENT_ID = 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f'
const ACTOR = `v1:${'a7'.repeat(32)}`
const CALL = Object.freeze({ entryId: ENTRY_ID, patientId: PATIENT_ID, status: 'answered', callerMask: '+7 •••••••• 29', repeatCaller: true, lineNumber: '78127482210', operatorExtension: '123', startedAt: '2026-08-26T10:00:00.000Z', forwardedAt: '2026-08-26T10:00:05.000Z', answeredAt: '2026-08-26T10:00:10.000Z', endedAt: '2026-08-26T10:01:10.000Z', waitSeconds: 10, talkSeconds: 60, disconnectReason: '1100', finalizedAt: '2026-08-26T10:01:10.000Z', createdAt: '2026-08-26T10:02:00.000Z', updatedAt: '2026-08-26T10:02:00.000Z', piiDestroyedAt: null })
const METRICS = Object.freeze({ active: 1, incoming: 3, answered: 1, missed: 1, answerRate: 50, averageWaitSeconds: 20, averageTalkSeconds: 30 })

function calls(overrides = {}) {
  const state = { list: [], get: [], metrics: [], reveal: [], destroy: [] }
  const value = {
    list: async (input) => { state.list.push(structuredClone(input)); return overrides.list ?? { items: [CALL], page: input.page, pageSize: input.pageSize, total: 1, pages: 1 } },
    get: async (input) => { state.get.push(structuredClone(input)); if (overrides.getError) throw overrides.getError; return overrides.get ?? CALL },
    metrics: async (input) => { state.metrics.push(structuredClone(input)); return overrides.metrics ?? METRICS },
    reveal: async (input) => { state.reveal.push(structuredClone(input)); if (overrides.revealError) throw overrides.revealError; return overrides.reveal ?? { entryId: ENTRY_ID, phone: '79215550129', revealedAt: '2026-08-27T11:00:00.000Z' } },
    destroy: async (input) => { state.destroy.push(structuredClone(input)); if (overrides.destroyError) throw overrides.destroyError; return overrides.destroy ?? { entryId: ENTRY_ID, destroyedAt: '2026-08-27T12:00:00.000Z', alreadyDestroyed: false } },
  }
  return Object.freeze({ state, value: Object.freeze(value) })
}

function request(path, { method = 'GET', body, origin = 'https://odintsovclinic.ru', headers = {} } = {}) {
  const requestHeaders = new Headers({ origin, 'x-real-ip': '203.0.113.71', ...headers })
  if (body !== undefined) requestHeaders.set('content-type', 'application/json')
  return new Request(`https://odintsovclinic.ru${path}`, { method, headers: requestHeaders, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) })
}

async function responseValue(response) {
  return Object.freeze({ status: response.status, cache: response.headers.get('cache-control'), body: await response.json() })
}

async function endpoints(fixture, overrides = {}) {
  const [index, detail, reveal, caller] = await Promise.all([import('../pages/api/admin/calls/index.js'), import('../pages/api/admin/calls/[entryId].js'), import('../pages/api/admin/calls/[entryId]/reveal.js'), import('../pages/api/admin/calls/[entryId]/caller.js')])
  const guard = overrides.guard ?? (async () => undefined)
  const actor = overrides.actor ?? (async () => ACTOR)
  const log = overrides.log ?? (() => undefined)
  const clock = overrides.clock ?? (() => new Date('2026-08-26T12:00:00.000Z'))
  return Object.freeze({ GET_INDEX: index.createCallIndexEndpoint({ records: () => fixture.value, guard, clock, log }), GET_DETAIL: detail.createCallDetailEndpoint({ records: () => fixture.value, guard, log }), POST_REVEAL: reveal.createCallRevealEndpoint({ records: () => fixture.value, guard, actor, log }), DELETE_CALLER: caller.createCallCallerEndpoint({ records: () => fixture.value, guard, actor, log }) })
}

describe('admin MANGO call API', () => {
  it('keeps call routes server-only and authenticated by default', async () => {
    const module = await import('../pages/api/admin/calls/index.js')
    const response = await module.GET({ request: request('/api/admin/calls') })
    expect({ prerender: module.prerender, status: response.status }).toEqual({ prerender: false, status: 401 })
  })

  it('returns one masked filtered page with metrics and no protected storage fields', async () => {
    const fixture = calls()
    const { GET_INDEX } = await endpoints(fixture)
    const path = '/api/admin/calls?page=2&pageSize=80&status=answered&lineNumber=%2B7%20812%20748-22-10&operatorExtension=123&from=2026-08-26T00%3A00%3A00.000Z&to=2026-08-27T00%3A00%3A00.000Z'
    const result = await responseValue(await GET_INDEX({ request: request(path) }))
    expect({ result, calls: fixture.state, leaked: /79215550129|callerCiphertext|callerFingerprint/.test(JSON.stringify(result)) }).toEqual({ result: { status: 200, cache: 'no-store', body: { data: [CALL], page: { number: 2, size: 50, total: 1, pages: 1 }, metrics: METRICS } }, calls: { list: [{ page: 2, pageSize: 50, status: 'answered', lineNumber: '78127482210', operatorExtension: '123', from: '2026-08-26T00:00:00.000Z', to: '2026-08-27T00:00:00.000Z' }], get: [], metrics: [{ from: '2026-08-26T00:00:00.000Z', to: '2026-08-27T00:00:00.000Z' }], reveal: [], destroy: [] }, leaked: false })
  })

  it('uses the current Moscow calendar day for unfiltered dashboard metrics', async () => {
    const fixture = calls()
    const { GET_INDEX } = await endpoints(fixture, { clock: () => new Date('2026-08-26T22:30:00.000Z') })
    await GET_INDEX({ request: request('/api/admin/calls') })
    expect(fixture.state.metrics).toEqual([{ from: '2026-08-26T21:00:00.000Z', to: '2026-08-27T21:00:00.000Z' }])
  })

  it('rejects unknown and wildcard filters before repository access', async () => {
    const fixture = calls()
    const { GET_INDEX } = await endpoints(fixture)
    const responses = await Promise.all(['/api/admin/calls?search=%25_', '/api/admin/calls?operatorExtension=%25', '/api/admin/calls?from=2026-08-26T00%3A00%3A00.000Z'].map((path) => GET_INDEX({ request: request(path) })))
    expect({ statuses: responses.map(({ status }) => status), lists: fixture.state.list.length }).toEqual({ statuses: [400, 400, 400], lists: 0 })
  })

  it('returns one masked call detail by a bounded provider ID', async () => {
    const fixture = calls()
    const { GET_DETAIL } = await endpoints(fixture)
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/calls/${encodeURIComponent(ENTRY_ID)}`), params: { entryId: ENTRY_ID } }))
    expect({ result, calls: fixture.state.get }).toEqual({ result: { status: 200, cache: 'no-store', body: { data: CALL } }, calls: [{ entryId: ENTRY_ID }] })
  })

  it('maps missing and destroyed caller records to stable statuses', async () => {
    const missing = calls({ getError: new MangoCallRecordError('CALL_NOT_FOUND') })
    const destroyed = calls({ revealError: new MangoCallRecordError('CALL_PII_DESTROYED') })
    const missingEndpoint = await endpoints(missing)
    const destroyedEndpoint = await endpoints(destroyed)
    const responses = await Promise.all([missingEndpoint.GET_DETAIL({ request: request('/api/admin/calls/missing'), params: { entryId: 'missing' } }), destroyedEndpoint.POST_REVEAL({ request: request(`/api/admin/calls/${ENTRY_ID}/reveal`, { method: 'POST' }), params: { entryId: ENTRY_ID } })])
    expect(responses.map(({ status }) => status)).toEqual([404, 410])
  })

  it('reveals the caller through the PII guard with a non-secret audit actor', async () => {
    const fixture = calls()
    const guard = vi.fn(async () => undefined)
    const { POST_REVEAL } = await endpoints(fixture, { guard })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/calls/${ENTRY_ID}/reveal`, { method: 'POST' }), params: { entryId: ENTRY_ID } }))
    expect({ result, guarded: guard.mock.calls.length, calls: fixture.state.reveal }).toEqual({ result: { status: 200, cache: 'no-store', body: { data: { entryId: ENTRY_ID, phone: '79215550129', revealedAt: '2026-08-27T11:00:00.000Z' } } }, guarded: 1, calls: [{ entryId: ENTRY_ID, actor: ACTOR }] })
  })

  it('requires an exact bounded JSON confirmation before caller destruction', async () => {
    const fixture = calls()
    const { DELETE_CALLER } = await endpoints(fixture)
    const invalid = await DELETE_CALLER({ request: request(`/api/admin/calls/${ENTRY_ID}/caller`, { method: 'DELETE', body: { confirmation: 'удалить' } }), params: { entryId: ENTRY_ID } })
    const large = await DELETE_CALLER({ request: request(`/api/admin/calls/${ENTRY_ID}/caller`, { method: 'DELETE', body: 'x'.repeat(4_097), headers: { 'content-type': 'application/json', 'content-length': '4097' } }), params: { entryId: ENTRY_ID } })
    expect({ statuses: [invalid.status, large.status], calls: fixture.state.destroy.length }).toEqual({ statuses: [400, 413], calls: 0 })
  })

  it('destroys confirmed caller data with an audit actor', async () => {
    const fixture = calls()
    const { DELETE_CALLER } = await endpoints(fixture)
    const result = await responseValue(await DELETE_CALLER({ request: request(`/api/admin/calls/${ENTRY_ID}/caller`, { method: 'DELETE', body: { confirmation: 'УНИЧТОЖИТЬ' } }), params: { entryId: ENTRY_ID } }))
    expect({ result, calls: fixture.state.destroy }).toEqual({ result: { status: 200, cache: 'no-store', body: { data: { entryId: ENTRY_ID, destroyedAt: '2026-08-27T12:00:00.000Z', alreadyDestroyed: false } } }, calls: [{ entryId: ENTRY_ID, actor: ACTOR }] })
  })

  it('passes guard failures through before parsing or repository access', async () => {
    const fixture = calls()
    const blocked = new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    const { DELETE_CALLER } = await endpoints(fixture, { guard: async () => blocked })
    const response = await DELETE_CALLER({ request: request(`/api/admin/calls/${ENTRY_ID}/caller`, { method: 'DELETE', body: { confirmation: 'УНИЧТОЖИТЬ' } }), params: { entryId: ENTRY_ID } })
    expect({ status: response.status, calls: fixture.state.destroy.length }).toEqual({ status: 403, calls: 0 })
  })

  it('sanitizes unexpected storage failures and logs only a fixed stage', async () => {
    const fixture = calls({ getError: new Error('sqlite://token-secret caller 79215550129') })
    const stages = []
    const { GET_DETAIL } = await endpoints(fixture, { log: (stage) => stages.push(stage) })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/calls/${ENTRY_ID}`), params: { entryId: ENTRY_ID } }))
    expect({ result, stages, leaked: JSON.stringify({ result, stages }).includes('79215550129') }).toEqual({ result: { status: 503, cache: 'no-store', body: { error: 'CALLS_UNAVAILABLE', message: 'Данные звонков временно недоступны' } }, stages: ['DETAIL_FAILED'], leaked: false })
  })
})
