import { useMemo, useState } from 'react'
import { HeartPulse, MapPin, Stethoscope, Users } from 'lucide-react'
import { DOCTORS } from '../../lib/doctors-data.js'
import { FILTER_TABS, matchesFilter } from '../../lib/filters.js'
import { DoctorCard } from '../DoctorCard.jsx'
import { MobileDoctorCarousel } from '../MobileDoctorCarousel.jsx'
import { CtaSection } from '../CtaSection.jsx'
import { ErrorBoundary } from '../ErrorBoundary.jsx'

const DOCTOR_FILTER_TABS = FILTER_TABS.filter((tab) => tab.id !== 'all')

const DOCTOR_STATS = [
  {
    icon: Users,
    value: DOCTORS.length,
    label: 'врачей в команде',
    className: 'clay-card-soft-mint',
  },
  {
    icon: Stethoscope,
    value: String(DOCTOR_FILTER_TABS.length),
    label: 'основных направления',
    className: 'clay-card-soft-blue',
  },
  {
    icon: MapPin,
    value: 'СПб',
    label: 'Приморский район',
    className: 'clay-card-soft-peach',
  },
]

export function Doctors() {
  const [activeFilter, setActiveFilter] = useState('all')
  const filtered = useMemo(() => DOCTORS.filter((d) => matchesFilter(d, activeFilter)), [activeFilter])
  return (
    <ErrorBoundary>
      <div className="grain-overlay" data-doctors-index-page>
        <section className="doctors-collection-section" aria-labelledby="doctors-collection-heading" data-doctors-collection>
          <div className="container-clay">
            <h1 id="doctors-collection-heading" className="doctors-collection-heading heading-display text-clay-dark" data-doctors-collection-heading>
              Ваши доктора
            </h1>
            <div className="doctors-filter-strip" role="group" aria-label="Фильтр врачей по специальности" data-doctors-filter-group>
              {DOCTOR_FILTER_TABS.map((tab) => {
                const isActive = activeFilter === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(isActive ? 'all' : tab.id)}
                    aria-pressed={isActive}
                    className={`pill-filter ${isActive ? 'active' : ''}`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              Показываем {filtered.length} из {DOCTORS.length} специалистов
            </p>
          </div>
          <MobileDoctorCarousel doctors={filtered} label="Мобильная карусель врачей" />
          <div className="container-clay">
            <div className="doctors-desktop-grid hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-16" data-doctors-desktop-grid>
              {filtered.map((doc) => (
                <DoctorCard key={doc.slug} doctor={doc} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="clay clay-card doctors-empty-state p-8 text-center text-clay-muted">
                Доктора по выбранному направлению не найдены.
              </div>
            )}
          </div>
        </section>
        <section className="doctors-editorial relative overflow-hidden" data-doctors-editorial>
          <div className="absolute inset-0 hero-gradient pointer-events-none" aria-hidden="true" />
          <div className="container-clay relative z-10 py-8 md:py-12 lg:py-14">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-12 items-center">
              <div className="max-w-3xl self-start text-left">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-4 py-2 text-sm font-semibold text-clay-dark shadow-[var(--shadow-xs)]">
                  <HeartPulse size={14} aria-hidden="true" />
                  Команда специалистов
                </div>
                <h2 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
                  Врачи клиники Одинцова
                </h2>
                <p className="text-clay-muted text-lg max-w-2xl leading-relaxed">
                  Онкологи-маммологи, гинекологи, эндокринологи и нутрициологи ведут приём в единой команде. Если случай требует нескольких взглядов, поможем выбрать профильного специалиста и удобное время визита.
                </p>
                <p className="text-sm text-clay-muted mt-4 max-w-2xl">
                  Приём ведём в Санкт-Петербурге, в Приморском районе, рядом с м. Комендантский проспект и м. Старая Деревня.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {DOCTOR_STATS.map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div key={stat.label} className={`clay ${stat.className} p-5`}>
                      <div className="flex items-start gap-4 lg:items-center">
                        <div className="icon-circle-mint h-11 w-11 rounded-2xl">
                          <Icon size={20} className="text-white" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="font-serif text-3xl font-light leading-none text-clay-dark">{stat.value}</p>
                          <p className="mt-1 text-sm font-semibold text-clay-muted">{stat.label}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
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
