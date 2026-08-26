import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

vi.mock('astro:db', () => ({ db: Object.freeze({ $client: Object.freeze({}) }) }))

const API_KEY = '123456789'
const API_SALT = 'mango-test-salt-with-enough-entropy'
const LINES = '+7 (812) 748-22-10'
const CREDENTIALS = () => Object.freeze({ apiKey: API_KEY, salt: API_SALT, inboundLines: LINES })

function signature(json) {
  return createHash('sha256').update(`${API_KEY}${json}${API_SALT}`, 'utf8').digest('hex')
}

function request(event, overrides = {}) {
  const json = typeof event === 'string' ? event : JSON.stringify(event)
  const body = new URLSearchParams({ vpbx_api_key: overrides.key ?? API_KEY, sign: overrides.sign ?? signature(json), json }).toString()
  return new Request('https://odintsovclinic.ru/api/integrations/mango/events/call', { method: overrides.method ?? 'POST', headers: { 'content-type': overrides.contentType ?? 'application/x-www-form-urlencoded; charset=UTF-8', 'x-real-ip': overrides.realIp ?? '203.0.113.29', 'x-forwarded-for': '198.51.100.8, 198.51.100.9', ...(overrides.headers ?? {}) }, body: overrides.method === 'GET' ? undefined : body })
}

function live(overrides = {}) {
  return { entry_id: 'entry-1', call_id: 'leg-1', timestamp: 1_770_000_000, seq: 1, call_state: 'Appeared', location: 'ivr', from: { number: '8 (921) 555-01-29' }, to: { line_number: '78127482210' }, ...overrides }
}

function summary(overrides = {}) {
  return { entry_id: 'entry-1', call_direction: 1, from: { number: '8 (921) 555-01-29' }, to: { extension: '123' }, line_number: '78127482210', create_time: 1_770_000_000, forward_time: 1_770_000_005, talk_time: 1_770_000_010, end_time: 1_770_000_070, entry_result: 1, ...overrides }
}

async function body(response) {
  return response.json()
}

async function modules() {
  const [health, call, final] = await Promise.all([import('../pages/api/integrations/mango/index.js'), import('../pages/api/integrations/mango/events/call.js'), import('../pages/api/integrations/mango/events/summary.js')])
  return Object.freeze({ health, call, final })
}

function records(apply = vi.fn(async () => ({ outcome: 'applied', entryId: 'entry-1' }))) {
  return Object.freeze({ factory: () => Object.freeze({ apply }), apply })
}

describe('MANGO integration API', () => {
  it('keeps every route server-rendered and exposes a secret-free health response', async () => {
    const { health, call, final } = await modules()
    const response = await health.GET({ request: new Request('https://odintsovclinic.ru/api/integrations/mango') })
    expect({ prerender: [health.prerender, call.prerender, final.prerender], status: response.status, cache: response.headers.get('cache-control'), body: await body(response) }).toEqual({ prerender: [false, false, false], status: 200, cache: 'no-store', body: { data: { available: true } } })
  })

  it('rejects unsupported methods with an explicit allow header', async () => {
    const { health, call } = await modules()
    const [healthResponse, webhookResponse] = await Promise.all([health.ALL(), call.ALL()])
    expect([healthResponse.status, healthResponse.headers.get('allow'), webhookResponse.status, webhookResponse.headers.get('allow')]).toEqual([405, 'GET', 405, 'POST'])
  })

  it('authenticates and normalizes a live event before persistence', async () => {
    const { call } = await modules()
    const storage = records()
    const POST = call.createMangoWebhookEndpoint({ normalize: call.normalizeMangoLiveEvent, records: storage.factory, credentials: CREDENTIALS, limit: () => ({ allowed: true }), log: vi.fn() })
    const response = await POST({ request: request(live()) })
    expect({ status: response.status, cache: response.headers.get('cache-control'), body: await body(response), command: storage.apply.mock.calls[0]?.[0] }).toMatchObject({ status: 200, cache: 'no-store', body: { data: { outcome: 'applied' } }, command: { kind: 'apply_live', entryId: 'entry-1', callId: 'leg-1', callerPhone: '79215550129' } })
  })

  it('uses the summary normalizer and acknowledges non-inbound cleanup', async () => {
    const { final } = await modules()
    const storage = records(vi.fn(async () => ({ outcome: 'removed', entryId: 'entry-1' })))
    const POST = final.createMangoSummaryEndpoint({ records: storage.factory, credentials: CREDENTIALS, limit: () => ({ allowed: true }), log: vi.fn() })
    const response = await POST({ request: request(summary({ call_direction: 2 })) })
    expect({ status: response.status, body: await body(response), command: storage.apply.mock.calls[0]?.[0] }).toEqual({ status: 200, body: { data: { outcome: 'removed' } }, command: { kind: 'remove_non_inbound', entryId: 'entry-1' } })
  })

  it.each(['applied', 'duplicate', 'stale', 'ignored'])('acknowledges the %s persistence outcome with 200', async (outcome) => {
    const { call } = await modules()
    const storage = records(vi.fn(async () => ({ outcome, entryId: 'entry-1' })))
    const POST = call.createMangoWebhookEndpoint({ normalize: call.normalizeMangoLiveEvent, records: storage.factory, credentials: CREDENTIALS, limit: () => ({ allowed: true }), log: vi.fn() })
    const response = await POST({ request: request(live()) })
    expect({ status: response.status, body: await body(response) }).toEqual({ status: 200, body: { data: { outcome } } })
  })

  it('rejects an invalid signature before event normalization or storage', async () => {
    const { call } = await modules()
    const normalize = vi.fn()
    const storage = records()
    const POST = call.createMangoWebhookEndpoint({ normalize, records: storage.factory, credentials: CREDENTIALS, limit: () => ({ allowed: true }), log: vi.fn() })
    const response = await POST({ request: request('{broken json', { key: 'wrong-key', sign: '0'.repeat(64) }) })
    expect({ status: response.status, body: await body(response), normalized: normalize.mock.calls.length, stored: storage.apply.mock.calls.length }).toEqual({ status: 401, body: { error: 'UNAUTHORIZED' }, normalized: 0, stored: 0 })
  })

  it('maps malformed domain events, media type, and declared body size safely', async () => {
    const { call } = await modules()
    const make = () => call.createMangoWebhookEndpoint({ normalize: call.normalizeMangoLiveEvent, records: records().factory, credentials: CREDENTIALS, limit: () => ({ allowed: true }), log: vi.fn() })
    const malformed = await make()({ request: request({ entry_id: 'entry-1' }) })
    const media = await make()({ request: request(live(), { contentType: 'application/json' }) })
    const large = await make()({ request: request(live(), { headers: { 'content-length': '65537' } }) })
    expect([[malformed.status, await body(malformed)], [media.status, await body(media)], [large.status, await body(large)]]).toEqual([[400, { error: 'INVALID_EVENT' }], [415, { error: 'UNSUPPORTED_MEDIA_TYPE' }], [413, { error: 'PAYLOAD_TOO_LARGE' }]])
  })

  it('applies the 300-per-minute limit to the proxy-controlled real IP', async () => {
    const { call } = await modules()
    const limit = vi.fn(() => ({ allowed: false, retryAfterSec: 17 }))
    const storage = records()
    const POST = call.createMangoWebhookEndpoint({ normalize: call.normalizeMangoLiveEvent, records: storage.factory, credentials: CREDENTIALS, limit, log: vi.fn() })
    const response = await POST({ request: request(live()) })
    expect({ status: response.status, retry: response.headers.get('retry-after'), body: await body(response), call: limit.mock.calls[0], stored: storage.apply.mock.calls.length }).toEqual({ status: 429, retry: '17', body: { error: 'RATE_LIMITED' }, call: ['203.0.113.29', { namespace: 'mango-webhooks', maxRequests: 300, windowMs: 60000 }], stored: 0 })
  })

  it('returns retryable sanitized failures and logs only a fixed stage', async () => {
    const { call } = await modules()
    const raw = 'token-secret-79215550129'
    const log = vi.fn()
    const storage = records(vi.fn(async () => { throw new Error(raw) }))
    const POST = call.createMangoWebhookEndpoint({ normalize: call.normalizeMangoLiveEvent, records: storage.factory, credentials: CREDENTIALS, limit: () => ({ allowed: true }), log })
    const response = await POST({ request: request(live()) })
    const result = { status: response.status, body: await body(response), stages: log.mock.calls.flat() }
    expect(result).toEqual({ status: 503, body: { error: 'MANGO_UNAVAILABLE' }, stages: ['PERSISTENCE_FAILED'] })
    expect(JSON.stringify(result)).not.toContain(raw)
  })

  it('fails closed on missing production configuration without reflecting names or values', async () => {
    const { call } = await modules()
    const log = vi.fn()
    const POST = call.createMangoWebhookEndpoint({ normalize: call.normalizeMangoLiveEvent, records: records().factory, credentials: () => { throw new Error('MANGO_VPBX_API_SALT=secret') }, limit: () => ({ allowed: true }), log })
    const response = await POST({ request: request(live()) })
    expect({ status: response.status, body: await body(response), stages: log.mock.calls.flat() }).toEqual({ status: 503, body: { error: 'MANGO_UNAVAILABLE' }, stages: ['CONFIGURATION_FAILED'] })
  })
})
