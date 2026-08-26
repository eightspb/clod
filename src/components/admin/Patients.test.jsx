import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Patients } from './Patients.jsx'

const PATIENT_ID = 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f'
const PATIENT = Object.freeze({ id: PATIENT_ID, name: 'О’Коннор-Сидорова Лёля', phoneMask: '+7 •••••••• 29', firstSeenAt: '2026-08-26T10:00:00.000Z', lastSeenAt: '2026-08-27T10:00:00.000Z', createdAt: '2026-08-26T10:00:00.000Z', updatedAt: '2026-08-27T10:00:00.000Z', piiDestroyedAt: null })
const PAGE = Object.freeze({ data: Object.freeze([PATIENT]), page: Object.freeze({ number: 1, size: 50, total: 1, pages: 2 }) })

function json(body, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function transport(responses) {
  const calls = []
  const fetcher = vi.fn(async (...input) => {
    calls.push(input)
    const response = responses.shift()
    if (response instanceof Error) throw response
    return typeof response === 'function' ? response(...input) : response
  })
  vi.stubGlobal('fetch', fetcher)
  return calls
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Patients admin view', () => {
  it('shows a useful loading state while the first page is pending', () => {
    transport([new Promise(() => undefined)])
    render(<Patients />)
    expect(screen.getByRole('status').textContent).toContain('Загружаем пациентов')
  })

  it('renders only the patient name and masked phone by default', async () => {
    transport([json(PAGE)])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    expect({ mask: screen.getByText(PATIENT.phoneMask).textContent, leaked: screen.queryByText('79215550129') }).toEqual({ mask: PATIENT.phoneMask, leaked: null })
  })

  it('applies exact phone search and advances pagination', async () => {
    const calls = transport([json(PAGE), json(PAGE), json(PAGE)])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    fireEvent.change(screen.getByLabelText('Точный телефон'), { target: { value: '+7 921 555-01-29' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Фильтры пациентов' }))
    await waitFor(() => expect(calls.length).toBe(2))
    fireEvent.click(screen.getByRole('button', { name: 'Следующая страница' }))
    await waitFor(() => expect(calls.length).toBe(3))
    expect(calls.map(([url]) => String(url))).toEqual(['/api/admin/patients?page=1&pageSize=50', '/api/admin/patients?page=1&pageSize=50&phone=%2B7+921+555-01-29', '/api/admin/patients?page=2&pageSize=50&phone=%2B7+921+555-01-29'])
  })

  it('reveals a phone explicitly and hides it again after thirty seconds', async () => {
    vi.useFakeTimers()
    transport([json(PAGE), json({ data: { id: PATIENT_ID, phone: '79215550129', revealedAt: '2026-08-27T11:00:00.000Z' } })])
    render(<Patients />)
    await act(async () => undefined)
    fireEvent.click(screen.getByRole('button', { name: `Показать телефон ${PATIENT.name}` }))
    await act(async () => undefined)
    const revealed = screen.getByText('79215550129').textContent
    act(() => vi.advanceTimersByTime(30_000))
    expect({ revealed, hidden: screen.queryByText('79215550129'), mask: screen.getByText(PATIENT.phoneMask).textContent }).toEqual({ revealed: '79215550129', hidden: null, mask: PATIENT.phoneMask })
  })

  it('requires dialog confirmation and renders an anonymized patient after destruction', async () => {
    transport([json(PAGE), json({ data: { id: PATIENT_ID, destroyedAt: '2026-08-27T12:00:00.000Z', alreadyDestroyed: false } })])
    render(<Patients />)
    await screen.findByText(PATIENT.name)
    fireEvent.click(screen.getByRole('button', { name: `Уничтожить данные ${PATIENT.name}` }))
    const dialog = screen.getByRole('dialog', { name: 'Уничтожить персональные данные?' })
    fireEvent.click(screen.getByRole('button', { name: 'Уничтожить безвозвратно' }))
    await screen.findByText('Данные уничтожены')
    expect({ dialog: Boolean(dialog), name: screen.queryByText(PATIENT.name), mask: screen.queryByText(PATIENT.phoneMask) }).toEqual({ dialog: true, name: null, mask: null })
  })

  it('shows an empty state when no patients match the filter', async () => {
    transport([json({ data: [], page: { number: 1, size: 50, total: 0, pages: 0 } })])
    render(<Patients />)
    expect(await screen.findByText('Пациенты не найдены')).toBeTruthy()
  })

  it('shows a stable error state without exposing transport details', async () => {
    transport([json({ error: 'PATIENTS_UNAVAILABLE' }, 503)])
    render(<Patients />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить пациентов')
  })
})
