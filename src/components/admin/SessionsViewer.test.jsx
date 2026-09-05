import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SessionsViewer } from './SessionsViewer.jsx'

function stubSessionsApi() {
  global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ sessions: [] }) }))
}

describe('SessionsViewer', () => {
  it('toggles the filter without an uncaught error', async () => {
    stubSessionsApi()
    const uncaught = []
    window.addEventListener('error', (event) => { event.preventDefault(); uncaught.push(event.error.message) })
    render(<SessionsViewer />)
    fireEvent.click(await screen.findByLabelText('Только активные'))
    expect(uncaught).toEqual([])
  })

  it('reloads sessions with the inactive filter after toggling the checkbox', async () => {
    stubSessionsApi()
    render(<SessionsViewer />)
    fireEvent.click(await screen.findByLabelText('Только активные'))
    await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith('/api/admin/sessions?active=false&limit=200'))
  })
})
