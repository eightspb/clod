import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Appointments } from './Appointments.jsx'

const APPOINTMENT_ID = 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f'
const CLAIM_ID = 'd1c060a0-8375-4ff9-bce5-9bb03029256f'
const PATIENT = Object.freeze({ id: '10000000-0000-4000-8000-000000000001', name: 'О’Коннор-Сидорова Лёля', phoneMask: '+7 •••••••• 29' })

function appointment(overrides = {}) {
  return Object.freeze({ id: APPOINTMENT_ID, patient: PATIENT, source: 'admin_existing', status: 'confirmed', medflexClaimId: null, medflexLpuId: null, medflexDoctorId: null, medflexSpecialityId: null, medflexServiceId: null, doctorName: 'Врач из МИС', specialityName: 'Консультация', serviceName: null, startsAt: '2026-08-27T07:20:00.000Z', endsAt: '2026-08-27T08:00:00.000Z', priceKopecks: null, failureCode: null, createdAt: '2026-08-26T10:00:00.000Z', updatedAt: '2026-08-26T10:00:00.000Z', cancelledAt: null, ...overrides })
}

function page(item = appointment()) {
  return { data: [item], page: { number: 1, size: 50, total: 1, pages: 2 } }
}

function json(body, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function transport(responses) {
  const calls = []
  vi.stubGlobal('fetch', vi.fn(async (...input) => {
    calls.push(input)
    const response = responses.shift()
    if (response instanceof Error) throw response
    return typeof response === 'function' ? response(...input) : response
  }))
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Appointments admin view', () => {
  beforeEach(() => window.history.replaceState({}, '', '/admin/appointments'))

  it('renders Russian source and status labels with Moscow appointment time', async () => {
    transport([json(page())])
    render(<Appointments />)
    await screen.findByText(PATIENT.name)
    const table = within(screen.getByRole('table'))
    expect({ source: table.getByText('Внесена из МИС').textContent, status: table.getByText('Подтверждена').textContent, time: table.getByText(/27\.08\.2026, 10:20/).textContent }).toEqual({ source: 'Внесена из МИС', status: 'Подтверждена', time: expect.stringContaining('27.08.2026, 10:20') })
  })

  it('applies source and status filters and advances pagination', async () => {
    const calls = transport([json(page()), json(page()), json(page())])
    render(<Appointments />)
    await screen.findByText(PATIENT.name)
    fireEvent.change(screen.getByLabelText('Статус записи'), { target: { value: 'confirmed' } })
    fireEvent.change(screen.getByLabelText('Источник записи'), { target: { value: 'admin_existing' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Фильтры записей' }))
    await waitFor(() => expect(calls.length).toBe(2))
    fireEvent.click(screen.getByRole('button', { name: 'Следующая страница' }))
    await waitFor(() => expect(calls.length).toBe(3))
    expect(calls.map(([url]) => String(url))).toEqual(['/api/admin/appointments?page=1&pageSize=50', '/api/admin/appointments?page=1&pageSize=50&status=confirmed&source=admin_existing', '/api/admin/appointments?page=2&pageSize=50&status=confirmed&source=admin_existing'])
  })

  it('translates the dashboard today link into exact Moscow UTC boundaries', async () => {
    window.history.replaceState({}, '', '/admin/appointments?date=today')
    const calls = transport([json(page())])
    render(<Appointments clock={() => new Date('2026-08-26T22:30:00.000Z')} />)
    await screen.findByText(PATIENT.name)
    expect(String(calls[0][0])).toBe('/api/admin/appointments?page=1&pageSize=50&from=2026-08-26T21%3A00%3A00.000Z&to=2026-08-27T21%3A00%3A00.000Z')
  })

  it('warns before a local-only cancellation and applies the returned status', async () => {
    const cancelled = appointment({ status: 'cancelled', cancelledAt: '2026-08-27T12:00:00.000Z' })
    const calls = transport([json(page()), json({ data: { appointment: cancelled, warning: 'LOCAL_ONLY' } })])
    render(<Appointments />)
    await screen.findByText(PATIENT.name)
    fireEvent.click(screen.getByRole('button', { name: `Отменить запись ${PATIENT.name}` }))
    const warning = screen.getByText('Это действие не отменяет приём в Medflex или МИС')
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить отмену' }))
    await waitFor(() => expect(within(screen.getByRole('table')).getByText('Отменена')).toBeTruthy())
    expect({ warning: warning.textContent, body: JSON.parse(calls[1][1].body) }).toEqual({ warning: 'Это действие не отменяет приём в Medflex или МИС', body: { confirmation: 'ОТМЕНИТЬ' } })
  })

  it('manually confirms a needs-review appointment with an explicit claim', async () => {
    const review = appointment({ source: 'website', status: 'needs_review', medflexClaimId: null })
    const confirmed = appointment({ source: 'website', status: 'confirmed', medflexClaimId: CLAIM_ID })
    const calls = transport([json(page(review)), json({ data: confirmed })])
    render(<Appointments />)
    await waitFor(() => expect(within(screen.getByRole('table')).getByText('Требует проверки')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: `Подтвердить запись ${PATIENT.name}` }))
    fireEvent.change(screen.getByLabelText('Claim ID Medflex'), { target: { value: CLAIM_ID } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить подтверждение' }))
    await waitFor(() => expect(within(screen.getByRole('table')).getByText('Подтверждена')).toBeTruthy())
    expect(JSON.parse(calls[1][1].body)).toEqual({ claimId: CLAIM_ID })
  })

  it('renders an empty journal state', async () => {
    transport([json({ data: [], page: { number: 1, size: 50, total: 0, pages: 0 } })])
    render(<Appointments />)
    expect(await screen.findByText('Записи не найдены')).toBeTruthy()
  })

  it('renders a stable loading failure state', async () => {
    transport([json({ error: 'APPOINTMENTS_UNAVAILABLE' }, 503)])
    render(<Appointments />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить записи')
  })
})
