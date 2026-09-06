import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  calls: { active: 2, incomingToday: 6, answeredToday: 4, missedToday: 2, answerRate: 66.7, averageWaitSeconds: 15, averageTalkSeconds: 83, lastEventAt: '2026-08-26T21:55:00.000Z' },
  monitor: { available: true, checkedAt: '2026-08-26T21:58:00.000Z', stale: false, checks: [{ name: 'health', ok: true, detail: '200' }, { name: 'disk', ok: false, detail: '87%' }], failing: [{ name: 'disk', ok: false, detail: '87%' }] },
}

describe('Dashboard clinic counters', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-08-26T22:00:00.000Z'), shouldAdvanceTime: true })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => STATS })))
  })
  afterEach(() => vi.useRealTimers())

  it('lists failing host monitor checks', async () => {
    render(<Dashboard />)
    expect(await screen.findByRole('alert', { name: 'Мониторинг сервера' })).toHaveTextContent('Диск: 87%')
  })

  it('tells the administrator when the host monitor is not installed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ...STATS, monitor: { available: false } }) })))
    render(<Dashboard />)
    expect(await screen.findByText(/Монитор сервера не настроен/)).toBeVisible()
  })

  it('warns when the host monitor stopped reporting', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ...STATS, monitor: { ...STATS.monitor, stale: true, failing: [] } }) })))
    render(<Dashboard />)
    expect(await screen.findByRole('alert', { name: 'Мониторинг сервера' })).toHaveTextContent('не отчитывался')
  })

  it('shows the telephony silence banner from the stats payload', async () => {
    vi.setSystemTime(new Date('2026-08-27T12:00:00.000Z'))
    render(<Dashboard />)
    expect(await screen.findByText(/Телефония молчит/)).toBeVisible()
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
