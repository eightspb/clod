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
  calls: { active: 2, incomingToday: 6, answeredToday: 4, missedToday: 2, answerRate: 66.7, averageWaitSeconds: 15, averageTalkSeconds: 83 },
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

  it('shows seven linked MANGO operational counters without caller data', async () => {
    render(<Dashboard />)
    expect(await screen.findByRole('heading', { name: 'Звонки MANGO' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Активные звонки: 2' })).toHaveAttribute('href', '/admin/calls')
    expect(screen.getByRole('link', { name: 'Входящие сегодня: 6' })).toHaveAttribute('href', '/admin/calls')
    expect(screen.getByRole('link', { name: 'Отвеченные: 4' })).toHaveAttribute('href', '/admin/calls?status=answered')
    expect(screen.getByRole('link', { name: 'Пропущенные: 2' })).toHaveAttribute('href', '/admin/calls?status=missed')
    expect(screen.getByRole('link', { name: 'Доля ответов: 66.7%' })).toHaveAttribute('href', '/admin/calls')
    expect(screen.getByRole('link', { name: 'Среднее ожидание: 15 с' })).toHaveAttribute('href', '/admin/calls')
    expect(screen.getByRole('link', { name: 'Средний разговор: 1 мин 23 с' })).toHaveAttribute('href', '/admin/calls')
    expect(screen.queryByText('79215550129')).toBeNull()
  })

  it('rounds average call durations to whole seconds', async () => {
    const calls = { ...STATS.calls, averageWaitSeconds: 11.4, averageTalkSeconds: 88.20000000000003 }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ...STATS, calls }) })))
    render(<Dashboard />)
    await screen.findByRole('heading', { name: 'Звонки MANGO' })
    expect(['Среднее ожидание: 11 с', 'Средний разговор: 1 мин 28 с'].map((name) => screen.getByRole('link', { name }).textContent)).toHaveLength(2)
  })
})
