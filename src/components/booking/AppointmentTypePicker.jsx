function price(value) {
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')} ₽`
}

function age(type) {
  if (type.minAge === 0 && type.maxAge === null) return 'Без возрастных ограничений'
  if (type.maxAge === null) return `С ${type.minAge} лет`
  return `${type.minAge}–${type.maxAge} лет`
}

function activate(event, action) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  action()
}

export function AppointmentTypePicker({ types, selectedKey, onSelect }) {
  return (
    <section className="booking-type-picker" aria-labelledby="booking-type-step-title">
      <h3 id="booking-type-step-title" className="font-serif text-3xl text-clay-dark">Выберите тип приёма</h3>
      <p className="mt-2 text-sm text-clay-muted">Цена и возрастные ограничения получены из актуального расписания</p>
      <div className="booking-type-list mt-6 grid gap-3 sm:grid-cols-2">
        {types.map((type) => {
          const selected = type.key === selectedKey
          const choose = () => onSelect(type)
          return (
            <button
              key={type.key}
              type="button"
              data-booking-type={type.key}
              data-selected={selected ? 'true' : 'false'}
              aria-pressed={selected}
              onClick={choose}
              onKeyDown={(event) => activate(event, choose)}
              className="booking-type-option min-h-11 rounded-2xl border border-clay-bg bg-white p-4 text-left text-clay-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-mint"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{type.label}</span>
                <span className="whitespace-nowrap font-semibold text-clay-mint">{price(type.price)}</span>
              </span>
              <span className="mt-2 block text-sm text-clay-muted">{age(type)}</span>
              {selected && <span className="booking-selected-indicator mt-2 inline-flex items-center gap-1 text-sm font-semibold text-clay-dark"><span aria-hidden="true">✓</span> Выбрано</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
