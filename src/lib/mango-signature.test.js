import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { MangoWebhookError, verifyMangoWebhook } from './mango-signature.js'

const API_KEY = '123456789'
const API_SALT = 'mango-test-salt-with-enough-entropy'
const LINES = '+7 (812) 748-22-10,+7 812 555-01-00'

function signature(json, salt = API_SALT) {
  return createHash('sha256').update(`${API_KEY}${json}${salt}`, 'utf8').digest('hex')
}

function request({ json = '{"entry_id":"entry-1"}', sign = undefined, key = API_KEY, body = undefined, contentType = 'application/x-www-form-urlencoded; charset=UTF-8', contentLength = undefined } = {}) {
  const encoded = body ?? new URLSearchParams({ vpbx_api_key: key, sign: sign ?? signature(json), json }).toString()
  const headers = new Headers({ 'content-type': contentType })
  if (contentLength !== undefined) headers.set('content-length', String(contentLength))
  return new Request('https://odintsovclinic.ru/api/integrations/mango/events/call', { method: 'POST', headers, body: encoded })
}

async function failure(operation) {
  try {
    await operation()
    return undefined
  } catch (error) {
    return { name: error.name, code: error.code, message: error.message }
  }
}

describe('MANGO webhook signature boundary', () => {
  it('verifies the signature over the decoded but otherwise byte-preserved JSON text', async () => {
    const json = '{ "entry_id" : "входящий", "seq" : 7 }'
    const result = await verifyMangoWebhook({ request: request({ json }), apiKey: API_KEY, salt: API_SALT, inboundLines: LINES })
    expect(result).toEqual({ event: { entry_id: 'входящий', seq: 7 }, inboundLines: ['78127482210', '78125550100'] })
    expect(result).not.toHaveProperty('rawJson')
  })

  it('accepts only the urlencoded media type with an optional UTF-8 charset', async () => {
    await expect(failure(() => verifyMangoWebhook({ request: request({ contentType: 'application/json' }), apiKey: API_KEY, salt: API_SALT, inboundLines: LINES }))).resolves.toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' })
    await expect(verifyMangoWebhook({ request: request({ contentType: 'APPLICATION/X-WWW-FORM-URLENCODED; charset=utf-8' }), apiKey: API_KEY, salt: API_SALT, inboundLines: LINES })).resolves.toMatchObject({ event: { entry_id: 'entry-1' } })
  })

  it('rejects declared and streamed bodies over 64 KiB', async () => {
    await expect(failure(() => verifyMangoWebhook({ request: request({ contentLength: 65_537 }), apiKey: API_KEY, salt: API_SALT, inboundLines: LINES }))).resolves.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' })
    const oversized = `vpbx_api_key=${API_KEY}&sign=${'0'.repeat(64)}&json=${'a'.repeat(65_537)}`
    await expect(failure(() => verifyMangoWebhook({ request: request({ body: oversized }), apiKey: API_KEY, salt: API_SALT, inboundLines: LINES }))).resolves.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' })
  })

  it('requires exactly one occurrence of every allowed form field', async () => {
    const json = '{"entry_id":"entry-1"}'
    const valid = new URLSearchParams({ vpbx_api_key: API_KEY, sign: signature(json), json }).toString()
    for (const body of [`${valid}&json=${encodeURIComponent(json)}`, `${valid}&extra=1`, `vpbx_api_key=${API_KEY}&json=${encodeURIComponent(json)}`]) {
      await expect(failure(() => verifyMangoWebhook({ request: request({ body }), apiKey: API_KEY, salt: API_SALT, inboundLines: LINES }))).resolves.toMatchObject({ code: 'INVALID_FORM' })
    }
  })

  it('rejects malformed form escapes and invalid UTF-8', async () => {
    for (const body of ['vpbx_api_key=x&sign=y&json=%', 'vpbx_api_key=x&sign=y&json=%C3%28']) {
      await expect(failure(() => verifyMangoWebhook({ request: request({ body }), apiKey: API_KEY, salt: API_SALT, inboundLines: LINES }))).resolves.toMatchObject({ code: 'INVALID_FORM' })
    }
  })

  it('fails closed on missing or invalid runtime configuration', async () => {
    for (const configuration of [{}, { apiKey: API_KEY, salt: API_SALT, inboundLines: '' }, { apiKey: API_KEY, salt: API_SALT, inboundLines: '+7 812 748-22-10,not-a-phone' }]) {
      await expect(failure(() => verifyMangoWebhook({ request: request(), ...configuration }))).resolves.toMatchObject({ code: 'INVALID_CONFIGURATION', message: 'MANGO webhook configuration is invalid' })
    }
  })

  it('rejects the wrong PBX key before parsing JSON', async () => {
    const json = '{broken json'
    const result = await failure(() => verifyMangoWebhook({ request: request({ json, key: 'other-key', sign: '0'.repeat(64) }), apiKey: API_KEY, salt: API_SALT, inboundLines: LINES }))
    expect(result).toMatchObject({ code: 'UNAUTHORIZED', message: 'MANGO webhook authentication failed' })
  })

  it('rejects malformed, uppercase, wrong-length, and incorrect signatures', async () => {
    for (const sign of ['xyz', 'A'.repeat(64), 'a'.repeat(63), '0'.repeat(64)]) {
      await expect(failure(() => verifyMangoWebhook({ request: request({ sign }), apiKey: API_KEY, salt: API_SALT, inboundLines: LINES }))).resolves.toMatchObject({ code: 'UNAUTHORIZED' })
    }
  })

  it('uses the injected constant-time comparator only for canonical signature bytes', async () => {
    const compare = vi.fn(() => true)
    await verifyMangoWebhook({ request: request(), apiKey: API_KEY, salt: API_SALT, inboundLines: LINES, compare })
    expect(compare).toHaveBeenCalledTimes(2)
    expect(compare.mock.calls.every(([left, right]) => Buffer.isBuffer(left) && Buffer.isBuffer(right) && left.length === right.length)).toBe(true)
  })

  it('rejects invalid JSON only after successful authentication', async () => {
    const json = '{broken json'
    await expect(failure(() => verifyMangoWebhook({ request: request({ json }), apiKey: API_KEY, salt: API_SALT, inboundLines: LINES }))).resolves.toMatchObject({ code: 'INVALID_EVENT' })
  })

  it('requires a bounded plain object event without reserved keys', async () => {
    for (const json of ['[]', 'null', '{"__proto__":{"polluted":true}}', JSON.stringify({ value: 'x'.repeat(9_000) })]) {
      await expect(failure(() => verifyMangoWebhook({ request: request({ json }), apiKey: API_KEY, salt: API_SALT, inboundLines: LINES }))).resolves.toMatchObject({ code: 'INVALID_EVENT' })
    }
  })

  it('rejects excessive event nesting and never reflects protected input in safe errors', async () => {
    let nested = '"secret-phone"'
    for (let depth = 0; depth < 20; depth += 1) nested = `{"value":${nested}}`
    const error = await failure(() => verifyMangoWebhook({ request: request({ json: nested }), apiKey: API_KEY, salt: API_SALT, inboundLines: LINES }))
    expect(error).toEqual({ name: 'MangoWebhookError', code: 'INVALID_EVENT', message: 'MANGO webhook event is invalid' })
    expect(JSON.stringify(error)).not.toContain('secret-phone')
  })

  it('exports a frozen typed error with an allowlisted code', () => {
    const error = new MangoWebhookError('arbitrary-secret-code')
    expect({ name: error.name, code: error.code, frozen: Object.isFrozen(error) }).toEqual({ name: 'MangoWebhookError', code: 'INVALID_EVENT', frozen: true })
  })
})
