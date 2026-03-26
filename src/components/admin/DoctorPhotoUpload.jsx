import { useState, useRef } from 'react'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '4px',
}

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

function validatePhotoFile(file) {
  if (!file) return 'Файл не выбран'
  if (!ALLOWED_TYPES.includes(file.type)) return 'Допустимые форматы: JPEG, PNG, WebP'
  if (file.size > MAX_SIZE) return 'Файл слишком большой (макс. 5MB)'
  return ''
}

function getResponseError(responseText, fallback) {
  try {
    return JSON.parse(responseText).error || fallback
  } catch {
    return fallback
  }
}

export function DoctorPhotoUpload({ doctor, onPhotoUpdated }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState(doctor.photoUrl || null)
  const fileRef = useRef(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const validationError = validatePhotoFile(file)
    if (validationError) {
      setStatus('error')
      setError(validationError)
      e.target.value = ''
      return
    }

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
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/admin/upload/photo')

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }

        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText)
            setProgress(100)
            setStatus('done')
            onPhotoUpdated(data.url)
            resolve()
          } else {
            reject(new Error(getResponseError(xhr.responseText, 'Ошибка загрузки')))
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
      <label style={labelStyle}>Фотография доктора</label>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          style={{
            width: '88px', height: '88px', borderRadius: '12px',
            border: '2px dashed #d1d5db', overflow: 'hidden', flexShrink: 0,
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f8fafc', position: 'relative', transition: 'border-color 0.15s',
          }}
          title="Нажмите для загрузки фото"
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Фото доктора" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <svg width="28" height="28" fill="none" stroke="#94a3b8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          )}
          {uploading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#16a34a', fontWeight: '500' }}>✓ Фото успешно загружено</div>
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

export default DoctorPhotoUpload
