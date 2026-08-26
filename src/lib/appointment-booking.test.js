import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it, vi } from 'vitest'
import { createAppointmentBooking } from './appointment-booking.js'
import { createAppointmentRecords } from './appointment-records.js'
import { createMedflexClient } from './medflex-client.js'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const MIGRATION_SCRIPT = join(PROJECT_ROOT, 'scripts/init-db.mjs')
const SECRET = '91b4b6ce0ebaa9724a66e69699b9eef56ea1df0a62de8825972f5d30c41fd129'
const FINGERPRINT_KEY = 'booking-contact-Ω-secret-with-enough-entropy-2026'
const ENCRYPTION_KEY = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64')
const PATIENT_ID = '10000000-0000-4000-8000-000000000001'
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

function recordAdapter(state = {}) {
  state.events ??= []
  state.prepares ??= []
  state.projects ??= []
  state.projectFailures ??= 0
  return Object.freeze({
    prepare: async (input) => {
      state.events.push('prepare')
      state.prepares.push(structuredClone(input))
      if (state.prepareFailure) throw state.prepareFailure
      return Object.freeze({ id: input.id, status: 'pending' })
    },
    project: async (input) => {
      state.events.push(`project:${input.status}`)
      state.projects.push(structuredClone(input))
      if (state.projectFailures > 0) { state.projectFailures -= 1; throw new Error('local projection failed') }
      return Object.freeze({ id: input.id, status: input.status })
    },
  })
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

async function clinicDatabase() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-appointment-booking-clinic-'))
  const path = join(directory, 'clinic.sqlite')
  await executeFile(process.execPath, [MIGRATION_SCRIPT], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${path}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 10_000, maxBuffer: 1_000_000 })
  return createClient({ url: `file:${path}` })
}

describe('appointment booking workflow', () => {
  it('hides validation, trusted schedule, intent ownership, and paid dispatch behind one submit interface', async () => {
    const client = await database()
    const state = { events: [] }
    const createDoctorAppointment = vi.fn(async () => { state.events.push('medflex'); return { claim_id: CLAIM_ID } })
    const medflex = Object.freeze({ getSchedule: async () => schedule(), getAppointmentHistory: async () => ({ data: [], count: 0, num_pages: 0 }), createDoctorAppointment })
    const stages = []
    const booking = createAppointmentBooking({ intentClient: client, intentSecret: SECRET, appointmentRecords: recordAdapter(state), medflex: () => medflex, clock: () => new Date('2088-01-01T00:00:00.000Z'), log: (stage) => stages.push(stage) })
    const result = await booking.submit(payload())
    client.close()
    expect({ result, creates: createDoctorAppointment.mock.calls.length, sent: createDoctorAppointment.mock.calls[0][0].appointment, events: state.events, stages }).toMatchObject({ result: { status: 201, body: { data: { status: 'confirmed', claimId: CLAIM_ID, price: 5_350 } } }, creates: 1, sent: { price: 5_350 }, events: ['prepare', 'medflex', 'project:confirmed'], stages: [] })
  })

  it('logs only a safe stage code when current schedule lookup fails', async () => {
    const client = await database()
    const raw = 'patient 79215550129 token-secret-raw'
    const stages = []
    const medflex = Object.freeze({ getSchedule: async () => { throw new Error(raw) }, getAppointmentHistory: async () => ({ data: [], count: 0, num_pages: 0 }), createDoctorAppointment: async () => ({ claim_id: CLAIM_ID }) })
    const booking = createAppointmentBooking({ intentClient: client, intentSecret: SECRET, appointmentRecords: recordAdapter(), medflex: () => medflex, clock: () => new Date('2088-01-01T00:00:00.000Z'), log: (stage) => stages.push(stage) })
    const result = await booking.submit(payload())
    client.close()
    expect({ status: result.status, code: result.body.error, stages, leaked: JSON.stringify({ result, stages }).includes(raw) }).toEqual({ status: 503, code: 'BOOKING_UNAVAILABLE', stages: ['SCHEDULE_LOOKUP_FAILED'], leaked: false })
  })

  it('returns a concurrent confirmation after a malformed paid response without redispatching', async () => {
    const client = await database()
    const creates = []
    const medflex = upstream(async () => { creates.push(true); return { claim_id: 'malformed-claim' } })
    const booking = createAppointmentBooking({ intentClient: faultClient(client, 'malformed-response-race'), intentSecret: SECRET, appointmentRecords: recordAdapter(), medflex: () => medflex, clock: () => new Date('2088-01-01T00:00:00.000Z'), log: () => undefined })
    const first = await booking.submit(payload())
    const replay = await booking.submit(payload())
    client.close()
    expect({ first: first.status, replay: replay.status, claim: first.body.data?.claimId, creates: creates.length }).toEqual({ first: 200, replay: 200, claim: CLAIM_ID, creates: 1 })
  })

  it('returns a persisted confirmation when its database acknowledgement is lost', async () => {
    const client = await database()
    const creates = []
    const medflex = upstream(async () => { creates.push(true); return { claim_id: CLAIM_ID } })
    const booking = createAppointmentBooking({ intentClient: faultClient(client, 'confirm-acknowledgement'), intentSecret: SECRET, appointmentRecords: recordAdapter(), medflex: () => medflex, clock: () => new Date('2088-01-01T00:00:00.000Z'), log: () => undefined })
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
    const records = recordAdapter()
    await createAppointmentBooking({ intentClient: client, intentSecret: SECRET, appointmentRecords: records, medflex: () => upstream(async () => ({ claim_id: 'malformed-claim' })), clock: () => new Date('2088-01-01T00:00:00.000Z'), log: (stage) => stages.push(stage) }).submit(raw)
    const calls = []
    const replay = await createAppointmentBooking({ intentClient: client, intentSecret: SECRET, appointmentRecords: records, medflex: () => historyClient(calls), clock: () => new Date('2088-01-01T00:00:00.000Z'), log: (stage) => stages.push(stage) }).submit(raw)
    client.close()
    const surfaces = JSON.stringify({ calls, stages, replay })
    expect({ status: replay.status, query: new URL(calls[0]).searchParams.toString(), leaked: [raw.patient.phone, '79991234567'].some((phone) => surfaces.includes(phone)) }).toEqual({ status: 202, query: 'date_start=2091-09-04&date_end=2091-09-04&lpu_id=34871&page=1&size=50', leaked: false })
  })

  it('does not dispatch Medflex when local appointment preparation fails', async () => {
    const client = await database()
    const state = { prepareFailure: new Error('database unavailable') }
    const creates = []
    const booking = createAppointmentBooking({ intentClient: client, intentSecret: SECRET, appointmentRecords: recordAdapter(state), medflex: () => upstream(async () => { creates.push(true); return { claim_id: CLAIM_ID } }), clock: () => new Date('2088-01-01T00:00:00.000Z'), log: () => undefined })
    const result = await booking.submit(payload())
    const stored = await client.execute({ sql: 'SELECT status, failureCode FROM BookingIntent WHERE id = ?', args: [payload().intentId] })
    client.close()
    expect({ status: result.status, creates: creates.length, stored: stored.rows[0] }).toEqual({ status: 503, creates: 0, stored: { status: 'failed', failureCode: 'LOCAL_PERSISTENCE_FAILED' } })
  })

  it('retries only local confirmation projection three times and repairs it on replay', async () => {
    const client = await database()
    const state = { projectFailures: 3 }
    const creates = []
    const records = recordAdapter(state)
    const booking = createAppointmentBooking({ intentClient: client, intentSecret: SECRET, appointmentRecords: records, medflex: () => upstream(async () => { creates.push(true); return { claim_id: CLAIM_ID } }), clock: () => new Date('2088-01-01T00:00:00.000Z'), log: () => undefined })
    const first = await booking.submit(payload())
    const replay = await booking.submit(payload())
    client.close()
    expect({ first: { status: first.status, body: first.body.data?.status }, replay: { status: replay.status, body: replay.body.data?.status }, creates: creates.length, projects: state.projects.map(({ status }) => status) }).toEqual({ first: { status: 202, body: 'uncertain' }, replay: { status: 200, body: 'confirmed' }, creates: 1, projects: ['confirmed', 'confirmed', 'confirmed', 'confirmed'] })
  })

  it('persists one encrypted patient and confirmed appointment around the real booking intent transaction', async () => {
    const client = await clinicDatabase()
    const creates = []
    const records = createAppointmentRecords({ client, fingerprintKey: FINGERPRINT_KEY, encryptionKey: ENCRYPTION_KEY, clock: () => new Date('2088-01-01T00:00:00.000Z'), uuid: () => PATIENT_ID })
    const booking = createAppointmentBooking({ intentClient: client, intentSecret: SECRET, appointmentRecords: records, medflex: () => upstream(async () => { creates.push(true); return { claim_id: CLAIM_ID } }), clock: () => new Date('2088-01-01T00:00:00.000Z'), log: () => undefined })
    const response = await booking.submit(payload())
    const local = await client.execute('SELECT a.status, a.medflexClaimId, p.profileCiphertext, p.phoneMask FROM Appointment a JOIN Patient p ON p.id = a.patientId')
    client.close()
    const row = local.rows[0] ?? {}
    expect({ response: response.status, creates: creates.length, status: row.status, claimId: row.medflexClaimId, encrypted: row.profileCiphertext?.startsWith('v1.') && !row.profileCiphertext.includes('79215550129'), mask: row.phoneMask }).toEqual({ response: 201, creates: 1, status: 'confirmed', claimId: CLAIM_ID, encrypted: true, mask: '+7 •••••••• 29' })
  })
})
