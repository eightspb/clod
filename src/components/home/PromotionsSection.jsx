import { ArrowRight, CalendarDays, Percent } from 'lucide-react'
import { FadeInSection } from '../FadeInSection.jsx'
import { HEALTH_DAY, LAB_DISCOUNT, formatRoubles } from '../../lib/promotions.js'

const CARD_CLASSNAME = 'group flex h-full flex-col rounded-[22px] border border-[color:var(--border-color)] bg-[color:var(--surface-card)] p-6 shadow-[var(--shadow-xs)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--border-color-strong)] hover:shadow-[var(--shadow-sm)]'

export function PromotionsSection() {
  return (
    <section id="home-promotions" className="section pt-0">
      <div className="container-clay">
        <div className="max-w-3xl mb-6">
          <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">Скидка 20% на анализы по вторникам и средам</h2>
          <p className="text-clay-muted text-lg leading-relaxed">Два предложения, которыми пациенты пользуются чаще всего. Полные условия — на странице акций.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FadeInSection staggerIndex={0} className="h-full">
            <a href={`/promotions#${LAB_DISCOUNT.id}`} className={`${CARD_CLASSNAME} clay-card-soft-mint`}>
              <div className="icon-circle-mint mb-4">
                <Percent size={20} className="text-white" aria-hidden="true" />
              </div>
              <span className="block text-xl font-semibold text-clay-dark">{LAB_DISCOUNT.title}</span>
              <span className="mt-1 block font-medium text-accent">Вторник и среда</span>
              <span className="mt-3 block flex-1 leading-relaxed text-clay-muted">{LAB_DISCOUNT.short}</span>
              <span className="mt-4 inline-flex items-center gap-1 font-semibold text-clay-dark">
                Условия акции
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </a>
          </FadeInSection>
          <FadeInSection staggerIndex={1} className="h-full">
            <a href={`/promotions#${HEALTH_DAY.id}`} className={`${CARD_CLASSNAME} clay-card-soft-peach`}>
              <div className="icon-circle-peach mb-4">
                <CalendarDays size={20} className="text-white" aria-hidden="true" />
              </div>
              <span className="block text-xl font-semibold text-clay-dark">{HEALTH_DAY.title}</span>
              <span className="mt-1 block font-medium text-accent">Каждый понедельник · {formatRoubles(HEALTH_DAY.price)} вместо {formatRoubles(HEALTH_DAY.regularPrice)}</span>
              <span className="mt-3 block flex-1 leading-relaxed text-clay-muted">{HEALTH_DAY.short}</span>
              <span className="mt-4 inline-flex items-center gap-1 font-semibold text-clay-dark">
                Что входит
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </a>
          </FadeInSection>
        </div>
      </div>
    </section>
  )
}
