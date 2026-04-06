import { useState, useEffect } from 'react'
import { DoctorEditForm } from './DoctorEditForm.jsx'
import { useAdminFetch } from '../../lib/useAdminFetch.js'

export function DoctorList() {
  const { data, loading, error, fetchData } = useAdminFetch()
  const [doctors, setDoctors] = useState([])
  const [editing, setEditing] = useState(null)
  const [saved, setSaved] = useState(null)

  async function loadDoctors() {
    const result = await fetchData('/api/admin/doctors', { errorMessage: 'Не удалось загрузить докторов' })
    if (result) setDoctors(result.doctors || [])
  }

  useEffect(() => { loadDoctors() }, [])

  function handleSave(updated) {
    setDoctors(prev => prev.map(d => d.id === updated.id ? updated : d))
    setEditing(null)
    setSaved(updated.id)
    setTimeout(() => setSaved(null), 2000)
  }

  if (loading) return <div style={{ color: '#64748b', padding: '40px', textAlign: 'center' }}>Загрузка...</div>
  if (error) return <div style={{ color: '#dc2626', padding: '20px' }}>{error}</div>

  return (
    <div>
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
                <td style={{ padding: '10px 16px', fontWeight: '500', color: '#1e293b' }}>{doc.name}</td>
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
