import { Award, BookOpen, ExternalLink, Mail, Mic, Phone, Tv } from 'lucide-react'
import { BreadcrumbNav } from '../BreadcrumbNav.jsx'
import { DOCTORS } from '../../lib/doctors-data.js'
import { PHONE_NUMBER, PHONE_DISPLAY, TELEGRAM_URL } from '../../lib/contacts.js'

const ALL_TV_APPEARANCES = DOCTORS
  .flatMap((doctor) =>
    (doctor.tvLinks || []).map((link) => ({
      ...link,
      doctorName: doctor.name,
      doctorSlug: doctor.slug,
      doctorSpecialization: doctor.specialization,
    }))
  )
  .sort((a, b) => Number(b.year) - Number(a.year))

const TOTAL_PUBLICATIONS = DOCTORS.reduce(
  (sum, doctor) => sum + (doctor.publications ? doctor.publications.length : 0),
  0
)

const EARLIEST_TV_YEAR = ALL_TV_APPEARANCES.length
  ? Math.min(...ALL_TV_APPEARANCES.map((a) => Number(a.year)))
  : new Date().getFullYear()

const MEDIA_YEARS = new Date().getFullYear() - EARLIEST_TV_YEAR + 1

const EXPERTISE_STATS = [
  {
    icon: Tv,
    iconBg: 'icon-circle-mint',
    cardClass: 'clay-card-soft-mint',
    value: ALL_TV_APPEARANCES.length,
    label: 'телевизионных выступлений',
  },
  {
    icon: BookOpen,
    iconBg: 'icon-circle-blue',
    cardClass: 'clay-card-soft-blue',
    value: TOTAL_PUBLICATIONS,
    label: 'научных публикаций',
  },
  {
    icon: Award,
    iconBg: 'icon-circle-peach',
    cardClass: 'clay-card-soft-peach',
    value: MEDIA_YEARS,
    label: `${MEDIA_YEARS === 1 ? 'год' : MEDIA_YEARS < 5 ? 'года' : 'лет'} в медиапространстве`,
  },
]

function safeText(value) {
  return String(value).replace(/[\u2014\u2013]/g, '-')
}

function TvCard({ appearance }) {
  const cardContent = (
    <div className="clay clay-card card-interactive h-full p-5 group">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="icon-circle-mint h-10 w-10 rounded-2xl">
          <Tv size={18} className="text-white" aria-hidden="true" />
        </div>
        {appearance.url && (
          <ExternalLink
            size={16}
            className="mt-1 shrink-0 text-clay-muted transition-colors duration-150 group-hover:text-clay-mint"
            aria-hidden="true"
          />
        )}
      </div>
      <h3 className="text-clay-dark font-semibold leading-snug text-sm sm:text-base">
        {safeText(appearance.title)}
      </h3>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-[color:var(--accent-light)] px-3 py-1 text-xs font-semibold text-clay-mint">
          {safeText(appearance.channel)}
        </span>
        <span className="text-xs text-clay-muted">{safeText(appearance.year)}</span>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--border-color)] pt-3">
        <Mic size={13} className="text-clay-muted shrink-0" aria-hidden="true" />
        <a
          href={`/doctors/${appearance.doctorSlug}`}
          className="text-xs font-medium text-clay-muted transition-colors duration-150 hover:text-clay-dark"
          onClick={(e) => e.stopPropagation()}
        >
          {safeText(appearance.doctorName)}
        </a>
      </div>
    </div>
  )
  if (appearance.url) {
    return (
      <a
        href={appearance.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
        aria-label={`${safeText(appearance.title)} - ${safeText(appearance.channel)}, ${safeText(appearance.year)}`}
      >
        {cardContent}
      </a>
    )
  }
  return <div className="h-full">{cardContent}</div>
}

function ExpertiseStatCard({ icon: Icon, iconBg, cardClass, value, label }) {
  return (
    <div className={`clay ${cardClass} p-5`}>
      <div className="flex items-center gap-4 sm:block sm:text-center">
        <div className={`${iconBg} h-11 w-11 rounded-2xl sm:mx-auto sm:mb-3`}>
          <Icon size={20} className="text-white" aria-hidden="true" />
        </div>
        <div>
          <div className="font-serif text-3xl font-light leading-none text-clay-dark">{value}+</div>
          <div className="mt-1 text-sm font-semibold text-clay-muted">{label}</div>
        </div>
      </div>
    </div>
  )
}

export function Media() {
  return (
    <main className="grain-overlay">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient pointer-events-none" aria-hidden="true" />
        <div className="container-clay relative z-10 py-8 md:py-12 lg:py-14">
          <BreadcrumbNav items={[{ label: 'СМИ и телевидение' }]} />
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div className="max-w-3xl self-start text-left">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-4 py-2 text-sm font-semibold text-clay-dark shadow-[var(--shadow-xs)]">
                <Tv size={14} aria-hidden="true" />
                Экспертные комментарии
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
                Врачи клиники в СМИ
              </h1>
              <p className="text-clay-muted text-lg leading-relaxed max-w-2xl">
                Наши специалисты регулярно выступают экспертами на телевидении и в медицинских изданиях. Делятся знаниями о маммологии, женском здоровье и современных методах лечения.
              </p>
            </div>
            <div className="grid gap-3">
              {EXPERTISE_STATS.map((stat) => (
                <ExpertiseStatCard key={stat.label} {...stat} />
              ))}
            </div>
          </div>
        </div>
      </section>
      {ALL_TV_APPEARANCES.length > 0 && (
        <section className="section">
          <div className="container-clay">
            <div className="mb-8 max-w-2xl">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark">
                Телевизионные выступления
              </h2>
              <p className="mt-3 text-clay-muted">
                Подборка эфиров и экспертных комментариев врачей клиники.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ALL_TV_APPEARANCES.map((appearance, index) => (
                <TvCard key={`${appearance.doctorSlug}-${index}`} appearance={appearance} />
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="section">
        <div className="container-clay">
          <div className="clay cta-gradient-card p-6 md:p-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark">
                  Хотите пригласить нашего эксперта для комментария?
                </h2>
                <p className="mt-3 text-clay-muted text-sm sm:text-base max-w-2xl">
                  Главный врач клиники Одинцов В.А. и специалисты клиники открыты для экспертных комментариев, интервью и участия в медицинских программах.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <a
                  href={`tel:${PHONE_NUMBER}`}
                  className="btn-clay-primary inline-flex items-center gap-2 justify-center"
                >
                  <Phone size={16} aria-hidden="true" />
                  {PHONE_DISPLAY}
                </a>
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-clay-secondary inline-flex items-center gap-2 justify-center"
                >
                  <Mail size={16} aria-hidden="true" />
                  Написать в Telegram
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
