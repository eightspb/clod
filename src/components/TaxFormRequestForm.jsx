import { useState } from 'react'
import { AlertCircle, CheckCircle, FileText, Shield } from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeDigits(value) {
  return normalizeText(value).replace(/\D+/g, '')
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isValidPhone(value) {
  const digits = normalizeDigits(value)
  return digits.length >= 10 && digits.length <= 15
}

function isValidInn(value) {
  return /^\d{12}$/.test(normalizeDigits(value))
}

function isValidTaxYear(value) {
  if (!/^\d{4}$/.test(value)) {
    return false
  }

  const numericYear = Number.parseInt(value, 10)
  return numericYear >= 2000 && numericYear <= CURRENT_YEAR
}

function validateForm(formData) {
  const fields = {
    patientFullName: normalizeText(formData.get('patientFullName')),
    patientBirthDate: normalizeText(formData.get('patientBirthDate')),
    taxpayerFullName: normalizeText(formData.get('taxpayerFullName')),
    taxpayerBirthDate: normalizeText(formData.get('taxpayerBirthDate')),
    taxpayerInn: normalizeText(formData.get('taxpayerInn')),
    taxYear: normalizeText(formData.get('taxYear')),
    email: normalizeText(formData.get('email')),
    phone: normalizeText(formData.get('phone')),
  }

  if (!fields.patientFullName) {
    return 'Укажите ФИО пациента.'
  }

  if (!fields.patientBirthDate) {
    return 'Укажите дату рождения пациента.'
  }

  if (!fields.taxpayerFullName) {
    return 'Укажите ФИО налогоплательщика.'
  }

  if (!fields.taxpayerBirthDate) {
    return 'Укажите дату рождения налогоплательщика.'
  }

  if (!fields.taxpayerInn) {
    return 'Укажите ИНН налогоплательщика.'
  }

  if (!isValidInn(fields.taxpayerInn)) {
    return 'ИНН налогоплательщика должен содержать 12 цифр.'
  }

  if (!fields.taxYear) {
    return 'Укажите год, за который нужна справка.'
  }

  if (!isValidTaxYear(fields.taxYear)) {
    return 'Укажите корректный год, за который нужна справка.'
  }

  if (!fields.email) {
    return 'Укажите email.'
  }

  if (!isValidEmail(fields.email)) {
    return 'Укажите корректный email.'
  }

  if (!fields.phone) {
    return 'Заполните телефон.'
  }

  if (!isValidPhone(fields.phone)) {
    return 'Укажите корректный номер телефона.'
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
  } catch { /* malformed payload — fall through to generic message */ }

  return 'Не удалось отправить заявку. Пожалуйста, попробуйте еще раз.'
}

export function TaxFormRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [formKey, setFormKey] = useState(0)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMsg('')

    const formData = new FormData(event.currentTarget)
    const validationMessage = validateForm(formData)

    if (validationMessage) {
      setErrorMsg(validationMessage)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/tax-form', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(await getErrorMessage(response))
      }

      setIsSuccess(true)
    } catch (error) {
      setErrorMsg(error.message || 'Произошла ошибка')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="clay clay-card-mint p-6 md:p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
            <CheckCircle className="text-clay-mint" size={24} />
          </div>
        </div>
        <h2 className="font-extrabold text-clay-dark text-2xl mb-2">
          Заявка на справку успешно отправлена!
        </h2>
        <p className="text-clay-text text-sm leading-relaxed mb-6">
          Мы получили ваши данные. Сотрудник клиники проверит заявку и свяжется с вами по указанным контактам, если потребуется уточнение.
        </p>
        <button
          type="button"
          onClick={() => {
            setFormKey((current) => current + 1)
            setIsSuccess(false)
            setErrorMsg('')
          }}
          className="clay btn-clay-white justify-center w-full py-3"
        >
          Отправить еще одну заявку
        </button>
      </div>
    )
  }

  return (
    <div className="clay clay-card p-5 md:p-7">
      <div className="flex items-start gap-3 mb-5">
        <div className="icon-circle-mint shrink-0">
          <FileText size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-clay-dark mb-1">
            Форма запроса справки для налогового вычета
          </h2>
          <p className="text-clay-muted text-sm leading-relaxed">
            Заполните данные пациента и налогоплательщика. Заявка уйдет сотрудникам клиники, после чего мы подготовим справку для налоговой инспекции.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="clay clay-card-soft-peach p-3 mb-5 flex items-start gap-2.5 text-clay-text text-sm"
        >
          <AlertCircle size={18} className="text-clay-peach flex-shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label
              htmlFor="patientFullName"
              className="block text-sm font-semibold text-clay-dark mb-1"
            >
              ФИО пациента <span className="text-clay-peach">*</span>
            </label>
            <input
              type="text"
              id="patientFullName"
              name="patientFullName"
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all text-sm"
              placeholder="Иванова Мария Сергеевна"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="patientBirthDate"
              className="block text-sm font-semibold text-clay-dark mb-1"
            >
              Дата рождения пациента <span className="text-clay-peach">*</span>
            </label>
            <input
              type="date"
              id="patientBirthDate"
              name="patientBirthDate"
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all text-sm"
            />
          </div>
          <div>
            <label htmlFor="taxYear" className="block text-sm font-semibold text-clay-dark mb-1">
              За какой год <span className="text-clay-peach">*</span>
            </label>
            <input
              type="number"
              id="taxYear"
              name="taxYear"
              required
              min="2000"
              max={CURRENT_YEAR}
              defaultValue={String(CURRENT_YEAR)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label
              htmlFor="taxpayerFullName"
              className="block text-sm font-semibold text-clay-dark mb-1"
            >
              ФИО налогоплательщика <span className="text-clay-peach">*</span>
            </label>
            <input
              type="text"
              id="taxpayerFullName"
              name="taxpayerFullName"
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all text-sm"
              placeholder="Иванов Сергей Петрович"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="taxpayerBirthDate"
              className="block text-sm font-semibold text-clay-dark mb-1"
            >
              Дата рождения налогоплательщика <span className="text-clay-peach">*</span>
            </label>
            <input
              type="date"
              id="taxpayerBirthDate"
              name="taxpayerBirthDate"
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="taxpayerInn"
              className="block text-sm font-semibold text-clay-dark mb-1"
            >
              ИНН налогоплательщика <span className="text-clay-peach">*</span>
            </label>
            <input
              type="text"
              id="taxpayerInn"
              name="taxpayerInn"
              required
              inputMode="numeric"
              maxLength={12}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all text-sm"
              placeholder="123456789012"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-clay-dark mb-1">
              Email <span className="text-clay-peach">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all text-sm"
              placeholder="example@mail.ru"
            />
          </div>
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
        </div>

        <div>
          <label htmlFor="comment" className="block text-sm font-semibold text-clay-dark mb-1">
            Комментарий
          </label>
          <textarea
            id="comment"
            name="comment"
            rows="3"
            disabled={isSubmitting}
            className="w-full px-3.5 py-2 rounded-xl border border-clay-border bg-clay-bg focus:bg-white focus:outline-none focus:ring-2 focus:ring-clay-mint/30 focus:border-clay-mint transition-all resize-none text-sm"
            placeholder="Если справка нужна срочно или есть уточнения по договору, укажите это здесь."
          />
        </div>

        <div className="flex items-start gap-2 mt-3">
          <Shield size={16} className="text-clay-mint flex-shrink-0 mt-0.5" />
          <p className="text-xs text-clay-muted leading-tight">
            Нажимая «Отправить заявку», я подтверждаю согласие на{' '}
            <a href="/privacy-policy" className="text-clay-mint hover:underline">
              обработку персональных данных
            </a>{' '}
            и передачу сведений, необходимых для подготовки справки.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
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
