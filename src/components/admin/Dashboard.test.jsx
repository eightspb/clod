import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Dashboard } from './Dashboard.jsx'

const STATS = {
  onlineNow: 2,
  today: { sessions: 3, uniqueVisitors: 2 },
  week: { sessions: 10, uniqueVisitors: 7 },
  month: { sessions: 30, uniqueVisitors: 19 },
  avgDuration: 72,
  topPages: [],
  dailyVisits: [],
  recentEvents: [],
  clinic: { todayAppointments: 4, upcomingAppointments: 8, needsReviewAppointments: 2, activePatients: 15 },
}

describe('Dashboard clinic counters', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => STATS })))
  })

  it('keeps analytics cards and links the four clinic counters to their journals', async () => {
    render(<Dashboard />)
    expect(await screen.findByText('Онлайн сейчас')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Записей сегодня: 4' })).toHaveAttribute('href', '/admin/appointments?date=today')
    expect(screen.getByRole('link', { name: 'Предстоящих записей: 8' })).toHaveAttribute('href', '/admin/appointments?range=upcoming')
    expect(screen.getByRole('link', { name: 'Требуют проверки: 2' })).toHaveAttribute('href', '/admin/appointments?status=needs_review')
    expect(screen.getByRole('link', { name: 'Активных пациентов: 15' })).toHaveAttribute('href', '/admin/patients')
  })
})
