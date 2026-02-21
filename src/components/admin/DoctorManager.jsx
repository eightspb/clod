import { useState, useEffect, useRef } from 'react'

// ─── Shared styles ────────────────────────────────────────────────────────────

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

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ progress, label, status }) {
  const colors = { uploading: '#38bdf8', done: '#22c55e', error: '#f87171' }
  const color = colors[status] || colors.uploading
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontSize: '11px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
          {label}
        </span>
        <span style={{ fontSize: '11px', color, fontWeight: '600', flexShrink: 0, marginLeft: '8px' }}>
          {status === 'done' ? '✓' : status === 'error' ? '✗' : `${progress}%`}
        </span>
      </div>
      <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: color,
          borderRadius: '3px',
          transition: 'width 0.2s ease',
        }} />
      </div>
    </div>
  )
}

// ─── Photo Upload Section ─────────────────────────────────────────────────────

function PhotoUpload({ doctor, onPhotoUpdated }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState(null) // null | 'uploading' | 'done' | 'error'
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState(doctor.photoUrl || null)
  const fileRef = useRef(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const localPreview = URL.createObjectURL(file)
    setPreviewUrl(localPreview)
    uploadPhoto(file)
  }

  async function uploadPhoto(file) {
    setUploading(true)
    setProgress(0)
    setStatus('uploading')
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('doctorId', doctor.id)

    try {
      // Simulate progress with XHR for real upload progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/admin/upload/photo')

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        }

        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText)
            setProgress(100)
            setStatus('done')
            onPhotoUpdated(data.url)
            resolve()
          } else {
            let msg = 'Ошибка загрузки'
            try { msg = JSON.parse(xhr.responseText).error || msg } catch {}
            reject(new Error(msg))
          }
        }

        xhr.onerror = () => reject(new Error('Ошибка соединения'))
        xhr.send(formData)
      })
    } catch (err) {
      setStatus('error')
      setError(err.message)
      setPreviewUrl(doctor.photoUrl || null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label style={labelStyle}>Фотография врача</label>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        {/* Avatar preview */}
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '12px',
            border: '2px dashed #d1d5db',
            overflow: 'hidden',
            flexShrink: 0,
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fafc',
            position: 'relative',
            transition: 'border-color 0.15s',
          }}
          title="Нажмите для загрузки фото"
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Фото врача"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <svg width="28" height="28" fill="none" stroke="#94a3b8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          )}
          {uploading && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8' }}>{progress}%</span>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              padding: '7px 14px',
              background: uploading ? '#f1f5f9' : '#1e293b',
              color: uploading ? '#94a3b8' : 'white',
              border: 'none', borderRadius: '7px',
              fontSize: '12px', fontWeight: '600',
              cursor: uploading ? 'not-allowed' : 'pointer',
              marginBottom: '8px',
            }}
          >
            {uploading ? 'Загрузка...' : previewUrl ? 'Заменить фото' : 'Загрузить фото'}
          </button>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>JPEG, PNG, WebP · макс. 5MB</div>

          {status === 'uploading' && (
            <div style={{ marginTop: '8px' }}>
              <ProgressBar progress={progress} label="Загрузка фото..." status="uploading" />
            </div>
          )}
          {status === 'done' && (
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#16a34a', fontWeight: '500' }}>
              ✓ Фото успешно загружено
            </div>
          )}
          {status === 'error' && (
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#dc2626' }}>{error}</div>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}

// ─── Certificates Upload Section ──────────────────────────────────────────────

function CertificatesUpload({ doctor }) {
  const [certs, setCerts] = useState(doctor.certificates || [])
  const [uploads, setUploads] = useState([]) // { name, progress, status, error }
  const [deleting, setDeleting] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const fileRef = useRef(null)

  async function handleFilesChange(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    e.target.value = '' // reset so same files can be re-selected

    // Initialize upload state for each file
    const initialUploads = files.map(f => ({ name: f.name, progress: 0, status: 'uploading', error: '' }))
    setUploads(initialUploads)

    // Upload files one-by-one with individual progress tracking
    const newCerts = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const result = await uploadSingleCert(file, doctor.id, (prog) => {
          setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, progress: prog } : u))
        })
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, progress: 100, status: 'done' } : u))
        newCerts.push(result)
      } catch (err) {
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'error', error: err.message } : u))
      }
    }

    if (newCerts.length > 0) {
      setCerts(prev => [...prev, ...newCerts])
    }

    // Clear upload progress after 3 seconds
    setTimeout(() => setUploads([]), 3000)
  }

  function uploadSingleCert(file, doctorId, onProgress) {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('files', file)
      formData.append('doctorId', doctorId)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/admin/upload/certificates')

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText)
          if (data.uploaded?.length > 0) {
            resolve(data.uploaded[0])
          } else if (data.errors?.length > 0) {
            reject(new Error(data.errors[0].error))
          } else {
            reject(new Error('Неизвестная ошибка'))
          }
        } else {
          let msg = 'Ошибка загрузки'
          try { msg = JSON.parse(xhr.responseText).error || msg } catch {}
          reject(new Error(msg))
        }
      }

      xhr.onerror = () => reject(new Error('Ошибка соединения'))
      xhr.send(formData)
    })
  }

  async function handleDelete(cert) {
    if (!confirm(`Удалить сертификат "${cert.title || 'без названия'}"?`)) return
    setDeleting(cert.id)
    try {
      const res = await fetch(`/api/admin/doctors/${doctor.id}/certificates`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certId: cert.id }),
      })
      if (res.ok) {
        setCerts(prev => prev.filter(c => c.id !== cert.id))
      }
    } catch {}
    setDeleting(null)
  }

  const hasUploads = uploads.length > 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <label style={labelStyle}>Сертификаты ({certs.length})</label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            padding: '5px 12px',
            background: '#1e293b', color: 'white',
            border: 'none', borderRadius: '6px',
            fontSize: '11px', fontWeight: '600', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
          </svg>
          Добавить
        </button>
      </div>

      {/* Upload progress bars */}
      {hasUploads && (
        <div style={{
          background: '#f8fafc', borderRadius: '8px', padding: '12px',
          border: '1px solid #e2e8f0', marginBottom: '12px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            Загрузка файлов...
          </div>
          {uploads.map((u, i) => (
            <ProgressBar key={i} progress={u.progress} label={u.name} status={u.status} />
          ))}
        </div>
      )}

      {/* Certificates grid */}
      {certs.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
          gap: '8px',
        }}>
          {certs.map(cert => (
            <div
              key={cert.id}
              style={{
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                aspectRatio: '1',
                background: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <img
                src={cert.url}
                alt={cert.title || 'Сертификат'}
                onClick={() => setLightbox(cert)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => { e.target.style.display = 'none' }}
              />
              {/* Delete button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(cert) }}
                disabled={deleting === cert.id}
                style={{
                  position: 'absolute', top: '4px', right: '4px',
                  width: '20px', height: '20px',
                  background: 'rgba(0,0,0,0.55)', color: 'white',
                  border: 'none', borderRadius: '50%',
                  fontSize: '13px', lineHeight: '1', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '700',
                }}
                title="Удалить"
              >
                ×
              </button>
              {/* Title tooltip */}
              {cert.title && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white', fontSize: '9px', padding: '3px 5px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {cert.title}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        !hasUploads && (
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: '2px dashed #d1d5db', borderRadius: '10px',
              padding: '24px', textAlign: 'center', cursor: 'pointer',
              color: '#94a3b8', fontSize: '12px',
              transition: 'border-color 0.15s',
            }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 6px', display: 'block' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Нажмите для добавления сертификатов
            <div style={{ fontSize: '10px', marginTop: '3px', color: '#cbd5e1' }}>Можно выбрать несколько файлов</div>
          </div>
        )
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={handleFilesChange}
        style={{ display: 'none' }}
      />

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, cursor: 'zoom-out',
          }}
        >
          <img
            src={lightbox.url}
            alt={lightbox.title || 'Сертификат'}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: '20px', right: '24px',
              background: 'rgba(255,255,255,0.15)', color: 'white',
              border: 'none', borderRadius: '50%',
              width: '36px', height: '36px', fontSize: '20px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
          {lightbox.title && (
            <div style={{
              position: 'absolute', bottom: '24px',
              background: 'rgba(0,0,0,0.6)', color: 'white',
              padding: '6px 16px', borderRadius: '20px', fontSize: '13px',
            }}>
              {lightbox.title}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Edit Form Modal ──────────────────────────────────────────────────────────

function EditForm({ doctor, onSave, onCancel }) {
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
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '28px',
        width: '100%', maxWidth: '560px', maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
            Редактировать врача
          </h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '22px', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Photo upload */}
          <PhotoUpload
            doctor={{ ...doctor, photoUrl }}
            onPhotoUpdated={(url) => setPhotoUrl(url)}
          />

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
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

          {/* Certificates upload */}
          <CertificatesUpload doctor={doctor} />

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <button type="button" onClick={onCancel} style={{
              padding: '9px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0',
              borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', color: '#374151',
            }}>
              Отмена
            </button>
            <button type="submit" disabled={saving} style={{
              padding: '9px 18px', background: saving ? '#94a3b8' : '#1e293b',
              border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer', color: 'white',
            }}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main DoctorManager ───────────────────────────────────────────────────────

export function DoctorManager() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [saved, setSaved] = useState(null)

  async function loadDoctors() {
    try {
      const res = await fetch('/api/admin/doctors')
      if (!res.ok) {
        if (res.status === 401) { window.location.href = '/admin/login'; return }
        throw new Error('Failed')
      }
      const data = await res.json()
      setDoctors(data.doctors || [])
    } catch {
      setError('Не удалось загрузить врачей')
    } finally {
      setLoading(false)
    }
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
        <EditForm
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
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    background: '#f1f5f9', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {doc.photoUrl ? (
                      <img src={doc.photoUrl} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    <span style={{
                      background: '#dbeafe', color: '#1d4ed8',
                      padding: '2px 8px', borderRadius: '10px',
                      fontSize: '11px', fontWeight: '600',
                    }}>
                      {doc.certificates.length}
                    </span>
                  ) : (
                    <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                  <button
                    onClick={() => setEditing(doc)}
                    style={{
                      padding: '5px 14px', background: '#1e293b', color: 'white',
                      border: 'none', borderRadius: '6px', fontSize: '12px',
                      fontWeight: '500', cursor: 'pointer',
                    }}
                  >
                    Изменить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {doctors.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Врачи не найдены</div>
        )}
      </div>
    </div>
  )
}
