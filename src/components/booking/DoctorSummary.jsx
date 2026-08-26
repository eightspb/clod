import { MapPin } from 'lucide-react'

const MONTHS = Object.freeze(['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'])

function price(value) {
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')} ₽`
}

function dateLabel(timestamp) {
  if (!timestamp) return ''
  const [year, month, day] = timestamp.slice(0, 10).split('-').map(Number)
  return `${day} ${MONTHS[month - 1]} ${year}`
}

function compactLocation(value) {
  return value.replace(/,\s*корп\.\s*1\b/u, 'к1')
}

export function DoctorSummary({ doctor, location, appointmentType, slot }) {
  return (
    <aside className="booking-doctor-summary rounded-3xl border border-clay-bg bg-clay-bg/40 p-5" aria-label="Выбранная запись">
      <div className="flex items-center gap-4">
        <img src={doctor.photo} alt="" width="72" height="72" loading="lazy" className="h-[72px] w-[72px] rounded-full object-cover" />
        <div>
          <p className="booking-summary-name font-serif text-xl text-clay-dark">{doctor.name}</p>
          <p className="booking-summary-specialization mt-1 text-sm text-clay-muted">{doctor.specialization}</p>
        </div>
      </div>
      {location && <p className="booking-summary-location mt-5 flex gap-2 text-sm text-clay-muted"><MapPin aria-hidden="true" className="mt-0.5 shrink-0 text-clay-mint" size={16} />{compactLocation(location)}</p>}
      {appointmentType && <div className="booking-summary-appointment mt-5 border-t border-clay-bg pt-4"><p className="text-xs uppercase tracking-wide text-clay-muted">Тип приёма</p><p className="mt-1 flex justify-between gap-3 font-semibold text-clay-dark"><span className="booking-summary-type">{appointmentType.label}</span><span className="booking-summary-price whitespace-nowrap text-clay-mint">{price(appointmentType.price)}</span></p></div>}
      {slot && <div className="booking-summary-slot mt-4 border-t border-clay-bg pt-4"><p className="text-xs uppercase tracking-wide text-clay-muted">Дата и время</p><p className="mt-1 font-semibold text-clay-dark">{dateLabel(slot.startsAt)}, {slot.time}</p></div>}
    </aside>
  )
}
