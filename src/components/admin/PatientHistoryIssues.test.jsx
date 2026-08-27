import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PatientHistoryIssues } from './PatientHistoryIssues.jsx'

const PATIENT_ID = '71000000-0000-4000-8000-000000000001'
const SECOND_PATIENT_ID = '71000000-0000-4000-8000-000000000002'
const ITEM = Object.freeze({ id: '72000000-0000-4000-8000-000000000002', sourceName: '544663c3807aab090001bad8_visits.csv', sourceRow: 29, startsAt: null, sourceStatus: 'unknown', linkStatus: 'ambiguous', linkMethod: 'exact_clinic_card', evidenceLevel: 'strong', candidates: Object.freeze([{ patientId: PATIENT_ID, evidenceCode: 'EXACT_CLINIC_CARD', score: 90 }, { patientId: SECOND_PATIENT_ID, evidenceCode: 'EXACT_CLINIC_CARD', score: 90 }]) })
const PAGE = Object.freeze({ data: Object.freeze([ITEM]), page: Object.freeze({ number: 1, size: 50, total: 51, pages: 2 }) })
const UNMATCHED_ITEM = Object.freeze({ ...ITEM, id: '72000000-0000-4000-8000-000000000003', sourceRow: 30, linkStatus: 'unmatched', linkMethod: null, evidenceLevel: 'none', candidates: Object.freeze([]) })
const UNMATCHED_PAGE = Object.freeze({ data: Object.freeze([UNMATCHED_ITEM]), page: Object.freeze({ number: 1, size: 50, total: 51, pages: 2 }) })
const NEWEST_ITEM = Object.freeze({ ...ITEM, sourceRow: 77, linkMethod: 'exact_full_name', evidenceLevel: 'moderate', candidates: Object.freeze([{ patientId: PATIENT_ID, evidenceCode: 'EXACT_FULL_NAME', score: 60 }, { patientId: SECOND_PATIENT_ID, evidenceCode: 'EXACT_FULL_NAME', score: 60 }]) })
const NEWEST_PAGE = Object.freeze({ data: Object.freeze([NEWEST_ITEM]), page: Object.freeze({ number: 1, size: 50, total: 1, pages: 1 }) })

function json(body, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function transport(responses) {
  const calls = []
  vi.stubGlobal('fetch', vi.fn(async (...input) => {
    calls.push(input)
    return responses.shift()
  }))
  return calls
}

function deferred() {
  let resolve
  const promise = new Promise((complete) => { resolve = complete })
  return { promise, resolve }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PatientHistoryIssues', () => {
  it('shows the ambiguous queue with safe evidence and candidate links', async () => {
    transport([json(PAGE)])
    render(<PatientHistoryIssues />)
    const region = await screen.findByRole('region', { name: 'Проблемы сопоставления визитов' })
    const links = screen.getAllByRole('link', { name: 'Открыть кандидата' })
    expect({ text: region.textContent, hrefs: links.map((link) => link.getAttribute('href')) }).toEqual({ text: expect.stringContaining('2 кандидатов'), hrefs: [`/admin/patients?patient=${PATIENT_ID}`, `/admin/patients?patient=${SECOND_PATIENT_ID}`] })
  })

  it('filters unmatched visits and keeps the filter during pagination', async () => {
    const calls = transport([json(PAGE), json(UNMATCHED_PAGE), json(UNMATCHED_PAGE)])
    render(<PatientHistoryIssues />)
    await screen.findAllByText(/Точная карта клиники/)
    fireEvent.change(screen.getByLabelText('Статус проблемы'), { target: { value: 'unmatched' } })
    await waitFor(() => expect(calls.length).toBe(2))
    fireEvent.click(screen.getByRole('button', { name: 'Следующая страница проблем' }))
    await waitFor(() => expect(calls.length).toBe(3))
    expect(calls.map(([url]) => String(url))).toEqual(['/api/admin/patient-history/issues?page=1&pageSize=50&status=ambiguous', '/api/admin/patient-history/issues?page=1&pageSize=50&status=unmatched', '/api/admin/patient-history/issues?page=2&pageSize=50&status=unmatched'])
  })

  it('keeps the newest issue filter response when an older request finishes last', async () => {
    const pending = deferred()
    transport([json(PAGE), pending.promise, json(NEWEST_PAGE)])
    render(<PatientHistoryIssues />)
    await screen.findAllByText(/Точная карта клиники/)
    fireEvent.change(screen.getByLabelText('Статус проблемы'), { target: { value: 'unmatched' } })
    fireEvent.change(screen.getByLabelText('Статус проблемы'), { target: { value: 'ambiguous' } })
    await screen.findAllByText(/Точное полное имя/)
    await act(async () => { pending.resolve(await json(UNMATCHED_PAGE)) })
    expect({ newest: screen.queryAllByText(/Точное полное имя/).length, stale: screen.queryAllByText(/Точная карта клиники/).length }).toEqual({ newest: 2, stale: 0 })
  })

  it('clears previous issue rows and reports a current status-filter failure', async () => {
    transport([json(PAGE), json({ error: 'PATIENT_HISTORY_UNAVAILABLE' }, 503)])
    render(<PatientHistoryIssues />)
    await screen.findAllByText(/Точная карта клиники/)
    fireEvent.change(screen.getByLabelText('Статус проблемы'), { target: { value: 'unmatched' } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить проблемы сопоставления')
    expect({ stale: screen.queryAllByText(/Точная карта клиники/).length, filter: screen.getByLabelText('Статус проблемы').value }).toEqual({ stale: 0, filter: 'unmatched' })
  })

  it('ignores an older failed issue filter after a newer filter succeeds', async () => {
    const older = deferred()
    transport([json(PAGE), older.promise, json(NEWEST_PAGE)])
    render(<PatientHistoryIssues />)
    await screen.findAllByText(/Точная карта клиники/)
    fireEvent.change(screen.getByLabelText('Статус проблемы'), { target: { value: 'unmatched' } })
    fireEvent.change(screen.getByLabelText('Статус проблемы'), { target: { value: 'ambiguous' } })
    await screen.findAllByText(/Точное полное имя/)
    await act(async () => { older.resolve(await json({ error: 'PATIENT_HISTORY_UNAVAILABLE' }, 503)) })
    expect({ current: screen.queryAllByText(/Точное полное имя/).length, error: screen.queryByRole('alert'), filter: screen.getByLabelText('Статус проблемы').value }).toEqual({ current: 2, error: null, filter: 'ambiguous' })
  })

  it('shows a stable unavailable state without transport values', async () => {
    transport([json({ error: 'PATIENT_HISTORY_UNAVAILABLE', secret: 'Пациент Секретный' }, 503)])
    render(<PatientHistoryIssues />)
    const alert = await screen.findByRole('alert')
    expect({ message: alert.textContent, leaked: alert.textContent.includes('Секретный') }).toEqual({ message: 'Не удалось загрузить проблемы сопоставления', leaked: false })
  })
})
