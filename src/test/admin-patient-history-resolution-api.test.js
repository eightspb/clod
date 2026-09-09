import { describe, expect, it } from 'vitest'
import { PatientHistoryRecordError } from '../lib/patient-history-records.js'
import { createPatientHistoryIssueResolveEndpoint, createPatientHistoryVisitLinkEndpoint } from '../lib/admin-patient-history-api.js'

const ISSUE_ID = '78000000-0000-4000-8000-000000000008'
const VISIT_ID = '72000000-0000-4000-8000-000000000002'
const PATIENT_ID = '71000000-0000-4000-8000-000000000001'
const ACTOR = 'u:11111111-1111-4111-8111-111111111111'

function request(path, body) {
  return new Request(`https://odintsovclinic.ru${path}`, { method: 'POST', headers: { 'x-real-ip': '203.0.113.89', 'content-type': 'application/json', origin: 'https://odintsovclinic.ru' }, body: JSON.stringify(body) })
}

function endpoints(history) {
  const calls = []
  const repository = Object.freeze({
    resolveIssue: async (input) => { calls.push({ op: 'resolveIssue', ...input }); if (history?.error) throw history.error; return { id: input.id, resolvedAt: '2026-09-09T10:00:00.000Z', alreadyResolved: false } },
    linkVisit: async (input) => { calls.push({ op: 'linkVisit', ...input }); if (history?.error) throw history.error; return { id: input.id, patientId: input.patientId, linkedAt: '2026-09-09T10:00:00.000Z', resolvedIssues: 2 } },
  })
  const options = { history: () => repository, guard: async () => undefined, actor: async () => ACTOR, body: async (value) => ({ valid: true, value: await value.json() }), log: () => undefined }
  return Object.freeze({ calls, resolve: createPatientHistoryIssueResolveEndpoint(options), link: createPatientHistoryVisitLinkEndpoint(options) })
}

describe('patient history resolution API', () => {
  it('resolves an issue with the caller as actor', async () => {
    const { calls, resolve } = endpoints()
    const response = await resolve({ request: request(`/api/admin/patient-history/issues/${ISSUE_ID}`, { resolved: true }), params: { id: ISSUE_ID } })
    expect({ status: response.status, calls }).toEqual({ status: 200, calls: [{ op: 'resolveIssue', id: ISSUE_ID, actor: ACTOR }] })
  })

  it('rejects a body other than resolved true', async () => {
    const { resolve } = endpoints()
    const response = await resolve({ request: request(`/api/admin/patient-history/issues/${ISSUE_ID}`, { resolved: false }), params: { id: ISSUE_ID } })
    expect(response.status).toBe(400)
  })

  it('links a visit to the candidate from the body', async () => {
    const { calls, link } = endpoints()
    const response = await link({ request: request(`/api/admin/patient-history/visits/${VISIT_ID}/link`, { patientId: PATIENT_ID }), params: { id: VISIT_ID } })
    expect({ status: response.status, calls }).toEqual({ status: 200, calls: [{ op: 'linkVisit', id: VISIT_ID, patientId: PATIENT_ID, actor: ACTOR }] })
  })

  it('answers 422 when the patient is not a recorded candidate', async () => {
    const { link } = endpoints({ error: new PatientHistoryRecordError('CANDIDATE_NOT_FOUND') })
    const response = await link({ request: request(`/api/admin/patient-history/visits/${VISIT_ID}/link`, { patientId: PATIENT_ID }), params: { id: VISIT_ID } })
    expect({ status: response.status, code: (await response.json()).error }).toEqual({ status: 422, code: 'CANDIDATE_NOT_FOUND' })
  })

  it('hides storage failures behind a value-free 503', async () => {
    const { link } = endpoints({ error: new Error('disk exploded at /srv/clod') })
    const response = await link({ request: request(`/api/admin/patient-history/visits/${VISIT_ID}/link`, { patientId: PATIENT_ID }), params: { id: VISIT_ID } })
    expect({ status: response.status, body: await response.text() }).toEqual({ status: 503, body: expect.not.stringContaining('/srv/clod') })
  })

  it('requires origin and a session by default on the route modules', async () => {
    const issue = await import('../pages/api/admin/patient-history/issues/[id].js')
    const link = await import('../pages/api/admin/patient-history/visits/[id]/link.js')
    const anonymous = new Request(`https://odintsovclinic.ru/api/admin/patient-history/issues/${ISSUE_ID}`, { method: 'PATCH', headers: { 'x-real-ip': '203.0.113.90' } })
    expect({ patch: (await issue.PATCH({ request: anonymous, params: { id: ISSUE_ID } })).status, post: (await link.POST({ request: anonymous, params: { id: VISIT_ID } })).status }).toEqual({ patch: 403, post: 403 })
  })
})
