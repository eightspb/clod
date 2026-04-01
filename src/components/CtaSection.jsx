import { Phone } from 'lucide-react'
import { PHONE_NUMBER, PHONE_DISPLAY } from '../lib/contacts.js'
import { FadeInSection } from './FadeInSection.jsx'

export function CtaSection({
  title = 'Записаться на приём',
  subtitle = 'Звоните или оставьте заявку - мы перезвоним и подберём удобное время',
  primaryLabel = 'Записаться онлайн',
  primaryHref,
  secondaryLabel = PHONE_DISPLAY,
  secondaryHref = `tel:${PHONE_NUMBER}`,
  cardClass = 'cta-gradient-card',
  doctorPhoto,
  doctorName,
}) {
  const primaryCta = primaryHref ? (
    <a href={primaryHref} className="clay btn-clay-primary gap-2">
      <Phone size={16} />
      {primaryLabel}
    </a>
  ) : (
    <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
      <Phone size={16} />
      {primaryLabel}
    </button>
  )
  return (
    <FadeInSection>
      <section className="section">
        <div className="container-clay">
          <div className={`clay ${cardClass} relative ${doctorPhoto ? 'cta-doctor-card' : 'p-6 md:p-8 text-center overflow-hidden'}`}>
            {doctorPhoto ? (
              <div className="cta-doctor-blobs">
                <div className="pointer-events-none absolute top-0 right-0 w-64 h-64 opacity-20 blob-mint" />
                <div className="pointer-events-none absolute bottom-0 left-0 w-48 h-48 opacity-15 blob-peach" />
              </div>
            ) : (
              <>
                <div className="pointer-events-none absolute top-0 right-0 w-64 h-64 opacity-20 blob-mint" />
                <div className="pointer-events-none absolute bottom-0 left-0 w-48 h-48 opacity-15 blob-peach" />
              </>
            )}
            {doctorPhoto ? (
              <div className="cta-doctor-layout relative">
                <div className="cta-doctor-content">
                  <h2 className="text-3xl md:text-4xl heading-serif text-clay-dark mb-3">
                    {title}
                  </h2>
                  <p className="text-clay-muted mb-6 max-w-lg">
                    {subtitle}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {primaryCta}
                    <a href={secondaryHref} className="clay btn-clay-secondary gap-2">
                      {secondaryLabel}
                    </a>
                  </div>
                </div>
                <div className="cta-doctor-photo-wrap">
                  <img
                    src={doctorPhoto}
                    alt={doctorName || ''}
                    className="cta-doctor-photo"
                    loading="lazy"
                  />
                </div>
              </div>
            ) : (
              <div className="relative">
                <h2 className="text-3xl md:text-4xl heading-serif text-clay-dark mb-3">
                  {title}
                </h2>
                <p className="text-clay-muted mb-6 max-w-lg mx-auto">
                  {subtitle}
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {primaryCta}
                  <a href={secondaryHref} className="clay btn-clay-secondary gap-2">
                    {secondaryLabel}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </FadeInSection>
  )
}
