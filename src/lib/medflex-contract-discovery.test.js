import { describe, expect, it } from 'vitest'
import { discoverMedflexContract } from './medflex-contract-discovery.js'

const TOKEN = 'токен-Ω-271'
const DATE = '2026-08-30'
const LEAK = 'Мария +7 921 555-01-29 secret-Ω'
const JSON_HEADERS = Object.freeze({ 'Content-Type': 'application/json' })
const DETAIL_FIELDS = Object.freeze(['avatar', 'description', 'doctor_url', 'education_and_experience', 'rating', 'review_count', 'reviews'])

function json(payload, status = 200, headers = JSON_HEADERS) {
  return new Response(JSON.stringify(payload), { status, headers })
}

function payload(url) {
  if (url.pathname === '/webhooks/') return [[{ url: `https://example.invalid/${LEAK}`, type: 'services', user_id: 5910, is_active: true }]]
  if (url.pathname === '/services/categories/') return { data: { lpu_id: 34871, categories: [{ id: 17, name: LEAK }] }, count: 21, num_pages: 1 }
  if (url.pathname === '/services/prices/') return { data: { lpu_id: 34871, services: [{ id: '8038', name: LEAK, price: 87000 }] }, count: 667, num_pages: 1 }
  if (url.searchParams.get('detailed') === 'true') return { data: [{ id: 70120, rating: 5, review_count: 9, reviews: [LEAK], doctor_url: LEAK, education_and_experience: LEAK, avatar: LEAK, description: LEAK }], count: 1, num_pages: 1 }
  return { data: [{ id: 311, fio: LEAK, mobile_phone: '79215550129' }], count: 1, num_pages: 1 }
}

function medflexFetch(calls, statuses = {}) {
  return async (input, options) => {
    const url = new URL(input)
    calls.push(Object.freeze({ url, method: options.method, body: options.body }))
    const status = statuses[url.pathname] ?? (options.method === 'POST' ? 400 : 200)
    return json(status === 200 ? payload(url) : { detail: LEAK }, status)
  }
}

function discovery(calls, overrides = {}) {
  return discoverMedflexContract({ fetchImpl: medflexFetch(calls, overrides.statuses), token: TOKEN, date: DATE, includePaidDoctorDetail: overrides.includePaidDoctorDetail === true })
}

function operation(report, method, path) {
  return report.operations.find((entry) => entry.method === method && entry.path === path)
}

describe('Medflex contract discovery', () => {
  it('covers eighteen paths and nineteen operations without exposing response values', async () => {
    const calls = []
    const report = await discovery(calls)
    const serialized = JSON.stringify(report)
    expect({ paths: report.contractPaths, operations: report.httpOperations, calls: calls.length, distinct: new Set(report.operations.map((entry) => entry.path)).size, leaked: serialized.includes(LEAK) || serialized.includes('79215550129') }).toEqual({ paths: 18, operations: 19, calls: 19, distinct: 18, leaked: false })
  })

  it('uses invalid empty bodies for every mutating contract probe', async () => {
    const calls = []
    await discovery(calls)
    const posts = calls.filter((call) => call.method === 'POST').map((call) => ({ path: call.url.pathname, body: call.body }))
    expect(posts).toEqual([{ path: '/direct_appointment/doctor/cancel/', body: '{}' }, { path: '/direct_appointment/doctor/execute/', body: '{}' }, { path: '/webhooks/', body: '{}' }])
  })

  it('uses only the required clinic scope for the LPU schedule probe', async () => {
    const calls = []
    await discovery(calls)
    const request = calls.find((call) => call.url.pathname === '/schedule/lpu/')
    expect([...request.url.searchParams.entries()]).toEqual([['lpu_ids', '34871'], ['page', '1']])
  })

  it('does not request paid doctor detail by default', async () => {
    const calls = []
    const report = await discovery(calls)
    const paidCalls = calls.filter((call) => call.url.searchParams.get('detailed') === 'true')
    expect({ calls: paidCalls.length, detail: report.doctorDetail }).toEqual({ calls: 0, detail: { status: 'not_requested', presentFields: [], absentFields: [] } })
  })

  it('requests paid detail exactly once for one known doctor', async () => {
    const calls = []
    const report = await discovery(calls, { includePaidDoctorDetail: true })
    const paid = calls.filter((call) => call.url.searchParams.get('detailed') === 'true')
    const query = paid[0]?.url.searchParams
    expect({ calls: paid.length, path: paid[0]?.url.pathname, doctorIds: query?.get('doctor_ids'), size: query?.get('size'), detail: report.doctorDetail }).toEqual({ calls: 1, path: '/models/doctor/', doctorIds: '70120', size: '1', detail: { status: 200, objectCount: 1, firstObjectKeys: ['avatar', 'description', 'doctor_url', 'education_and_experience', 'id', 'rating', 'review_count', 'reviews'], presentFields: DETAIL_FIELDS, absentFields: ['video_card'] } })
  })

  it('reports access statuses without copying error bodies', async () => {
    const calls = []
    const report = await discovery(calls, { statuses: { '/direct_appointment/history/': 404, '/models/doctor/all/': 403 } })
    const serialized = JSON.stringify(report)
    expect({ history: operation(report, 'GET', '/direct_appointment/history/').status, allDoctors: operation(report, 'GET', '/models/doctor/all/').status, leaked: serialized.includes(LEAK) }).toEqual({ history: 404, allDoctors: 403, leaked: false })
  })

  it('summarizes nested service and webhook collections by keys only', async () => {
    const report = await discovery([])
    const prices = operation(report, 'GET', '/services/prices/')
    const webhooks = operation(report, 'GET', '/webhooks/')
    expect({ prices: { count: prices.objectCount, keys: prices.firstObjectKeys }, webhooks: { count: webhooks.objectCount, keys: webhooks.firstObjectKeys } }).toEqual({ prices: { count: 667, keys: ['id', 'name', 'price'] }, webhooks: { count: 1, keys: ['is_active', 'type', 'url', 'user_id'] } })
  })

  it('retries an ordinary read once after a bounded Retry-After', async () => {
    const calls = []
    const fetchImpl = async (input, options) => {
      const url = new URL(input)
      calls.push(url.pathname)
      if (url.pathname === '/models/town/' && calls.filter((path) => path === url.pathname).length === 1) return json({ detail: LEAK }, 429, { ...JSON_HEADERS, 'Retry-After': '0' })
      return medflexFetch([], {})(input, options)
    }
    const report = await discoverMedflexContract({ fetchImpl, token: TOKEN, date: DATE, includePaidDoctorDetail: false })
    expect({ calls: calls.filter((path) => path === '/models/town/').length, status: operation(report, 'GET', '/models/town/').status }).toEqual({ calls: 2, status: 200 })
  })

  it('never retries the paid doctor detail request', async () => {
    const calls = []
    const fetchImpl = async (input, options) => {
      const url = new URL(input)
      calls.push(url.toString())
      if (url.searchParams.get('detailed') === 'true') return json({ detail: LEAK }, 429, { ...JSON_HEADERS, 'Retry-After': '0' })
      return medflexFetch([], {})(input, options)
    }
    const report = await discoverMedflexContract({ fetchImpl, token: TOKEN, date: DATE, includePaidDoctorDetail: true })
    expect({ calls: calls.filter((url) => new URL(url).searchParams.get('detailed') === 'true').length, status: report.doctorDetail.status }).toEqual({ calls: 1, status: 429 })
  })
})
