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

describe('SessionsViewer rows', () => {
  it('expands the clicked session row without moving the detail to a neighbour', async () => {
    const sessions = [{ id: 'сессия-1', visitorId: 'v-1', ip: '203.0.113.0/24', userAgent: 'Chrome · macOS', currentPage: '/vab', referrer: null, screenWidth: 1440, screenHeight: 900, language: 'ru', startedAt: '2026-08-26T10:00:00.000Z', lastActiveAt: '2026-08-26T10:05:00.000Z', isOnline: true, durationSeconds: 300 }, { id: 'сессия-2', visitorId: 'v-2', ip: '198.51.100.0/24', userAgent: 'Safari · iOS', currentPage: '/', referrer: null, screenWidth: 390, screenHeight: 844, language: 'ru', startedAt: '2026-08-26T09:00:00.000Z', lastActiveAt: '2026-08-26T09:01:00.000Z', isOnline: false, durationSeconds: 60 }]
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ sessions }) }))
    render(<SessionsViewer />)
    fireEvent.click(await screen.findByText('/vab'))
    expect(screen.getByText('сессия-1')).toBeVisible()
  })
})
