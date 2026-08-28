import { describe, expect, it, vi } from 'vitest'

vi.mock('astro:db', () => ({ db: Object.freeze({ $client: Object.freeze({}) }) }))

const DOCTOR = Object.freeze({ id: 'doctor-odintsov', name: 'Одинцов Владислав Александрович', slug: 'odintsov', specialization: 'Онколог-маммолог', experienceYears: 30, bio: 'Главный врач', photoUrl: '/images/doctors/odintsov.webp', certificates: [], medflexDoctorId: 70120, medflexName: 'Одинцов Владислав Александрович', active: true, syncedAt: '2026-08-28T17:00:00.000Z' })

function request(path, method = 'GET', origin = 'https://odintsovclinic.ru') {
  return new Request(`https://odintsovclinic.ru${path}`, { method, headers: { origin, 'x-real-ip': '203.0.113.81' } })
}

describe('admin doctors API', () => {
  it('returns the synced doctor catalog through an authenticated read endpoint', async () => {
    const module = await import('../pages/api/admin/doctors.js')
    const endpoint = module.createDoctorIndexEndpoint({ records: () => ({ list: async () => [DOCTOR] }), guard: async () => undefined, log: () => undefined })
    const response = await endpoint({ request: request('/api/admin/doctors') })
    expect({ status: response.status, body: await response.json() }).toEqual({ status: 200, body: { doctors: [DOCTOR] } })
  })

  it('protects the sync endpoint with the shared write guard', async () => {
    const module = await import('../pages/api/admin/doctors/sync.js')
    const response = await module.POST({ request: request('/api/admin/doctors/sync', 'POST', 'https://evil.invalid') })
    expect(response.status).toBe(403)
  })

  it('returns the refreshed catalog and a sanitized synchronization report', async () => {
    const module = await import('../pages/api/admin/doctors/sync.js')
    const workflow = { sync: vi.fn(async () => ({ report: { active: 9, created: 9, preserved: 0, total: 9 }, doctors: [DOCTOR] })) }
    const endpoint = module.createDoctorSyncEndpoint({ workflow: () => workflow, guard: async () => undefined, log: () => undefined })
    const response = await endpoint({ request: request('/api/admin/doctors/sync', 'POST') })
    expect({ status: response.status, body: await response.json(), calls: workflow.sync.mock.calls.length }).toEqual({ status: 200, body: { report: { active: 9, created: 9, preserved: 0, total: 9 }, doctors: [DOCTOR] }, calls: 1 })
  })

  it('does not leak Medflex or database errors', async () => {
    const stages = []
    const module = await import('../pages/api/admin/doctors/sync.js')
    const endpoint = module.createDoctorSyncEndpoint({ workflow: () => ({ sync: async () => { throw new Error('token=secret sqlite://private') } }), guard: async () => undefined, log: (stage) => stages.push(stage) })
    const response = await endpoint({ request: request('/api/admin/doctors/sync', 'POST') })
    const body = await response.json()
    expect({ status: response.status, body, stages, leaked: JSON.stringify({ body, stages }).includes('secret') }).toEqual({ status: 503, body: { error: 'DOCTORS_SYNC_UNAVAILABLE', message: 'Не удалось обновить врачей из Medflex' }, stages: ['SYNC_FAILED'], leaked: false })
  })
})
