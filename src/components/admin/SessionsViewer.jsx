import { useState, useEffect } from 'react'
import { useAdminFetch } from '../../lib/useAdminFetch.js'

function OnlineBadge({ isOnline }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <span style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: isOnline ? '#22c55e' : '#94a3b8',
        flexShrink: 0,
      }} />
      <span style={{ fontSize: '11px', color: isOnline ? '#16a34a' : '#94a3b8', fontWeight: '500' }}>
        {isOnline ? 'Онлайн' : 'Неактивен'}
      </span>
    </span>
  )
}

function fmtDuration(sec) {
  if (sec < 60) return `${sec}с`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return `${m}м ${s}с`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}ч ${rm}м`
}

function parseUA(ua) {
  if (!ua) return '-'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  return ua.slice(0, 30)
}

export function SessionsViewer() {
  const { loading, error, fetchData } = useAdminFetch()
  const [sessions, setSessions] = useState([])
  const [activeOnly, setActiveOnly] = useState(true)
  const [expanded, setExpanded] = useState(null)

  async function loadSessions() {
    const result = await fetchData(`/api/admin/sessions?active=${activeOnly}&limit=200`, { errorMessage: 'Не удалось загрузить сессии' })
    if (result) setSessions(result.sessions || [])
  }

  useEffect(() => {
    loadSessions()
    const interval = setInterval(loadSessions, 10000)
    return () => clearInterval(interval)
  }, [activeOnly])

  const onlineCount = sessions.filter(s => s.isOnline).length

  if (loading) return <div style={{ color: '#64748b', padding: '40px', textAlign: 'center' }}>Загрузка...</div>
  if (error) return <div style={{ color: '#dc2626', padding: '20px' }}>{error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          background: 'white', borderRadius: '10px', padding: '12px 20px',
          border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{onlineCount} онлайн</span>
        </div>
        <div style={{
          background: 'white', borderRadius: '10px', padding: '12px 20px',
          border: '1px solid #e2e8f0', fontSize: '14px', color: '#374151',
        }}>
          Всего сессий: <strong>{sessions.length}</strong>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer', marginLeft: 'auto' }}>
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={e => { setActiveOnly(e.target.checked); setLoading(true) }}
          />
          Только активные
        </label>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Статус</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>IP</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Браузер</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Текущая страница</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Начало</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Длительность</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Язык</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Экран</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <>
                <tr
                  key={s.id}
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: expanded === s.id ? '#f8fafc' : 'white',
                    transition: 'background 0.1s',
                  }}
                >
                  <td style={{ padding: '10px 14px' }}><OnlineBadge isOnline={s.isOnline} /></td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#374151' }}>{s.ip || '-'}</td>
                  <td style={{ padding: '10px 14px', color: '#374151' }}>{parseUA(s.userAgent)}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#1e293b', fontWeight: '500' }}>{s.currentPage || '/'}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>
                    {new Date(s.startedAt).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#374151' }}>{fmtDuration(s.durationSeconds)}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{s.language || '-'}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>
                    {s.screenWidth && s.screenHeight ? `${s.screenWidth}×${s.screenHeight}` : '-'}
                  </td>
                </tr>
                {expanded === s.id && (
                  <tr key={`${s.id}-detail`} style={{ background: '#f8fafc' }}>
                    <td colSpan={8} style={{ padding: '12px 14px 14px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12px' }}>
                        <div><span style={{ color: '#94a3b8' }}>Session ID: </span><span style={{ fontFamily: 'monospace', color: '#374151' }}>{s.id}</span></div>
                        <div><span style={{ color: '#94a3b8' }}>Visitor ID: </span><span style={{ fontFamily: 'monospace', color: '#374151' }}>{s.visitorId}</span></div>
                        <div><span style={{ color: '#94a3b8' }}>Referrer: </span><span style={{ color: '#374151' }}>{s.referrer || '-'}</span></div>
                        <div><span style={{ color: '#94a3b8' }}>Последняя активность: </span><span style={{ color: '#374151' }}>{new Date(s.lastActiveAt).toLocaleString('ru')}</span></div>
                        <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#94a3b8' }}>User-Agent: </span><span style={{ color: '#374151', wordBreak: 'break-all' }}>{s.userAgent || '-'}</span></div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            {activeOnly ? 'Нет активных сессий' : 'Нет сессий'}
          </div>
        )}
      </div>
      <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>
        Авто-обновление каждые 10 секунд. Нажмите на строку для подробностей.
      </div>
    </div>
  )
}
