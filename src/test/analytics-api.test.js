import { beforeEach, describe, expect, it, vi } from 'vitest'

const insertCalls = []
const updateCalls = []

const { dbMock, eqMock } = vi.hoisted(() => {
  const db = {
    insert: vi.fn(() => ({
      values: vi.fn(async (payload) => {
        insertCalls.push(payload)
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((payload) => ({
        where: vi.fn(async () => {
          updateCalls.push(payload)
        }),
      })),
    })),
  }

  return {
    dbMock: db,
    eqMock: vi.fn((column, value) => ({ column, value })),
  }
})

vi.mock('astro:db', () => ({
  db: dbMock,
  AnalyticsSession: { id: 'analytics_session.id' },
  PageView: { id: 'page_view.id' },
  EventLog: { id: 'event_log.id' },
  eq: eqMock,
}))

function makeJsonRequest({
  origin = 'https://odintsovclinic.ru',
  ip = '127.0.0.1',
  body = {},
} = {}) {
  return {
    url: 'https://odintsovclinic.ru/api/analytics/test',
    headers: new Headers({
      'content-type': 'application/json',
      origin,
      'x-forwarded-for': ip,
    }),
    json: async () => body,
  }
}

async function loadEventHandler() {
  vi.resetModules()
  return import('../pages/api/analytics/event.js')
}

async function loadHeartbeatHandler() {
  vi.resetModules()
  return import('../pages/api/analytics/heartbeat.js')
}

describe('analytics API hardening', () => {
  beforeEach(() => {
    insertCalls.length = 0
    updateCalls.length = 0
    dbMock.insert.mockClear()
    dbMock.update.mockClear()
    eqMock.mockClear()
  })

  it('rejects analytics events from unknown origins with a machine-readable error', async () => {
    const { POST } = await loadEventHandler()

    const response = await POST({
      request: makeJsonRequest({
        origin: 'https://evil.example.com',
        body: { type: 'page_enter', sessionId: 'session-1', visitorId: 'visitor-1', data: { page: '/' } },
      }),
    })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN_ORIGIN',
        message: 'Недопустимый источник запроса',
      },
    })
  })

  it('rejects malformed analytics event payloads before side effects', async () => {
    const { POST } = await loadEventHandler()

    const response = await POST({
      request: makeJsonRequest({
        body: { type: 'page_enter', sessionId: '', visitorId: '', data: { page: '' } },
      }),
    })

    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        { field: 'sessionId', message: 'Некорректный идентификатор сессии' },
        { field: 'visitorId', message: 'Некорректный идентификатор посетителя' },
        { field: 'data.page', message: 'Укажите страницу события' },
      ])
    )
    expect(insertCalls).toHaveLength(0)
    expect(updateCalls).toHaveLength(0)
  })

  it('applies rate limiting to repeated analytics events from the same ip', async () => {
    const { POST } = await loadEventHandler()

    for (let index = 0; index < 100; index += 1) {
      const response = await POST({
        request: makeJsonRequest({
          ip: '10.0.0.5',
          body: {
            type: 'click',
            sessionId: 'session-1',
            visitorId: 'visitor-1',
            data: { page: '/', target: 'cta-button' },
          },
        }),
      })
      expect(response.status).toBe(200)
    }

    const limitedResponse = await POST({
      request: makeJsonRequest({
        ip: '10.0.0.5',
        body: {
          type: 'click',
          sessionId: 'session-1',
          visitorId: 'visitor-1',
          data: { page: '/', target: 'cta-button' },
        },
      }),
    })

    expect(limitedResponse.status).toBe(429)
    await expect(limitedResponse.json()).resolves.toEqual({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Слишком много событий. Попробуйте позже',
      },
    })
    expect(limitedResponse.headers.get('Retry-After')).toBeTruthy()
  })

  it('records a valid page_enter event', async () => {
    const { POST } = await loadEventHandler()

    const response = await POST({
      request: makeJsonRequest({
        body: {
          type: 'page_enter',
          sessionId: 'session-1',
          visitorId: 'visitor-1',
          data: { page: '/blog', from: '/' },
        },
      }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(insertCalls).toHaveLength(3)
  })

  it('rejects heartbeat requests from unknown origins with the same error shape', async () => {
    const { POST } = await loadHeartbeatHandler()

    const response = await POST({
      request: makeJsonRequest({
        origin: 'https://evil.example.com',
        body: { sessionId: 'session-1', page: '/' },
      }),
    })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN_ORIGIN',
        message: 'Недопустимый источник запроса',
      },
    })
  })

  it('rejects malformed heartbeat payloads before touching the database', async () => {
    const { POST } = await loadHeartbeatHandler()

    const response = await POST({
      request: makeJsonRequest({
        body: { sessionId: '', page: '' },
      }),
    })

    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        { field: 'sessionId', message: 'Некорректный идентификатор сессии' },
        { field: 'page', message: 'Укажите текущую страницу' },
      ])
    )
    expect(updateCalls).toHaveLength(0)
  })
})
