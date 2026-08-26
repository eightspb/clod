import { BookingDialogFooter } from './BookingDialogFooter.jsx'

const PATIENT_FIELDS = Object.freeze([
  Object.freeze({ key: 'lastName', id: 'booking-patient-last-name', label: 'Фамилия', autoComplete: 'family-name', type: 'text' }),
  Object.freeze({ key: 'firstName', id: 'booking-patient-first-name', label: 'Имя', autoComplete: 'given-name', type: 'text' }),
  Object.freeze({ key: 'secondName', id: 'booking-patient-second-name', label: 'Отчество', autoComplete: 'additional-name', type: 'text' }),
  Object.freeze({ key: 'phone', id: 'booking-patient-phone', label: 'Телефон', autoComplete: 'tel', type: 'tel' }),
  Object.freeze({ key: 'birthday', id: 'booking-patient-birthday', label: 'Дата рождения', autoComplete: 'bday', type: 'date' }),
])

export function PatientDetailsForm({ patient, comment, consent, errors, actionsTarget, onPatientChange, onCommentChange, onConsentChange, onBack, onContinue }) {
  return (
    <section className="booking-patient-form" aria-labelledby="booking-patient-step-title">
      <h3 id="booking-patient-step-title" className="font-serif text-3xl text-clay-dark">Данные пациента</h3>
      <p className="mt-2 text-sm text-clay-muted">Укажите данные человека, который придёт на приём</p>
      <form id="booking-patient-form" className="mt-6 grid gap-4" noValidate onSubmit={(event) => { event.preventDefault(); onContinue() }}>
        <div className="grid gap-4 sm:grid-cols-2">
          {PATIENT_FIELDS.map((field) => {
            const error = errors[field.key]
            const errorId = `${field.id}-error`
            return (
              <div key={field.key} className="booking-field grid gap-1.5 text-sm font-medium text-clay-dark">
                <label htmlFor={field.id}>{field.label}</label>
                <input id={field.id} type={field.type} autoComplete={field.autoComplete} value={patient[field.key]} onChange={(event) => onPatientChange(field.key, event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className="booking-input min-h-11 rounded-xl border border-clay-bg bg-white px-3 text-base text-clay-dark outline-none focus:border-clay-mint focus:ring-2 focus:ring-clay-mint/20" />
                {error && <span id={errorId} className="booking-field-error text-xs font-medium text-clay-dark">{error}</span>}
              </div>
            )
          })}
        </div>
        <label htmlFor="booking-patient-comment" className="booking-field grid gap-1.5 text-sm font-medium text-clay-dark">
          Комментарий
          <textarea id="booking-patient-comment" value={comment} onChange={(event) => onCommentChange(event.target.value)} aria-invalid={Boolean(errors.comment)} aria-describedby={errors.comment ? 'booking-patient-comment-error' : undefined} maxLength="300" rows="3" className="booking-input min-h-24 resize-y rounded-xl border border-clay-bg bg-white px-3 py-2 text-base text-clay-dark outline-none focus:border-clay-mint focus:ring-2 focus:ring-clay-mint/20" />
          {errors.comment && <span id="booking-patient-comment-error" className="booking-field-error text-xs font-medium text-clay-dark">{errors.comment}</span>}
        </label>
        <label htmlFor="booking-patient-consent" className="booking-consent flex min-h-11 items-start gap-3 rounded-xl border border-clay-bg p-3 text-sm text-clay-dark">
          <input id="booking-patient-consent" type="checkbox" checked={consent} onChange={(event) => onConsentChange(event.target.checked)} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? 'booking-patient-consent-error' : undefined} className="mt-1 h-5 w-5 shrink-0 accent-clay-mint" />
          <span>Согласие на обработку персональных данных в соответствии с <a href="/privacy-policy" className="text-clay-mint underline">политикой конфиденциальности</a>{errors.consent && <span id="booking-patient-consent-error" className="booking-field-error mt-1 block text-xs font-medium text-clay-dark">{errors.consent}</span>}</span>
        </label>
      </form>
      <BookingDialogFooter target={actionsTarget} className="flex-col-reverse sm:flex-row sm:justify-between">
        <button type="button" onClick={onBack} className="booking-back btn-clay-secondary min-h-11">Назад</button>
        <button type="submit" form="booking-patient-form" className="booking-primary-action btn-clay-primary min-h-11">Проверить запись</button>
      </BookingDialogFooter>
    </section>
  )
}
