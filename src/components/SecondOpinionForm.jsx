import { useState } from 'react'
import { Shield, Paperclip, X, AlertCircle, CheckCircle } from 'lucide-react'

export function SecondOpinionForm({ onClose }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [files, setFiles] = useState([])

  const handleFileChange = (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      // Basic validation: max 5 files, ~5MB each limit could be added here
      setFiles((prev) => [...prev, ...selectedFiles].slice(0, 5)) // max 5 files
    }
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.target)
      
      // Remove any previously appended files from FormData and append current state files
      formData.delete('files')
      files.forEach((file) => {
        formData.append('files', file)
      })

      const res = await fetch('/api/second-opinion', {
        method: 'POST',
        body: formData, // fetch automatically sets multipart/form-data with proper boundary
      })

      if (!res.ok) {
        throw new Error('Не удалось отправить заявку. Пожалуйста, попробуйте еще раз.')
      }

      setIsSuccess(true)
    } catch (err) {
      setErrorMsg(err.message || 'Произошла ошибка')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="clay clay-card-mint p-6 relative overflow-hidden text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
            <CheckCircle className="text-clay-mint" size={24} />
          </div>
        </div>
        <h3 className="font-extrabold text-white text-xl mb-2">Заявка успешно отправлена!</h3>
        <p className="text-white/90 text-xs leading-relaxed mb-6">
          Мы получили ваши данные и снимки. Наш специалист свяжется с вами в ближайшее время.
        </p>
        <button
          onClick={onClose}
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

      <h3 className="text-xl md:text-2xl font-extrabold text-clay-dark mb-2">Отправить данные на проверку</h3>
      <p className="text-clay-muted text-sm mb-5">
        Заполните форму и прикрепите снимки УЗИ или маммографии (не старше 3 месяцев) и заключение из предыдущей клиники.
      </p>

      {errorMsg && (
        <div className="clay clay-card-soft-peach p-3 mb-5 flex items-start gap-2.5 text-clay-text text-sm">
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
            rows="2"
            disabled={isSubmitting}
            className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all resize-none text-sm"
            placeholder="Опишите кратко вашу ситуацию..."
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-semibold text-clay-dark mb-1.5">
            Прикрепить документы (до 5 файлов) <span className="text-clay-peach">*</span>
          </label>
          
          <div className="clay clay-card-soft-mint border border-dashed border-clay-mint/30 p-3 rounded-xl bg-white/50">
            <input
              type="file"
              id="file-upload"
              multiple
              onChange={handleFileChange}
              disabled={isSubmitting || files.length >= 5}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <label
              htmlFor="file-upload"
              className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg border-2 border-transparent font-semibold text-sm transition-all cursor-pointer ${
                files.length >= 5 || isSubmitting
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
                      className="text-clay-muted hover:text-clay-peach p-0.5"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-xs text-clay-muted mt-2 text-center">
              PDF, JPG, PNG, DOC (до 10 МБ на файл)
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 mt-3">
          <Shield size={16} className="text-clay-mint flex-shrink-0 mt-0.5" />
          <p className="text-xs text-clay-muted leading-tight">
            Нажимая «Отправить», я даю согласие на{' '}
            <a href="/privacy-policy" className="text-clay-mint hover:underline">обработку персональных данных</a>.
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
      </form>
    </div>
  )
}
