import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const MIGRATION_SCRIPT = join(PROJECT_ROOT, 'scripts/init-db.mjs')
const FINGERPRINT_KEY = 'appointment-contact-Ω-secret-with-enough-entropy-2026'
const ENCRYPTION_KEY = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64')
const PATIENT_ID = '10000000-0000-4000-8000-000000000001'
const OTHER_PATIENT_ID = '20000000-0000-4000-8000-000000000002'
const APPOINTMENT_ID = '30000000-0000-4000-8000-000000000003'
const OTHER_APPOINTMENT_ID = '40000000-0000-4000-8000-000000000004'
const CLAIM_ID = '50000000-0000-4000-8000-000000000005'
const OTHER_CLAIM_ID = '60000000-0000-4000-8000-000000000006'
const FIRST_CONTACT_ID = '70000000-0000-4000-8000-000000000007'
const SECOND_CONTACT_ID = '80000000-0000-4000-8000-000000000008'
const NOW = new Date('2026-08-26T10:00:00.000Z')
const FIRST_PROFILE = Object.freeze({ firstName: 'Лёля', lastName: 'О’Коннор-Сидорова', secondName: 'Алиевна', phone: '+7 (921) 555-01-29', birthday: '1988-02-29' })
const OTHER_PROFILE = Object.freeze({ firstName: 'Мария', lastName: 'Кюри', secondName: 'Склодовская', phone: '+7 921 555-83-47', birthday: null })
const APPOINTMENT = Object.freeze({ medflexLpuId: 34871, medflexDoctorId: 70120, medflexSpecialityId: 55, medflexServiceId: null, doctorName: 'Одинцов Владислав Александрович', specialityName: 'Маммолог', serviceName: null, startsAt: '2026-08-27T07:20:00.000Z', endsAt: '2026-08-27T08:00:00.000Z', priceRubles: 5_350, localDoctorId: null })
const OTHER_APPOINTMENT = Object.freeze({ ...APPOINTMENT, medflexDoctorId: 90111, doctorName: 'Кюри Мария Склодовская', startsAt: '2026-08-28T09:10:00.000Z', endsAt: '2026-08-28T09:50:00.000Z', priceRubles: 4_700 })

function sequence(values) {
  let index = 0
  return () => values[Math.min(index++, values.length - 1)]
}

async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-appointment-records-'))
  const path = join(directory, 'content.sqlite')
  await executeFile(process.execPath, [MIGRATION_SCRIPT], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${path}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 10_000, maxBuffer: 1_000_000 })
  return createClient({ url: `file:${path}` })
}

async function fixture(overrides = {}) {
  const client = overrides.client ?? await database()
  const module = await import('./appointment-records.js')
  const factory = typeof module.createAppointmentRecords === 'function' ? module.createAppointmentRecords : () => Object.freeze({})
  const records = factory({ client, fingerprintKey: FINGERPRINT_KEY, encryptionKey: ENCRYPTION_KEY, clock: overrides.clock ?? (() => NOW), uuid: overrides.uuid ?? sequence([PATIENT_ID, FIRST_CONTACT_ID, OTHER_PATIENT_ID, SECOND_CONTACT_ID]) })
  return Object.freeze({ client, records })
}

async function invoke(records, method, input) {
  return typeof records[method] === 'function' ? records[method](input) : Object.freeze({ missing: method })
}

async function captured(operation) {
  try {
    await operation()
    return Object.freeze({ threw: false })
  } catch (error) {
    return Object.freeze({ threw: true, name: error.name, code: error.code })
  }
}

function prepareInput(overrides = {}) {
  return { id: overrides.id ?? APPOINTMENT_ID, source: overrides.source ?? 'website', profile: overrides.profile ?? FIRST_PROFILE, appointment: overrides.appointment ?? APPOINTMENT }
}

describe('appointment records', () => {
  it('atomically prepares an encrypted patient, pending appointment, and verified doctor link', async () => {
    const { client, records } = await fixture()
    const result = await invoke(records, 'prepare', prepareInput())
    const patient = await client.execute('SELECT COUNT(*) AS total FROM Patient')
    const appointment = await client.execute('SELECT patientId, status, priceKopecks, bookingFingerprint FROM Appointment')
    const link = await client.execute('SELECT medflexDoctorId, externalName, active FROM MedflexDoctorLink')
    client.close()
    expect({ result, patients: Number(patient.rows[0]?.total), appointment: appointment.rows[0], link: link.rows[0] }).toEqual({ result: { id: APPOINTMENT_ID, patient: { id: PATIENT_ID, name: 'О’Коннор-Сидорова Лёля Алиевна', phoneMask: '+7 •••••••• 29' }, source: 'website', status: 'pending', medflexClaimId: null, medflexLpuId: 34871, medflexDoctorId: 70120, medflexSpecialityId: 55, medflexServiceId: null, doctorName: 'Одинцов Владислав Александрович', specialityName: 'Маммолог', serviceName: null, startsAt: APPOINTMENT.startsAt, endsAt: APPOINTMENT.endsAt, priceKopecks: 535_000, failureCode: null, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), cancelledAt: null }, patients: 1, appointment: { patientId: PATIENT_ID, status: 'pending', priceKopecks: 535_000, bookingFingerprint: expect.stringMatching(/^v1:[0-9a-f]{64}$/) }, link: { medflexDoctorId: 70120, externalName: 'Одинцов Владислав Александрович', active: 1 } })
  })

  it('returns the same appointment for an idempotent prepare replay', async () => {
    const { client, records } = await fixture()
    const first = await invoke(records, 'prepare', prepareInput())
    const second = await invoke(records, 'prepare', prepareInput())
    const count = await client.execute('SELECT COUNT(*) AS total FROM Appointment')
    client.close()
    expect({ firstId: first.id, secondId: second.id, total: Number(count.rows[0]?.total) }).toEqual({ firstId: APPOINTMENT_ID, secondId: APPOINTMENT_ID, total: 1 })
  })

  it('rolls back a mismatched reuse of an appointment identity', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'prepare', prepareInput())
    const failure = await captured(() => records.prepare(prepareInput({ profile: OTHER_PROFILE, appointment: OTHER_APPOINTMENT })))
    const counts = await client.execute('SELECT (SELECT COUNT(*) FROM Appointment) AS appointments, (SELECT COUNT(*) FROM Patient) AS patients')
    client.close()
    expect({ failure, row: counts.rows[0] }).toEqual({ failure: { threw: true, name: 'AppointmentRecordError', code: 'APPOINTMENT_CONFLICT' }, row: { appointments: 1, patients: 1 } })
  })

  it('rejects a duplicate patient-doctor-slot booking under a new intent identity', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'prepare', prepareInput())
    const failure = await captured(() => records.prepare(prepareInput({ id: OTHER_APPOINTMENT_ID })))
    const count = await client.execute('SELECT COUNT(*) AS total FROM Appointment')
    client.close()
    expect({ failure, total: Number(count.rows[0]?.total) }).toEqual({ failure: { threw: true, name: 'AppointmentRecordError', code: 'APPOINTMENT_DUPLICATE' }, total: 1 })
  })

  it('projects booking intent states into local appointment states idempotently', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'prepare', prepareInput())
    const review = await invoke(records, 'project', { id: APPOINTMENT_ID, status: 'uncertain' })
    const confirmed = await invoke(records, 'project', { id: APPOINTMENT_ID, status: 'confirmed', claimId: CLAIM_ID })
    const repeated = await invoke(records, 'project', { id: APPOINTMENT_ID, status: 'confirmed', claimId: CLAIM_ID })
    client.close()
    expect({ review: review.status, confirmed: { status: confirmed.status, claimId: confirmed.medflexClaimId }, repeated: { status: repeated.status, claimId: repeated.medflexClaimId } }).toEqual({ review: 'needs_review', confirmed: { status: 'confirmed', claimId: CLAIM_ID }, repeated: { status: 'confirmed', claimId: CLAIM_ID } })
  })

  it('enforces unique Medflex claim identities across local appointments', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'prepare', prepareInput())
    await invoke(records, 'prepare', prepareInput({ id: OTHER_APPOINTMENT_ID, profile: OTHER_PROFILE, appointment: OTHER_APPOINTMENT }))
    await invoke(records, 'project', { id: APPOINTMENT_ID, status: 'confirmed', claimId: CLAIM_ID })
    const failure = await captured(() => records.project({ id: OTHER_APPOINTMENT_ID, status: 'confirmed', claimId: CLAIM_ID }))
    client.close()
    expect(failure).toEqual({ threw: true, name: 'AppointmentRecordError', code: 'APPOINTMENT_CLAIM_CONFLICT' })
  })

  it('creates a confirmed local existing appointment without Medflex identifiers', async () => {
    const { client, records } = await fixture()
    const appointment = { ...APPOINTMENT, medflexLpuId: null, medflexDoctorId: null, medflexSpecialityId: null, doctorName: 'Врач из МИС', specialityName: 'Консультация', priceRubles: null }
    const result = await invoke(records, 'createExisting', { id: APPOINTMENT_ID, profile: FIRST_PROFILE, appointment })
    client.close()
    expect({ source: result.source, status: result.status, claimId: result.medflexClaimId, doctorId: result.medflexDoctorId, price: result.priceKopecks }).toEqual({ source: 'admin_existing', status: 'confirmed', claimId: null, doctorId: null, price: null })
  })

  it('lists filtered appointments with masked patient identity and clamped pages', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'prepare', prepareInput())
    await invoke(records, 'prepare', prepareInput({ id: OTHER_APPOINTMENT_ID, source: 'admin_medflex', profile: OTHER_PROFILE, appointment: OTHER_APPOINTMENT }))
    await invoke(records, 'project', { id: OTHER_APPOINTMENT_ID, status: 'confirmed', claimId: OTHER_CLAIM_ID })
    const page = await invoke(records, 'list', { page: 1, pageSize: 99, status: 'confirmed', source: 'admin_medflex', doctorId: 90111, from: '2026-08-28T00:00:00.000Z', to: '2026-08-29T00:00:00.000Z' })
    client.close()
    expect({ page: { ...page, items: page.items?.map(({ id, patient, status }) => ({ id, patient, status })) }, leaked: JSON.stringify(page).includes('79215558347') }).toEqual({ page: { items: [{ id: OTHER_APPOINTMENT_ID, patient: { id: OTHER_PATIENT_ID, name: 'Кюри Мария Склодовская', phoneMask: '+7 •••••••• 47' }, status: 'confirmed' }], page: 1, pageSize: 50, total: 1, pages: 1 }, leaked: false })
  })

  it('returns one masked appointment detail without exposing patient contact data', async () => {
    const { client, records } = await fixture()
    await invoke(records, 'prepare', prepareInput())
    const detail = await invoke(records, 'get', { id: APPOINTMENT_ID })
    client.close()
    expect({ detail: { id: detail.id, patient: detail.patient, status: detail.status }, leaked: JSON.stringify(detail).includes('79215550129') }).toEqual({ detail: { id: APPOINTMENT_ID, patient: { id: PATIENT_ID, name: 'О’Коннор-Сидорова Лёля Алиевна', phoneMask: '+7 •••••••• 29' }, status: 'pending' }, leaked: false })
  })

  it('cancels a confirmed local appointment idempotently with a durable timestamp', async () => {
    const cancelledAt = new Date('2026-08-27T12:00:00.000Z')
    const { client, records } = await fixture({ clock: sequence([NOW, NOW, cancelledAt, new Date('2026-08-28T12:00:00.000Z')]) })
    await invoke(records, 'createExisting', { id: APPOINTMENT_ID, profile: FIRST_PROFILE, appointment: { ...APPOINTMENT, medflexLpuId: null, medflexDoctorId: null, medflexSpecialityId: null } })
    const first = await invoke(records, 'cancel', { id: APPOINTMENT_ID })
    const second = await invoke(records, 'cancel', { id: APPOINTMENT_ID })
    client.close()
    expect({ first: { status: first.status, cancelledAt: first.cancelledAt }, second: { status: second.status, cancelledAt: second.cancelledAt } }).toEqual({ first: { status: 'cancelled', cancelledAt: cancelledAt.toISOString() }, second: { status: 'cancelled', cancelledAt: cancelledAt.toISOString() } })
  })
})
