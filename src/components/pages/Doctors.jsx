import { useState, useMemo } from 'react'
import { DOCTORS } from '../../lib/doctors-data.js'
import { matchesFilter } from '../../lib/constants.js'
import { DoctorCard } from '../DoctorCard.jsx'
import { CtaSection } from '../CtaSection.jsx'
import { ErrorBoundary } from '../ErrorBoundary.jsx'

const FILTER_TABS = [
  { id: 'all', label: 'Все доктора' },
  { id: 'mammology', label: 'Маммология' },
  { id: 'gynecology', label: 'Гинекология' },
  { id: 'endocrinology', label: 'Эндокринология' },
]

const FILTER_BG = [
  'linear-gradient(145deg,#F0F9F6,#E4F5F0)',
  'linear-gradient(145deg,#FEF4EF,#FDE8DF)',
  'linear-gradient(145deg,#EFF6FD,#E2EFF9)',
  'linear-gradient(145deg,#F4F0FB,#EBE4F7)',
]

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
            Онкологи-маммологи, гинекологи и эндокринологи — все владеют УЗИ и работают в единой команде
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
                  className="inline-flex items-center justify-center rounded-full text-sm font-semibold px-6 py-2.5 cursor-pointer transition-all duration-200 select-none"
                  style={isActive ? {
                    background: 'linear-gradient(145deg, #68D8B8, #44C4A0)',
                    color: '#fff',
                    boxShadow: '8px 8px 20px hsl(155,12%,60%), inset -3px -3px 8px hsla(155,25%,42%,0.6), inset 0px 6px 12px hsla(155,60%,88%,0.5)',
                  } : {
                    background: FILTER_BG[i % FILTER_BG.length],
                    color: '#3D4A44',
                    boxShadow: '6px 6px 16px hsl(0,0%,72%), inset -3px -3px 7px hsla(0,0%,55%,0.18), inset 0px 5px 10px hsla(0,0%,100%,0.7)',
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
        subtitle="Позвоните нам — мы поможем выбрать нужного специалиста и запишем на удобное время"
        primaryLabel="Бесплатное второе мнение"
      />
    </div>
    </ErrorBoundary>
  )
}
