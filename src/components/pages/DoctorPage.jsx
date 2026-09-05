import { GraduationCap, Phone, ArrowLeft, CheckCircle, Star, BookOpen, Tv, ExternalLink, Award } from 'lucide-react'
import { PHONE_NUMBER, PHONE_DISPLAY } from '../../lib/contacts.js'
import { CtaSection } from '../CtaSection.jsx'
import { ErrorBoundary } from '../ErrorBoundary.jsx'
import { StarRating } from '../StarRating.jsx'

function safeText(value) {
  return String(value).replace(/[\u2014\u2013]/g, '-')
}

function paragraphs(value) {
  return safeText(value).split('\n').filter(Boolean)
}

function ReviewsStat({ doctor }) {
  const title = <p className="text-xs font-semibold text-clay-muted">Отзывы</p>
  if (doctor.proDoctorovRating) {
    return (
      <div className="clay clay-card-soft-peach p-4">
        {title}
        <div className="mt-1 text-sm font-bold leading-snug text-clay-dark">
          <StarRating score={doctor.proDoctorovRating.score} reviewCount={doctor.proDoctorovRating.reviewCount} url={doctor.proDoctorovUrl} size={14} variant="compact" />
        </div>
      </div>
    )
  }
  if (doctor.proDoctorovUrl) {
    return (
      <div className="clay clay-card-soft-peach p-4">
        {title}
        <a href={doctor.proDoctorovUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold leading-snug text-clay-dark transition-colors hover:text-clay-mint">
          ПроДокторов
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      </div>
    )
  }
  return (
    <div className="clay clay-card-soft-peach p-4">
      {title}
      <p className="mt-1 text-sm font-bold leading-snug text-clay-dark">Профиль врача</p>
    </div>
  )
}

export function DoctorPage({ doctor }) {
  if (!doctor) return null
  const alignRight = doctor.photoAlign === 'right'
  const heroGridColumns = alignRight ? 'lg:grid-cols-[minmax(0,52%)_minmax(360px,48%)]' : 'lg:grid-cols-[minmax(360px,48%)_minmax(0,52%)]'
  const doctorPhoto = doctor.photoFull || doctor.photo
  const doctorAltPrefix = doctor.specialization ? `${safeText(doctor.specialization).split(',')[0].toLowerCase()} ` : ''
  const doctorAlt = `${doctorAltPrefix}${safeText(doctor.name)}, клиника Одинцова, СПб`
  return (
    <ErrorBoundary>
    <div className="grain-overlay">
      <section className="relative overflow-hidden pt-4 pb-10">
        <div className="absolute inset-0 hero-gradient pointer-events-none" aria-hidden="true" />
        <div className="container-clay relative z-10">
          <a
            href="/doctors"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-clay-muted transition-colors hover:text-clay-mint"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Все доктора
          </a>
          <div className="clay clay-card-lg overflow-hidden">
            <div className={`grid grid-cols-1 gap-0 ${heroGridColumns}`}>
              <div className={`relative order-2 p-5 sm:p-8 ${alignRight ? 'lg:order-1' : 'lg:order-2'}`}>
                <div className="mb-4 inline-flex max-w-full rounded-full border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-4 py-2 shadow-[var(--shadow-xs)]">
                  <p className="truncate text-sm font-semibold text-clay-dark">{safeText(doctor.specialization)}</p>
                </div>
                <h1 className="text-3xl sm:text-4xl heading-display text-clay-dark leading-tight mb-3">
                  {safeText(doctor.name)}
                </h1>
                {doctor.tagline && (
                  <p className="text-base text-clay-muted leading-relaxed mb-4 max-w-2xl">
                    {safeText(doctor.tagline)}
                  </p>
                )}
                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="clay clay-card-soft-mint p-4">
                    <p className="text-xs font-semibold text-clay-muted">Стаж работы</p>
                    <p className="mt-1 font-serif text-3xl font-light leading-none text-clay-dark">{doctor.experienceYears} лет</p>
                  </div>
                  <div className="clay clay-card-soft-blue p-4">
                    <p className="text-xs font-semibold text-clay-muted">Направление</p>
                    <p className="mt-1 text-sm font-bold leading-snug text-clay-dark">{safeText(doctor.specialization.split(',')[0])}</p>
                  </div>
                  <ReviewsStat doctor={doctor} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" data-booking-btn="true" data-booking-doctor={doctor.slug} className="clay btn-clay-primary gap-2">
                    <Phone size={16} aria-hidden="true" />
                    Записаться на приём
                  </button>
                  <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-secondary gap-2">
                    {PHONE_DISPLAY}
                  </a>
                </div>
              </div>
              {doctorPhoto && (
                <div className={`relative order-1 flex min-h-[300px] items-end justify-center overflow-hidden bg-[color:var(--surface-accent)] px-6 pt-8 lg:min-h-0 ${alignRight ? 'lg:order-2' : 'lg:order-1'}`}>
                  <div className="absolute left-6 top-6 rounded-[18px] bg-white/80 px-4 py-2 shadow-[var(--shadow-xs)]">
                    <div className="flex items-center gap-2 text-sm font-bold text-clay-dark">
                      <Award size={16} className="text-clay-mint" aria-hidden="true" />
                      {doctor.experienceYears} лет
                    </div>
                  </div>
                  <img
                    src={doctorPhoto}
                    alt={doctorAlt}
                    className="max-h-[420px] w-auto object-contain object-bottom doctor-photo-shadow lg:absolute lg:inset-x-6 lg:top-8 lg:h-[calc(100%-2rem)] lg:max-h-none lg:w-[calc(100%-3rem)]"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      {doctor.aboutDoctor && (
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8">
              <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:gap-8">
                <h2 className="text-2xl heading-serif text-clay-dark">О докторе</h2>
                <div className="space-y-3 text-clay-muted leading-relaxed">
                  {paragraphs(doctor.aboutDoctor).map((para) => (
                    <p key={para}>{para}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      {doctor.bio && (
        <section className="section bg-[color:var(--surface-accent)] border-y border-[color:var(--border-color)]">
          <div className="container-clay">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="clay clay-card p-6 md:p-8">
                <h2 className="text-2xl heading-serif text-clay-dark mb-4">Слово доктора</h2>
                <div className="space-y-3 text-clay-muted leading-relaxed">
                  {paragraphs(doctor.bio).map((para) => (
                    <p key={para}>{para}</p>
                  ))}
                </div>
              </div>
              {doctor.helpsWith && doctor.helpsWith.length > 0 && (
                <div className="clay clay-card-soft-mint p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-clay-dark">
                    <CheckCircle size={18} className="text-clay-mint flex-shrink-0" aria-hidden="true" />
                    Помогу при
                  </h3>
                  <ul className="space-y-3">
                    {doctor.helpsWith.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm leading-snug text-clay-muted">
                        <CheckCircle size={15} className="mt-0.5 flex-shrink-0 text-clay-mint" aria-hidden="true" />
                        <span>{safeText(item)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      {doctor.education && doctor.education.length > 0 && (
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8">
              <h2 className="mb-6 flex items-center gap-3 text-2xl heading-serif text-clay-dark">
                <div className="icon-circle-blue flex-shrink-0">
                  <GraduationCap size={18} className="text-white" aria-hidden="true" />
                </div>
                Образование и повышение квалификации
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {doctor.education.map((item) => (
                  <div key={`${item.year}-${item.description}`} className="rounded-[18px] border border-[color:var(--border-color)] bg-[color:var(--surface-card)] p-4">
                    <p className="mb-2 inline-flex rounded-full bg-[color:var(--accent-light)] px-3 py-1 text-xs font-extrabold text-clay-mint">{safeText(item.year)}</p>
                    <p className="text-sm leading-relaxed text-clay-dark">{safeText(item.description)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
      {doctor.publications && doctor.publications.length > 0 && (
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8">
              <h2 className="mb-6 flex items-center gap-3 text-2xl heading-serif text-clay-dark">
                <div className="icon-circle-mint flex-shrink-0">
                  <BookOpen size={18} className="text-white" aria-hidden="true" />
                </div>
                Научные публикации и патенты
              </h2>
              <div className="grid gap-3">
                {doctor.publications.map((pub) => (
                  <div key={`${pub.year}-${pub.title}`} className="rounded-[18px] border border-[color:var(--border-color)] bg-[color:var(--surface-card-hover)] p-4">
                    <p className="mb-2 inline-flex rounded-full bg-[color:var(--accent-light)] px-3 py-1 text-xs font-extrabold text-clay-mint">{safeText(pub.year)}</p>
                    <p className="text-sm leading-relaxed text-clay-dark">{safeText(pub.title)}</p>
                    {pub.note && (
                      <p className="mt-1 text-xs text-clay-muted">{safeText(pub.note)}</p>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-5 border-t border-[color:var(--border-color)] pt-4 text-xs text-clay-muted">
                Всего: 4 патента РФ, 12 рационализаторских предложений, 68 печатных работ
              </p>
            </div>
          </div>
        </section>
      )}
      {doctor.tvLinks && doctor.tvLinks.length > 0 && (
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8">
              <h2 className="mb-6 flex items-center gap-3 text-2xl heading-serif text-clay-dark">
                <div className="icon-circle-peach flex-shrink-0">
                  <Tv size={18} className="text-white" aria-hidden="true" />
                </div>
                Выступления в СМИ
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {doctor.tvLinks.map((tv) => {
                  const content = (
                    <>
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-clay-muted">{safeText(tv.channel)}</span>
                        {tv.url && <ExternalLink size={14} className="flex-shrink-0 text-clay-muted transition-colors group-hover:text-clay-mint" aria-hidden="true" />}
                      </div>
                      <p className="mb-3 text-sm font-semibold leading-snug text-clay-dark">{safeText(tv.title)}</p>
                      <span className="text-xs text-clay-muted">{safeText(tv.year)}</span>
                    </>
                  )
                  return tv.url ? (
                    <a key={`${tv.channel}-${tv.title}`} href={tv.url} target="_blank" rel="noopener noreferrer" className="clay clay-card-soft-peach group block rounded-[18px] p-4 transition-shadow hover:shadow-[var(--shadow-md)]">
                      {content}
                    </a>
                  ) : (
                    <div key={`${tv.channel}-${tv.title}`} className="clay clay-card-soft-peach rounded-[18px] p-4">
                      {content}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      )}
      {doctor.reviews && doctor.reviews.length > 0 && (
        <section className="section">
          <div className="container-clay">
            <h2 className="mb-6 flex items-center gap-3 text-2xl heading-serif text-clay-dark">
              <div className="icon-circle-peach flex-shrink-0">
                <Star size={18} className="text-white" aria-hidden="true" />
              </div>
              Отзывы пациентов
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {doctor.reviews.map((review) => (
                <div key={`${review.author || 'review'}-${review.text}`} className="clay clay-card p-6">
                  <div className="mb-3 flex gap-1">
                    {[...Array(5)].map((_, si) => (
                      <Star key={si} size={14} className="fill-clay-mint text-clay-mint" aria-hidden="true" />
                    ))}
                  </div>
                  <p className="mb-4 text-sm leading-relaxed text-clay-muted">«{safeText(review.text)}»</p>
                  {review.author && (
                    <p className="text-xs font-semibold text-clay-dark">{safeText(review.author)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      <CtaSection
        title={`Записаться к ${safeText(doctor.dativeShortName || doctor.name)}`}
        subtitle="Звоните или оставьте заявку - мы перезвоним и подберём удобное время"
        primaryLabel="Онлайн-запись"
        doctorPhoto={doctorPhoto}
        doctorName={safeText(doctor.name)}
        doctorSlug={doctor.slug}
        photoAlign={doctor.ctaPhotoAlign}
      />
    </div>
    </ErrorBoundary>
  )
}
