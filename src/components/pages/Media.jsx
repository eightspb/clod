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
    value: ALL_TV_APPEARANCES.length,
    label: 'телевизионных выступлений',
  },
  {
    icon: BookOpen,
    iconBg: 'icon-circle-blue',
    value: TOTAL_PUBLICATIONS,
    label: 'научных публикаций',
  },
  {
    icon: Award,
    iconBg: 'icon-circle-peach',
    value: MEDIA_YEARS,
    label: `${MEDIA_YEARS === 1 ? 'год' : MEDIA_YEARS < 5 ? 'года' : 'лет'} в медиапространстве`,
  },
]

function TvCard({ appearance }) {
  const cardContent = (
    <div className="clay-card h-full flex flex-col gap-3 p-5 hover:shadow-clay-lg transition-shadow duration-200 group">
      <div className="flex items-start justify-between gap-2">
        <div className="icon-circle-mint shrink-0 flex items-center justify-center w-10 h-10 rounded-full">
          <Tv size={18} className="text-white" aria-hidden="true" />
        </div>
        {appearance.url && (
          <ExternalLink
            size={16}
            className="text-clay-muted group-hover:text-clay-mint transition-colors duration-150 shrink-0 mt-1"
            aria-hidden="true"
          />
        )}
      </div>
      <h3 className="text-clay-dark font-semibold leading-snug text-sm sm:text-base">
        {appearance.title}
      </h3>
      <div className="flex flex-wrap items-center gap-2 mt-auto">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-clay-mint/10 text-clay-mint border border-clay-mint/20">
          {appearance.channel}
        </span>
        <span className="text-xs text-clay-muted">{appearance.year}</span>
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-clay-bg">
        <Mic size={13} className="text-clay-muted shrink-0" aria-hidden="true" />
        <a
          href={`/doctors/${appearance.doctorSlug}`}
          className="text-xs text-clay-muted hover:text-clay-text transition-colors duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {appearance.doctorName}
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
        aria-label={`${appearance.title} — ${appearance.channel}, ${appearance.year}`}
      >
        {cardContent}
      </a>
    )
  }

  return <div className="h-full">{cardContent}</div>
}

function ExpertiseStatCard({ icon: Icon, iconBg, value, label }) {
  return (
    <div className="clay-card flex flex-col items-center text-center gap-3 p-6">
      <div className={`${iconBg} flex items-center justify-center w-12 h-12 rounded-full`}>
        <Icon size={22} className="text-white" aria-hidden="true" />
      </div>
      <div>
        <div className="text-3xl font-bold text-clay-dark">{value}+</div>
        <div className="text-sm text-clay-muted mt-1">{label}</div>
      </div>
    </div>
  )
}

export function Media() {
  return (
    <main>
      <section className="section bg-clay-bg">
        <div className="container-clay">
          <BreadcrumbNav items={[{ label: 'СМИ и телевидение' }]} />
          <div className="max-w-2xl mt-6">
            <h1 className="text-3xl sm:text-4xl heading-serif text-clay-dark leading-tight">
              Врачи клиники в СМИ
            </h1>
            <p className="mt-4 text-clay-muted text-lg leading-relaxed">
              Наши специалисты регулярно выступают экспертами на телевидении и в медицинских
              изданиях — делятся знаниями о маммологии, женском здоровье и современных методах
              лечения
            </p>
          </div>
        </div>
      </section>

      {ALL_TV_APPEARANCES.length > 0 && (
        <section className="section">
          <div className="container-clay">
            <h2 className="text-2xl heading-serif text-clay-dark mb-8">
              Телевизионные выступления
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ALL_TV_APPEARANCES.map((appearance, index) => (
                <TvCard key={`${appearance.doctorSlug}-${index}`} appearance={appearance} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section bg-clay-bg">
        <div className="container-clay">
          <div className="max-w-xl mb-8">
            <h2 className="text-2xl heading-serif text-clay-dark">
              Экспертиза наших врачей
            </h2>
            <p className="mt-3 text-clay-muted">
              Клиника Одинцова — признанный медиаэксперт в маммологии и женском здоровье
              Санкт-Петербурга
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {EXPERTISE_STATS.map((stat) => (
              <ExpertiseStatCard key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-clay">
          <div className="clay-card-mint p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl sm:text-2xl heading-serif text-white">
                Хотите пригласить нашего эксперта для комментария?
              </h2>
              <p className="mt-2 text-white text-sm sm:text-base max-w-lg">
                Главный врач клиники Одинцов В.А. и специалисты клиники открыты для экспертных
                комментариев, интервью и участия в медицинских программах
              </p>
            </div>
            <div className="flex flex-col gap-3 shrink-0">
              <a
                href={`tel:${PHONE_NUMBER}`}
                className="btn-clay-white inline-flex items-center gap-2 justify-center"
              >
                <Phone size={16} aria-hidden="true" />
                {PHONE_DISPLAY}
              </a>
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-clay-white inline-flex items-center gap-2 justify-center"
              >
                <Mail size={16} aria-hidden="true" />
                Написать в Telegram
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
