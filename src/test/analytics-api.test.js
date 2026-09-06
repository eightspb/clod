import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const insertCalls = []
const updateCalls = []
const selectRows = []
const selectCalls = []

const { andMock, avgMock, countDistinctMock, countMock, dbMock, descMock, eqMock, gteMock, guardAdminReadMock, inArrayMock, isNullMock, ltMock } = vi.hoisted(() => {
  function expression(type) {
    return vi.fn((...values) => ({ type, values }))
  }
  function select() {
    const rows = selectRows.shift()
    const call = { table: undefined, where: undefined }
    const result = () => rows instanceof Error ? Promise.reject(rows) : Promise.resolve(rows ?? [])
    const query = {
      where: vi.fn((where) => {
        call.where = where
        return result()
      }),
      groupBy: vi.fn(() => query),
      orderBy: vi.fn(() => query),
      limit: vi.fn(() => result()),
    }
    return {
      from: vi.fn((table) => {
        call.table = table
        selectCalls.push(call)
        return query
      }),
    }
  }
  const db = {
    select: vi.fn(select),
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
    andMock: expression('and'),
    avgMock: vi.fn(() => ({ type: 'avg' })),
    countDistinctMock: vi.fn(() => ({ type: 'countDistinct' })),
    countMock: vi.fn(() => ({ type: 'count' })),
    dbMock: db,
    descMock: expression('desc'),
    eqMock: expression('eq'),
    gteMock: expression('gte'),
    guardAdminReadMock: vi.fn(),
    inArrayMock: expression('inArray'),
    isNullMock: expression('isNull'),
    ltMock: expression('lt'),
  }
})

vi.mock('../lib/database.js', () => ({
  db: dbMock,
  AnalyticsSession: { id: 'analytics_session.id', visitorId: 'analytics_session.visitorId', startedAt: 'analytics_session.startedAt', lastActiveAt: 'analytics_session.lastActiveAt' },
  Appointment: { startsAt: 'appointment.startsAt', status: 'appointment.status' },
  PageView: { id: 'page_view.id', duration: 'page_view.duration', page: 'page_view.page' },
  EventLog: { id: 'event_log.id', createdAt: 'event_log.createdAt' },
  MangoCall: { status: 'mango_call.status', startedAt: 'mango_call.startedAt', waitSeconds: 'mango_call.waitSeconds', talkSeconds: 'mango_call.talkSeconds' },
  Patient: { piiDestroyedAt: 'patient.piiDestroyedAt' },
  and: andMock,
  avg: avgMock,
  databaseErrorCode: (error) => error?.cause?.code ?? error?.code ?? error?.name ?? 'UNKNOWN',
  count: countMock,
  countDistinct: countDistinctMock,
  desc: descMock,
  eq: eqMock,
  gte: gteMock,
  inArray: inArrayMock,
  isNull: isNullMock,
  lt: ltMock,
}))

vi.mock('../lib/admin-api.js', () => ({ guardAdminRead: guardAdminReadMock }))

function makeJsonRequest({
  origin = 'https://odintsovclinic.ru',
  ip = '127.0.0.1',
  body = {},
  raw,
} = {}) {
  return new Request('https://odintsovclinic.ru/api/analytics/test', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin,
      'x-forwarded-for': ip,
    },
    body: raw ?? JSON.stringify(body),
  })
}

async function loadEventHandler() {
  vi.resetModules()
  return import('../pages/api/analytics/event.js')
}

async function loadHeartbeatHandler() {
  vi.resetModules()
  return import('../pages/api/analytics/heartbeat.js')
}

async function loadStatsHandler() {
  vi.resetModules()
  return import('../pages/api/admin/stats.js')
}

describe('analytics API hardening', () => {
  beforeEach(() => {
    insertCalls.length = 0
    updateCalls.length = 0
    selectRows.length = 0
    selectCalls.length = 0
    dbMock.select.mockClear()
    dbMock.insert.mockClear()
    dbMock.update.mockClear()
    eqMock.mockClear()
    guardAdminReadMock.mockReset()
    guardAdminReadMock.mockResolvedValue(null)
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

  it('rejects an analytics event body above 32 KiB before side effects', async () => {
    const { POST } = await loadEventHandler()
    const response = await POST({ request: makeJsonRequest({ raw: JSON.stringify({ type: 'page_enter', data: { page: 'ё'.repeat(20_000) } }) }) })
    expect({ status: response.status, inserts: insertCalls.length }).toEqual({ status: 413, inserts: 0 })
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

  it('touches the existing session when the insert fails with a Drizzle-wrapped SQLITE_CONSTRAINT error', async () => {
    const { POST } = await loadEventHandler()
    const wrapped = Object.assign(new Error('Failed query: insert into "AnalyticsSession"'), { cause: Object.assign(new Error('UNIQUE constraint failed: AnalyticsSession.id'), { code: 'SQLITE_CONSTRAINT' }) })
    dbMock.insert.mockImplementationOnce(() => ({ values: vi.fn(async () => { throw wrapped }) }))
    const response = await POST({ request: makeJsonRequest({ body: { type: 'page_enter', sessionId: 'сессия-Ω', visitorId: 'гость-1', data: { page: '/mammology' } } }) })
    expect({ status: response.status, updates: updateCalls.length }).toEqual({ status: 200, updates: 1 })
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

describe('admin clinic statistics', () => {
  beforeEach(() => {
    selectRows.length = 0
    selectCalls.length = 0
    dbMock.select.mockClear()
    guardAdminReadMock.mockReset()
    guardAdminReadMock.mockResolvedValue(null)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T22:30:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('adds clinic counters using the current Europe/Moscow calendar day', async () => {
    selectRows.push(
      [{ count: 2 }],
      [{ sessions: 3, uniqueVisitors: 2 }],
      [{ sessions: 10, uniqueVisitors: 7 }],
      [{ sessions: 30, uniqueVisitors: 19 }],
      [{ avgDuration: 72 }],
      [{ page: '/', count: 9 }],
      [],
      [],
      [{ count: 4 }],
      [{ count: 8 }],
      [{ count: 2 }],
      [{ count: 15 }],
      [{ count: 2 }],
      [{ count: 6 }],
      [{ count: 4 }],
      [{ count: 2 }],
      [{ averageWait: 15.4, averageTalk: 82.6 }],
      [{ updatedAt: '2026-08-26T21:55:00.000Z' }]
    )
    const { GET } = await loadStatsHandler()
    const response = await GET({ request: new Request('https://odintsovclinic.ru/api/admin/stats') })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.clinic).toEqual({ todayAppointments: 4, upcomingAppointments: 8, needsReviewAppointments: 2, activePatients: 15 })
    expect(body.calls).toEqual({ active: 2, incomingToday: 6, answeredToday: 4, missedToday: 2, answerRate: 66.7, averageWaitSeconds: 15, averageTalkSeconds: 83, lastEventAt: '2026-08-26T21:55:00.000Z' })
    expect(body.monitor).toEqual({ available: false })
    expect(body.today).toEqual({ sessions: 3, uniqueVisitors: 2 })
    const todayQuery = selectCalls.find((call) => call.table?.startsAt === 'appointment.startsAt' && call.where?.values?.some((condition) => condition.type === 'lt'))
    expect(todayQuery.where).toEqual({
      type: 'and',
      values: [
        { type: 'gte', values: ['appointment.startsAt', '2026-08-26T21:00:00.000Z'] },
        { type: 'lt', values: ['appointment.startsAt', '2026-08-27T21:00:00.000Z'] },
        { type: 'inArray', values: ['appointment.status', ['pending', 'confirmed', 'needs_review']] },
      ],
    })
    const callTodayQuery = selectCalls.find((call) => call.table?.startedAt === 'mango_call.startedAt' && call.where?.values?.some((condition) => condition.type === 'lt'))
    expect(callTodayQuery.where.values.slice(0, 2)).toEqual([{ type: 'gte', values: ['mango_call.startedAt', '2026-08-26T21:00:00.000Z'] }, { type: 'lt', values: ['mango_call.startedAt', '2026-08-27T21:00:00.000Z'] }])
  })

  it('returns zero clinic defaults for empty aggregate rows', async () => {
    selectRows.push(...Array.from({ length: 18 }, () => []))
    const { GET } = await loadStatsHandler()
    const response = await GET({ request: new Request('https://odintsovclinic.ru/api/admin/stats') })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.clinic).toEqual({ todayAppointments: 0, upcomingAppointments: 0, needsReviewAppointments: 0, activePatients: 0 })
    expect(body.calls).toEqual({ active: 0, incomingToday: 0, answeredToday: 0, missedToday: 0, answerRate: 0, averageWaitSeconds: 0, averageTalkSeconds: 0, lastEventAt: null })
  })

  it('checks authentication before querying clinic statistics', async () => {
    guardAdminReadMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
    const { GET } = await loadStatsHandler()
    const response = await GET({ request: new Request('https://odintsovclinic.ru/api/admin/stats') })
    expect(response.status).toBe(401)
    expect(dbMock.select).not.toHaveBeenCalled()
  })

  it('sanitizes authenticated database failures', async () => {
    selectRows.push(new Error('database contained private data'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { GET } = await loadStatsHandler()
    const response = await GET({ request: new Request('https://odintsovclinic.ru/api/admin/stats') })
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Не удалось загрузить статистику.' } })
    errorSpy.mockRestore()
  })
})
