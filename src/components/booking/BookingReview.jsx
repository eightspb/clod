import { BookingDialogFooter } from './BookingDialogFooter.jsx'

export function BookingReview({ patient, comment, isSubmitting, actionsTarget, onBack, onSubmit }) {
  const fullName = [patient.lastName, patient.firstName, patient.secondName].filter(Boolean).join(' ')
  return (
    <section className="booking-review" aria-labelledby="booking-review-step-title">
      <h3 id="booking-review-step-title" className="font-serif text-3xl text-clay-dark">Проверьте запись</h3>
      <p className="mt-2 text-sm text-clay-muted">После подтверждения мы передадим заявку в клинику один раз</p>
      <dl className="mt-6 grid gap-4 rounded-2xl border border-clay-bg p-5 text-sm">
        <div><dt className="text-clay-muted">Пациент</dt><dd className="mt-1 font-semibold text-clay-dark">{fullName}</dd></div>
        <div><dt className="text-clay-muted">Телефон</dt><dd className="mt-1 font-semibold text-clay-dark">{patient.phone}</dd></div>
        <div><dt className="text-clay-muted">Дата рождения</dt><dd className="mt-1 font-semibold text-clay-dark">{patient.birthday}</dd></div>
        {comment && <div><dt className="text-clay-muted">Комментарий</dt><dd className="mt-1 text-clay-dark">{comment}</dd></div>}
      </dl>
      <BookingDialogFooter target={actionsTarget} className="flex-col-reverse sm:flex-row sm:justify-between">
        <button type="button" disabled={isSubmitting} onClick={onBack} className="booking-back btn-clay-secondary min-h-11 disabled:cursor-not-allowed disabled:opacity-50">Назад</button>
        <button type="button" disabled={isSubmitting} onClick={onSubmit} className="booking-submit btn-clay-primary min-h-11 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? 'Подтверждаем запись' : 'Подтвердить запись'}</button>
      </BookingDialogFooter>
    </section>
  )
}
