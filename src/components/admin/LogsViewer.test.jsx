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
