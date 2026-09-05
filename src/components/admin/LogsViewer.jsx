import { useState, useEffect, useCallback } from 'react'
import { useAdminFetch } from '../../lib/useAdminFetch.js'

const EVENT_TYPES = ['', 'click', 'navigation', 'page_enter', 'page_leave', 'form_submit', 'heartbeat']
const EMPTY_FILTERS = Object.freeze({ type: '', filterPage: '', date: '' })

const TYPE_COLORS = {
  click: { bg: '#dbeafe', text: '#1d4ed8' },
  navigation: { bg: '#d1fae5', text: '#065f46' },
  page_enter: { bg: '#e0e7ff', text: '#3730a3' },
  page_leave: { bg: '#fef3c7', text: '#92400e' },
  form_submit: { bg: '#fce7f3', text: '#9d174d' },
  heartbeat: { bg: '#f1f5f9', text: '#475569' },
}

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || { bg: '#f1f5f9', text: '#475569' }
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: '2px 8px', borderRadius: '4px',
      fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap',
    }}>
      {type}
    </span>
  )
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  const pages = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  const btnStyle = (active) => ({
    padding: '5px 10px', border: '1px solid #e2e8f0',
    borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
    background: active ? '#1e293b' : 'white',
    color: active ? 'white' : '#374151',
    fontWeight: active ? '600' : '400',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
      <button style={btnStyle(false)} onClick={() => onPage(1)} disabled={page === 1}>«</button>
      <button style={btnStyle(false)} onClick={() => onPage(page - 1)} disabled={page === 1}>‹</button>
      {pages.map(p => (
        <button key={p} style={btnStyle(p === page)} onClick={() => onPage(p)}>{p}</button>
      ))}
      <button style={btnStyle(false)} onClick={() => onPage(page + 1)} disabled={page === totalPages}>›</button>
      <button style={btnStyle(false)} onClick={() => onPage(totalPages)} disabled={page === totalPages}>»</button>
    </div>
  )
}

export function LogsViewer() {
  const { loading, error, fetchData } = useAdminFetch()
  const [logs, setLogs] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS)
  const [expanded, setExpanded] = useState(null)

  const loadLogs = useCallback(async (p, f) => {
    const params = new URLSearchParams({
      page: String(p),
      perPage: '50',
      ...(f.type && { type: f.type }),
      ...(f.filterPage && { filterPage: f.filterPage }),
      ...(f.date && { date: f.date }),
    })
    const result = await fetchData(`/api/admin/logs?${params}`, { errorMessage: 'Не удалось загрузить логи' })
    if (result) {
      setLogs(result.logs || [])
      setTotal(result.total || 0)
      setTotalPages(result.totalPages || 1)
    }
  }, [fetchData])

  useEffect(() => { loadLogs(page, appliedFilters) }, [page, appliedFilters, loadLogs])

  function applyFilters() {
    setAppliedFilters(filters)
    setPage(1)
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setPage(1)
  }

  function handlePage(p) {
    setPage(p)
    setExpanded(null)
  }

  const inputStyle = {
    padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '7px',
    fontSize: '12px', outline: 'none', fontFamily: 'Inter, sans-serif',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Filters */}
      <div style={{
        background: 'white', borderRadius: '12px', padding: '16px 20px',
        border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap',
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Тип события</label>
          <select
            className="admin-select"
            value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
            style={inputStyle}
          >
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t || 'Все типы'}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Страница</label>
          <input
            type="text"
            placeholder="/mammology"
            value={filters.filterPage}
            onChange={e => setFilters(f => ({ ...f, filterPage: e.target.value }))}
            style={{ ...inputStyle, width: '160px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Дата</label>
          <input
            type="date"
            value={filters.date}
            onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <button
          onClick={applyFilters}
          style={{
            padding: '7px 16px', background: '#1e293b', color: 'white',
            border: 'none', borderRadius: '7px', fontSize: '12px',
            fontWeight: '600', cursor: 'pointer',
          }}
        >
          Применить
        </button>
        <button
          onClick={resetFilters}
          style={{
            padding: '7px 14px', background: '#f1f5f9', color: '#374151',
            border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '12px', cursor: 'pointer',
          }}
        >
          Сбросить
        </button>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8', alignSelf: 'center' }}>
          Всего: {total}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Загрузка...</div>
        ) : error ? (
          <div style={{ padding: '20px', color: '#dc2626' }}>{error}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Время</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Тип</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Страница</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Target</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>IP</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: expanded === log.id ? '#f8fafc' : 'white',
                    }}
                  >
                    <td style={{ padding: '8px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString('ru', {
                        day: '2-digit', month: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: '8px 14px' }}><TypeBadge type={log.eventType} /></td>
                    <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: '#374151', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.page || '/'}
                    </td>
                    <td style={{ padding: '8px 14px', color: '#374151', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.target || '-'}
                    </td>
                    <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: '#94a3b8' }}>{log.ip || '-'}</td>
                    <td style={{ padding: '8px 14px', color: '#94a3b8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details ? log.details.slice(0, 60) : '-'}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr key={`${log.id}-detail`} style={{ background: '#f8fafc' }}>
                      <td colSpan={6} style={{ padding: '10px 14px 14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px', fontSize: '12px' }}>
                          <div><span style={{ color: '#94a3b8' }}>Log ID: </span><span style={{ fontFamily: 'monospace', color: '#374151' }}>{log.id}</span></div>
                          <div><span style={{ color: '#94a3b8' }}>Session ID: </span><span style={{ fontFamily: 'monospace', color: '#374151' }}>{log.sessionId}</span></div>
                          {log.details && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <span style={{ color: '#94a3b8' }}>Details: </span>
                              <pre style={{ display: 'inline', fontFamily: 'monospace', color: '#374151', fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {(() => { try { return JSON.stringify(JSON.parse(log.details), null, 2) } catch { return log.details } })()}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
        {!loading && logs.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Нет событий</div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={handlePage} />
      <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
        Нажмите на строку для просмотра подробностей
      </div>
    </div>
  )
}
