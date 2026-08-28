import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import { createDoctorRecords } from './doctor-records.js'

const executeFile = promisify(execFile)
const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const MIGRATION_SCRIPT = join(PROJECT_ROOT, 'scripts/init-db.mjs')
const SYNCED_AT = '2026-08-28T17:00:00.000Z'
const DOCTOR = Object.freeze({ slug: 'odintsov', name: 'Одинцов Владислав Александрович', specialization: 'Онколог-маммолог', experienceYears: 30, bio: 'Главный врач', photo: '/images/doctors/odintsov.webp', medflexDoctorId: 70120, externalName: 'Одинцов Владислав Александрович' })

async function database() {
  const directory = await mkdtemp(join(tmpdir(), 'clod-doctor-records-'))
  const path = join(directory, 'content.sqlite')
  await executeFile(process.execPath, [MIGRATION_SCRIPT], { cwd: PROJECT_ROOT, env: { ...process.env, ASTRO_DB_REMOTE_URL: `file:${path}`, ASTRO_DB_APP_TOKEN: '' }, timeout: 10_000, maxBuffer: 1_000_000 })
  return createClient({ url: `file:${path}` })
}

describe('doctor records', () => {
  it('seeds curated doctor details and links the active Medflex identity atomically', async () => {
    const client = await database()
    const records = createDoctorRecords({ client })
    const result = await records.sync({ doctors: [DOCTOR], syncedAt: SYNCED_AT })
    const doctors = await records.list()
    const links = await client.execute('SELECT medflexDoctorId, externalName, localDoctorId, active, syncedAt FROM MedflexDoctorLink')
    client.close()
    expect({ result, doctors, link: links.rows[0] }).toEqual({ result: { active: 1, created: 1, preserved: 0, total: 1 }, doctors: [{ id: 'doctor-odintsov', name: DOCTOR.name, slug: 'odintsov', specialization: DOCTOR.specialization, experienceYears: 30, bio: 'Главный врач', photoUrl: DOCTOR.photo, certificates: [], medflexDoctorId: 70120, medflexName: DOCTOR.externalName, active: true, syncedAt: SYNCED_AT, medflexLinks: [{ medflexDoctorId: 70120, medflexName: DOCTOR.externalName, active: true, syncedAt: SYNCED_AT }] }], link: { medflexDoctorId: 70120, externalName: DOCTOR.externalName, localDoctorId: 'doctor-odintsov', active: 1, syncedAt: SYNCED_AT } })
  })

  it('preserves manual profile fields and deactivates links missing from the next catalog', async () => {
    const client = await database()
    const records = createDoctorRecords({ client })
    await records.sync({ doctors: [DOCTOR], syncedAt: '2026-08-27T17:00:00.000Z' })
    await client.execute({ sql: 'UPDATE Doctor SET name = ?, specialization = ?, bio = ? WHERE id = ?', args: ['Отредактированное имя', 'Ручная специализация', 'Ручная биография', 'doctor-odintsov'] })
    const result = await records.sync({ doctors: [], syncedAt: SYNCED_AT })
    const doctors = await records.list()
    client.close()
    expect({ result, doctor: doctors[0] }).toEqual({ result: { active: 0, created: 0, preserved: 0, total: 1 }, doctor: expect.objectContaining({ name: 'Отредактированное имя', specialization: 'Ручная специализация', bio: 'Ручная биография', medflexDoctorId: 70120, active: false, syncedAt: SYNCED_AT }) })
  })

  it('rolls back the entire catalog when a doctor identity conflicts', async () => {
    const client = await database()
    const records = createDoctorRecords({ client })
    await client.execute({ sql: 'INSERT INTO Doctor (id, name, slug, specialization, experienceYears, bio, photoMediaId) VALUES (?, ?, ?, ?, ?, ?, ?)', args: ['by-slug', 'Первый врач', 'odintsov', 'Первый', 1, 'Первый', null] })
    await client.execute({ sql: 'INSERT INTO Doctor (id, name, slug, specialization, experienceYears, bio, photoMediaId) VALUES (?, ?, ?, ?, ?, ?, ?)', args: ['by-name', DOCTOR.name, 'other', 'Второй', 2, 'Второй', null] })
    await expect(records.sync({ doctors: [DOCTOR], syncedAt: SYNCED_AT })).rejects.toMatchObject({ name: 'DoctorRecordError', code: 'DOCTOR_IDENTITY_CONFLICT' })
    const links = await client.execute('SELECT COUNT(*) AS total FROM MedflexDoctorLink')
    client.close()
    expect(Number(links.rows[0].total)).toBe(0)
  })

  it('keeps the linked local profile after an administrator changes both name and slug', async () => {
    const client = await database()
    const records = createDoctorRecords({ client })
    await records.sync({ doctors: [DOCTOR], syncedAt: '2026-08-27T17:00:00.000Z' })
    await client.execute({ sql: 'UPDATE Doctor SET name = ?, slug = ?, specialization = ? WHERE id = ?', args: ['Ручное имя', 'manual-slug', 'Ручная специализация', 'doctor-odintsov'] })
    const result = await records.sync({ doctors: [DOCTOR], syncedAt: SYNCED_AT })
    const doctors = await records.list()
    client.close()
    expect({ result, doctors: doctors.map(({ id, name, slug, specialization }) => ({ id, name, slug, specialization })) }).toEqual({ result: { active: 1, created: 0, preserved: 1, total: 1 }, doctors: [{ id: 'doctor-odintsov', name: 'Ручное имя', slug: 'manual-slug', specialization: 'Ручная специализация' }] })
  })

  it('returns one local doctor with current and historical Medflex links after an identifier rotation', async () => {
    const client = await database()
    const records = createDoctorRecords({ client })
    await records.sync({ doctors: [DOCTOR], syncedAt: '2026-08-27T17:00:00.000Z' })
    await records.sync({ doctors: [{ ...DOCTOR, medflexDoctorId: 70121 }], syncedAt: SYNCED_AT })
    const doctors = await records.list()
    client.close()
    expect(doctors).toHaveLength(1)
    expect(doctors[0]).toMatchObject({ id: 'doctor-odintsov', medflexDoctorId: 70121, active: true, medflexLinks: [{ medflexDoctorId: 70121, active: true }, { medflexDoctorId: 70120, active: false }] })
  })

  it('resolves an identifier rotation through history after both local identity fields were edited', async () => {
    const client = await database()
    const records = createDoctorRecords({ client })
    await records.sync({ doctors: [DOCTOR], syncedAt: '2026-08-27T17:00:00.000Z' })
    await client.execute({ sql: 'UPDATE Doctor SET name = ?, slug = ? WHERE id = ?', args: ['Ручное имя', 'manual-slug', 'doctor-odintsov'] })
    const result = await records.sync({ doctors: [{ ...DOCTOR, medflexDoctorId: 70121 }], syncedAt: SYNCED_AT })
    const doctors = await records.list()
    client.close()
    expect({ result, total: doctors.length, doctor: doctors[0] }).toMatchObject({ result: { active: 1, created: 0, preserved: 1, total: 2 }, total: 1, doctor: { id: 'doctor-odintsov', name: 'Ручное имя', slug: 'manual-slug', medflexDoctorId: 70121 } })
  })
})
