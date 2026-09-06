import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { describe, expect, it, vi } from 'vitest'
import { createAppointmentBooking } from '../lib/appointment-booking.js'
import { createBookingIntentRepository } from '../lib/appointment-intents.js'
import { validateBookingPayload } from '../lib/appointment-validation.js'
import { MedflexError } from '../lib/medflex-client.js'

vi.mock('../lib/database.js', () => ({ db: Object.freeze({ $client: undefined }) }))

const CLAIM_ID = '872bb8e7-fdc5-4886-8c54-2be1fe31d7fb'

function upstreamFixture() {
  const state = {
    factoryCalls: 0,
    factoryError: undefined,
    scheduleCalls: 0,
    scheduleInputs: [],
    scheduleError: undefined,
    schedulePage: schedulePage(),
    historyCalls: 0,
    historyInputs: [],
    historyError: undefined,
    historyPages: [historyPage()],
    createCalls: 0,
    createInputs: [],
    createSyncError: undefined,
    createError: undefined,
    createOperation: undefined,
    claimId: CLAIM_ID,
  }
  const client = Object.freeze({
    getSchedule: async (input) => {
      state.scheduleCalls += 1
      state.scheduleInputs.push(structuredClone(input))
      if (state.scheduleError) throw state.scheduleError
      return state.schedulePage
    },
    getAppointmentHistory: async (input) => {
      state.historyCalls += 1
      state.historyInputs.push(structuredClone(input))
      if (state.historyError) throw state.historyError
      return state.historyPages[input.page - 1]
    },
    createDoctorAppointment: (input) => {
      state.createCalls += 1
      state.createInputs.push(structuredClone(input))
      if (state.createSyncError) throw state.createSyncError
      if (state.createOperation) return state.createOperation(input)
      if (state.createError) return Promise.reject(state.createError)
      return Promise.resolve({ claim_id: state.claimId })
    },
  })
  const medflex = () => {
    state.factoryCalls += 1
    if (state.factoryError) throw state.factoryError
    return client
  }
  return Object.freeze({ state, medflex, log: vi.fn() })
}

function appointmentRecordFixture() {
  const state = { prepares: [], projects: [], current: undefined, getError: undefined }
  const records = Object.freeze({ prepare: async (input) => { state.prepares.push(structuredClone(input)); state.current = Object.freeze({ id: input.id, status: 'pending', medflexClaimId: null }); return state.current }, project: async (input) => { state.projects.push(structuredClone(input)); state.current = Object.freeze({ id: input.id, status: input.status === 'uncertain' ? 'needs_review' : input.status, medflexClaimId: input.claimId ?? null }); return state.current }, get: async () => { if (state.getError) throw state.getError; return state.current } })
  return Object.freeze({ state, records })
}

const SECRET = '807d53fb6db10feee627348937439500e68d766c63e9a18a1d27b74dff81ef30'
const INTENT_ID = '3335ac38-8090-42f1-8e05-f6c29bc73a9c'
const OTHER_INTENT_ID = '3027f8bc-9637-4d3d-8b8c-0b0b58e93b3a'
const FENCE_ID = '4664829a-aa5d-40d3-bb26-69b3968f7b4e'
const SLOT_DATE = '2091-09-04'
const START_LOCAL = `${SLOT_DATE} 10:10`
const END_LOCAL = `${SLOT_DATE} 10:50`
const TABLE_SQL = `CREATE TABLE BookingIntent (
  id TEXT PRIMARY KEY,
  requestFingerprint TEXT NOT NULL,
  status TEXT NOT NULL,
  fencingToken TEXT,
  doctorSlug TEXT NOT NULL,
  appointmentType TEXT NOT NULL,
  doctorId INTEGER NOT NULL,
  lpuId INTEGER NOT NULL,
  specialityId INTEGER NOT NULL,
  startsAt TEXT NOT NULL,
  endsAt TEXT NOT NULL,
  price INTEGER NOT NULL,
  medflexClaimId TEXT,
  failureCode TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  pendingUntil TEXT NOT NULL
)`
const INDEX_SQL = Object.freeze([
  'CREATE UNIQUE INDEX BookingIntent_requestFingerprint_unique ON BookingIntent(requestFingerprint)',
  'CREATE UNIQUE INDEX BookingIntent_medflexClaimId_unique ON BookingIntent(medflexClaimId)',
  'CREATE UNIQUE INDEX BookingIntent_fencingToken_unique ON BookingIntent(fencingToken)',
  'CREATE INDEX BookingIntent_status_pendingUntil_idx ON BookingIntent(status, pendingUntil)',
  'CREATE INDEX BookingIntent_resumeScope_idx ON BookingIntent(doctorSlug, appointmentType, startsAt, endsAt)',
])

function booking(overrides = {}) {
  const patient = Object.hasOwn(overrides, 'patient') ? overrides.patient : { firstName: 'Лёля', lastName: 'О’Коннор-Сидорова', secondName: 'Алиевна', phone: '+7 (921) 555-01-29', birthday: '1988-02-29' }
  return { doctorSlug: 'odintsov', appointmentType: 'mammologist', intentId: INTENT_ID, dtStart: `${SLOT_DATE}T10:10:00+03:00`, dtEnd: `${SLOT_DATE}T10:50:00+03:00`, patient, comment: 'Нужен сурдопереводчик Ω', consent: true, ...overrides }
}

function trustedBooking(payload = booking({}), mode = 'booking') {
  const now = mode === 'booking' ? new Date('2088-01-01T00:00:00.000Z') : new Date()
  const result = validateBookingPayload(payload, { now, mode })
  if (!result.valid) throw new Error('Test booking must be valid')
  return result.value
}

function slot(overrides = {}) {
  return { valid: true, doctorId: 70120, lpuId: 34871, specialityId: 55, price: 4_900, dtStart: START_LOCAL, dtEnd: END_LOCAL, ...overrides }
}

function scheduleRow(overrides = {}) {
  return {
    doctor_id: 70120,
    lpu_id: 34871,
    specialities: [55],
    prices: [{ speciality_id: 55, price: 4_900 }],
    allowed_age: [{ speciality_id: 55, min: 18, max: null }],
    cells: [{ dt_start: START_LOCAL, dt_end: END_LOCAL }],
    ...overrides,
  }
}

function schedulePage(rows = [scheduleRow({})]) {
  return { data: rows, count: rows.length, num_pages: rows.length ? 1 : 0 }
}

function historyRow(payload = booking({}), trustedSlot = slot({}), overrides = {}) {
  const normalized = trustedBooking(payload, 'resume')
  return {
    id: 981_337,
    uuid: CLAIM_ID,
    date: trustedSlot.dtStart.slice(0, 10),
    time_start: `${trustedSlot.dtStart.slice(11)}:00`,
    time_end: `${trustedSlot.dtEnd.slice(11)}:00`,
    price: trustedSlot.price,
    canceled: false,
    lpu: { id: trustedSlot.lpuId, name: '«Клиника доктора Одинцова»', address: 'просп. Богатырский, д. 22, корп. 1' },
    doctor: { id: trustedSlot.doctorId, fio: 'Одинцов Владислав Александрович', speciality_id: trustedSlot.specialityId, speciality_name: 'Маммолог' },
    patient: { mobile_phone: normalized.patient.phone, first_name: normalized.patient.firstName, second_name: normalized.patient.secondName, last_name: normalized.patient.lastName, birthday: normalized.patient.birthday },
    ...overrides,
  }
}

function historyPage(rows = []) {
  return { data: rows, count: rows.length, num_pages: rows.length ? 1 : 0 }
}

async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-appointments-api-'))
  const client = createClient({ url: `file:${join(directory, 'intents.sqlite')}` })
  await client.execute(TABLE_SQL)
  for (const sql of INDEX_SQL) await client.execute(sql)
  return { client, close: () => client.close() }
}

async function withDatabase(operation) {
  const fixture = await database()
  try {
    return await operation(fixture)
  } finally {
    fixture.close()
  }
}

function headers({ contentType, origin, realIp, forwardedFor, contentLength } = {}) {
  const values = new Headers()
  if (contentType !== undefined) values.set('content-type', contentType)
  if (origin !== undefined) values.set('origin', origin)
  if (realIp !== undefined) values.set('x-real-ip', realIp)
  if (forwardedFor !== undefined) values.set('x-forwarded-for', forwardedFor)
  if (contentLength !== undefined) values.set('content-length', String(contentLength))
  return values
}

function slotsRequest(overrides = {}) {
  const query = overrides.query ?? `doctor=odintsov&from=${SLOT_DATE}&days=14`
  const requestHeaders = headers({ origin: overrides.origin, realIp: overrides.realIp ?? '203.0.113.31', forwardedFor: overrides.forwardedFor })
  return new Request(`https://odintsovclinic.ru/api/appointments/slots?${query}`, { headers: requestHeaders })
}

function bookRequest(overrides = {}) {
  const body = overrides.rawBody ?? JSON.stringify(overrides.body ?? booking({}))
  const requestHeaders = headers({ contentType: overrides.contentType ?? 'application/json; charset=utf-8', origin: overrides.origin ?? 'https://odintsovclinic.ru', realIp: overrides.realIp ?? '203.0.113.41', forwardedFor: overrides.forwardedFor, contentLength: overrides.contentLength })
  return new Request('https://odintsovclinic.ru/api/appointments/book', { method: 'POST', headers: requestHeaders, body })
}

function oversizedBookRequest(cancellation) {
  let read = false
  const reader = {
    read: async () => {
      if (read) return { done: true, value: undefined }
      read = true
      return { done: false, value: new Uint8Array(16 * 1024 + 1) }
    },
    cancel: async () => { cancellation.count += 1 },
    releaseLock: () => undefined,
  }
  return { url: 'https://odintsovclinic.ru/api/appointments/book', headers: headers({ contentType: 'application/json', origin: 'https://odintsovclinic.ru', realIp: '203.0.113.43', contentLength: 7 }), body: { getReader: () => reader } }
}

async function responseValue(response) {
  return { status: response.status, cache: response.headers.get('Cache-Control'), retryAfter: response.headers.get('Retry-After'), body: await response.json() }
}

async function loadSlots(upstream, { productionLog = false } = {}) {
  const module = await import('../pages/api/appointments/slots.js')
  if (!upstream) return module
  const input = { medflex: upstream.medflex }
  if (!productionLog) input.log = upstream.log
  return { ...module, GET: module.createSlotsEndpoint(input) }
}

async function loadBook(upstream, intentClient, endpoint = {}) {
  const module = await import('../pages/api/appointments/book.js')
  if (!upstream) return module
  const record = appointmentRecordFixture()
  const workflow = () => createAppointmentBooking({ intentClient, intentSecret: SECRET, appointmentRecords: record.records, medflex: upstream.medflex, log: upstream.log })
  return { ...module, POST: module.createBookEndpoint(workflow, { fingerprintKey: SECRET, contactLimit: endpoint.contactLimit ?? (() => Object.freeze({ allowed: true })) }), appointmentState: record.state }
}

function medflexError(code, input = {}) {
  return new MedflexError(code, input)
}

async function seed(fixture, payload, trustedSlot, status) {
  const normalized = trustedBooking(payload, 'resume')
  const repository = createBookingIntentRepository({ client: fixture.client, secret: SECRET, clock: () => new Date('2019-01-01T00:00:00.000Z'), uuid: () => FENCE_ID })
  const acquired = await repository.acquire({ booking: normalized, slot: trustedSlot })
  if (status === 'confirmed') await repository.confirm({ capability: acquired.capability, claimId: CLAIM_ID })
  if (status === 'uncertain') await repository.markUncertain({ capability: acquired.capability })
  if (status === 'failed') await repository.fail({ capability: acquired.capability, failureCode: 'SLOT_UNAVAILABLE' })
  return normalized
}

function deferred() {
  let resolve
  const promise = new Promise((resolvePromise) => { resolve = resolvePromise })
  return { promise, resolve }
}

describe('GET /api/appointments/slots', () => {
  it('is a non-prerendered same-origin server endpoint', async () => {
    const module = await loadSlots()
    expect(module.prerender).toBe(false)
  })

  it('allows a public GET without Origin and returns a browser-safe normalized schedule', async () => {
    const upstream = upstreamFixture()
    const { GET } = await loadSlots(upstream)
    const result = await responseValue(await GET({ request: slotsRequest({}), url: new URL(slotsRequest({}).url) }))
    const serialized = JSON.stringify(result.body)
    expect({ status: result.status, cache: result.cache, available: result.body.data.available, safe: !/70120|34871|doctor_id|speciality_id/.test(serialized) }).toEqual({ status: 200, cache: 'no-store', available: true, safe: true })
  })

  it('rejects a present cross-origin GET before Medflex access', async () => {
    const upstream = upstreamFixture()
    const { GET } = await loadSlots(upstream)
    const response = await GET({ request: slotsRequest({ origin: 'https://evil.invalid' }), url: new URL(slotsRequest({}).url) })
    expect({ status: response.status, body: await response.json(), calls: upstream.state.scheduleCalls }).toEqual({ status: 403, body: { error: 'FORBIDDEN_ORIGIN', message: 'Недопустимый источник запроса' }, calls: 0 })
  })

  it('rejects an invalid bounded date window before Medflex access', async () => {
    const upstream = upstreamFixture()
    const request = slotsRequest({ query: 'doctor=odintsov&from=2091-02-29&days=15' })
    const { GET } = await loadSlots(upstream)
    const response = await GET({ request, url: new URL(request.url) })
    expect({ status: response.status, code: (await response.json()).error, calls: upstream.state.scheduleCalls }).toEqual({ status: 400, code: 'VALIDATION_ERROR', calls: 0 })
  })

  it('returns doctor unavailable before constructing the upstream client', async () => {
    const upstream = upstreamFixture()
    const request = slotsRequest({ query: `doctor=neizvestnyy-vrach&from=${SLOT_DATE}&days=7` })
    const { GET } = await loadSlots(upstream)
    const response = await GET({ request, url: new URL(request.url) })
    expect({ status: response.status, body: await response.json(), factories: upstream.state.factoryCalls }).toEqual({ status: 404, body: { error: 'DOCTOR_UNAVAILABLE', message: 'Онлайн-запись к этому врачу недоступна' }, factories: 0 })
  })

  it('returns an explicit normalized empty schedule as a successful response', async () => {
    const upstream = upstreamFixture()
    upstream.state.schedulePage = schedulePage([])
    const request = slotsRequest({})
    const { GET } = await loadSlots(upstream)
    const result = await responseValue(await GET({ request, url: new URL(request.url) }))
    expect(result).toMatchObject({ status: 200, cache: 'no-store', body: { data: { available: false, reason: 'NO_SCHEDULE', appointmentTypes: [], dates: [] } } })
  })

  it.each([
    ['timeout', medflexError('MEDFLEX_TIMEOUT', { retryable: true })],
    ['malformed response', medflexError('MEDFLEX_INVALID_RESPONSE', { retryable: true })],
    ['redirect rejection', medflexError('MEDFLEX_NETWORK', { retryable: true })],
  ])('maps an upstream %s to one sanitized unavailable response', async (_label, error) => {
    const upstream = upstreamFixture()
    upstream.state.scheduleError = error
    const request = slotsRequest({ realIp: `203.0.113.${60 + upstream.state.factoryCalls}` })
    const { GET } = await loadSlots(upstream)
    const result = await responseValue(await GET({ request, url: new URL(request.url) }))
    expect(result).toEqual({ status: 503, cache: 'no-store', retryAfter: null, body: { error: 'SCHEDULE_UNAVAILABLE', message: 'Расписание временно недоступно' } })
  })

  it('logs only a safe schedule stage when an upstream error contains secrets', async () => {
    const upstream = upstreamFixture()
    const raw = 'token-secret-raw doctor 70120'
    upstream.state.scheduleError = new Error(raw)
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const request = slotsRequest({ realIp: '203.0.113.64' })
    const { GET } = await loadSlots(upstream, { productionLog: true })
    const response = await GET({ request, url: new URL(request.url) })
    const calls = JSON.stringify(logged.mock.calls)
    logged.mockRestore()
    expect({ status: response.status, calls, leaked: calls.includes(raw) }).toEqual({ status: 503, calls: '[["[appointments/slots]","SCHEDULE_LOOKUP_FAILED"]]', leaked: false })
  })

  it('keeps the unavailable response fail-closed when the logging adapter fails', async () => {
    const upstream = upstreamFixture()
    upstream.state.scheduleError = new Error('upstream failed')
    const module = await loadSlots()
    const GET = module.createSlotsEndpoint({ medflex: upstream.medflex, log: () => { throw new Error('logger failed') } })
    const request = slotsRequest({ realIp: '203.0.113.65' })
    const response = await GET({ request, url: new URL(request.url) })
    expect({ status: response.status, body: await response.json() }).toEqual({ status: 503, body: { error: 'SCHEDULE_UNAVAILABLE', message: 'Расписание временно недоступно' } })
  })

  it('uses the proxy-controlled real IP for the thirty-request schedule limit', async () => {
    const upstream = upstreamFixture()
    const { GET } = await loadSlots(upstream)
    const statuses = []
    for (let index = 0; index < 31; index += 1) {
      const request = slotsRequest({ realIp: '203.0.113.240', forwardedFor: `198.51.100.${index + 1}` })
      statuses.push((await GET({ request, url: new URL(request.url) })).status)
    }
    expect({ accepted: statuses.filter((status) => status === 200).length, final: statuses.at(-1), calls: upstream.state.scheduleCalls }).toEqual({ accepted: 30, final: 429, calls: 30 })
  })
})

describe('POST /api/appointments/book boundaries', () => {
  it('is a non-prerendered server endpoint', async () => {
    const module = await loadBook()
    expect(module.prerender).toBe(false)
  })

  it('rejects a cross-origin mutation before reading or dispatching it', async () => {
    const upstream = upstreamFixture()
    const { POST } = await loadBook(upstream)
    const result = await responseValue(await POST({ request: bookRequest({ origin: 'https://evil.invalid' }) }))
    expect({ status: result.status, cache: result.cache, body: result.body, calls: upstream.state.createCalls }).toEqual({ status: 403, cache: 'no-store', body: { error: 'FORBIDDEN_ORIGIN', message: 'Недопустимый источник запроса' }, calls: 0 })
  })

  it('rejects a non-JSON media type before storage or Medflex access', async () => {
    const upstream = upstreamFixture()
    const { POST } = await loadBook(upstream)
    const response = await POST({ request: bookRequest({ contentType: 'text/plain' }) })
    expect({ status: response.status, body: await response.json(), calls: upstream.state.factoryCalls }).toEqual({ status: 415, body: { error: 'UNSUPPORTED_MEDIA_TYPE', message: 'Передайте данные записи в формате JSON' }, calls: 0 })
  })

  it('rejects a declared oversized body before reading it', async () => {
    const upstream = upstreamFixture()
    const { POST } = await loadBook(upstream)
    const response = await POST({ request: bookRequest({ contentLength: 16 * 1024 + 1 }) })
    expect({ status: response.status, code: (await response.json()).error, calls: upstream.state.factoryCalls }).toEqual({ status: 413, code: 'BODY_TOO_LARGE', calls: 0 })
  })

  it('caps actual streamed bytes and cancels a forged short request body', async () => {
    const upstream = upstreamFixture()
    const cancellation = { count: 0 }
    const { POST } = await loadBook(upstream)
    const response = await POST({ request: oversizedBookRequest(cancellation) })
    expect({ status: response.status, code: (await response.json()).error, cancellations: cancellation.count }).toEqual({ status: 413, code: 'BODY_TOO_LARGE', cancellations: 1 })
  })

  it('rejects malformed JSON before storage or Medflex access', async () => {
    const upstream = upstreamFixture()
    const { POST } = await loadBook(upstream)
    const response = await POST({ request: bookRequest({ rawBody: '{"patient":' }) })
    expect({ status: response.status, code: (await response.json()).error, calls: upstream.state.factoryCalls }).toEqual({ status: 400, code: 'INVALID_JSON', calls: 0 })
  })

  it('rejects patient, consent, and forged semantic fields before Medflex access', async () => {
    const upstream = upstreamFixture()
    const hostile = { ...booking({ consent: false }), medflexDoctorId: 70120, price: 1 }
    const { POST } = await loadBook(upstream)
    const response = await POST({ request: bookRequest({ body: hostile }) })
    expect({ status: response.status, code: (await response.json()).error, calls: upstream.state.factoryCalls }).toEqual({ status: 400, code: 'VALIDATION_ERROR', calls: 0 })
  })
})

describe('POST /api/appointments/book intent flow', () => {
  it('creates one appointment from current trusted scope and price', async () => {
    const upstream = upstreamFixture()
    upstream.state.schedulePage = schedulePage([scheduleRow({ prices: [{ speciality_id: 55, price: 5_350 }] })])
    const result = await withDatabase(async (fixture) => {
      const { POST } = await loadBook(upstream, fixture.client)
      const response = await responseValue(await POST({ request: bookRequest({ realIp: '203.0.113.81' }) }))
      return { response, sent: upstream.state.createInputs[0] }
    })
    expect(result).toMatchObject({ response: { status: 201, cache: 'no-store', body: { data: { status: 'confirmed', claimId: CLAIM_ID, doctor: { slug: 'odintsov' }, appointmentType: { key: 'mammologist' }, price: 5_350 } } }, sent: { doctor: { id: 70120, lpu_id: 34871, speciality_id: 55 }, appointment: { dt_start: START_LOCAL, dt_end: END_LOCAL, price: 5_350 } } })
  })

  it('returns a slot conflict with a fresh-intent instruction before paid dispatch', async () => {
    const upstream = upstreamFixture()
    upstream.state.schedulePage = schedulePage([scheduleRow({ cells: [] })])
    const result = await withDatabase(async (fixture) => {
      const { POST } = await loadBook(upstream, fixture.client)
      return responseValue(await POST({ request: bookRequest({ realIp: '203.0.113.82' }) }))
    })
    expect({ status: result.status, body: result.body, calls: upstream.state.createCalls }).toEqual({ status: 409, body: { error: 'SLOT_UNAVAILABLE', message: 'Выбранное время уже недоступно', freshIntentRequired: true, refreshSchedule: true }, calls: 0 })
  })

  it('does not acquire or dispatch when the pre-paid schedule call fails', async () => {
    const upstream = upstreamFixture()
    upstream.state.scheduleError = medflexError('MEDFLEX_TIMEOUT', { retryable: true })
    const result = await withDatabase(async (fixture) => {
      const { POST } = await loadBook(upstream, fixture.client)
      return responseValue(await POST({ request: bookRequest({ realIp: '203.0.113.83' }) }))
    })
    expect({ status: result.status, code: result.body.error, creates: upstream.state.createCalls }).toEqual({ status: 503, code: 'BOOKING_UNAVAILABLE', creates: 0 })
  })

  it('replays an exact confirmation after the current slot disappears', async () => {
    const upstream = upstreamFixture()
    const result = await withDatabase(async (fixture) => {
      const { POST } = await loadBook(upstream, fixture.client)
      const first = await POST({ request: bookRequest({ realIp: '203.0.113.84' }) })
      upstream.state.schedulePage = schedulePage([])
      const replay = await responseValue(await POST({ request: bookRequest({ realIp: '203.0.113.85' }) }))
      return { first: first.status, replay, schedules: upstream.state.scheduleCalls, creates: upstream.state.createCalls }
    })
    expect(result).toMatchObject({ first: 201, replay: { status: 200, body: { data: { status: 'confirmed', claimId: CLAIM_ID } } }, schedules: 1, creates: 1 })
  })

  it('answers a re-sent identical request under a new intent identifier with the confirmed booking', async () => {
    const upstream = upstreamFixture()
    const result = await withDatabase(async (fixture) => {
      const { POST } = await loadBook(upstream, fixture.client)
      await POST({ request: bookRequest({ realIp: '203.0.113.96' }) })
      const replay = await responseValue(await POST({ request: bookRequest({ body: booking({ intentId: OTHER_INTENT_ID }), realIp: '203.0.113.97' }) }))
      return { status: replay.status, claimId: replay.body?.data?.claimId, creates: upstream.state.createCalls }
    })
    expect(result).toEqual({ status: 200, claimId: CLAIM_ID, creates: 1 })
  })

  it('returns one detail-free conflict for cross-ID duplicate and exact-ID mismatch', async () => {
    const upstream = upstreamFixture()
    const result = await withDatabase(async (fixture) => {
      const { POST } = await loadBook(upstream, fixture.client)
      await POST({ request: bookRequest({ realIp: '203.0.113.86' }) })
      const duplicate = await responseValue(await POST({ request: bookRequest({ body: booking({ intentId: OTHER_INTENT_ID }), realIp: '203.0.113.87' }) }))
      const mismatch = await responseValue(await POST({ request: bookRequest({ body: booking({ comment: 'Другой запрос' }), realIp: '203.0.113.88' }) }))
      return { duplicate, mismatch, creates: upstream.state.createCalls }
    })
    expect(result).toEqual({ duplicate: { status: 200, cache: 'no-store', retryAfter: null, body: { data: { status: 'confirmed', claimId: CLAIM_ID, doctor: result.duplicate.body.data.doctor, appointmentType: result.duplicate.body.data.appointmentType, startsAt: result.duplicate.body.data.startsAt, endsAt: result.duplicate.body.data.endsAt, price: result.duplicate.body.data.price } } }, mismatch: { status: 409, cache: 'no-store', retryAfter: null, body: { error: 'BOOKING_REQUEST_CONFLICT', message: 'Эта попытка записи не может быть повторена' } }, creates: 1 })
  })

  it('allows at most one paid call for two concurrent requests', async () => {
    const upstream = upstreamFixture()
    const started = deferred()
    const release = deferred()
    upstream.state.createOperation = () => { started.resolve(); return release.promise }
    const result = await withDatabase(async (fixture) => {
      const { POST } = await loadBook(upstream, fixture.client)
      const first = POST({ request: bookRequest({ realIp: '203.0.113.89' }) })
      await started.promise
      const second = POST({ request: bookRequest({ realIp: '203.0.113.90' }) })
      release.resolve({ claim_id: CLAIM_ID })
      return Promise.all([first, second])
    })
    const statuses = result.map(({ status }) => status)
    const replay = statuses.find((status) => status !== 201)
    expect({ creates: upstream.state.createCalls, confirmed: statuses.filter((status) => status === 201).length, safeReplay: [200, 202].includes(replay) }).toEqual({ creates: 1, confirmed: 1, safeReplay: true })
  })

  it('marks a definite upstream slot conflict failed and requires a fresh intent', async () => {
    const upstream = upstreamFixture()
    upstream.state.createError = medflexError('MEDFLEX_SLOT_UNAVAILABLE', { status: 423, outcomeUncertain: false })
    const result = await withDatabase(async (fixture) => {
      const { POST } = await loadBook(upstream, fixture.client)
      return responseValue(await POST({ request: bookRequest({ realIp: '203.0.113.91' }) }))
    })
    expect({ status: result.status, body: result.body, creates: upstream.state.createCalls }).toEqual({ status: 409, body: { error: 'SLOT_UNAVAILABLE', message: 'Выбранное время уже недоступно', freshIntentRequired: true, refreshSchedule: true }, creates: 1 })
  })

  it('maps a definite ignored upstream request to a safe retryable service failure', async () => {
    const upstream = upstreamFixture()
    upstream.state.createError = medflexError('MEDFLEX_RATE_LIMITED', { status: 429, retryable: true, outcomeUncertain: false })
    const result = await withDatabase(async (fixture) => {
      const { POST } = await loadBook(upstream, fixture.client)
      return responseValue(await POST({ request: bookRequest({ realIp: '203.0.113.92' }) }))
    })
    expect({ status: result.status, code: result.body.error, creates: upstream.state.createCalls }).toEqual({ status: 503, code: 'BOOKING_UNAVAILABLE', creates: 1 })
  })

  it('marks a synchronous pre-dispatch client failure safely retryable', async () => {
    const upstream = upstreamFixture()
    upstream.state.createSyncError = new TypeError('local body construction failed')
    const result = await withDatabase(async (fixture) => {
      const { POST } = await loadBook(upstream, fixture.client)
      return responseValue(await POST({ request: bookRequest({ realIp: '203.0.113.93' }) }))
    })
    expect({ status: result.status, code: result.body.error, schedules: upstream.state.scheduleCalls }).toEqual({ status: 503, code: 'BOOKING_UNAVAILABLE', schedules: 1 })
  })

  it('marks a post-dispatch timeout uncertain without a blind retry', async () => {
    const upstream = upstreamFixture()
    upstream.state.createError = medflexError('MEDFLEX_TIMEOUT', { outcomeUncertain: true })
    const result = await withDatabase(async (fixture) => {
      const { POST } = await loadBook(upstream, fixture.client)
      const first = await responseValue(await POST({ request: bookRequest({ realIp: '203.0.113.94' }) }))
      const replay = await responseValue(await POST({ request: bookRequest({ realIp: '203.0.113.95' }) }))
      return { first, replay, creates: upstream.state.createCalls, factories: upstream.state.factoryCalls, histories: upstream.state.historyCalls }
    })
    expect(result).toMatchObject({ first: { status: 202, body: { data: { status: 'uncertain', canRetry: false } } }, replay: { status: 202, body: { data: { status: 'uncertain', canRetry: false } } }, creates: 1, factories: 1, histories: 0 })
  })

  it('ignores unsupported history even when it would match an uncertain booking', async () => {
    const upstream = upstreamFixture()
    upstream.state.createError = medflexError('MEDFLEX_NETWORK', { outcomeUncertain: true })
    const result = await withDatabase(async (fixture) => {
      const { POST } = await loadBook(upstream, fixture.client)
      await POST({ request: bookRequest({ realIp: '203.0.113.96' }) })
      upstream.state.schedulePage = schedulePage([])
      upstream.state.historyPages = [historyPage([historyRow()])]
      const replay = await responseValue(await POST({ request: bookRequest({ realIp: '203.0.113.97' }) }))
      return { replay, creates: upstream.state.createCalls, factories: upstream.state.factoryCalls, schedules: upstream.state.scheduleCalls, histories: upstream.state.historyCalls }
    })
    expect(result).toMatchObject({ replay: { status: 202, body: { data: { status: 'uncertain' } } }, creates: 1, factories: 1, schedules: 1, histories: 0 })
  })

  it('keeps a persisted uncertain intent fail-closed when its local appointment is absent', async () => {
    const upstream = upstreamFixture()
    const persisted = slot({ doctorId: 80120, lpuId: 44871, specialityId: 155, price: 6_250 })
    const result = await withDatabase(async (fixture) => {
      await seed(fixture, booking({}), persisted, 'uncertain')
      const { POST } = await loadBook(upstream, fixture.client)
      const response = await responseValue(await POST({ request: bookRequest({ realIp: '203.0.113.101' }) }))
      return { response, factories: upstream.state.factoryCalls, schedules: upstream.state.scheduleCalls, histories: upstream.state.historyCalls }
    })
    expect({ status: result.response.status, state: result.response.body.data.status, factories: result.factories, schedules: result.schedules, histories: result.histories }).toEqual({ status: 202, state: 'uncertain', factories: 0, schedules: 0, histories: 0 })
  })

  it('keeps a local recovery failure uncertain and sanitized', async () => {
    const upstream = upstreamFixture()
    const raw = 'patient 79215550129 token-secret-raw'
    upstream.state.createError = medflexError('MEDFLEX_TIMEOUT', { outcomeUncertain: true })
    const result = await withDatabase(async (fixture) => {
      const { POST, appointmentState } = await loadBook(upstream, fixture.client)
      await POST({ request: bookRequest({ realIp: '203.0.113.98' }) })
      appointmentState.getError = new Error(raw)
      const replay = await responseValue(await POST({ request: bookRequest({ realIp: '203.0.113.99' }) }))
      return { replay, serialized: JSON.stringify(replay.body), creates: upstream.state.createCalls, factories: upstream.state.factoryCalls }
    })
    expect({ status: result.replay.status, code: result.replay.body.data.status, leaked: result.serialized.includes(raw), creates: result.creates, factories: result.factories }).toEqual({ status: 202, code: 'uncertain', leaked: false, creates: 1, factories: 1 })
  })

  it('uses a returned claim immediately when confirmation races into reconciliation', async () => {
    const upstream = upstreamFixture()
    const result = await withDatabase(async (fixture) => {
      upstream.state.createOperation = async () => { await fixture.client.execute({ sql: 'UPDATE BookingIntent SET status = ? WHERE id = ?', args: ['uncertain', INTENT_ID] }); return { claim_id: CLAIM_ID } }
      const { POST } = await loadBook(upstream, fixture.client)
      const response = await responseValue(await POST({ request: bookRequest({ realIp: '203.0.113.100' }) }))
      return { response, histories: upstream.state.historyCalls }
    })
    expect(result).toMatchObject({ response: { status: 201, body: { data: { status: 'confirmed', claimId: CLAIM_ID } } }, histories: 0 })
  })

  it('rate limits the stable real-IP bucket after five booking requests', async () => {
    const upstream = upstreamFixture()
    const result = await withDatabase(async (fixture) => {
      const { POST } = await loadBook(upstream, fixture.client)
      const responses = []
      for (let index = 0; index < 6; index += 1) responses.push(await POST({ request: bookRequest({ realIp: '203.0.113.241', forwardedFor: `198.51.100.${index + 1}` }) }))
      return { statuses: responses.map(({ status }) => status), retry: responses.at(-1).headers.get('Retry-After'), creates: upstream.state.createCalls }
    })
    expect(result).toEqual({ statuses: [201, 200, 200, 200, 200, 429], retry: expect.any(String), creates: 1 })
  })

  it('logs only the error class of an unexpected workflow failure', async () => {
    const module = await import('../pages/api/appointments/book.js')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const POST = module.createBookEndpoint(() => ({ submit: async () => { throw new TypeError('patient 79215550129 leaked') } }), { fingerprintKey: SECRET, contactLimit: () => Object.freeze({ allowed: true }) })
    const response = await POST({ request: bookRequest({ realIp: '203.0.113.99' }) })
    const logged = errorSpy.mock.calls.map((call) => call.join(' '))
    errorSpy.mockRestore()
    expect({ status: response.status, stage: logged.some((line) => line.endsWith('WORKFLOW_UNEXPECTED_FAILURE:TypeError')), leaked: logged.some((line) => line.includes('79215550129')) }).toEqual({ status: 503, stage: true, leaked: false })
  })

  it('limits one normalized contact fingerprint after three attempts across changing IP addresses', async () => {
    const upstream = upstreamFixture()
    const keys = []
    const contactLimit = (key) => { keys.push(key); return keys.length <= 3 ? { allowed: true } : { allowed: false, retryAfterSec: 317 } }
    const ids = [INTENT_ID, OTHER_INTENT_ID, '7027f8bc-9637-4d3d-8b8c-0b0b58e93b3a', '8027f8bc-9637-4d3d-8b8c-0b0b58e93b3a']
    const result = await withDatabase(async (fixture) => {
      const { POST } = await loadBook(upstream, fixture.client, { contactLimit })
      const responses = []
      for (let index = 0; index < ids.length; index += 1) responses.push(await POST({ request: bookRequest({ body: booking({ intentId: ids[index], patient: { ...booking().patient, phone: index % 2 === 0 ? '+7 (921) 555-01-29' : '8 921 555-01-29' } }), realIp: `203.0.113.${210 + index}` }) }))
      return responses
    })
    const serialized = JSON.stringify(keys)
    expect({ statuses: result.map(({ status }) => status), sameKey: new Set(keys).size, safeKey: keys.every((key) => /^v1:[0-9a-f]{64}$/.test(key)), leaked: serialized.includes('79215550129') || serialized.includes('89215550129'), retry: result.at(-1).headers.get('Retry-After') }).toEqual({ statuses: [201, 200, 200, 429], sameKey: 1, safeKey: true, leaked: false, retry: '317' })
  })
})

describe('POST /api/appointments/book after slot start', () => {
  it('replays an exact confirmed booking after its start without a live schedule', async () => {
    const upstream = upstreamFixture()
    const past = booking({ dtStart: '2020-08-24T10:10:00+03:00', dtEnd: '2020-08-24T10:50:00+03:00' })
    const pastSlot = slot({ dtStart: '2020-08-24 10:10', dtEnd: '2020-08-24 10:50' })
    const result = await withDatabase(async (fixture) => {
      await seed(fixture, past, pastSlot, 'confirmed')
      const { POST } = await loadBook(upstream, fixture.client)
      return responseValue(await POST({ request: bookRequest({ body: past, realIp: '203.0.113.111' }) }))
    })
    expect({ status: result.status, claim: result.body.data.claimId, schedules: upstream.state.scheduleCalls, creates: upstream.state.createCalls }).toEqual({ status: 200, claim: CLAIM_ID, schedules: 0, creates: 0 })
  })

  it('keeps an exact uncertain booking after its start without Medflex access', async () => {
    const upstream = upstreamFixture()
    const past = booking({ dtStart: '2020-08-24T10:10:00+03:00', dtEnd: '2020-08-24T10:50:00+03:00' })
    const pastSlot = slot({ dtStart: '2020-08-24 10:10', dtEnd: '2020-08-24 10:50' })
    const result = await withDatabase(async (fixture) => {
      await seed(fixture, past, pastSlot, 'uncertain')
      const { POST } = await loadBook(upstream, fixture.client)
      return responseValue(await POST({ request: bookRequest({ body: past, realIp: '203.0.113.112' }) }))
    })
    expect({ status: result.status, state: result.body.data.status, factories: upstream.state.factoryCalls, schedules: upstream.state.scheduleCalls, histories: upstream.state.historyCalls }).toEqual({ status: 202, state: 'uncertain', factories: 0, schedules: 0, histories: 0 })
  })

  it.each([
    ['not found', undefined],
    ['retryable failure', 'failed'],
  ])('never schedules or dispatches a past %s intent', async (_label, status) => {
    const upstream = upstreamFixture()
    const past = booking({ dtStart: '2020-08-24T10:10:00+03:00', dtEnd: '2020-08-24T10:50:00+03:00' })
    const pastSlot = slot({ dtStart: '2020-08-24 10:10', dtEnd: '2020-08-24 10:50' })
    const result = await withDatabase(async (fixture) => {
      if (status) await seed(fixture, past, pastSlot, status)
      const { POST } = await loadBook(upstream, fixture.client)
      return responseValue(await POST({ request: bookRequest({ body: past, realIp: status ? '203.0.113.114' : '203.0.113.113' }) }))
    })
    expect({ status: result.status, code: result.body.error, schedules: upstream.state.scheduleCalls, creates: upstream.state.createCalls }).toEqual({ status: 400, code: 'VALIDATION_ERROR', schedules: 0, creates: 0 })
  })
})
