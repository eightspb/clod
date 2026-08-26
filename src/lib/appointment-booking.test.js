import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { describe, expect, it, vi } from 'vitest'
import { createAppointmentBooking } from './appointment-booking.js'
import { createMedflexClient } from './medflex-client.js'

const SECRET = '91b4b6ce0ebaa9724a66e69699b9eef56ea1df0a62de8825972f5d30c41fd129'
const CLAIM_ID = '872bb8e7-fdc5-4886-8c54-2be1fe31d7fb'
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

function payload() {
  return { doctorSlug: 'odintsov', appointmentType: 'mammologist', intentId: '3335ac38-8090-42f1-8e05-f6c29bc73a9c', dtStart: '2091-09-04T10:10:00+03:00', dtEnd: '2091-09-04T10:50:00+03:00', patient: { firstName: 'Лёля', lastName: 'Сидорова', secondName: '', phone: '+7 (921) 555-01-29', birthday: '1988-02-29' }, comment: '', consent: true }
}

function schedule() {
  return { data: [{ doctor_id: 70120, lpu_id: 34871, specialities: [55], prices: [{ speciality_id: 55, price: 5_350 }], allowed_age: [{ speciality_id: 55, min: 18, max: null }], cells: [{ dt_start: '2091-09-04 10:10', dt_end: '2091-09-04 10:50' }] }], count: 1, num_pages: 1 }
}

function upstream(createDoctorAppointment) {
  return Object.freeze({ getSchedule: async () => schedule(), getAppointmentHistory: async () => ({ data: [], count: 0, num_pages: 0 }), createDoctorAppointment })
}

function faultClient(client, fault) {
  let injected = false
  return Object.freeze({
    batch: (...input) => client.batch(...input),
    execute: async (statement) => {
      if (injected) return client.execute(statement)
      if (fault === 'confirm-acknowledgement' && statement?.args?.[0] === 'confirmed') {
        injected = true
        await client.execute(statement)
        throw new Error('Confirmation acknowledgement lost')
      }
      if (fault === 'malformed-response-race' && statement?.args?.[0] === 'uncertain') {
        injected = true
        await client.execute({ sql: 'UPDATE BookingIntent SET status = ?, medflexClaimId = ?, failureCode = ? WHERE id = ?', args: ['confirmed', CLAIM_ID, null, payload().intentId] })
      }
      return client.execute(statement)
    },
  })
}

function historyClient(calls) {
  const fetchImpl = async (url) => {
    calls.push(String(url))
    return new Response(JSON.stringify({ data: [], count: 0, num_pages: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  return createMedflexClient({ fetchImpl, token: 'history-token-privacy', timeoutMs: 1_003 })
}

async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-appointment-booking-'))
  const client = createClient({ url: `file:${join(directory, 'intents.sqlite')}` })
  await client.execute(TABLE_SQL)
  for (const sql of INDEX_SQL) await client.execute(sql)
  return client
}

describe('appointment booking workflow', () => {
  it('hides validation, trusted schedule, intent ownership, and paid dispatch behind one submit interface', async () => {
    const client = await database()
    const createDoctorAppointment = vi.fn(async () => ({ claim_id: CLAIM_ID }))
    const medflex = Object.freeze({ getSchedule: async () => schedule(), getAppointmentHistory: async () => ({ data: [], count: 0, num_pages: 0 }), createDoctorAppointment })
    const stages = []
    const booking = createAppointmentBooking({ intentClient: client, intentSecret: SECRET, medflex: () => medflex, clock: () => new Date('2088-01-01T00:00:00.000Z'), log: (stage) => stages.push(stage) })
    const result = await booking.submit(payload())
    client.close()
    expect({ result, creates: createDoctorAppointment.mock.calls.length, sent: createDoctorAppointment.mock.calls[0][0].appointment, stages }).toMatchObject({ result: { status: 201, body: { data: { status: 'confirmed', claimId: CLAIM_ID, price: 5_350 } } }, creates: 1, sent: { price: 5_350 }, stages: [] })
  })

  it('logs only a safe stage code when current schedule lookup fails', async () => {
    const client = await database()
    const raw = 'patient 79215550129 token-secret-raw'
    const stages = []
    const medflex = Object.freeze({ getSchedule: async () => { throw new Error(raw) }, getAppointmentHistory: async () => ({ data: [], count: 0, num_pages: 0 }), createDoctorAppointment: async () => ({ claim_id: CLAIM_ID }) })
    const booking = createAppointmentBooking({ intentClient: client, intentSecret: SECRET, medflex: () => medflex, clock: () => new Date('2088-01-01T00:00:00.000Z'), log: (stage) => stages.push(stage) })
    const result = await booking.submit(payload())
    client.close()
    expect({ status: result.status, code: result.body.error, stages, leaked: JSON.stringify({ result, stages }).includes(raw) }).toEqual({ status: 503, code: 'BOOKING_UNAVAILABLE', stages: ['SCHEDULE_LOOKUP_FAILED'], leaked: false })
  })

  it('returns a concurrent confirmation after a malformed paid response without redispatching', async () => {
    const client = await database()
    const creates = []
    const medflex = upstream(async () => { creates.push(true); return { claim_id: 'malformed-claim' } })
    const booking = createAppointmentBooking({ intentClient: faultClient(client, 'malformed-response-race'), intentSecret: SECRET, medflex: () => medflex, clock: () => new Date('2088-01-01T00:00:00.000Z'), log: () => undefined })
    const first = await booking.submit(payload())
    const replay = await booking.submit(payload())
    client.close()
    expect({ first: first.status, replay: replay.status, claim: first.body.data?.claimId, creates: creates.length }).toEqual({ first: 200, replay: 200, claim: CLAIM_ID, creates: 1 })
  })

  it('returns a persisted confirmation when its database acknowledgement is lost', async () => {
    const client = await database()
    const creates = []
    const medflex = upstream(async () => { creates.push(true); return { claim_id: CLAIM_ID } })
    const booking = createAppointmentBooking({ intentClient: faultClient(client, 'confirm-acknowledgement'), intentSecret: SECRET, medflex: () => medflex, clock: () => new Date('2088-01-01T00:00:00.000Z'), log: () => undefined })
    const first = await booking.submit(payload())
    const replay = await booking.submit(payload())
    client.close()
    expect({ first: first.status, replay: replay.status, claim: first.body.data?.claimId, creates: creates.length }).toEqual({ first: 200, replay: 200, claim: CLAIM_ID, creates: 1 })
  })

  it('keeps the patient phone out of the bounded upstream history URL and safe surfaces', async () => {
    const client = await database()
    const source = payload()
    const raw = { ...source, patient: { ...source.patient, phone: '+7 (999) 123-45-67' } }
    const stages = []
    await createAppointmentBooking({ intentClient: client, intentSecret: SECRET, medflex: () => upstream(async () => ({ claim_id: 'malformed-claim' })), clock: () => new Date('2088-01-01T00:00:00.000Z'), log: (stage) => stages.push(stage) }).submit(raw)
    const calls = []
    const replay = await createAppointmentBooking({ intentClient: client, intentSecret: SECRET, medflex: () => historyClient(calls), clock: () => new Date('2088-01-01T00:00:00.000Z'), log: (stage) => stages.push(stage) }).submit(raw)
    client.close()
    const surfaces = JSON.stringify({ calls, stages, replay })
    expect({ status: replay.status, query: new URL(calls[0]).searchParams.toString(), leaked: [raw.patient.phone, '79991234567'].some((phone) => surfaces.includes(phone)) }).toEqual({ status: 202, query: 'date_start=2091-09-04&date_end=2091-09-04&lpu_id=34871&page=1&size=50', leaked: false })
  })
})
