import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { DoctorEditForm } from './DoctorEditForm.jsx'
import { useAdminFetch } from '../../lib/useAdminFetch.js'

export function DoctorList() {
  const { loading, error, fetchData } = useAdminFetch()
  const [doctors, setDoctors] = useState([])
  const [editing, setEditing] = useState(null)
  const [saved, setSaved] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [syncMessage, setSyncMessage] = useState('')

  const syncDoctors = useCallback(async () => {
    setSyncing(true)
    setSyncError('')
    setSyncMessage('')
    try {
      const response = await fetch('/api/admin/doctors/sync', { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' } })
      if (response.status === 401) {
        window.location.href = '/admin/login'
        return
      }
      if (!response.ok) throw new Error('Doctor synchronization failed')
      const result = await response.json()
      setDoctors(result.doctors || [])
      setSyncMessage(`Medflex: ${result.report.active} активных, ${result.report.created} новых, ${result.report.preserved} сохранено без изменений`)
    } catch {
      setSyncError('Не удалось обновить врачей из Medflex')
    } finally {
      setSyncing(false)
    }
  }, [])

  const loadDoctors = useCallback(async () => {
    const result = await fetchData('/api/admin/doctors', { errorMessage: 'Не удалось загрузить докторов' })
    if (!result) return
    const loaded = result.doctors || []
    setDoctors(loaded)
    if (loaded.length === 0) await syncDoctors()
  }, [fetchData, syncDoctors])

  useEffect(() => { loadDoctors() }, [loadDoctors])

  function handleSave(updated) {
    setDoctors(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated, certificates: updated.certificates ?? d.certificates, medflexLinks: updated.medflexLinks ?? d.medflexLinks } : d))
    setEditing(null)
    setSaved(updated.id)
    setTimeout(() => setSaved(null), 2000)
  }

  if (loading) return <div style={{ color: '#64748b', padding: '40px', textAlign: 'center' }}>Загрузка...</div>
  if (error) return <div style={{ color: '#dc2626', padding: '20px' }}>{error}</div>

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          {syncMessage && <p role="status" className="m-0 text-sm font-medium text-emerald-700">{syncMessage}</p>}
          {syncError && <p role="alert" className="m-0 text-sm font-medium text-red-700">{syncError}</p>}
          {!syncMessage && !syncError && <p className="m-0 text-sm text-slate-500">Карточки клиники связаны с актуальным каталогом Medflex</p>}
        </div>
        <button type="button" onClick={syncDoctors} disabled={syncing} aria-label="Обновить врачей из Medflex" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60">
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} aria-hidden="true" />
          {syncing ? 'Обновляем...' : 'Обновить из Medflex'}
        </button>
      </div>
      {editing && (
        <DoctorEditForm
          doctor={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', width: '48px' }}>Фото</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>ФИО</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Специализация</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Стаж</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Серт.</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doc, i) => (
              <tr key={doc.id} style={{
                borderBottom: i < doctors.length - 1 ? '1px solid #f1f5f9' : 'none',
                background: saved === doc.id ? '#f0fdf4' : 'white',
                transition: 'background 0.3s',
              }}>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {doc.photoUrl ? (
                      <img src={doc.photoUrl} alt={`${doc.specialization ? doc.specialization.split(',')[0].toLowerCase() + ' ' : ''}${doc.name}, клиника Одинцова, СПб`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                    )}
                  </div>
                </td>
                <td style={{ padding: '10px 16px', fontWeight: '500', color: '#1e293b' }}>
                  <div>{doc.name}</div>
                  {Number.isInteger(doc.medflexDoctorId) && <div className={`mt-1 text-[11px] font-semibold ${doc.active ? 'text-emerald-700' : 'text-slate-400'}`}>{doc.active ? 'Medflex активен' : 'Нет в текущем каталоге Medflex'}</div>}
                </td>
                <td style={{ padding: '10px 16px', color: '#374151' }}>{doc.specialization}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', color: '#64748b' }}>{doc.experienceYears} лет</td>
                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                  {doc.certificates?.length > 0 ? (
                    <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' }}>
                      {doc.certificates.length}
                    </span>
                  ) : (
                    <span style={{ color: '#cbd5e1', fontSize: '12px' }}>-</span>
                  )}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                  <button
                    onClick={() => setEditing(doc)}
                    style={{ padding: '5px 14px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
                  >
                    Изменить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {doctors.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Доктора не найдены</div>
        )}
      </div>
    </div>
  )
}
