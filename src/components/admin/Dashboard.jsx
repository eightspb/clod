import { useState, useEffect } from 'react'
import { useAdminFetch } from '../../lib/useAdminFetch.js'

function StatCard({ title, value, sub, color }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px 24px',
      border: '1px solid #e2e8f0',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        {title}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>{sub}</div>}
    </div>
  )
}

function ClinicCard({ title, value, href, color }) {
  return (
    <a aria-label={`${title}: ${value}`} href={href} className="clay-card group block border-l-4 p-5 no-underline transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderLeftColor: color }}>
      <span className="block text-xs font-bold uppercase tracking-wider text-clay-admin-muted">{title}</span>
      <span className="mt-2 block text-3xl font-bold text-clay-admin-dark">{value}</span>
      <span className="mt-2 block text-xs font-semibold text-clay-mint">Открыть журнал →</span>
    </a>
  )
}

function callDuration(seconds) {
  const roundedSeconds = Math.round(seconds)
  const minutes = Math.floor(roundedSeconds / 60)
  const remainingSeconds = roundedSeconds % 60
  return minutes > 0 ? `${minutes} мин ${remainingSeconds} с` : `${remainingSeconds} с`
}

function BarChart({ data }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.count), 1)
  const last7 = data.slice(-7)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
        {last7.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '100%',
              height: `${Math.max((d.count / max) * 64, d.count > 0 ? 4 : 0)}px`,
              background: '#38bdf8',
              borderRadius: '3px 3px 0 0',
              transition: 'height 0.3s',
            }} title={`${d.date}: ${d.count}`} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        {last7.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '9px', color: '#94a3b8' }}>
            {d.date.slice(5)}
          </div>
        ))}
      </div>
    </div>
  )
}

function EventTypeBadge({ type }) {
  const colors = {
    click: { bg: '#dbeafe', text: '#1d4ed8' },
    navigation: { bg: '#d1fae5', text: '#065f46' },
    page_enter: { bg: '#e0e7ff', text: '#3730a3' },
    page_leave: { bg: '#fef3c7', text: '#92400e' },
    form_submit: { bg: '#fce7f3', text: '#9d174d' },
    heartbeat: { bg: '#f1f5f9', text: '#475569' },
  }
  const c = colors[type] || { bg: '#f1f5f9', text: '#475569' }
  return (
    <span style={{
      background: c.bg,
      color: c.text,
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '600',
    }}>
      {type}
    </span>
  )
}

export function Dashboard() {
  const { data: stats, loading, error, fetchData } = useAdminFetch()

  async function loadStats() {
    await fetchData('/api/admin/stats', { errorMessage: 'Не удалось загрузить статистику' })
  }

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div style={{ color: '#64748b', padding: '40px', textAlign: 'center' }}>Загрузка...</div>
  if (error) return <div style={{ color: '#dc2626', padding: '20px' }}>{error}</div>
  if (!stats) return null
  const clinic = stats.clinic || { todayAppointments: 0, upcomingAppointments: 0, needsReviewAppointments: 0, activePatients: 0 }
  const calls = stats.calls || { active: 0, incomingToday: 0, answeredToday: 0, missedToday: 0, answerRate: 0, averageWaitSeconds: 0, averageTalkSeconds: 0 }

  function fmtDuration(sec) {
    if (sec < 60) return `${sec}с`
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}м ${s}с`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <section aria-labelledby="clinic-statistics-title">
        <div className="mb-3 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-mint">Клиника</p><h2 id="clinic-statistics-title" className="mt-1 font-serif text-2xl text-clay-dark">Оперативная сводка</h2></div><span className="text-xs text-clay-admin-muted">Время по Москве</span></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ClinicCard title="Записей сегодня" value={clinic.todayAppointments} href="/admin/appointments?date=today" color="#4DC8A8" />
          <ClinicCard title="Предстоящих записей" value={clinic.upcomingAppointments} href="/admin/appointments?range=upcoming" color="#60A5FA" />
          <ClinicCard title="Требуют проверки" value={clinic.needsReviewAppointments} href="/admin/appointments?status=needs_review" color="#F59E0B" />
          <ClinicCard title="Активных пациентов" value={clinic.activePatients} href="/admin/patients" color="#A78BFA" />
        </div>
      </section>
      <section aria-labelledby="mango-statistics-title">
        <div className="mb-3 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-mint">Телефония</p><h2 id="mango-statistics-title" className="mt-1 font-serif text-2xl text-clay-dark">Звонки MANGO</h2></div><span className="text-xs text-clay-admin-muted">Сегодня, время по Москве</span></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          <ClinicCard title="Активные звонки" value={calls.active} href="/admin/calls" color="#22C55E" />
          <ClinicCard title="Входящие сегодня" value={calls.incomingToday} href="/admin/calls" color="#38BDF8" />
          <ClinicCard title="Отвеченные" value={calls.answeredToday} href="/admin/calls?status=answered" color="#4DC8A8" />
          <ClinicCard title="Пропущенные" value={calls.missedToday} href="/admin/calls?status=missed" color="#F97316" />
          <ClinicCard title="Доля ответов" value={`${calls.answerRate}%`} href="/admin/calls" color="#A78BFA" />
          <ClinicCard title="Среднее ожидание" value={callDuration(calls.averageWaitSeconds)} href="/admin/calls" color="#F59E0B" />
          <ClinicCard title="Средний разговор" value={callDuration(calls.averageTalkSeconds)} href="/admin/calls" color="#EC4899" />
        </div>
      </section>
      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <StatCard
          title="Онлайн сейчас"
          value={stats.onlineNow}
          sub="активны < 5 мин"
          color="#22c55e"
        />
        <StatCard
          title="Визитов сегодня"
          value={stats.today.sessions}
          sub={`${stats.today.uniqueVisitors} уникальных`}
          color="#38bdf8"
        />
        <StatCard
          title="За неделю"
          value={stats.week.sessions}
          sub={`${stats.week.uniqueVisitors} уникальных`}
          color="#a78bfa"
        />
        <StatCard
          title="За месяц"
          value={stats.month.sessions}
          sub={`${stats.month.uniqueVisitors} уникальных`}
          color="#fb923c"
        />
        <StatCard
          title="Ср. длительность"
          value={fmtDuration(stats.avgDuration)}
          sub="на странице"
          color="#f472b6"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Chart */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>
            Посещения за 7 дней
          </div>
          <BarChart data={stats.dailyVisits} />
        </div>

        {/* Top pages */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>
            Топ страниц
          </div>
          {stats.topPages.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>Нет данных</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.topPages.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', width: '16px', textAlign: 'right' }}>{i + 1}</span>
                  <div style={{ flex: 1, fontSize: '13px', color: '#374151', fontFamily: 'monospace' }}>{p.page || '/'}</div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent events */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
            Последние события
          </div>
          <a href="/admin/logs" style={{ fontSize: '12px', color: '#38bdf8', textDecoration: 'none' }}>
            Все логи →
          </a>
        </div>
        {stats.recentEvents.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>Нет событий</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {stats.recentEvents.map((evt, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '140px 110px 1fr auto',
                gap: '12px',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: i < stats.recentEvents.length - 1 ? '1px solid #f1f5f9' : 'none',
                fontSize: '12px',
              }}>
                <span style={{ color: '#94a3b8' }}>
                  {new Date(evt.createdAt).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <EventTypeBadge type={evt.eventType} />
                <span style={{ color: '#374151', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {evt.page}
                </span>
                <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                  {evt.target || '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
