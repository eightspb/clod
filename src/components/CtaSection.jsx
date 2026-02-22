import { Phone } from 'lucide-react'
import { PHONE_NUMBER, PHONE_DISPLAY } from '../lib/contacts.js'

export function CtaSection({
  title = 'Записаться на приём',
  subtitle = 'Звоните или оставьте заявку — мы перезвоним и подберём удобное время',
  primaryLabel = 'Записаться онлайн',
  primaryHref = '/second-opinion',
  secondaryLabel = PHONE_DISPLAY,
  secondaryHref = `tel:${PHONE_NUMBER}`,
  cardClass = 'clay-card',
}) {
  return (
    <section className="section">
      <div className="container-clay">
        <div className={`clay ${cardClass} p-6 md:p-8 text-center relative overflow-hidden`}>
          <div className="pointer-events-none absolute top-0 right-0 w-64 h-64 opacity-20 blob-mint" />
          <div className="pointer-events-none absolute bottom-0 left-0 w-48 h-48 opacity-15 blob-peach" />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-extrabold text-clay-dark mb-3">
              {title}
            </h2>
            <p className="text-clay-muted mb-6 max-w-lg mx-auto">
              {subtitle}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href={primaryHref} className="clay btn-clay-primary gap-2">
                <Phone size={16} />
                {primaryLabel}
              </a>
              <a href={secondaryHref} className="clay btn-clay-secondary gap-2">
                {secondaryLabel}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CtaSection
