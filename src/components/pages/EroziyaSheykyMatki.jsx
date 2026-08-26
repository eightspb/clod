import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, BookOpen } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { ResponsiveDoctorCollection } from '../ResponsiveDoctorCollection.jsx'
import { ResponsiveDoctorHero } from '../ResponsiveDoctorHero.jsx'

export const EROZIYA_FAQ = [
  {
    question: 'Что такое эрозия шейки матки?',
    answer: 'В народе «эрозией» нередко называют несколько разных состояний. Истинная эрозия - дефект эпителия шейки матки - встречается редко. Чаще речь идёт об эктопии: смещении цилиндрического эпителия (выстилающего цервикальный канал) на наружную поверхность шейки. Эктопия - вариант нормы у молодых женщин и не требует лечения при отсутствии изменений при кольпоскопии.',
  },
  {
    question: 'Нужно ли лечить эрозию шейки матки?',
    answer: 'Не всегда. Простая эктопия без атипии и воспаления наблюдается, а не лечится. Лечение - лазерная коагуляция, радиоволновое воздействие - показано при выявленной дисплазии, персистирующей ВПЧ-инфекции или жалобах пациентки. Решение принимается после кольпоскопии и ПАП-теста.',
  },
  {
    question: 'Что такое кольпоскопия?',
    answer: 'Кольпоскопия - осмотр шейки матки с увеличением под специальным прибором (кольпоскопом) с обработкой уксусной кислотой и раствором Люголя. Позволяет выявить зоны атипии, оценить трансформационную зону и при необходимости взять прицельную биопсию.',
  },
  {
    question: 'Чем опасна нелеченая эрозия?',
    answer: 'Простая эктопия безопасна. Опасность представляет дисплазия шейки матки (CIN), которую иногда обнаруживают одновременно с эктопией. Дисплазия без лечения может прогрессировать в предрак или рак шейки матки - поэтому важны регулярный ПАП-тест и кольпоскопия.',
  },
  {
    question: 'Как часто нужно проходить обследование?',
    answer: 'Женщинам старше 21 года - ПАП-тест раз в 3 года (или ПАП + ВПЧ-тест раз в 5 лет с 25 лет). При выявленных изменениях - по индивидуальному графику, который определяет гинеколог после кольпоскопии.',
  },
  {
    question: 'Больно ли делать кольпоскопию?',
    answer: 'Кольпоскопия безболезненна: это осмотр, а не вмешательство. Небольшой дискомфорт возможен при обработке шейки матки растворами, но боли нет. Прицельная биопсия сопровождается кратковременным ощущением щипка.',
  },
]

const SPECIALTY_DOCTORS = DOCTORS.filter((d) =>
  /гинеколог/i.test(d.specialization)
)

const PRICE_CATEGORY = getShortPriceCategoryBySlug('gynecology')

const symptoms = [
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Контактные кровянистые выделения после секса' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Патологические бели (обильные, окрашенные)' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Лёгкая болезненность внизу живота' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Обнаружение при плановом осмотре гинеколога' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Дискомфорт при гинекологическом осмотре' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Чаще - полное отсутствие симптомов' },
]

const diagnostics = [
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Кольпоскопия', desc: 'Осмотр шейки матки с увеличением. Выявляет зоны атипии и определяет необходимость биопсии.' },
  { icon: <Eye size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'ПАП-тест (онкоцитология)', desc: 'Мазок с шейки матки для цитологического исследования. Выявляет дисплазию и предраковые изменения.' },
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'ВПЧ-тест и биопсия', desc: 'Определение высокоонкогенных типов вируса папилломы человека. При кольпоскопических находках - прицельная биопсия.' },
]

const treatments = [
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Динамическое наблюдение', desc: 'При простой эктопии без атипии, нормальном ПАП-тесте и отсутствии ВПЧ - регулярное обследование без вмешательства.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Радиоволновое воздействие', desc: 'Современный метод деструкции изменённого эпителия. Малоболезненный, амбулаторный, с коротким периодом восстановления.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Лазерная коагуляция', desc: 'Применяется при обширных зонах изменений или высокоонкогенном ВПЧ. Проводится в амбулаторных условиях.' },
]

const steps = [
  { n: '01', title: 'Приём гинеколога', desc: 'Осмотр в зеркалах, сбор анамнеза. При необходимости - забор мазков прямо на консультации.' },
  { n: '02', title: 'Кольпоскопия', desc: 'Расширенный осмотр шейки матки с увеличением. Оценка трансформационной зоны и зон атипии.' },
  { n: '03', title: 'Лабораторная верификация', desc: 'ПАП-тест, ВПЧ-тест, при необходимости - прицельная биопсия с гистологическим исследованием.' },
  { n: '04', title: 'Выбор тактики', desc: 'Наблюдение, деструктивное лечение или хирургическое - в зависимости от результатов. Врач подробно объясняет каждый вариант.' },
  { n: '05', title: 'Контроль после лечения', desc: 'ПАП-тест и кольпоскопия через 3-6 месяцев после вмешательства для оценки результата.' },
]

const relatedArticles = [
  { href: '/blog/eroziya-sheyki-matki', title: 'Эрозия шейки матки. Мифы и правда' },
  { href: '/blog/kak-prokhodit-priem-ginekologa', title: 'Как проходит приём гинеколога' },
]

const PAGE_STATS = [
  { val: '~40', unit: '%', label: 'Женщин репродуктивного возраста имеют эктопию' },
  { val: '3', unit: 'года', label: 'Рекомендуемый интервал ПАП-теста' },
  { val: 'CIN', unit: '', label: 'Дисплазия требует активной тактики' },
  { val: 'Амбул.', unit: '', label: 'Формат большинства вмешательств' },
]

const VISIT_REASONS = [
  { text: 'Гинеколог нашёл эрозию и нужно разобраться' },
  { text: 'Контактные кровянистые выделения' },
  { text: 'Не делали ПАП-тест более 3 лет' },
  { text: 'Выявлен ВПЧ высокого риска' },
  { text: 'Назначено прижигание, хотите уточнить' },
]

const EXTRA_LINKS = [
  { href: '/gynecology', title: 'Гинекология - обзор направления', desc: 'Приём гинеколога и диагностика в Клинике Одинцова' },
]

const PAGE = {
  specialtyLabel: 'Гинекология, Приморский район СПб',
}

export function EroziyaSheykyMatki() {
  return (
    <div className="bg-[color:var(--surface-page)]">
      <section className="relative overflow-hidden grain-overlay border-b border-[color:var(--border-color)] bg-[color:var(--surface-accent)]">
        <div className="absolute inset-0 hero-gradient pointer-events-none" />
        <div className="container-clay relative z-10 py-8 md:py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-12 items-center">
            <div className="max-w-3xl self-start text-left">
              <div className="badge-specialty-peach-filled inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5">
                <Zap size={12} />
                {PAGE.specialtyLabel}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl heading-display text-clay-dark leading-tight mb-5">
                Эрозия шейки матки:{' '}
                <span className="heading-accent">диагностика и лечение в СПб</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Приём гинеколога, кольпоскопия и ПАП-тест в Клинике Одинцова на Богатырском проспекте.
              </p>
              <p className="text-clay-muted leading-relaxed mb-6 max-w-2xl">
                Врач объяснит, что именно выявлено, нужно ли лечение и какой вариант подходит в вашей ситуации.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary btn-specialty-peach gap-2">
                  Записаться к гинекологу
                  <ArrowRight size={16} />
                </button>
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary">
                  Уточнить тактику
                </button>
              </div>
            </div>
            <ResponsiveDoctorHero
              doctors={SPECIALTY_DOCTORS}
              label="Карусель гинекологов на странице об эрозии шейки матки"
              ctaHref="/second-opinion"
              desktopClassName="hidden lg:block [&_.hero-doctor-card-inner]:overflow-hidden [&_.hero-doctor-photo-link]:max-h-[260px] [&_.hero-doctor-photo-link]:overflow-hidden [&_.hero-doctor-photo]:max-h-[260px] [&_.hero-doctor-photo]:object-contain [&_.hero-doctor-info]:p-4"
              desktopMedia="(min-width: 1024px)"
            />
          </div>
        </div>
      </section>

      <FadeInSection>
        <section className="relative z-20 -mt-5 md:-mt-7">
          <div className="container-clay">
            <div className="clay clay-card-lg p-4 md:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PAGE_STATS.map((s) => (
                  <div key={s.label} className="rounded-2xl bg-[color:var(--surface-muted)] px-4 py-4">
                    <div className="flex items-end gap-1">
                      <span className="text-3xl sm:text-4xl font-serif font-light text-clay-peach leading-none">{s.val}</span>
                      {s.unit && <span className="text-sm font-bold text-clay-peach leading-none pb-1">{s.unit}</span>}
                    </div>
                    <p className="text-sm text-clay-muted mt-2 leading-snug">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.75fr)] gap-6 lg:gap-10 items-start">
              <div className="clay clay-card-lg p-6 md:p-8">
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">Что такое эрозия шейки матки</h2>
                <div className="space-y-4 text-clay-muted leading-relaxed">
                  <p>В большинстве случаев эрозией называют эктопию: смещение цилиндрического эпителия цервикального канала на наружную поверхность шейки матки. У молодых женщин это часто вариант нормы.</p>
                  <p>Опасность представляет не сама эктопия, а дисплазия - атипичные изменения клеток эпителия, которые могут развиться на фоне персистирующей ВПЧ-инфекции. Поэтому важны регулярный ПАП-тест и кольпоскопия.</p>
                </div>
              </div>
              <aside className="clay clay-card-soft-peach p-5 md:p-6">
                <h3 className="font-bold text-clay-dark text-lg mb-4">На что обратить внимание</h3>
                <div className="space-y-3">
                  {symptoms.map((s) => (
                    <div key={s.text} className="flex items-start gap-3 rounded-2xl bg-white/55 px-3 py-3">
                      <span className="mt-0.5 flex-shrink-0">{s.icon}</span>
                      <span className="text-sm font-medium text-clay-dark leading-snug">{s.text}</span>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section bg-[color:var(--surface-accent)] border-y border-[color:var(--border-color)]">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div className="clay clay-card p-5 md:p-6">
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика эрозии шейки матки</h2>
                <p className="text-clay-muted leading-relaxed mb-6">Полноценная диагностика включает несколько взаимодополняющих методов и помогает не лечить норму.</p>
                <div className="space-y-5">
                  {diagnostics.map((d) => (
                    <article key={d.title} className="flex items-start gap-4 border-t border-[color:var(--border-color)] pt-5 first:border-t-0 first:pt-0">
                      <div className={d.bg}>{d.icon}</div>
                      <div>
                        <h3 className="font-bold text-clay-dark text-base mb-1">{d.title}</h3>
                        <p className="text-clay-muted text-sm leading-relaxed">{d.desc}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <div className="clay clay-card p-5 md:p-6">
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Лечение эрозии шейки матки</h2>
                <p className="text-clay-muted leading-relaxed mb-6">Тактика зависит от цитологии, кольпоскопической картины, ВПЧ-теста и жалоб.</p>
                <div className="space-y-5">
                  {treatments.map((t) => (
                    <article key={t.title} className="flex items-start gap-4 border-t border-[color:var(--border-color)] pt-5 first:border-t-0 first:pt-0">
                      <div className={t.bg}>{t.icon}</div>
                      <div>
                        <h3 className="font-bold text-clay-dark text-base mb-1">{t.title}</h3>
                        <p className="text-clay-muted text-sm leading-relaxed">{t.desc}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-8 items-start">
              <div className="clay clay-card-lg p-6 md:p-8">
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Маршрут пациентки</h2>
                <p className="text-clay-muted leading-relaxed mb-7">Пошагово от осмотра до обоснованного решения.</p>
                <div className="space-y-5">
                  {steps.map((s) => (
                    <article key={s.n} className="grid grid-cols-[2.5rem_1fr] gap-4">
                      <div className="num-badge text-sm w-10 h-10">{s.n}</div>
                      <div className="border-b border-[color:var(--border-color)] pb-5 last:border-b-0 last:pb-0">
                        <h3 className="font-semibold text-clay-dark text-base mb-1">{s.title}</h3>
                        <p className="text-clay-muted text-sm leading-relaxed">{s.desc}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <aside className="space-y-4 lg:sticky lg:top-24">
                <div className="clay clay-card-peach p-6 relative overflow-hidden">
                  <h3 className="font-bold text-clay-dark text-xl mb-2">Второе мнение гинеколога</h3>
                  <p className="text-clay-text text-sm leading-relaxed mb-4">Вам уже рекомендовали прижигание или операцию? Принесите результаты анализов и кольпоскопии, гинеколог оценит показания и объяснит варианты.</p>
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-white/65 border border-white/80 px-4 py-2.5 text-clay-dark text-sm font-bold mb-4">
                    Цена: 0 ₽
                  </div>
                  <button type="button" data-booking-btn="true" className="clay btn-clay-white text-sm py-2.5 w-full justify-center">
                    Уточнить тактику
                  </button>
                </div>
                <div className="clay clay-card p-6">
                  <h3 className="font-bold text-clay-dark text-lg mb-4">Когда стоит обратиться</h3>
                  <div className="space-y-3">
                    {VISIT_REASONS.map((item) => (
                      <div key={item.text} className="flex items-start gap-3">
                        <CheckCircle size={16} className="text-clay-peach mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-clay-dark leading-snug">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section bg-[color:var(--surface-muted)] border-y border-[color:var(--border-color)]">
          <div className="container-clay">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-8 xl:gap-10 items-start">
              <div>
                <div className="mb-7">
                  <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Наши гинекологи</h2>
                  <p className="text-clay-muted leading-relaxed max-w-2xl">Ведут приём в Приморском районе Санкт-Петербурга.</p>
                </div>
                <ResponsiveDoctorCollection
                  doctors={SPECIALTY_DOCTORS}
                  label="Карусель гинекологов клиники на странице об эрозии шейки матки"
                  mobileClassName="md:hidden pt-8"
                  desktopClassName="hidden md:grid md:grid-cols-2 gap-6 pt-8"
                />
              </div>
              <aside className="clay clay-card-lg p-5 md:p-6">
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Цены на гинекологию в СПб</h2>
                <p className="text-clay-muted leading-relaxed mb-5">Основные позиции для первичного визита. Полный перечень доступен в разделе цен.</p>
                <div className="divide-y divide-[color:var(--border-color)]">
                  {PRICE_CATEGORY.items.map((item) => (
                    <div key={item.name} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                      <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                      <span className="text-clay-peach font-bold text-sm whitespace-nowrap">{formatPriceLabel(item.price, item.isFrom)}</span>
                    </div>
                  ))}
                </div>
                <a href={PRICE_CATEGORY.fullPriceHref} className="clay btn-clay-secondary text-sm mt-6 w-full justify-center gap-2">
                  Полный прайс-лист
                  <ArrowRight size={15} />
                </a>
              </aside>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6 lg:gap-8 items-start">
              <div className="clay clay-card-soft-peach p-6 md:p-8">
                <Clock size={34} className="text-clay-peach mb-4" />
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Запишитесь к гинекологу в Санкт-Петербурге</h2>
                <p className="text-clay-muted mb-5 leading-relaxed">Клиника Одинцова находится на Богатырском проспекте, рядом с м. Комендантский проспект и м. Старая Деревня.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="button" data-booking-btn="true" className="clay btn-clay-primary btn-specialty-peach gap-2">
                    Записаться на приём
                    <ArrowRight size={16} />
                  </button>
                  <a href={TELEGRAM_URL} className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                    Написать в Telegram
                  </a>
                </div>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-5">Полезные материалы</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedArticles.map((a) => (
                    <a key={a.href} href={a.href} className="clay clay-card-soft-peach card-interactive card-interactive-peach p-5 flex items-start gap-3 group">
                      <BookOpen size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-peach transition-colors">{a.title}</p>
                        <p className="text-clay-muted text-xs">Читать статью</p>
                      </div>
                    </a>
                  ))}
                  {EXTRA_LINKS.map((a) => (
                    <a key={a.href} href={a.href} className="clay clay-card card-interactive card-interactive-peach p-5 flex items-start gap-3 group">
                      <Zap size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-peach transition-colors">{a.title}</p>
                        <p className="text-clay-muted text-xs leading-relaxed">{a.desc}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      <div className="container-clay">
        <FaqSection items={EROZIYA_FAQ} title="Частые вопросы об эрозии шейки матки" />
      </div>
    </div>
  )
}
