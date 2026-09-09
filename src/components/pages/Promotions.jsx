import { ArrowRight, CalendarDays, Check, Percent, Phone, Tag } from 'lucide-react'
import { PHONE_NUMBER, PHONE_DISPLAY } from '../../lib/contacts.js'
import { HEALTH_DAY, LAB_DISCOUNT, PROMOTIONS, formatRoubles } from '../../lib/promotions.js'

const PROMO_STYLES = {
  [LAB_DISCOUNT.id]: { icon: Percent, iconBg: 'icon-circle-mint', card: 'clay-card-soft-mint', badge: 'Вторник и среда' },
  [HEALTH_DAY.id]: { icon: CalendarDays, iconBg: 'icon-circle-peach', card: 'clay-card-soft-peach', badge: 'Каждый понедельник' },
}

export function Promotions() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient pointer-events-none" aria-hidden="true" />
        <div className="container-clay relative z-10 py-8 md:py-10">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-4 py-2 font-semibold text-clay-dark shadow-[var(--shadow-xs)]">
              <Tag size={14} aria-hidden="true" />
              Пациентам
            </div>
            <h1 className="text-4xl sm:text-5xl heading-display text-clay-dark leading-tight mb-5">Акции и специальные предложения</h1>
            <p className="text-lg text-clay-muted leading-relaxed max-w-2xl">
              Действующие предложения клиники: скидка на лабораторные исследования по вторникам и средам и программа «День женского здоровья» по понедельникам. Условия и цены актуальны на момент публикации; уточнить детали можно у администратора.
            </p>
          </div>
        </div>
      </section>
      <section className="section pt-4">
        <div className="container-clay flex flex-col gap-6">
          {PROMOTIONS.map((promo) => {
            const style = PROMO_STYLES[promo.id]
            const Icon = style.icon
            return (
              <article key={promo.id} id={promo.id} className={`clay ${style.card} p-6 md:p-8 scroll-mt-24`}>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div>
                    <div className="mb-4 flex items-center gap-3">
                      <div className={`${style.iconBg} flex-shrink-0`}>
                        <Icon size={20} className="text-white" aria-hidden="true" />
                      </div>
                      <span className="font-semibold text-accent">{style.badge}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">{promo.title}</h2>
                    {promo.price && (
                      <p className="mb-3 text-2xl font-bold text-clay-dark">
                        {formatRoubles(promo.price)}{' '}
                        <span className="font-normal text-clay-muted line-through">{formatRoubles(promo.regularPrice)}</span>
                      </p>
                    )}
                    <p className="text-clay-muted leading-relaxed mb-4">{promo.description}</p>
                    {promo.includes && (
                      <ul className="mb-4 grid gap-2 sm:grid-cols-2">
                        {promo.includes.map((item) => (
                          <li key={item} className="flex items-start gap-2 rounded-[14px] border border-[color:var(--border-color)] bg-[color:var(--surface-card)] p-3 text-clay-dark">
                            <Check size={16} className="mt-1 flex-shrink-0 text-clay-mint" aria-hidden="true" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {promo.doctorSlug && (
                      <p className="text-clay-muted">
                        Приём ведёт{' '}
                        <a href={`/doctors/${promo.doctorSlug}`} className="font-semibold text-clay-dark underline-offset-4 hover:underline">{promo.doctorName}</a>
                      </p>
                    )}
                  </div>
                  <div className="clay clay-card p-5 self-start">
                    <h3 className="font-bold text-clay-dark mb-3">Условия</h3>
                    <ul className="grid gap-2 text-clay-muted">
                      {promo.conditions.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-clay-mint" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex flex-col gap-2">
                      <button type="button" data-booking-btn="true" className="clay btn-clay-primary justify-center gap-2">
                        Записаться
                        <ArrowRight size={16} aria-hidden="true" />
                      </button>
                      <a href={promo.href} className="clay btn-clay-secondary justify-center">{promo.hrefLabel}</a>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
      <section className="section pt-0">
        <div className="container-clay">
          <div className="clay cta-gradient-card p-6 md:p-8 text-center">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Уточнить условия акции</h2>
            <p className="text-clay-muted mb-6 max-w-lg mx-auto">Администратор подскажет, какие исследования доступны в выбранный день и как к ним подготовиться.</p>
            <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-primary inline-flex items-center gap-2">
              <Phone size={16} aria-hidden="true" />
              {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
