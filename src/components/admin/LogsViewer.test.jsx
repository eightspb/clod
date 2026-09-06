import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LogsViewer } from './LogsViewer.jsx'

function stubLogsApi() {
  global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ logs: [], total: 0, totalPages: 1 }) }))
}

describe('LogsViewer', () => {
  it('requests the chosen event type only after the filters are applied', async () => {
    stubLogsApi()
    const { container } = render(<LogsViewer />)
    await screen.findByRole('button', { name: 'Применить' })
    fireEvent.change(container.querySelector('select'), { target: { value: 'form_submit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Применить' }))
    await waitFor(() => expect(global.fetch.mock.calls.map(([url]) => url)).toEqual(['/api/admin/logs?page=1&perPage=50', '/api/admin/logs?page=1&perPage=50&type=form_submit']))
  })
})

describe('LogsViewer rows', () => {
  it('expands the clicked log row and shows its identifiers', async () => {
    const logs = [{ id: 'лог-1', sessionId: 'сессия-1', eventType: 'click', page: '/vab', target: 'btn', details: '{"href":"/vab"}', createdAt: '2026-08-26T10:00:00.000Z', ip: '203.0.113.0/24' }, { id: 'лог-2', sessionId: 'сессия-2', eventType: 'navigation', page: '/', target: null, details: null, createdAt: '2026-08-26T09:00:00.000Z', ip: null }]
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ logs, total: 2, totalPages: 1 }) }))
    render(<LogsViewer />)
    fireEvent.click(await screen.findByText('/vab'))
    expect(screen.getByText('лог-1')).toBeVisible()
  })
})
