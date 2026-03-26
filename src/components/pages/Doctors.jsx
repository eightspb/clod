import { useMemo, useState } from 'react'
import { DOCTORS } from '../../lib/doctors-data.js'
import { FILTER_TABS, matchesFilter } from '../../lib/filters.js'
import { DoctorCard } from '../DoctorCard.jsx'
import { CtaSection } from '../CtaSection.jsx'
import { ErrorBoundary } from '../ErrorBoundary.jsx'

export function Doctors() {
  const [activeFilter, setActiveFilter] = useState('all')

  const filtered = useMemo(() => DOCTORS.filter((d) => matchesFilter(d, activeFilter)), [activeFilter])

  return (
    <ErrorBoundary>
      <div>
        {/* ── Заголовок ── */}
        <section className="section pb-0">
          <div className="container-clay text-center">
            <div className="clay clay-card-soft-mint inline-flex px-4 py-2 rounded-2xl mb-4">
              <span className="text-sm font-semibold text-clay-mint">Команда врачей</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-clay-dark mb-4">
              Врачи клиники Одинцова
            </h1>
            <p className="text-clay-muted text-lg max-w-2xl mx-auto leading-relaxed">
              Онкологи-маммологи, гинекологи, эндокринологи и нутрициологи ведут приём в единой команде. Если случай требует нескольких взглядов, поможем выбрать профильного специалиста и удобное время визита.
            </p>
            <p className="text-sm text-clay-muted mt-3">
              Приём ведём в Санкт-Петербурге, в Приморском районе, рядом с м. Комендантский проспект и м. Старая Деревня.
            </p>
          </div>
        </section>

        {/* ── Фильтры ── */}
        <section className="section pt-6 pb-0">
          <div className="container-clay">
            <div className="flex flex-wrap gap-2 justify-center">
              {FILTER_TABS.map((tab) => {
                const isActive = activeFilter === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id)}
                    aria-pressed={isActive}
                    className={`inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-mint/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f3ef] ${
                      isActive
                        ? 'bg-clay-dark text-white border-clay-dark shadow-sm'
                        : 'bg-white/85 text-clay-dark border-clay-mint/15 hover:bg-clay-mint-pale hover:border-clay-mint/30'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Карточки ── */}
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((doc) => (
                <DoctorCard key={doc.slug} doctor={doc} />
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-clay-muted">
                Доктора по выбранному направлению не найдены
              </div>
            )}
          </div>
        </section>

        <CtaSection
          title="Нужна помощь с выбором врача?"
          subtitle="Если случай требует второго взгляда, подскажем, к кому лучше записаться, и поможем с маршрутом обращения."
          primaryLabel="Получить второе мнение"
          primaryHref="/second-opinion"
        />
      </div>
    </ErrorBoundary>
  )
}
