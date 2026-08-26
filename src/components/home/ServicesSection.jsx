import { ChevronRight } from 'lucide-react'
import { FadeInSection } from '../FadeInSection.jsx'
import { HOME_DIRECTIONS, HOME_FEATURED_ROUTES } from './home-directions.js'

const FEATURED_ROUTE_CLASSNAME = 'group rounded-[18px] border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-5 py-4 shadow-[var(--shadow-xs)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--border-color-strong)] hover:shadow-[var(--shadow-sm)]'

export function ServicesSection() {
  return (
    <section id="home-directions" className="section">
      <div className="container-clay">
        <div className="max-w-3xl mb-8">
          <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">Выберите направление</h2>
          <p className="text-clay-muted text-lg leading-relaxed">Выберите нужное направление, чтобы сразу перейти к профильной странице, врачу и следующему шагу без лишнего поиска по сайту.</p>
        </div>
        <nav aria-label="Быстрый выбор направления" className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-sm)]">
          {HOME_DIRECTIONS.map((direction, index) => (
            <FadeInSection key={direction.href} staggerIndex={index}>
            <a href={direction.href} aria-label={direction.title} className={`group block ${index === HOME_DIRECTIONS.length - 1 ? '' : 'border-b border-[color:var(--border-color)]'}`}>
              <div className="grid gap-3 px-5 py-5 transition-colors duration-200 group-hover:bg-[color:var(--surface-card-hover)] md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_auto] md:items-center md:gap-6 md:px-6">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-1.5 rounded-full bg-[color:var(--accent-light)] transition-colors duration-200 group-hover:bg-[color:var(--accent)]" aria-hidden="true" />
                  <h3 className="text-xl font-semibold text-clay-dark sm:text-2xl">{direction.title}</h3>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[color:var(--accent)]">{direction.summary}</p>
                  <p className="mt-1 text-sm leading-relaxed text-clay-muted">{direction.description}</p>
                </div>
                <div className="inline-flex items-center gap-1 text-sm font-semibold text-clay-dark md:justify-self-end">
                  Перейти
                  <ChevronRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </div>
            </a>
            </FadeInSection>
          ))}
        </nav>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {HOME_FEATURED_ROUTES.map((route) => (
            <a key={route.href} href={route.href} className={FEATURED_ROUTE_CLASSNAME}>
              <span className="block text-xl font-semibold text-clay-dark">{route.title}</span>
              <span className="mt-2 block text-sm leading-relaxed text-clay-muted">{route.description}</span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-clay-dark">
                Подробнее
                <ChevronRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
