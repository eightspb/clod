import { useState, useRef, useEffect } from 'react'
import { Shield, Paperclip, X, AlertCircle, CheckCircle } from 'lucide-react'
import {
  MAX_FILES,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_FILE_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
} from '../lib/file-constraints.js'

function getFileExtension(filename) {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? parts.at(-1) : ''
}

function isAllowedFile(file) {
  const extension = getFileExtension(file.name || '')
  const mimeType = (file.type || '').toLowerCase()

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return false
  }

  if (!mimeType) {
    return true
  }

  return ALLOWED_MIME_TYPES.has(mimeType)
}

function validateFiles(files) {
  if (!files.length) {
    return 'Прикрепите хотя бы один файл.'
  }

  if (files.length > MAX_FILES) {
    return `Можно прикрепить не более ${MAX_FILES} файлов.`
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > MAX_TOTAL_FILE_SIZE_BYTES) {
    return 'Суммарный размер файлов не должен превышать 25 МБ.'
  }

  for (const file of files) {
    if (!isAllowedFile(file)) {
      return 'Можно прикрепить только PDF, JPG, JPEG или PNG.'
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return 'Размер одного файла не должен превышать 10 МБ.'
    }
  }

  return ''
}

async function getErrorMessage(response) {
  try {
    const payload = await response.json()
    if (payload?.error?.details?.length) {
      return payload.error.details.map(({ message }) => message).join(' ')
    }

    if (payload?.error?.message) {
      return payload.error.message
    }
  } catch {
    return 'Ошибка соединения. Проверьте интернет и попробуйте через минуту'
  }

  return 'Ошибка соединения. Проверьте интернет и попробуйте через минуту'
}

export function SecondOpinionForm({ onClose, modalTitleId }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [files, setFiles] = useState([])
  const formRef = useRef(null)
  const confirmRef = useRef(null)
  useEffect(() => {
    if (!isConfirming) return
    confirmRef.current?.focus()
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setIsConfirming(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isConfirming])

  const handleFileChange = (e) => {
    if (!e.target.files) return

    const selectedFiles = Array.from(e.target.files)
    const nextFiles = [...files, ...selectedFiles]
    const validationMessage = validateFiles(nextFiles)

    if (validationMessage) {
      setErrorMsg(validationMessage)
      e.target.value = ''
      return
    }

    setFiles(nextFiles)
    setErrorMsg('')
    e.target.value = ''
  }

  const removeFile = (index) => {
    setFiles((prev) => {
      const nextFiles = prev.filter((_, i) => i !== index)
      if (errorMsg) {
        setErrorMsg(validateFiles(nextFiles))
      }
      return nextFiles
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMsg('')
    const validationMessage = validateFiles(files)
    if (validationMessage) {
      setErrorMsg(validationMessage)
      return
    }
    formRef.current = e.currentTarget
    setIsConfirming(true)
  }
  const handleConfirmedSubmit = async () => {
    setIsConfirming(false)
    setIsSubmitting(true)
    try {
      const formData = new FormData(formRef.current)
      formData.delete('files')
      files.forEach((file) => {
        formData.append('files', file)
      })
      const res = await fetch('/api/second-opinion', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        throw new Error(await getErrorMessage(res))
      }
      setIsSuccess(true)
    } catch (err) {
      setErrorMsg(err.message || 'Ошибка соединения. Проверьте интернет и попробуйте через минуту')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="clay clay-card-mint p-6 relative overflow-hidden text-center" role="status">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
            <CheckCircle className="text-clay-mint" size={24} />
          </div>
        </div>
        <h3 className="font-extrabold text-clay-dark text-xl mb-2">Заявка успешно отправлена!</h3>
        <p className="text-clay-text text-xs leading-relaxed mb-6">
          Мы получили ваши данные и снимки. Наш специалист свяжется с вами в течение рабочего дня (пн-пт 9:00-20:00).
        </p>
        <button
          onClick={onClose}
          aria-label="Закрыть и вернуться на страницу"
          className="clay btn-clay-white justify-center w-full py-2 text-sm"
        >
          Отлично
        </button>
      </div>
    )
  }

  return (
    <div className="clay clay-card p-5 md:p-7 relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-clay-muted hover:text-clay-dark transition-colors"
          aria-label="Закрыть"
        >
          <X size={24} />
        </button>
      )}

      <h3 id={modalTitleId} className="text-xl md:text-2xl font-extrabold text-clay-dark mb-2">Отправить данные на проверку</h3>
      <p className="text-clay-muted text-sm mb-5">
        Заполните форму и прикрепите снимки УЗИ или маммографии (не старше 3 месяцев) и заключение из предыдущей клиники. Если нужен очный осмотр в Санкт-Петербурге, мы подскажем дальнейший шаг.
      </p>

      {errorMsg && (
        <div role="alert" className="clay clay-card-soft-peach p-3 mb-5 flex items-start gap-2.5 text-clay-text text-sm">
          <AlertCircle size={18} className="text-clay-peach flex-shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="lastName" className="block text-sm font-semibold text-clay-dark mb-1">
              Фамилия <span className="text-clay-peach">*</span>
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              maxLength={120}
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all text-sm"
              placeholder="Иванова"
            />
          </div>
          <div>
            <label htmlFor="firstName" className="block text-sm font-semibold text-clay-dark mb-1">
              Имя <span className="text-clay-peach">*</span>
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              maxLength={120}
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all text-sm"
              placeholder="Мария"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="middleName" className="block text-sm font-semibold text-clay-dark mb-1">
              Отчество
            </label>
            <input
              type="text"
              id="middleName"
              name="middleName"
              maxLength={120}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all text-sm"
              placeholder="Ивановна"
            />
          </div>
          <div>
            <label htmlFor="birthDate" className="block text-sm font-semibold text-clay-dark mb-1">
              Дата рождения <span className="text-clay-peach">*</span>
            </label>
            <input
              type="date"
              id="birthDate"
              name="birthDate"
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-clay-dark mb-1">
              Телефон <span className="text-clay-peach">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all text-sm"
              placeholder="+7 (999) 000-00-00"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-clay-dark mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all text-sm"
              placeholder="example@mail.ru"
            />
          </div>
        </div>

        <div>
          <label htmlFor="comment" className="block text-sm font-semibold text-clay-dark mb-1">
            Комментарий (по желанию)
          </label>
          <textarea
            id="comment"
            name="comment"
            maxLength={2000}
            rows="2"
            disabled={isSubmitting}
            className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all resize-none text-sm"
            placeholder="Опишите кратко вашу ситуацию..."
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-semibold text-clay-dark mb-1.5">
            Прикрепить документы (до {MAX_FILES} файлов) <span className="text-clay-peach">*</span>
          </label>
          
          <div className="file-upload-field clay clay-card-soft-mint border border-dashed border-clay-mint/30 p-3 rounded-xl bg-white/50">
            <input
              type="file"
              id="file-upload"
              multiple
              onChange={handleFileChange}
              disabled={isSubmitting || files.length >= MAX_FILES}
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png"
              aria-describedby="file-upload-hint"
            />
            <label
              htmlFor="file-upload"
              className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg border-2 border-transparent font-semibold text-sm transition-all cursor-pointer ${
                files.length >= MAX_FILES || isSubmitting
                  ? 'bg-clay-bg text-clay-muted opacity-50 cursor-not-allowed'
                  : 'bg-white text-clay-mint shadow-sm hover:shadow-md'
              }`}
            >
              <Paperclip size={18} />
              Выберите файлы
            </label>

            {files.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-1.5 rounded-md bg-white/80 text-xs">
                    <span className="truncate pr-3 text-clay-dark font-medium max-w-[80%]">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      disabled={isSubmitting}
                      aria-label={`Удалить файл ${file.name}`}
                      className="text-clay-muted hover:text-clay-peach p-0.5"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <p id="file-upload-hint" className="text-xs text-clay-muted mt-2 text-center">
              PDF, JPG, JPEG, PNG. До 10 МБ на файл, суммарно до 25 МБ.
            </p>
          </div>
          <p className="text-xs text-clay-muted mt-1.5 leading-relaxed">
            Прикрепите снимки или заключения. Нужны для предварительной оценки вашего случая.
          </p>
        </div>

        <div className="flex items-start gap-2 mt-3">
          <Shield size={16} className="text-clay-mint flex-shrink-0 mt-0.5" />
          <p className="text-xs text-clay-muted leading-tight">
            Нажимая «Отправить заявку», я даю согласие на{' '}
            <a href="/privacy-policy" className="text-clay-mint hover:underline">обработку персональных данных</a>.
            {' '}Согласие распространяется на прикреплённые файлы и материалы обращения.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || files.length === 0}
          className="clay btn-clay-primary w-full justify-center mt-3 py-3 text-base"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Отправить заявку'
          )}
        </button>
        <p className="text-xs text-clay-muted text-center mt-2">
          Данные защищены и не передаются третьим лицам
        </p>
      </form>
      {isConfirming && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="clay clay-card-soft-mint p-5 mt-4 text-center"
        >
          <p id="confirm-dialog-title" className="text-sm text-clay-dark font-medium mb-4">
            Отправить снимки и данные? Наш врач свяжется в рабочее время.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              ref={confirmRef}
              type="button"
              onClick={handleConfirmedSubmit}
              className="clay btn-clay-primary px-6 py-2 text-sm"
            >
              Подтвердить
            </button>
            <button
              type="button"
              onClick={() => setIsConfirming(false)}
              className="clay btn-clay-secondary px-6 py-2 text-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
