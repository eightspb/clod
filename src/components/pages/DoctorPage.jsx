import { GraduationCap, Phone, ArrowLeft, CheckCircle, Star, BookOpen, Tv, ExternalLink } from 'lucide-react'
import { PHONE_NUMBER, PHONE_DISPLAY } from '../../lib/contacts.js'
import { CtaSection } from '../CtaSection.jsx'
import { ErrorBoundary } from '../ErrorBoundary.jsx'
import { StarRating } from '../StarRating.jsx'

export function DoctorPage({ doctor }) {
  if (!doctor) return null

  const alignRight = doctor.photoAlign === 'right'

  return (
    <ErrorBoundary>
    <div>
      {/* ── Hero ── */}
      <section className="section pt-8 pb-10">
        <div className="container-clay">
          <a
            href="/doctors"
            className="inline-flex items-center gap-2 text-clay-muted text-sm font-medium mb-6 hover:text-clay-mint transition-colors"
          >
            <ArrowLeft size={16} />
            Все доктора
          </a>

          <div className="clay clay-card relative" style={{ overflow: 'visible', padding: '0' }}>
            {/* Декоративные блобы — обрезаются радиусом карточки */}
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden">
              <div className={`absolute w-64 h-64 opacity-20 blob-mint ${alignRight ? 'top-0 left-0' : 'top-0 right-0'}`} />
              <div className={`absolute w-48 h-48 opacity-15 blob-peach ${alignRight ? 'bottom-0 right-0' : 'bottom-0 left-0'}`} />
            </div>

            {/* Фото: absolute, выходит сверху за карточку (right +20%, left +10%) */}
            {(doctor.photoFull || doctor.photo) && (
              <div
                className="hidden md:block absolute bottom-0 z-10"
                style={alignRight
                  ? { right: '10%', width: '280px', top: '-20%', height: '120%' }
                  : { left: '-1rem', width: '280px', top: '-10%', height: '110%' }}
              >
                <img
                  src={doctor.photoFull || doctor.photo}
                  alt={`${doctor.specialization ? doctor.specialization.split(',')[0].toLowerCase() + ' ' : ''}${doctor.name}, клиника Одинцова, СПб`}
                  className="h-full w-auto max-w-none object-contain object-bottom doctor-photo-shadow"
                  loading="lazy"
                />
                <div className="clay clay-card-soft-mint px-4 py-2.5 rounded-2xl text-center absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-clay-sm">
                  <p className="text-xs text-clay-muted leading-none mb-0.5">Стаж работы</p>
                  <p className="text-lg font-extrabold text-clay-mint leading-none">{doctor.experienceYears} лет</p>
                </div>
              </div>
            )}

            {/* Mobile: фото сверху */}
            {(doctor.photoFull || doctor.photo) && (
              <div className="md:hidden flex flex-col items-center pt-6 px-5">
                <div className="relative">
                  <img
                    src={doctor.photoFull || doctor.photo}
                    alt={doctor.name}
                    className="w-48 h-auto object-contain doctor-photo-shadow"
                    loading="lazy"
                  />
                  <div className="clay clay-card-soft-mint px-4 py-2.5 rounded-2xl text-center absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-clay-sm">
                    <p className="text-xs text-clay-muted leading-none mb-0.5">Стаж работы</p>
                    <p className="text-lg font-extrabold text-clay-mint leading-none">{doctor.experienceYears} лет</p>
                  </div>
                </div>
              </div>
            )}

            {/* Контент — отступ слева или справа под фото на desktop */}
            <div className="relative p-5 md:p-8 flex flex-col justify-center" style={{ minHeight: '340px', marginLeft: '0' }}>
              <div className={alignRight ? 'md:mr-[300px]' : 'md:ml-[300px]'}>
                <div className="clay clay-card-soft-blue inline-flex px-3 py-1.5 rounded-xl mb-3">
                  <p className="text-xs font-semibold text-clay-dark">{doctor.specialization}</p>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl heading-serif text-clay-dark leading-tight mb-4">
                  {doctor.name}
                </h1>

                {doctor.tagline && (
                  <p className="text-base md:text-lg text-clay-muted leading-relaxed mb-6 max-w-2xl">
                    {doctor.tagline}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
                    <Phone size={16} />
                    Записаться на приём
                  </button>
                  <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-secondary gap-2">
                    {PHONE_DISPLAY}
                  </a>
                </div>

                {doctor.proDoctorovRating && (
                  <div className="mt-4 clay clay-card-soft-mint inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl">
                    <StarRating
                      score={doctor.proDoctorovRating.score}
                      reviewCount={doctor.proDoctorovRating.reviewCount}
                      url={doctor.proDoctorovUrl}
                      size={16}
                      variant="full"
                    />
                    <a
                      href={doctor.proDoctorovUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-clay-mint hover:underline transition-colors"
                    >
                      Читать отзывы на ПроДокторов
                    </a>
                  </div>
                )}
                {!doctor.proDoctorovRating && doctor.proDoctorovUrl && (
                  <div className="mt-4">
                    <a
                      href={doctor.proDoctorovUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-clay-muted hover:text-clay-mint transition-colors"
                    >
                      <ExternalLink size={12} />
                      Профиль на ПроДокторов
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── О докторе ── */}
      {doctor.aboutDoctor && (
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8">
              <h2 className="text-xl heading-serif text-clay-dark mb-4">О докторе</h2>
              <div className="text-clay-muted leading-relaxed space-y-3">
                {doctor.aboutDoctor.split('\n').filter(Boolean).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Слово доктора / Биография ── */}
      {doctor.bio && (
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="clay clay-card p-6 md:p-8">
                  <h2 className="text-xl heading-serif text-clay-dark mb-4">Слово доктора</h2>
                  <div className="text-clay-muted leading-relaxed space-y-3">
                    {doctor.bio.split('\n').filter(Boolean).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Помощь при */}
              {doctor.helpsWith && doctor.helpsWith.length > 0 && (
                <div className="clay clay-card-soft-mint p-6">
                  <h3 className="text-base font-bold text-clay-dark mb-4 flex items-center gap-2">
                    <CheckCircle size={18} className="text-clay-mint flex-shrink-0" />
                    Помогу при
                  </h3>
                  <ul className="space-y-2">
                    {doctor.helpsWith.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-clay-muted leading-snug">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-clay-mint flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Образование ── */}
      {doctor.education && doctor.education.length > 0 && (
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8">
              <h2 className="text-xl heading-serif text-clay-dark mb-6 flex items-center gap-3">
                <div className="icon-circle-blue flex-shrink-0">
                  <GraduationCap size={18} className="text-white" />
                </div>
                Образование и повышение квалификации
              </h2>

              <div className="space-y-4">
                {doctor.education.map((item, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="clay clay-card-soft-blue px-3 py-1.5 rounded-xl text-center flex-shrink-0 min-w-[60px]">
                      <p className="text-xs font-extrabold text-clay-mint leading-none">{item.year}</p>
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm text-clay-dark leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Публикации ── */}
      {doctor.publications && doctor.publications.length > 0 && (
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8">
              <h2 className="text-xl heading-serif text-clay-dark mb-6 flex items-center gap-3">
                <div className="icon-circle-mint flex-shrink-0">
                  <BookOpen size={18} className="text-white" />
                </div>
                Научные публикации и патенты
              </h2>

              <div className="space-y-3">
                {doctor.publications.map((pub, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="clay clay-card-soft-mint px-3 py-1.5 rounded-xl text-center flex-shrink-0 min-w-[52px]">
                      <p className="text-xs font-extrabold text-clay-mint leading-none">{pub.year}</p>
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm text-clay-dark leading-relaxed">{pub.title}</p>
                      {pub.note && (
                        <p className="text-xs text-clay-muted mt-0.5">{pub.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-clay-muted mt-5 pt-4 border-t border-gray-100">
                Всего: 4 патента РФ, 12 рационализаторских предложений, 68 печатных работ
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── TV-выступления ── */}
      {doctor.tvLinks && doctor.tvLinks.length > 0 && (
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8">
              <h2 className="text-xl heading-serif text-clay-dark mb-6 flex items-center gap-3">
                <div className="icon-circle-peach flex-shrink-0">
                  <Tv size={18} className="text-white" />
                </div>
                Выступления в СМИ
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {doctor.tvLinks.map((tv, i) => {
                  const content = (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-clay-muted">{tv.channel}</span>
                        {tv.url && <ExternalLink size={14} className="text-clay-muted flex-shrink-0 group-hover:text-clay-mint transition-colors" />}
                      </div>
                      <p className="text-sm font-semibold text-clay-dark leading-snug mb-2">{tv.title}</p>
                      <span className="text-xs text-clay-muted">{tv.year}</span>
                    </>
                  )
                  return tv.url ? (
                    <a key={i} href={tv.url} target="_blank" rel="noopener noreferrer" className="clay clay-card-soft-peach p-4 rounded-2xl hover:shadow-md transition-shadow group">
                      {content}
                    </a>
                  ) : (
                    <div key={i} className="clay clay-card-soft-peach p-4 rounded-2xl">
                      {content}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Отзывы ── */}
      {doctor.reviews && doctor.reviews.length > 0 && (
        <section className="section">
          <div className="container-clay">
            <h2 className="text-xl heading-serif text-clay-dark mb-6 flex items-center gap-3">
              <div className="icon-circle-peach flex-shrink-0">
                <Star size={18} className="text-white" />
              </div>
              Отзывы пациентов
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {doctor.reviews.map((review, i) => (
                <div key={i} className="clay clay-card p-6 relative overflow-visible">
                  <div className="pointer-events-none absolute top-3 right-8 w-2.5 h-2.5 rounded-full opacity-40 dot-peach-light" />
                  <div className="pointer-events-none absolute top-8 right-4 w-2 h-2 rounded-full opacity-30 dot-blue-light" />

                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, si) => (
                      <Star key={si} size={14} className="text-clay-mint fill-clay-mint" />
                    ))}
                  </div>
                  <p className="text-clay-muted text-sm leading-relaxed mb-4">«{review.text}»</p>
                  {review.author && (
                    <p className="text-xs font-semibold text-clay-dark">{review.author}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaSection
        title={`Записаться к ${doctor.dativeShortName || doctor.name}`}
        subtitle="Звоните или оставьте заявку - мы перезвоним и подберём удобное время"
        primaryLabel="Онлайн-запись"
        doctorPhoto={doctor.photoFull || doctor.photo}
        doctorName={doctor.name}
        photoAlign={doctor.ctaPhotoAlign}
      />
    </div>
    </ErrorBoundary>
  )
}
