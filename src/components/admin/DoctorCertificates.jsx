import { useState, useRef } from 'react'

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
        <div style={{ height: '100%', width: `${progress}%`, background: color, borderRadius: '3px', transition: 'width 0.2s ease' }} />
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '4px',
}

export function DoctorCertificates({ doctor }) {
  const [certs, setCerts] = useState(doctor.certificates || [])
  const [uploads, setUploads] = useState([])
  const [deleting, setDeleting] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const fileRef = useRef(null)

  async function handleFilesChange(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    e.target.value = ''

    const initialUploads = files.map(f => ({ name: f.name, progress: 0, status: 'uploading', error: '' }))
    setUploads(initialUploads)

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

    if (newCerts.length > 0) setCerts(prev => [...prev, ...newCerts])
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
          if (data.uploaded?.length > 0) resolve(data.uploaded[0])
          else if (data.errors?.length > 0) reject(new Error(data.errors[0].error))
          else reject(new Error('Неизвестная ошибка'))
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
      if (res.ok) setCerts(prev => prev.filter(c => c.id !== cert.id))
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
          style={{ padding: '5px 12px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
          </svg>
          Добавить
        </button>
      </div>

      {hasUploads && (
        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Загрузка файлов...</div>
          {uploads.map((u, i) => (
            <ProgressBar key={i} progress={u.progress} label={u.name} status={u.status} />
          ))}
        </div>
      )}

      {certs.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
          {certs.map(cert => (
            <div key={cert.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', aspectRatio: '1', background: '#f8fafc', cursor: 'pointer' }}>
              <img
                src={cert.url}
                alt={cert.title || 'Сертификат'}
                onClick={() => setLightbox(cert)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => { e.target.style.display = 'none' }}
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(cert) }}
                disabled={deleting === cert.id}
                style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none', borderRadius: '50%', fontSize: '13px', lineHeight: '1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}
                title="Удалить"
              >×</button>
              {cert.title && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '9px', padding: '3px 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            style={{ border: '2px dashed #d1d5db', borderRadius: '10px', padding: '24px', textAlign: 'center', cursor: 'pointer', color: '#94a3b8', fontSize: '12px' }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 6px', display: 'block' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Нажмите для добавления сертификатов
            <div style={{ fontSize: '10px', marginTop: '3px', color: '#cbd5e1' }}>Можно выбрать несколько файлов</div>
          </div>
        )
      )}

      <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple onChange={handleFilesChange} style={{ display: 'none' }} />

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, cursor: 'zoom-out' }}>
          <img src={lightbox.url} alt={lightbox.title || 'Сертификат'} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: '20px', right: '24px', background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          {lightbox.title && (
            <div style={{ position: 'absolute', bottom: '24px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '13px' }}>
              {lightbox.title}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DoctorCertificates
