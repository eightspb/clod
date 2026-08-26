import { describe, expect, it, vi } from 'vitest'
import { createMedflexClient, MedflexError } from './medflex-client.js'

const FIXED_ORIGIN = 'https://api.medflex.ru'
const JSON_TYPE = Object.freeze({ 'Content-Type': 'application/json' })
const TOKEN_ENV_KEY = 'MEDFLEX_CLINIC_TOKEN'
const UUID_ONE = 'd1c060a0-8375-4ff9-bce5-9bb03029256f'
const UUID_TWO = '0001beaa-21a3-472e-b0e9-5ac6358611ee'
const HTTP_CASES = Object.freeze([
  [400, 'MEDFLEX_REJECTED', false],
  [401, 'MEDFLEX_AUTH', false],
  [403, 'MEDFLEX_AUTH', false],
  [404, 'MEDFLEX_NOT_FOUND', false],
  [409, 'MEDFLEX_CONFLICT', false],
  [423, 'MEDFLEX_SLOT_UNAVAILABLE', false],
  [429, 'MEDFLEX_RATE_LIMITED', true],
  [500, 'MEDFLEX_UNAVAILABLE', true],
  [503, 'MEDFLEX_UNAVAILABLE', true],
])

function jsonResponse(value, status, headers) {
  return new Response(JSON.stringify(value), { status, headers: { ...JSON_TYPE, ...headers } })
}

function page(data) {
  return { data, count: data.length, num_pages: data.length ? 1 : 0 }
}

function fetchCapture(response) {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    return response
  }
  return { calls, fetchImpl }
}

function controlledEarlyResponse(status, contentType, contentLength, cancellationMessage) {
  let cancellations = 0
  const headers = { 'Content-Type': contentType }
  if (contentLength !== undefined) headers['Content-Length'] = contentLength
  const body = new ReadableStream({
    start: (controller) => controller.enqueue(new TextEncoder().encode(JSON.stringify(page([])))),
    cancel: () => { cancellations += 1; throw new RangeError(cancellationMessage) },
  })
  return { response: new Response(body, { status, headers }), cancellationCount: () => cancellations }
}

function controlledFailingStreamResponse(chunk, cancellationMessage) {
  let cancellations = 0
  const body = new ReadableStream({
    start: (controller) => controller.enqueue(chunk),
    cancel: () => { cancellations += 1; return Promise.reject(new RangeError(cancellationMessage)) },
  })
  const response = new Response(body, { status: 200, headers: JSON_TYPE })
  return { response, cancellationCount: () => cancellations, locked: () => response.body.locked }
}

function postRequest(call) {
  return { url: call.url, method: call.options.method, headers: call.options.headers, redirect: call.options.redirect, body: JSON.parse(call.options.body) }
}

function expectedPost(body) {
  return {
    url: `${FIXED_ORIGIN}/direct_appointment/doctor/execute/`,
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: 'Token запись-127', 'Content-Type': 'application/json' },
    redirect: 'error',
    body,
  }
}

function appointment(overrides) {
  return {
    doctor: { id: 941, lpu_id: 271, speciality_id: 83 },
    appointment: { dt_start: '2026-09-17 14:05', dt_end: '2026-09-17 14:35', comment: 'Нужен переводчик жестового языка', price: 3750.5 },
    client: { first_name: 'Лёля', second_name: '', last_name: 'О’Коннор', mobile_phone: '79215550129', birthday: '1988-02-29' },
    ...overrides,
  }
}

function appointmentInterval(dtStart, dtEnd) {
  return appointment({ appointment: { dt_start: dtStart, dt_end: dtEnd, comment: 'Проверка границы года', price: 3750 } })
}

function sparseIds(identifier) {
  const identifiers = new Array(2)
  identifiers[1] = identifier
  return identifiers
}

function idsWithOverriddenMap() {
  const identifiers = [-59]
  Object.defineProperty(identifiers, 'map', { value: () => [-59] })
  return identifiers
}

async function failure(operation) {
  try {
    await operation()
  } catch (error) {
    return error
  }
  throw new Error('Expected operation to fail')
}

function thrown(operation) {
  try {
    operation()
  } catch (error) {
    return error
  }
  throw new Error('Expected operation to throw')
}

function waitsForAbort(_url, options) {
  return new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('Остановлено', 'AbortError')), { once: true })
  })
}

async function withFakeTimers(operation) {
  vi.useFakeTimers()
  try {
    return await operation()
  } finally {
    vi.useRealTimers()
  }
}

async function withRuntimeToken(token, operation) {
  const original = process.env[TOKEN_ENV_KEY]
  if (token === undefined) delete process.env[TOKEN_ENV_KEY]
  else process.env[TOKEN_ENV_KEY] = token
  try {
    return await operation()
  } finally {
    if (original === undefined) delete process.env[TOKEN_ENV_KEY]
    else process.env[TOKEN_ENV_KEY] = original
  }
}

describe('Medflex client configuration', () => {
  it('fails on a blank token before calling fetch', () => {
    let calls = 0
    const fetchImpl = () => { calls += 1 }
    const error = thrown(() => createMedflexClient({ fetchImpl, token: ' \t ', timeoutMs: 71 }))
    expect({ calls, error }).toMatchObject({ calls: 0, error: { code: 'MEDFLEX_CONFIG', retryable: false } })
  })

  it('rejects a caller supplied origin instead of making it configurable', () => {
    let calls = 0
    const fetchImpl = () => { calls += 1 }
    const error = thrown(() => createMedflexClient({ fetchImpl, token: 'узкий-токен', timeoutMs: 73, origin: 'https://capture.invalid' }))
    expect({ calls, type: error.constructor }).toEqual({ calls: 0, type: TypeError })
  })

  it('reads the omitted token from process environment at factory-call runtime', async () => {
    const capture = fetchCapture(jsonResponse(page([]), 200, {}))
    const authorization = await withRuntimeToken('  runtime-token-77  ', async () => {
      const client = createMedflexClient({ fetchImpl: capture.fetchImpl, timeoutMs: 73 })
      await client.listLpus({})
      return capture.calls[0].options.headers.Authorization
    })
    expect(authorization).toBe('Token runtime-token-77')
  })

  it('fails before fetch when the runtime token is omitted and missing', async () => {
    let calls = 0
    const result = await withRuntimeToken(undefined, async () => {
      const fetchImpl = () => { calls += 1 }
      const error = thrown(() => createMedflexClient({ fetchImpl, timeoutMs: 79 }))
      return { calls, error }
    })
    expect(result).toMatchObject({ calls: 0, error: { code: 'MEDFLEX_CONFIG', retryable: false } })
  })

  it.each([0, -9, 1.5, 120001, '67'])('rejects the invalid timeout %s', (timeoutMs) => {
    const operation = () => createMedflexClient({ fetchImpl: globalThis.fetch, token: 'таймаут-токен', timeoutMs })
    expect(operation).toThrow(TypeError)
  })

  it('returns a frozen capability without exposing credentials', () => {
    const client = createMedflexClient({ fetchImpl: globalThis.fetch, token: '  не-показывать-93  ', timeoutMs: 79 })
    expect({ frozen: Object.isFrozen(client), keys: Object.keys(client).sort(), serialized: JSON.stringify(client) }).toEqual({
      frozen: true,
      keys: ['createDoctorAppointment', 'getAppointmentHistory', 'getSchedule', 'listDoctors', 'listLpus'],
      serialized: '{}',
    })
  })
})

describe('Medflex request construction', () => {
  it('sends exact authentication only to the fixed LPU endpoint', async () => {
    const capture = fetchCapture(jsonResponse(page([{ id: 613, name: 'Клиника на Неве' }]), 200, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: '  clinic-κλειδί  ', timeoutMs: 83 })
    await client.listLpus({})
    const call = capture.calls[0]
    expect({ origin: new URL(call.url).origin, path: new URL(call.url).pathname, authorization: call.options.headers.Authorization }).toEqual({
      origin: FIXED_ORIGIN,
      path: '/models/lpu/',
      authorization: 'Token clinic-κλειδί',
    })
  })

  it('uses safe GET options without a request body', async () => {
    const capture = fetchCapture(jsonResponse(page([]), 200, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: 'каталог-81', timeoutMs: 89 })
    await client.listLpus({})
    const options = capture.calls[0].options
    expect({ method: options.method, accept: options.headers.Accept, redirect: options.redirect, hasBody: Object.hasOwn(options, 'body') }).toEqual({
      method: 'GET', accept: 'application/json', redirect: 'error', hasBody: false,
    })
  })

  it('forces detailed false and serializes doctor filters deterministically', async () => {
    const capture = fetchCapture(jsonResponse(page([]), 200, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: 'врачи-107', timeoutMs: 97 })
    await client.listDoctors({ specialityIds: [19, 3], size: 17, doctorIds: [701, 29], page: 4, lpuIds: [88, 7] })
    expect(capture.calls[0].url).toBe(`${FIXED_ORIGIN}/models/doctor/?detailed=false&page=4&size=17&doctor_ids=29%2C701&lpu_ids=7%2C88&speciality_ids=3%2C19`)
  })

  it('builds a bounded schedule query in a fixed order', async () => {
    const capture = fetchCapture(jsonResponse(page([]), 200, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: 'расписание-109', timeoutMs: 101 })
    await client.getSchedule({ page: 3, specialityIds: [47, 5], lpuIds: [901], doctorIds: [71, 13], days: 30, dateStart: '2028-02-29', townId: 1261 })
    expect(capture.calls[0].url).toBe(`${FIXED_ORIGIN}/schedule/?town_id=1261&date_start=2028-02-29&days=30&doctor_ids=13%2C71&lpu_ids=901&speciality_ids=5%2C47&page=3`)
  })

  it('encodes appointment history filters without reflecting them elsewhere', async () => {
    const capture = fetchCapture(jsonResponse(page([]), 200, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: 'история-113', timeoutMs: 103 })
    await client.getAppointmentHistory({ size: 13, uuid: UUID_TWO, lpuId: 57, dateEnd: '2026-09-30', dateStart: '2026-09-01', page: 2 })
    expect(capture.calls[0].url).toBe(`${FIXED_ORIGIN}/direct_appointment/history/?date_start=2026-09-01&date_end=2026-09-30&lpu_id=57&uuid=${UUID_TWO}&page=2&size=13`)
  })

  it('posts a safely copied JSON appointment without following redirects', async () => {
    const body = appointment({})
    const capture = fetchCapture(jsonResponse({ claim_id: UUID_ONE }, 200, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: 'запись-127', timeoutMs: 107 })
    await client.createDoctorAppointment(body)
    expect(postRequest(capture.calls[0])).toEqual(expectedPost(body))
  })

  it('never retries the paid appointment request', async () => {
    const capture = fetchCapture(jsonResponse({ detail: 'Повтор запрещён' }, 429, { 'Retry-After': '30' }))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: 'без-повтора-131', timeoutMs: 109 })
    await failure(() => client.createDoctorAppointment(appointment({})))
    expect(capture.calls).toHaveLength(1)
  })
})

describe('Medflex input validation', () => {
  it('does not mutate caller filters while sorting identifier copies', async () => {
    const options = { lpuIds: [97, 11], doctorIds: [503, 41], specialityIds: [23, 2], page: 7, size: 19 }
    const snapshot = structuredClone(options)
    const capture = fetchCapture(jsonResponse(page([]), 200, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: 'копия-137', timeoutMs: 113 })
    await client.listDoctors(options)
    expect(options).toEqual(snapshot)
  })

  it('does not mutate the caller appointment while normalizing its copy', async () => {
    const body = appointment({})
    const snapshot = structuredClone(body)
    const capture = fetchCapture(jsonResponse({ claim_id: UUID_ONE }, 200, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: 'тело-139', timeoutMs: 127 })
    await client.createDoctorAppointment(body)
    expect(body).toEqual(snapshot)
  })

  it.each([
    ['LPU option', (client) => client.listLpus({ page: 2 })],
    ['doctor detail switch', (client) => client.listDoctors({ detailed: true })],
    ['schedule origin', (client) => client.getSchedule({ townId: 1261, origin: 'https://evil.invalid' })],
    ['history callback', (client) => client.getAppointmentHistory({ onResult: () => undefined })],
    ['history phone filter', (client) => client.getAppointmentHistory({ mobilePhone: '79215550129' })],
  ])('rejects the unknown %s before fetch', async (_label, invoke) => {
    let calls = 0
    const fetchImpl = async () => { calls += 1 }
    const client = createMedflexClient({ fetchImpl, token: 'неизвестное-149', timeoutMs: 131 })
    const error = await failure(() => invoke(client))
    expect({ calls, type: error.constructor }).toEqual({ calls: 0, type: TypeError })
  })

  it.each([
    ['zero doctor ID', (client) => client.listDoctors({ doctorIds: [0] })],
    ['fractional LPU ID', (client) => client.listDoctors({ lpuIds: [2.7] })],
    ['empty specialty list', (client) => client.listDoctors({ specialityIds: [] })],
    ['duplicate doctor IDs', (client) => client.listDoctors({ doctorIds: [31, 31] })],
    ['sparse doctor IDs', (client) => client.listDoctors({ doctorIds: sparseIds(37) })],
    ['sparse LPU IDs', (client) => client.listDoctors({ lpuIds: sparseIds(43) })],
    ['sparse specialty IDs', (client) => client.listDoctors({ specialityIds: sparseIds(47) })],
    ['overridden identifier map', (client) => client.listDoctors({ doctorIds: idsWithOverriddenMap() })],
    ['oversized doctor list', (client) => client.listDoctors({ doctorIds: Array.from({ length: 101 }, (_value, index) => index + 1) })],
    ['missing town', (client) => client.getSchedule({ days: 4 })],
    ['impossible schedule date', (client) => client.getSchedule({ townId: 1261, dateStart: '2027-02-29' })],
    ['oversized day window', (client) => client.getSchedule({ townId: 1261, days: 31 })],
    ['zero schedule page', (client) => client.getSchedule({ townId: 1261, page: 0 })],
    ['reversed history dates', (client) => client.getAppointmentHistory({ dateStart: '2026-10-02', dateEnd: '2026-10-01' })],
    ['malformed history UUID', (client) => client.getAppointmentHistory({ uuid: 'not-a-claim' })],
    ['oversized history page', (client) => client.getAppointmentHistory({ size: 51 })],
  ])('rejects %s before fetch', async (_label, invoke) => {
    let calls = 0
    const fetchImpl = async () => { calls += 1 }
    const client = createMedflexClient({ fetchImpl, token: 'границы-151', timeoutMs: 137 })
    const error = await failure(() => invoke(client))
    expect({ calls, type: error.constructor }).toEqual({ calls: 0, type: TypeError })
  })

  it('rejects an accessor option without invoking it', async () => {
    const options = {}
    Object.defineProperty(options, 'page', { enumerable: true, get: () => { throw new RangeError('getter invoked') } })
    const client = createMedflexClient({ fetchImpl: globalThis.fetch, token: 'accessor-157', timeoutMs: 139 })
    const error = await failure(() => client.listDoctors(options))
    expect(error).toBeInstanceOf(TypeError)
  })

  it('propagates an unexpected pre-dispatch caller reflection fault', async () => {
    const fault = new RangeError('caller reflection failed')
    const options = new Proxy({}, { getPrototypeOf: () => { throw fault } })
    const client = createMedflexClient({ fetchImpl: globalThis.fetch, token: 'caller-fault-159', timeoutMs: 143 })
    const error = await failure(() => client.listDoctors(options))
    expect(error).toBe(fault)
  })

  it.each([
    ['unknown appointment field', appointment({ patient_record: 'не отправлять' })],
    ['nonpositive doctor ID', appointment({ doctor: { id: -3, lpu_id: 271, speciality_id: 83 } })],
    ['invalid birthday', appointment({ client: { first_name: 'Ия', second_name: '', last_name: 'Ли', mobile_phone: '79215550129', birthday: '2025-02-29' } })],
    ['whitespace-only first name', appointment({ client: { first_name: '   ', second_name: '', last_name: 'Ли', mobile_phone: '79215550129', birthday: '1988-02-29' } })],
    ['oversized comment', appointment({ appointment: { dt_start: '2026-09-17 14:05', dt_end: '2026-09-17 14:35', comment: 'Ж'.repeat(301), price: 3750 } })],
  ])('rejects an appointment with %s before dispatch', async (_label, body) => {
    let calls = 0
    const fetchImpl = async () => { calls += 1 }
    const client = createMedflexClient({ fetchImpl, token: 'валидация-163', timeoutMs: 149 })
    const error = await failure(() => client.createDoctorAppointment(body))
    expect({ calls, type: error.constructor }).toEqual({ calls: 0, type: TypeError })
  })

  it('trims bounded appointment text before dispatch', async () => {
    const body = appointment({ client: { first_name: '  Лёля  ', second_name: '   ', last_name: '  Ли ', mobile_phone: '79215550129', birthday: '1988-02-29' } })
    const capture = fetchCapture(jsonResponse({ claim_id: UUID_ONE }, 200, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: 'trim-165', timeoutMs: 149 })
    await client.createDoctorAppointment(body)
    const sent = JSON.parse(capture.calls[0].options.body)
    expect(sent.client).toEqual({ first_name: 'Лёля', second_name: '', last_name: 'Ли', mobile_phone: '79215550129', birthday: '1988-02-29' })
  })

  it('rejects a reversed appointment interval before paid dispatch', async () => {
    let calls = 0
    const body = appointment({ appointment: { dt_start: '2026-09-17 15:05', dt_end: '2026-09-17 14:35', comment: 'Обратный интервал', price: 3750 } })
    const fetchImpl = async () => { calls += 1 }
    const client = createMedflexClient({ fetchImpl, token: 'interval-166', timeoutMs: 151 })
    const error = await failure(() => client.createDoctorAppointment(body))
    expect({ calls, type: error.constructor }).toEqual({ calls: 0, type: TypeError })
  })

  it('accepts a chronological appointment interval crossing 0099 into 0100', async () => {
    const capture = fetchCapture(jsonResponse({ claim_id: UUID_ONE }, 200, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: 'year-crossing-166', timeoutMs: 157 })
    const result = await client.createDoctorAppointment(appointmentInterval('0099-12-31 23:55', '0100-01-01 00:05'))
    expect({ calls: capture.calls.length, claimId: result.claim_id }).toEqual({ calls: 1, claimId: UUID_ONE })
  })

  it('rejects a reversed appointment interval crossing 0100 into 0099 before paid dispatch', async () => {
    let calls = 0
    const fetchImpl = async () => { calls += 1 }
    const client = createMedflexClient({ fetchImpl, token: 'year-reversed-166', timeoutMs: 163 })
    const error = await failure(() => client.createDoctorAppointment(appointmentInterval('0100-01-01 00:05', '0099-12-31 23:55')))
    expect({ calls, type: error.constructor }).toEqual({ calls: 0, type: TypeError })
  })
})

describe('Medflex success response isolation', () => {
  it.each([
    ['LPU catalog', (client) => client.listLpus({})],
    ['doctor catalog', (client) => client.listDoctors({ page: 1, size: 11 })],
    ['schedule', (client) => client.getSchedule({ townId: 1261, days: 7, page: 1 })],
    ['history', (client) => client.getAppointmentHistory({ page: 1, size: 23 })],
  ])('returns a plain owned data array for %s', async (_label, invoke) => {
    const capture = fetchCapture(jsonResponse(page([{ id: 167, label: 'Данные Ω' }]), 200, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: 'ответ-167', timeoutMs: 151 })
    const result = await invoke(client)
    expect({ plain: Object.getPrototypeOf(result) === Object.prototype, owned: Object.hasOwn(result, 'data'), array: Array.isArray(result.data) }).toEqual({ plain: true, owned: true, array: true })
  })

  it('deeply detaches and freezes returned upstream data', async () => {
    const upstream = page([{ id: 173, nested: { label: 'До изменения', values: [5, 9] } }])
    const response = { status: 200, headers: new Headers(JSON_TYPE), text: async () => JSON.stringify(upstream), json: async () => upstream }
    const client = createMedflexClient({ fetchImpl: async () => response, token: 'изоляция-173', timeoutMs: 157 })
    const result = await client.listLpus({})
    upstream.data[0].nested.label = 'После изменения'
    expect({ label: result.data[0].nested.label, root: Object.isFrozen(result), data: Object.isFrozen(result.data), nested: Object.isFrozen(result.data[0].nested) }).toEqual({ label: 'До изменения', root: true, data: true, nested: true })
  })

  it('returns only validated pagination metadata and omits upstream links', async () => {
    const source = { data: [{ id: 179 }], count: 371, num_pages: 19, links: { next: `${FIXED_ORIGIN}/direct_appointment/history/?mobile_phone=79215550129&page=2`, previous: null } }
    const capture = fetchCapture(jsonResponse(source, 200, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: 'метаданные-179', timeoutMs: 163 })
    const result = await client.getAppointmentHistory({ page: 1, size: 19 })
    expect(result).toEqual({ data: [{ id: 179 }], count: 371, num_pages: 19 })
  })

  it('accepts and normalizes a strict appointment claim UUID', async () => {
    const capture = fetchCapture(jsonResponse({ claim_id: UUID_ONE.toUpperCase() }, 200, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: 'claim-181', timeoutMs: 167 })
    const result = await client.createDoctorAppointment(appointment({}))
    expect(result).toEqual({ claim_id: UUID_ONE })
  })
})

describe('Medflex invalid responses', () => {
  it.each([
    ['non-2xx status', 409, 'application/json', undefined, 'MEDFLEX_CONFLICT'],
    ['wrong content type', 200, 'text/html', undefined, 'MEDFLEX_INVALID_RESPONSE'],
    ['oversized content length', 200, 'application/json', '1048577', 'MEDFLEX_INVALID_RESPONSE'],
  ])('cancels the body before rejecting %s without exposing cancellation failure', async (_label, status, contentType, contentLength, code) => {
    const raw = `cancel leaked token-187 phone-79215550129 ${status}`
    const controlled = controlledEarlyResponse(status, contentType, contentLength, raw)
    const client = createMedflexClient({ fetchImpl: async () => controlled.response, token: 'cancel-early-187', timeoutMs: 169 })
    const error = await failure(() => client.listLpus({}))
    expect({ cancellations: controlled.cancellationCount(), code: error.code, leaked: `${error.message} ${JSON.stringify(error)}`.includes(raw) }).toEqual({ cancellations: 1, code, leaked: false })
  })

  it.each([
    ['fatal UTF-8 before EOF', () => new Uint8Array([0xc3, 0x28])],
    ['oversized chunk before EOF', () => new Uint8Array(1_048_577)],
  ])('best-effort cancels and releases a stream after %s', async (_label, chunk) => {
    const raw = 'cancel stream leaked token-189 phone-79215550129'
    const controlled = controlledFailingStreamResponse(chunk(), raw)
    const client = createMedflexClient({ fetchImpl: async () => controlled.response, token: 'cancel-stream-189', timeoutMs: 171 })
    const error = await failure(() => client.listLpus({}))
    expect({ cancellations: controlled.cancellationCount(), locked: controlled.locked(), code: error.code, leaked: `${error.message} ${JSON.stringify(error)}`.includes(raw) }).toEqual({ cancellations: 1, locked: false, code: 'MEDFLEX_INVALID_RESPONSE', leaked: false })
  })

  it('rejects a success response without a JSON content type', async () => {
    const response = new Response(JSON.stringify(page([])), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    const client = createMedflexClient({ fetchImpl: async () => response, token: 'тип-191', timeoutMs: 173 })
    const error = await failure(() => client.listLpus({}))
    expect(error).toMatchObject({ code: 'MEDFLEX_INVALID_RESPONSE', retryable: true })
  })

  it('rejects malformed JSON without exposing its fragment', async () => {
    const fragment = '{"data":[{"patient":"Мария-secret"}'
    const response = new Response(fragment, { status: 200, headers: JSON_TYPE })
    const client = createMedflexClient({ fetchImpl: async () => response, token: 'json-193', timeoutMs: 179 })
    const error = await failure(() => client.listDoctors({ page: 1, size: 7 }))
    expect({ code: error.code, leaked: `${error.message} ${JSON.stringify(error)}`.includes(fragment) }).toEqual({ code: 'MEDFLEX_INVALID_RESPONSE', leaked: false })
  })

  it('rejects a declared response larger than one mebibyte', async () => {
    const response = jsonResponse(page([]), 200, { 'Content-Length': '1048577' })
    const client = createMedflexClient({ fetchImpl: async () => response, token: 'размер-197', timeoutMs: 181 })
    const error = await failure(() => client.listLpus({}))
    expect(error).toMatchObject({ code: 'MEDFLEX_INVALID_RESPONSE' })
  })

  it('stops reading an undeclared response larger than one mebibyte', async () => {
    const response = new Response(`{"data":[{"payload":"${'Ж'.repeat(524289)}"}]}`, { status: 200, headers: JSON_TYPE })
    const client = createMedflexClient({ fetchImpl: async () => response, token: 'поток-199', timeoutMs: 997 })
    const error = await failure(() => client.listLpus({}))
    expect(error).toMatchObject({ code: 'MEDFLEX_INVALID_RESPONSE' })
  })

  it.each([
    ['null root', null],
    ['array root', []],
    ['missing data', { count: 0, num_pages: 0 }],
    ['missing count', { data: [], num_pages: 0 }],
    ['missing pages', { data: [], count: 0 }],
    ['object data', { data: {}, count: 0, num_pages: 0 }],
    ['null item', { data: [null], count: 1, num_pages: 1 }],
    ['negative count', { data: [], count: -1, num_pages: 0 }],
    ['fractional pages', { data: [], count: 0, num_pages: 1.5 }],
  ])('rejects the malformed page shape %s', async (_label, body) => {
    const capture = fetchCapture(jsonResponse(body, 200, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: 'shape-211', timeoutMs: 1009 })
    const error = await failure(() => client.getSchedule({ townId: 1261 }))
    expect(error).toMatchObject({ code: 'MEDFLEX_INVALID_RESPONSE' })
  })

  it.each([
    ['missing claim', {}],
    ['extra field', { claim_id: UUID_ONE, patient: 'не возвращать' }],
    ['malformed claim', { claim_id: 'd1c060a0-not-a-uuid' }],
  ])('rejects the malformed appointment success %s', async (_label, body) => {
    const capture = fetchCapture(jsonResponse(body, 200, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: 'claim-shape-223', timeoutMs: 1013 })
    const error = await failure(() => client.createDoctorAppointment(appointment({})))
    expect(error).toMatchObject({ code: 'MEDFLEX_INVALID_RESPONSE', outcomeUncertain: true })
  })
})

describe('Medflex safe errors', () => {
  it.each(HTTP_CASES)('maps HTTP %i to %s', async (status, code, retryable) => {
    const response = jsonResponse({ detail: `Внутренняя причина ${status}` }, status, {})
    const client = createMedflexClient({ fetchImpl: async () => response, token: `статус-${status}`, timeoutMs: 1031 })
    const error = await failure(() => client.listLpus({}))
    expect(error).toMatchObject({ code, status, retryable, outcomeUncertain: false })
  })

  it.each([500, 503])('marks paid POST HTTP %i as uncertain and non-retryable without retry', async (status) => {
    const capture = fetchCapture(jsonResponse({ detail: `Сбой после приёма ${status}` }, status, {}))
    const client = createMedflexClient({ fetchImpl: capture.fetchImpl, token: `paid-http-${status}`, timeoutMs: 1021 })
    const error = await failure(() => client.createDoctorAppointment(appointment({})))
    expect({ calls: capture.calls.length, code: error.code, status: error.status, retryable: error.retryable, uncertain: error.outcomeUncertain }).toEqual({ calls: 1, code: 'MEDFLEX_UNAVAILABLE', status, retryable: false, uncertain: true })
  })

  it('preserves a bounded integer Retry-After value', async () => {
    const response = jsonResponse({ detail: 'Подождите' }, 429, { 'Retry-After': '47' })
    const client = createMedflexClient({ fetchImpl: async () => response, token: 'retry-227', timeoutMs: 1033 })
    const error = await failure(() => client.listDoctors({ page: 2, size: 29 }))
    expect(error).toMatchObject({ code: 'MEDFLEX_RATE_LIMITED', retryAfterSeconds: 47 })
  })

  it.each(['-1', '3.7', '86401', 'one minute'])('ignores the untrusted Retry-After value %s', async (retryAfter) => {
    const response = jsonResponse({ detail: 'Не доверять' }, 429, { 'Retry-After': retryAfter })
    const client = createMedflexClient({ fetchImpl: async () => response, token: 'retry-bound-229', timeoutMs: 1039 })
    const error = await failure(() => client.listLpus({}))
    expect(error.retryAfterSeconds).toBeUndefined()
  })

  it('never reflects raw detail credentials or a history phone in serialized errors', async () => {
    const token = 'token-secret-233'
    const phone = '79215550129'
    const detail = `Пациент ${phone}; credential ${token}`
    const response = jsonResponse({ detail, stack: `raw ${detail}` }, 400, {})
    const client = createMedflexClient({ fetchImpl: async () => response, token, timeoutMs: 1049 })
    const error = await failure(() => client.getAppointmentHistory({ page: 1, size: 19 }))
    const serialized = `${error.message} ${JSON.stringify(error)}`
    expect([token, phone, detail].some((value) => serialized.includes(value))).toBe(false)
  })

  it('sanitizes direct error construction and rejects invalid metadata ranges', () => {
    const rawCode = 'raw token-secret-237 phone-79215550129'
    const error = new MedflexError(rawCode, { status: 99, retryAfterSeconds: 86_401, retryable: 'true', outcomeUncertain: 1, detail: rawCode })
    const serialized = `${error.message} ${JSON.stringify(error)}`
    expect({ code: error.code, status: error.status, retryAfter: error.retryAfterSeconds, retryable: error.retryable, uncertain: error.outcomeUncertain, leaked: serialized.includes(rawCode) }).toEqual({ code: 'MEDFLEX_HTTP_ERROR', status: undefined, retryAfter: undefined, retryable: false, uncertain: false, leaked: false })
  })

  it('freezes public error metadata', async () => {
    const response = jsonResponse({ detail: 'Слот занят' }, 423, {})
    const client = createMedflexClient({ fetchImpl: async () => response, token: 'readonly-239', timeoutMs: 1051 })
    const error = await failure(() => client.getSchedule({ townId: 1261 }))
    expect({ instance: error instanceof MedflexError, frozen: Object.isFrozen(error), code: error.code }).toEqual({ instance: true, frozen: true, code: 'MEDFLEX_SLOT_UNAVAILABLE' })
  })
})

describe('Medflex network boundaries', () => {
  it('normalizes an ordinary GET network failure without raw causes', async () => {
    const raw = 'fetch failed at https://api.medflex.ru/?mobile_phone=79215550129'
    const fetchImpl = async () => { throw new TypeError(raw) }
    const client = createMedflexClient({ fetchImpl, token: 'network-241', timeoutMs: 1061 })
    const error = await failure(() => client.listDoctors({ doctorIds: [241] }))
    expect({ code: error.code, retryable: error.retryable, leaked: `${error.message} ${JSON.stringify(error)}`.includes(raw) }).toEqual({ code: 'MEDFLEX_NETWORK', retryable: true, leaked: false })
  })

  it('marks a paid POST network failure after dispatch as uncertain and non-retryable', async () => {
    let calls = 0
    const fetchImpl = async () => { calls += 1; throw new TypeError('socket closed after write') }
    const client = createMedflexClient({ fetchImpl, token: 'uncertain-network-251', timeoutMs: 1063 })
    const error = await failure(() => client.createDoctorAppointment(appointment({})))
    expect({ calls, code: error.code, retryable: error.retryable, uncertain: error.outcomeUncertain }).toEqual({ calls: 1, code: 'MEDFLEX_NETWORK', retryable: false, uncertain: true })
  })

  it('aborts a timed out GET and reports a safe retryable timeout', async () => {
    let signal
    const fetchImpl = (url, options) => { signal = options.signal; return waitsForAbort(url, options) }
    const client = createMedflexClient({ fetchImpl, token: 'timeout-get-257', timeoutMs: 5 })
    const error = await failure(() => client.getSchedule({ townId: 1261, days: 3 }))
    expect({ aborted: signal.aborted, code: error.code, retryable: error.retryable, uncertain: error.outcomeUncertain }).toEqual({ aborted: true, code: 'MEDFLEX_TIMEOUT', retryable: true, uncertain: false })
  })

  it('marks a timed out paid POST as explicitly outcome uncertain', async () => {
    let signal
    const fetchImpl = (url, options) => { signal = options.signal; return waitsForAbort(url, options) }
    const client = createMedflexClient({ fetchImpl, token: 'timeout-post-263', timeoutMs: 5 })
    const error = await failure(() => client.createDoctorAppointment(appointment({})))
    expect({ aborted: signal.aborted, code: error.code, retryable: error.retryable, uncertain: error.outcomeUncertain }).toEqual({ aborted: true, code: 'MEDFLEX_TIMEOUT', retryable: false, uncertain: true })
  })

  it('clears the timeout after a completed response', async () => {
    let signal
    const fetchImpl = async (_url, options) => { signal = options.signal; return jsonResponse(page([]), 200, {}) }
    const client = createMedflexClient({ fetchImpl, token: 'clear-269', timeoutMs: 7 })
    const aborted = await withFakeTimers(async () => { await client.listLpus({}); await vi.advanceTimersByTimeAsync(17); return signal.aborted })
    expect(aborted).toBe(false)
  })

  it('sanitizes an unexpected injected fetch rejection', async () => {
    const raw = 'broken fetch for token-secret-271 and phone 79215550129'
    const fault = new Error(raw)
    const fetchImpl = async () => { throw fault }
    const client = createMedflexClient({ fetchImpl, token: 'programming-271', timeoutMs: 107 })
    const error = await failure(() => client.listLpus({}))
    expect({ code: error.code, retryable: error.retryable, leaked: `${error.message} ${JSON.stringify(error)}`.includes(raw) }).toEqual({ code: 'MEDFLEX_NETWORK', retryable: true, leaked: false })
  })

  it('sanitizes even a caller-created MedflexError rejected inside fetch', async () => {
    const raw = 'token-secret-273 with phone 79215550129'
    const fetchImpl = async () => { throw new MedflexError(raw, { retryable: false }) }
    const client = createMedflexClient({ fetchImpl, token: 'foreign-error-273', timeoutMs: 108 })
    const error = await failure(() => client.listLpus({}))
    expect({ code: error.code, leaked: `${error.message} ${JSON.stringify(error)}`.includes(raw) }).toEqual({ code: 'MEDFLEX_NETWORK', leaked: false })
  })

  it('does not inspect hostile transport rejection properties', async () => {
    const raw = 'proxy getter leaked token-secret-275 and 79215550129'
    const fault = new Proxy(new Error('opaque'), { get: (target, key, receiver) => { if (key === 'name') throw new RangeError(raw); return Reflect.get(target, key, receiver) } })
    const client = createMedflexClient({ fetchImpl: async () => { throw fault }, token: 'hostile-error-275', timeoutMs: 108 })
    const error = await failure(() => client.listLpus({}))
    expect({ code: error.code, leaked: `${error.message} ${JSON.stringify(error)}`.includes(raw) }).toEqual({ code: 'MEDFLEX_NETWORK', leaked: false })
  })

  it('sanitizes an unexpected response body read rejection', async () => {
    const raw = 'stream failed at ?mobile_phone=79215550129 with token-secret-277'
    const response = { status: 200, headers: new Headers(JSON_TYPE), text: async () => { throw new RangeError(raw) } }
    const client = createMedflexClient({ fetchImpl: async () => response, token: 'body-read-277', timeoutMs: 109 })
    const error = await failure(() => client.getAppointmentHistory({ page: 1, size: 19 }))
    expect({ code: error.code, leaked: `${error.message} ${JSON.stringify(error)}`.includes(raw) }).toEqual({ code: 'MEDFLEX_NETWORK', leaked: false })
  })
})
