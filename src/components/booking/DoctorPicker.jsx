import { Search } from 'lucide-react'

function searchValue(value) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('ru-RU').trim()
}

export function DoctorPicker({ doctors, query, onQueryChange, onSelect }) {
  const needle = searchValue(query)
  const filtered = doctors.filter((doctor) => searchValue(`${doctor.name} ${doctor.specialization}`).includes(needle))
  return (
    <section className="booking-doctor-picker" aria-labelledby="booking-doctor-step-title">
      <h3 id="booking-doctor-step-title" className="font-serif text-3xl text-clay-dark">Выберите врача</h3>
      <label className="booking-doctor-search mt-5 flex min-h-11 items-center gap-3 rounded-2xl border border-clay-bg bg-white px-4 focus-within:border-clay-mint">
        <Search aria-hidden="true" className="shrink-0 text-clay-muted" size={18} />
        <span className="sr-only">Поиск врача</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="min-h-11 w-full bg-transparent text-clay-dark outline-none placeholder:text-clay-muted"
          placeholder="Имя или специальность"
          aria-label="Поиск врача"
        />
      </label>
      <div className="booking-doctor-list mt-5 grid gap-3">
        {filtered.map((doctor) => (
          <button
            key={doctor.slug}
            type="button"
            onClick={() => onSelect(doctor)}
            className="booking-doctor-option flex min-h-11 w-full items-center gap-4 rounded-2xl border border-clay-bg bg-white p-3 text-left text-clay-dark hover:border-clay-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-mint"
          >
            <img src={doctor.photo} alt="" width="56" height="56" loading="lazy" className="h-14 w-14 rounded-full object-cover" />
            <span className="grid gap-1">
              <span className="font-semibold">{doctor.name}</span>
              <span className="text-sm text-clay-muted">{doctor.specialization}</span>
            </span>
          </button>
        ))}
      </div>
      {filtered.length === 0 && <p className="mt-6 text-sm text-clay-muted">Врачей по этому запросу не найдено</p>}
    </section>
  )
}
