import { describe, expect, it, vi } from 'vitest'
import { safeCall, safeCallPage } from '../lib/admin-call-api.js'
import { MangoCallRecordError } from '../lib/mango-call-records.js'

vi.mock('astro:db', () => ({ db: Object.freeze({ $client: Object.freeze({}) }) }))

const ENTRY_ID = 'entry:clinic:1'
const PATIENT_ID = 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f'
const ACTOR = `v1:${'a7'.repeat(32)}`
const CALL = Object.freeze({ entryId: ENTRY_ID, patientId: PATIENT_ID, status: 'answered', callerMask: '+7 •••••••• 29', repeatCaller: true, lineNumber: '78127482210', operatorExtension: '123', startedAt: '2026-08-26T10:00:00.000Z', forwardedAt: '2026-08-26T10:00:05.000Z', answeredAt: '2026-08-26T10:00:10.000Z', endedAt: '2026-08-26T10:01:10.000Z', waitSeconds: 10, talkSeconds: 60, disconnectReason: '1100', finalizedAt: '2026-08-26T10:01:10.000Z', createdAt: '2026-08-26T10:02:00.000Z', updatedAt: '2026-08-26T10:02:00.000Z', piiDestroyedAt: null })
const ACTIVE_CALL = Object.freeze({ ...CALL, entryId: 'entry:clinic:active', status: 'connected', endedAt: null, disconnectReason: null, finalizedAt: null })
const METRICS = Object.freeze({ active: 1, incoming: 3, answered: 1, missed: 1, answerRate: 50, averageWaitSeconds: 20, averageTalkSeconds: 30 })

function calls(overrides = {}) {
  const state = { list: [], active: [], get: [], metrics: [], reveal: [], destroy: [] }
  const value = {
    list: async (input) => { state.list.push(structuredClone(input)); return overrides.list ?? { items: [CALL], page: input.page, pageSize: input.pageSize, total: 1, pages: 1 } },
    active: async () => { state.active.push(true); return overrides.active ?? [ACTIVE_CALL] },
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
    const path = '/api/admin/calls?page=1&pageSize=80&status=answered&lineNumber=%2B7%20812%20748-22-10&operatorExtension=123&from=2026-08-26T00%3A00%3A00.000Z&to=2026-08-27T00%3A00%3A00.000Z'
    const result = await responseValue(await GET_INDEX({ request: request(path) }))
    expect({ result, calls: fixture.state, leaked: /79215550129|callerCiphertext|callerFingerprint/.test(JSON.stringify(result)) }).toEqual({ result: { status: 200, cache: 'no-store', body: { data: [CALL], page: { number: 1, size: 50, total: 1, pages: 1 }, activeCalls: [ACTIVE_CALL], metrics: METRICS } }, calls: { list: [{ page: 1, pageSize: 50, status: 'answered', lineNumber: '78127482210', operatorExtension: '123', from: '2026-08-26T00:00:00.000Z', to: '2026-08-27T00:00:00.000Z' }], active: [true], get: [], metrics: [{ from: '2026-08-26T00:00:00.000Z', to: '2026-08-27T00:00:00.000Z' }], reveal: [], destroy: [] }, leaked: false })
  })

  it('rejects a finalized call from the current-call collection', async () => {
    const { GET_INDEX } = await endpoints(calls({ active: [CALL] }), { log: () => undefined })
    const result = await responseValue(await GET_INDEX({ request: request('/api/admin/calls') }))
    expect(result.status).toBe(503)
  })

  it.each([
    ['phone-shaped count', { ...METRICS, active: 79_215_550_129 }],
    ['fractional count', { ...METRICS, incoming: 3.5 }],
    ['out-of-range rate', { ...METRICS, answerRate: 101 }],
    ['out-of-range duration', { ...METRICS, averageWaitSeconds: 86_401 }],
    ['unrounded duration', { ...METRICS, averageWaitSeconds: 20.01 }],
    ['incoherent outcome counts', { ...METRICS, incoming: 1, answered: 1, missed: 1 }],
    ['nonzero empty average', { active: 0, incoming: 0, answered: 0, missed: 0, answerRate: 0, averageWaitSeconds: 1, averageTalkSeconds: 0 }],
  ])('rejects call metrics with a %s', async (_label, metrics) => {
    const { GET_INDEX } = await endpoints(calls({ metrics }), { log: () => undefined })
    const result = await responseValue(await GET_INDEX({ request: request('/api/admin/calls') }))
    expect({ status: result.status, leaked: JSON.stringify(result).includes('79215550129') }).toEqual({ status: 503, leaked: false })
  })

  it('rejects an accessor call metric without invoking it', async () => {
    const reads = { active: 0 }
    const metrics = { ...METRICS }
    Object.defineProperty(metrics, 'active', { enumerable: true, get: () => { reads.active += 1; return 79_215_550_129 } })
    const { GET_INDEX } = await endpoints(calls({ metrics }), { log: () => undefined })
    const result = await responseValue(await GET_INDEX({ request: request('/api/admin/calls') }))
    expect({ status: result.status, reads, leaked: JSON.stringify(result).includes('79215550129') }).toEqual({ status: 503, reads: { active: 0 }, leaked: false })
  })

  it.each([
    ['entry ID', { entryId: '\u0000entry' }],
    ['patient ID', { patientId: 'patient-unsafe' }],
    ['status', { status: 'deleted' }],
    ['caller mask', { callerMask: '79215550129' }],
    ['repeat caller', { repeatCaller: 1 }],
    ['line number', { lineNumber: '+7 812 748-22-10' }],
    ['operator extension', { operatorExtension: 'operator-7' }],
    ['start timestamp', { startedAt: '2026-02-30T10:00:00.000Z' }],
    ['forward timestamp', { forwardedAt: 'not-a-time' }],
    ['answer timestamp', { answeredAt: 'not-a-time' }],
    ['end timestamp', { endedAt: 'not-a-time' }],
    ['wait count', { waitSeconds: -1 }],
    ['talk count', { talkSeconds: 86_401 }],
    ['disconnect reason', { disconnectReason: 'reason\u0000secret' }],
    ['final timestamp', { finalizedAt: 'not-a-time' }],
    ['creation timestamp', { createdAt: 'not-a-time' }],
    ['update chronology', { updatedAt: '2026-08-26T09:59:59.000Z' }],
    ['destruction timestamp', { callerMask: null, repeatCaller: null, piiDestroyedAt: 'not-a-time' }],
  ])('rejects an unsafe %s in a masked call', (_label, override) => {
    expect(() => safeCall({ ...CALL, ...override })).toThrow(TypeError)
  })

  it('rejects an accessor call field without invoking it', () => {
    const reads = { callerMask: 0 }
    const unsafe = { ...CALL }
    Object.defineProperty(unsafe, 'callerMask', { enumerable: true, get: () => { reads.callerMask += 1; return '79215550129' } })
    let threw = false
    try { safeCall(unsafe) } catch { threw = true }
    expect({ threw, reads }).toEqual({ threw: true, reads: { callerMask: 0 } })
  })

  it('returns one immutable empty call page after the declared last page', () => {
    const result = safeCallPage({ items: [], page: 2, pageSize: 50, total: 1, pages: 1 })
    expect({ result, frozen: Object.isFrozen(result) && Object.isFrozen(result.data) && Object.isFrozen(result.page) }).toEqual({ result: { data: [], page: { number: 2, size: 50, total: 1, pages: 1 } }, frozen: true })
  })

  it.each([
    ['nonempty page after the end', { items: [CALL], page: 2, pageSize: 50, total: 1, pages: 1 }],
    ['oversized page', { items: [], page: 1_000_001, pageSize: 50, total: 0, pages: 0 }],
    ['oversized page size', { items: [], page: 1, pageSize: 51, total: 0, pages: 0 }],
    ['oversized total', { items: [], page: 1, pageSize: 50, total: 50_000_001, pages: 1_000_001 }],
    ['inconsistent pages', { items: [], page: 1, pageSize: 50, total: 51, pages: 1 }],
  ])('rejects a call page with %s', (_label, page) => {
    expect(() => safeCallPage(page)).toThrow(TypeError)
  })

  it('does not return an exact phone through the ordinary caller mask', async () => {
    const fixture = calls({ get: { ...CALL, callerMask: '79215550129' } })
    const { GET_DETAIL } = await endpoints(fixture, { log: () => undefined })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/calls/${encodeURIComponent(ENTRY_ID)}`), params: { entryId: ENTRY_ID } }))
    expect({ status: result.status, leaked: JSON.stringify(result).includes('79215550129') }).toEqual({ status: 503, leaked: false })
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

  it('binds a call detail response to the requested entry', async () => {
    const { GET_DETAIL } = await endpoints(calls({ get: { ...CALL, entryId: 'entry:clinic:2' } }), { log: () => undefined })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/calls/${ENTRY_ID}`), params: { entryId: ENTRY_ID } }))
    expect(result.status).toBe(503)
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

  it.each([
    ['mismatched entry ID', { entryId: 'entry:clinic:2', phone: '79215550129', revealedAt: '2026-08-27T11:00:00.000Z' }],
    ['noncanonical phone', { entryId: ENTRY_ID, phone: '+7 921 555-01-29', revealedAt: '2026-08-27T11:00:00.000Z' }],
    ['noncanonical timestamp', { entryId: ENTRY_ID, phone: '79215550129', revealedAt: '2026-08-27T11:00:00Z' }],
  ])('rejects a call reveal with a %s', async (_label, reveal) => {
    const { POST_REVEAL } = await endpoints(calls({ reveal }), { log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/calls/${ENTRY_ID}/reveal`, { method: 'POST' }), params: { entryId: ENTRY_ID } }))
    expect({ status: result.status, leaked: JSON.stringify(result).includes('79215550129') }).toEqual({ status: 503, leaked: false })
  })

  it('rejects an accessor call reveal field without invoking it', async () => {
    const reads = { phone: 0 }
    const reveal = { entryId: ENTRY_ID, revealedAt: '2026-08-27T11:00:00.000Z' }
    Object.defineProperty(reveal, 'phone', { enumerable: true, get: () => { reads.phone += 1; return '79215550129' } })
    const { POST_REVEAL } = await endpoints(calls({ reveal }), { log: () => undefined })
    const result = await responseValue(await POST_REVEAL({ request: request(`/api/admin/calls/${ENTRY_ID}/reveal`, { method: 'POST' }), params: { entryId: ENTRY_ID } }))
    expect({ status: result.status, reads, leaked: JSON.stringify(result).includes('79215550129') }).toEqual({ status: 503, reads: { phone: 0 }, leaked: false })
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

  it.each([
    ['mismatched entry ID', { entryId: 'entry:clinic:2', destroyedAt: '2026-08-27T12:00:00.000Z', alreadyDestroyed: false }],
    ['noncanonical timestamp', { entryId: ENTRY_ID, destroyedAt: '2026-08-27T12:00:00Z', alreadyDestroyed: false }],
    ['nonboolean state', { entryId: ENTRY_ID, destroyedAt: '2026-08-27T12:00:00.000Z', alreadyDestroyed: 0 }],
  ])('rejects a call destruction with a %s', async (_label, destroy) => {
    const { DELETE_CALLER } = await endpoints(calls({ destroy }), { log: () => undefined })
    const result = await responseValue(await DELETE_CALLER({ request: request(`/api/admin/calls/${ENTRY_ID}/caller`, { method: 'DELETE', body: { confirmation: 'УНИЧТОЖИТЬ' } }), params: { entryId: ENTRY_ID } }))
    expect(result.status).toBe(503)
  })

  it('rejects an accessor call destruction field without invoking it', async () => {
    const reads = { destroyedAt: 0 }
    const destroy = { entryId: ENTRY_ID, alreadyDestroyed: false }
    Object.defineProperty(destroy, 'destroyedAt', { enumerable: true, get: () => { reads.destroyedAt += 1; return '2026-08-27T12:00:00.000Z' } })
    const { DELETE_CALLER } = await endpoints(calls({ destroy }), { log: () => undefined })
    const result = await responseValue(await DELETE_CALLER({ request: request(`/api/admin/calls/${ENTRY_ID}/caller`, { method: 'DELETE', body: { confirmation: 'УНИЧТОЖИТЬ' } }), params: { entryId: ENTRY_ID } }))
    expect({ status: result.status, reads }).toEqual({ status: 503, reads: { destroyedAt: 0 } })
  })

  it('preserves no-store on guard failures before repository access', async () => {
    const fixture = calls()
    const guard = async () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    const { GET_INDEX, GET_DETAIL, POST_REVEAL, DELETE_CALLER } = await endpoints(fixture, { guard })
    const responses = await Promise.all([GET_INDEX({ request: request('/api/admin/calls') }), GET_DETAIL({ request: request(`/api/admin/calls/${ENTRY_ID}`), params: { entryId: ENTRY_ID } }), POST_REVEAL({ request: request(`/api/admin/calls/${ENTRY_ID}/reveal`, { method: 'POST' }), params: { entryId: ENTRY_ID } }), DELETE_CALLER({ request: request(`/api/admin/calls/${ENTRY_ID}/caller`, { method: 'DELETE', body: { confirmation: 'УНИЧТОЖИТЬ' } }), params: { entryId: ENTRY_ID } })])
    expect({ statuses: responses.map(({ status }) => status), caches: responses.map((response) => response.headers.get('cache-control')), calls: fixture.state }).toEqual({ statuses: [403, 403, 403, 403], caches: ['no-store', 'no-store', 'no-store', 'no-store'], calls: { list: [], active: [], get: [], metrics: [], reveal: [], destroy: [] } })
  })

  it('sanitizes unexpected storage failures and logs only a fixed stage', async () => {
    const fixture = calls({ getError: new Error('sqlite://token-secret caller 79215550129') })
    const stages = []
    const { GET_DETAIL } = await endpoints(fixture, { log: (stage) => stages.push(stage) })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/calls/${ENTRY_ID}`), params: { entryId: ENTRY_ID } }))
    expect({ result, stages, leaked: JSON.stringify({ result, stages }).includes('79215550129') }).toEqual({ result: { status: 503, cache: 'no-store', body: { error: 'CALLS_UNAVAILABLE', message: 'Данные звонков временно недоступны' } }, stages: ['DETAIL_FAILED'], leaked: false })
  })

  it.each([
    ['revoked proxy', () => { const value = Proxy.revocable({}, {}); value.revoke(); return value.proxy }],
    ['hostile proxy', () => new Proxy({}, { getPrototypeOf: () => { throw new Error('caller-storage-secret-79215550129') } })],
  ])('sanitizes a %s thrown by call storage', async (_label, failure) => {
    const fixture = calls({ getError: failure() })
    const stages = []
    const { GET_DETAIL } = await endpoints(fixture, { log: (stage) => stages.push(stage) })
    const result = await responseValue(await GET_DETAIL({ request: request(`/api/admin/calls/${ENTRY_ID}`), params: { entryId: ENTRY_ID } }))
    expect({ result, stages, leaked: JSON.stringify({ result, stages }).includes('79215550129') }).toEqual({ result: { status: 503, cache: 'no-store', body: { error: 'CALLS_UNAVAILABLE', message: 'Данные звонков временно недоступны' } }, stages: ['DETAIL_FAILED'], leaked: false })
  })
})
