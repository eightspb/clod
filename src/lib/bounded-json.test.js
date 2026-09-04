import { describe, expect, it } from 'vitest'
import { readBoundedJson } from './bounded-json.js'

function request({ body, contentLength, contentType = 'application/json' } = {}) {
  const headers = new Headers({ 'content-type': contentType })
  if (contentLength !== undefined) headers.set('content-length', String(contentLength))
  return new Request('https://odintsovclinic.ru/api/test', { method: 'POST', headers, body })
}

describe('readBoundedJson', () => {
  it('rejects a declared body above the limit without reading it', async () => {
    expect(await readBoundedJson(request({ body: '{}', contentLength: 33 }), 32)).toEqual({ valid: false, tooLarge: true })
  })

  it('rejects a streamed body above the limit when no length is declared', async () => {
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(`{"комментарий":"${'ё'.repeat(40)}"}`)); controller.close() } })
    const streamed = new Request('https://odintsovclinic.ru/api/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half' })
    expect(await readBoundedJson(streamed, 32)).toEqual({ valid: false, tooLarge: true })
  })

  it('reads one object within the limit', async () => {
    expect(await readBoundedJson(request({ body: '{"страница":"/vab"}' }), 64)).toEqual({ valid: true, tooLarge: false, value: { страница: '/vab' } })
  })

  it('rejects a non-JSON media type before reading', async () => {
    expect(await readBoundedJson(request({ body: '{}', contentType: 'text/plain' }), 64)).toEqual({ valid: false, tooLarge: false })
  })

  it('fails fast on a non-positive limit', () => {
    expect(() => readBoundedJson(request({ body: '{}' }), 0)).rejects.toThrow(TypeError)
  })
})
