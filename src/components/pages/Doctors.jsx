import { useState, useMemo } from 'react'
import { DOCTORS } from '../../lib/doctors-data.js'
import { FILTER_TABS, FILTER_BG, matchesFilter } from '../../lib/filters.js'
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
            <span className="text-sm font-semibold text-clay-mint">Наша команда</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-clay-dark mb-4">
            Доктора клиники Одинцова
          </h1>
          <p className="text-clay-muted text-lg max-w-2xl mx-auto">
            Онкологи-маммологи, гинекологи, эндокринологи и нутрициологи - все владеют УЗИ и работают в единой команде
          </p>
        </div>
      </section>

      {/* ── Фильтры ── */}
      <section className="section pt-6 pb-0">
        <div className="container-clay">
          <div className="flex flex-wrap gap-2 justify-center">
            {FILTER_TABS.map((tab, i) => {
              const isActive = activeFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`pill-filter font-semibold px-6 py-2.5${isActive ? ' active' : ''}`}
                  style={isActive ? undefined : { background: FILTER_BG[i % FILTER_BG.length] }}
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
        title="Не знаете, к кому обратиться?"
        subtitle="Позвоните нам - мы поможем выбрать нужного специалиста и запишем на удобное время"
        primaryLabel="Бесплатное второе мнение"
        primaryHref="/second-opinion"
      />
    </div>
    </ErrorBoundary>
  )
}
