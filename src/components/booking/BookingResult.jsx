import { AlertCircle, CalendarPlus, CheckCircle2, Clock3, Phone } from 'lucide-react'
import { PHONE_DISPLAY, PHONE_NUMBER } from '../../lib/contacts.js'
import { BookingDialogFooter } from './BookingDialogFooter.jsx'

const MONTHS = Object.freeze(['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'])
const UTF8_ENCODER = new globalThis.TextEncoder()

function price(value) {
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')} ₽`
}

function dateTime(timestamp, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(timestamp))
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${Number(values.day)} ${MONTHS[Number(values.month) - 1]} ${values.year}, ${values.hour}:${values.minute}`
}

function calendarTimestamp(timestamp) {
  return new Date(timestamp).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function calendarText(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/([,;])/g, '\\$1')
}

function foldLine(value) {
  const lines = []
  let current = ''
  let byteLength = 0
  for (const character of value) {
    const characterBytes = UTF8_ENCODER.encode(character).length
    if (byteLength + characterBytes > 75) {
      lines.push(current)
      current = ` ${character}`
      byteLength = 1 + characterBytes
      continue
    }
    current += character
    byteLength += characterBytes
  }
  lines.push(current)
  return lines.join('\r\n')
}

function calendarHref(result) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Клиника Одинцова//Онлайн-запись//RU', 'BEGIN:VEVENT', `UID:${result.claimId}@odintsovclinic.ru`, `DTSTAMP:${calendarTimestamp(result.dtstamp)}`, `DTSTART:${calendarTimestamp(result.startsAt)}`, `DTEND:${calendarTimestamp(result.endsAt)}`, `SUMMARY:${calendarText(`${result.appointmentType.label} — ${result.doctor.name}`)}`, `LOCATION:${calendarText(result.doctor.location)}`, 'END:VEVENT', 'END:VCALENDAR']
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(`${lines.map(foldLine).join('\r\n')}\r\n`)}`
}

function ProtectedResult({ result, isSubmitting, retryAfter, actionsTarget, onAction, onClose }) {
  const retryable = result.status === 'retryable'
  const pending = result.status === 'pending'
  const uncertain = result.status === 'uncertain'
  const title = retryable ? 'Не удалось завершить запись' : pending ? 'Запись обрабатывается' : uncertain ? 'Статус записи не подтверждён' : 'Не удалось подтвердить запись'
  const action = retryable ? 'Повторить отправку' : pending || uncertain ? 'Проверить статус' : ''
  const delayedAction = retryable && retryAfter > 0 ? `Повторить через ${retryAfter} с` : action
  const message = retryable ? 'Повторная отправка защищена тем же номером попытки' : pending ? 'Заявка уже принята в обработку. Проверьте её статус вручную' : uncertain ? 'Не создавайте новую запись. Проверьте текущую попытку или позвоните в клинику' : 'Свяжитесь с клиникой, чтобы выбрать безопасный следующий шаг'
  const Icon = pending ? Clock3 : AlertCircle
  return (
    <section className={`booking-result booking-result-${result.status} text-center`} data-booking-result={result.status} aria-labelledby="booking-result-title">
      <Icon aria-hidden="true" className="mx-auto text-clay-mint" size={48} />
      <h3 id="booking-result-title" className="mt-4 font-serif text-3xl text-clay-dark">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-clay-muted">{message}</p>
      {(uncertain || result.status === 'failed') && <a href={`tel:${PHONE_NUMBER}`} className="booking-phone btn-clay-secondary mt-5 min-h-11"><Phone aria-hidden="true" size={18} />{PHONE_DISPLAY}</a>}
      <BookingDialogFooter target={actionsTarget} className="justify-center">
        {action && <button type="button" disabled={isSubmitting || retryAfter > 0} onClick={onAction} className="booking-result-action btn-clay-primary min-h-11 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? 'Отправляем запрос' : delayedAction}</button>}
        <button type="button" disabled={isSubmitting} onClick={onClose} className="booking-close-result btn-clay-secondary min-h-11 disabled:cursor-not-allowed disabled:opacity-50">Закрыть</button>
      </BookingDialogFooter>
    </section>
  )
}

export function BookingResult({ result, isSubmitting, retryAfter, actionsTarget, onAction, onClose }) {
  if (result.status !== 'confirmed') return <ProtectedResult result={result} isSubmitting={isSubmitting} retryAfter={retryAfter} actionsTarget={actionsTarget} onAction={onAction} onClose={onClose} />
  return (
    <section className="booking-result booking-result-confirmed booking-result-success text-center" data-booking-result="confirmed" aria-labelledby="booking-result-title">
      <CheckCircle2 aria-hidden="true" className="mx-auto text-clay-mint" size={48} />
      <h3 id="booking-result-title" className="mt-4 font-serif text-3xl text-clay-dark">Запись подтверждена</h3>
      <p className="mt-2 text-clay-muted">Сохраните данные приёма</p>
      <dl className="mx-auto mt-6 grid max-w-xl gap-3 rounded-2xl border border-clay-bg p-5 text-left text-sm">
        <div><dt className="text-clay-muted">Врач</dt><dd className="font-semibold text-clay-dark">{result.doctor.name}</dd></div>
        <div><dt className="text-clay-muted">Тип приёма</dt><dd className="font-semibold text-clay-dark">{result.appointmentType.label}</dd></div>
        <div><dt className="text-clay-muted">Клиника</dt><dd className="font-semibold text-clay-dark">{result.doctor.location}</dd></div>
        <div><dt className="text-clay-muted">Дата и время</dt><dd className="font-semibold text-clay-dark">{dateTime(result.startsAt, result.doctor.timeZone)}</dd></div>
        <div><dt className="text-clay-muted">Стоимость</dt><dd className="font-semibold text-clay-mint">{price(result.price)}</dd></div>
        <div><dt className="text-clay-muted">Номер подтверждения</dt><dd className="break-all font-semibold text-clay-dark">{result.claimId}</dd></div>
      </dl>
      <BookingDialogFooter target={actionsTarget} className="justify-center">
        <a href={calendarHref(result)} download="appointment.ics" className="booking-calendar btn-clay-secondary min-h-11"><CalendarPlus aria-hidden="true" size={18} />Добавить в календарь</a>
        <button type="button" onClick={onClose} className="booking-primary-action btn-clay-primary min-h-11">Готово</button>
      </BookingDialogFooter>
    </section>
  )
}
