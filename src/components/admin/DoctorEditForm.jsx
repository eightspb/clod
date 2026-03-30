import { useState } from 'react'
import { DoctorPhotoUpload } from './DoctorPhotoUpload.jsx'
import { DoctorCertificates } from './DoctorCertificates.jsx'

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '4px',
}

export function DoctorEditForm({ doctor, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: doctor.name || '',
    specialization: doctor.specialization || '',
    experienceYears: doctor.experienceYears || 0,
    bio: doctor.bio || '',
    slug: doctor.slug || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [photoUrl, setPhotoUrl] = useState(doctor.photoUrl || null)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === 'experienceYears' ? Number(value) : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/doctors/${doctor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        onSave({ ...data.doctor, photoUrl, certificates: doctor.certificates || [] })
      } else {
        setError(data.error || 'Ошибка сохранения')
      }
    } catch {
      setError('Ошибка соединения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Редактировать доктора</h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '22px', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <DoctorPhotoUpload doctor={{ ...doctor, photoUrl }} onPhotoUpdated={(url) => setPhotoUrl(url)} />

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

          <div>
            <label style={labelStyle}>ФИО</label>
            <input name="name" value={form.name} onChange={handleChange} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Специализация</label>
            <input name="specialization" value={form.specialization} onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Стаж (лет)</label>
              <input name="experienceYears" type="number" min="0" max="60" value={form.experienceYears} onChange={handleChange} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Slug (URL)</label>
              <input name="slug" value={form.slug} onChange={handleChange} style={inputStyle} placeholder="ivanov-ivan" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Биография</label>
            <textarea name="bio" value={form.bio} onChange={handleChange} rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }} />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

          <DoctorCertificates doctor={doctor} />

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <button type="button" onClick={onCancel} style={{ padding: '9px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', color: '#374151' }}>
              Отмена
            </button>
            <button type="submit" disabled={saving} style={{ padding: '9px 18px', background: saving ? '#94a3b8' : '#1e293b', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', color: 'white' }}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
