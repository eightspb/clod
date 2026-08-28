import { describe, expect, it, vi } from 'vitest'
import { createAdminDoctorSync } from './admin-doctor-sync.js'

const WEBSITE_DOCTOR = Object.freeze({ slug: 'odintsov', name: 'Одинцов Владислав Александрович', specialization: 'Онколог-маммолог', experienceYears: 30, bio: 'Главный врач', photo: '/images/doctors/odintsov.webp' })
const MEDFLEX_DOCTOR = Object.freeze({ slug: 'odintsov', id: 70120, name: WEBSITE_DOCTOR.name })
const LOCAL_DOCTOR = Object.freeze({ id: 'doctor-odintsov', name: WEBSITE_DOCTOR.name })

describe('admin doctor synchronization', () => {
  it('discovers through a read-only adapter and persists only curated profile fields', async () => {
    const state = { command: null, discoveryKeys: null }
    const records = { sync: vi.fn(async (command) => { state.command = command; return { active: 1, created: 1, preserved: 0, total: 1 } }), list: vi.fn(async () => [LOCAL_DOCTOR]) }
    const medflexClient = { listDoctors: vi.fn(), listLpus: vi.fn(), createDoctorAppointment: vi.fn() }
    const discover = vi.fn(async (input) => { state.discoveryKeys = Object.keys(input.client).sort(); return { clinic: { id: 34871 }, doctors: [MEDFLEX_DOCTOR] } })
    const workflow = createAdminDoctorSync({ records, medflexClient, discover, websiteDoctors: [WEBSITE_DOCTOR], clock: () => new Date('2026-08-28T17:00:00.000Z') })
    const result = await workflow.sync()
    expect({ result, command: state.command, discoveryKeys: state.discoveryKeys }).toEqual({ result: { report: { active: 1, created: 1, preserved: 0, total: 1 }, doctors: [LOCAL_DOCTOR] }, command: { doctors: [{ ...WEBSITE_DOCTOR, medflexDoctorId: 70120, externalName: WEBSITE_DOCTOR.name }], syncedAt: '2026-08-28T17:00:00.000Z' }, discoveryKeys: ['listDoctors', 'listLpus'] })
  })
})
