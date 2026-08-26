import { BookingDialogFooter } from './BookingDialogFooter.jsx'

const MONTHS_SHORT = Object.freeze(['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'])
const MONTHS_FULL = Object.freeze(['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'])
const WEEKDAYS_SHORT = Object.freeze(['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'])
const WEEKDAYS_FULL = Object.freeze(['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'])
const PERIODS = Object.freeze([
  Object.freeze({ key: 'morning', label: 'Утро' }),
  Object.freeze({ key: 'day', label: 'День' }),
  Object.freeze({ key: 'evening', label: 'Вечер' }),
])

function civil(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new TypeError('Booking schedule date must use YYYY-MM-DD')
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

function dateValue(value) {
  const input = civil(value)
  const date = new Date(0)
  date.setUTCFullYear(input.year, input.month - 1, input.day)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

function dateMetadata(value) {
  const date = dateValue(value)
  return { key: value, day: date.getUTCDate(), month: date.getUTCMonth(), weekday: date.getUTCDay() }
}

function countLabel(count) {
  if (count === 1) return '1 свободное время'
  return `${count} свободных времени`
}

function placeLabel(count) {
  if (count === 1) return '1 место'
  if (count > 1 && count < 5) return `${count} места`
  return `${count} мест`
}

function activate(event, action) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  action()
}

export function SchedulePicker({ dates, selectedDate, selectedSlot, actionsTarget, onSelectDate, onSelectSlot, onContinue }) {
  const active = dates.find((date) => date.date === selectedDate)
  return (
    <section className="booking-schedule-picker" aria-labelledby="booking-schedule-step-title">
      <h3 id="booking-schedule-step-title" className="font-serif text-3xl text-clay-dark">Выберите дату и время</h3>
      <div className="booking-date-strip mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="Даты приёма">
        {dates.map((available) => {
          const date = dateMetadata(available.date)
          const count = available.count
          const selected = date.key === selectedDate
          const choose = () => onSelectDate(date.key)
          return (
            <button
              key={date.key}
              type="button"
              data-booking-date={date.key}
              data-selected={selected ? 'true' : 'false'}
              aria-pressed={selected}
              aria-label={`${date.day} ${MONTHS_FULL[date.month]}, ${WEEKDAYS_FULL[date.weekday]}, ${countLabel(count)}`}
              onClick={choose}
              onKeyDown={(event) => activate(event, choose)}
              className="booking-date-option min-h-11 min-w-[76px] rounded-2xl border border-clay-bg bg-white px-3 py-2 text-clay-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-mint"
            >
              <span className="block text-xs uppercase text-clay-muted">{WEEKDAYS_SHORT[date.weekday]}</span>
              <span className="block font-semibold">{date.day} {MONTHS_SHORT[date.month]}</span>
              <span className="mt-1 block text-xs text-clay-mint">{placeLabel(count)}</span>
              {selected && <span aria-hidden="true" className="booking-selected-indicator mt-1 block text-xs font-bold text-clay-dark">✓</span>}
            </button>
          )
        })}
      </div>
      <div className="booking-time-groups mt-6 grid gap-5">
        {PERIODS.map((period) => {
          const slots = active?.slots.filter((slot) => slot.period === period.key) ?? []
          if (slots.length === 0) return null
          return (
            <section key={period.key} className={`booking-time-group booking-time-group-${period.key}`}>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-clay-muted">{period.label}</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {slots.map((slot) => {
                  const selected = slot.startsAt === selectedSlot?.startsAt && slot.endsAt === selectedSlot?.endsAt
                  const choose = () => onSelectSlot(slot)
                  return <button key={`${slot.startsAt}-${slot.endsAt}`} type="button" data-booking-time={slot.startsAt} data-selected={selected ? 'true' : 'false'} aria-pressed={selected} onClick={choose} onKeyDown={(event) => activate(event, choose)} className="booking-time-option min-h-11 min-w-11 rounded-xl border border-clay-bg bg-white px-4 font-semibold text-clay-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-mint">{slot.time}{selected && <span aria-hidden="true" className="booking-selected-indicator ml-2">✓</span>}</button>
                })}
              </div>
            </section>
          )
        })}
      </div>
      <BookingDialogFooter target={actionsTarget}>
        <button type="button" disabled={!selectedSlot} onClick={onContinue} className="booking-primary-action btn-clay-primary min-h-11 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50">Продолжить</button>
      </BookingDialogFooter>
    </section>
  )
}
