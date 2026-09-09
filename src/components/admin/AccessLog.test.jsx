import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccessLog } from './AccessLog.jsx'

const ENTRY = Object.freeze({ id: '10000000-0000-4000-8000-000000000001', subject: 'patient', subjectId: 'a68f05c5-8528-4e08-86e5-3bd00cc3a79f', action: 'reveal_full', reason: 'Сверка записи', createdAt: '2026-09-09T10:15:00.000Z', user: { login: 'olga.ivanova', displayName: 'Ольга Иванова' } })

function transport(body) {
  const calls = []
  vi.stubGlobal('fetch', vi.fn(async (...input) => {
    calls.push(input)
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }))
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AccessLog', () => {
  it('shows the user login, the action label and the reason in Moscow time', async () => {
    transport({ data: [ENTRY], page: { number: 1, size: 50, total: 1, pages: 1 } })
    render(<AccessLog />)
    const row = (await screen.findByText('olga.ivanova')).closest('tr')
    expect(row).toHaveTextContent('09.09.2026, 13:15Ольга Ивановаolga.ivanovaПоказ досье')
  })

  it('scopes the request to one patient', async () => {
    const calls = transport({ data: [], page: { number: 1, size: 10, total: 0, pages: 0 } })
    render(<AccessLog patientId={ENTRY.subjectId} pageSize={10} />)
    await screen.findByText('Записей о доступе нет')
    expect(calls[0][0]).toBe(`/api/admin/access?page=1&pageSize=10&patientId=${ENTRY.subjectId}`)
  })
})
