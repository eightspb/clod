import { useMemo, useState } from 'react'
import { DOCTORS } from '../../lib/doctors-data.js'
import { FILTER_TABS, FILTER_BG, FILTER_BG_FLAT, matchesFilter } from '../../lib/filters.js'
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
              <span className="text-sm font-semibold text-clay-mint">Команда специалистов</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
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
              {FILTER_TABS.map((tab, index) => {
                const isActive = activeFilter === tab.id
                const background = isActive ? FILTER_BG[index] : FILTER_BG_FLAT[index]
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id)}
                    aria-pressed={isActive}
                    className={`inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-mint/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f3ef] ${
                      isActive
                        ? 'text-clay-dark -translate-y-0.5'
                        : 'text-clay-dark hover:-translate-y-0.5'
                    }`}
                    style={{
                      background,
                      borderColor: isActive ? 'rgba(78, 200, 168, 0.28)' : 'rgba(93, 115, 106, 0.12)',
                      boxShadow: isActive
                        ? '0 12px 24px rgba(77, 94, 86, 0.14), inset -3px -3px 8px rgba(255,255,255,0.55), inset 0 3px 6px rgba(255,255,255,0.3)'
                        : '0 8px 18px rgba(77, 94, 86, 0.08), inset -2px -2px 6px rgba(255,255,255,0.45), inset 0 2px 5px rgba(255,255,255,0.22)',
                    }}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-16">
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
          primaryLabel="Проверить, нужна ли операция"
          primaryHref="/second-opinion"
        />
      </div>
    </ErrorBoundary>
  )
}
