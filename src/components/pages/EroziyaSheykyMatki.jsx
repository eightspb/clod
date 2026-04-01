import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, MessageCircle, BookOpen } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { DoctorCard } from '../DoctorCard.jsx'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { HeroDoctorCard } from '../HeroDoctorCard.jsx'

export const EROZIYA_FAQ = [
  {
    question: 'Что такое эрозия шейки матки?',
    answer: 'В народе «эрозией» нередко называют несколько разных состояний. Истинная эрозия — дефект эпителия шейки матки — встречается редко. Чаще речь идёт об эктопии: смещении цилиндрического эпителия (выстилающего цервикальный канал) на наружную поверхность шейки. Эктопия — вариант нормы у молодых женщин и не требует лечения при отсутствии изменений при кольпоскопии.',
  },
  {
    question: 'Нужно ли лечить эрозию шейки матки?',
    answer: 'Не всегда. Простая эктопия без атипии и воспаления наблюдается, а не лечится. Лечение — лазерная коагуляция, радиоволновое воздействие — показано при выявленной дисплазии, персистирующей ВПЧ-инфекции или жалобах пациентки. Решение принимается после кольпоскопии и ПАП-теста.',
  },
  {
    question: 'Что такое кольпоскопия?',
    answer: 'Кольпоскопия — осмотр шейки матки с увеличением под специальным прибором (кольпоскопом) с обработкой уксусной кислотой и раствором Люголя. Позволяет выявить зоны атипии, оценить трансформационную зону и при необходимости взять прицельную биопсию.',
  },
  {
    question: 'Чем опасна нелеченая эрозия?',
    answer: 'Простая эктопия безопасна. Опасность представляет дисплазия шейки матки (CIN), которую иногда обнаруживают одновременно с эктопией. Дисплазия без лечения может прогрессировать в предрак или рак шейки матки — поэтому важны регулярный ПАП-тест и кольпоскопия.',
  },
  {
    question: 'Как часто нужно проходить обследование?',
    answer: 'Женщинам старше 21 года — ПАП-тест раз в 3 года (или ПАП + ВПЧ-тест раз в 5 лет с 25 лет). При выявленных изменениях — по индивидуальному графику, который определяет гинеколог после кольпоскопии.',
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
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Чаще — полное отсутствие симптомов' },
]

const diagnostics = [
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Кольпоскопия', desc: 'Осмотр шейки матки с увеличением. Выявляет зоны атипии и определяет необходимость биопсии.' },
  { icon: <Eye size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'ПАП-тест (онкоцитология)', desc: 'Мазок с шейки матки для цитологического исследования. Выявляет дисплазию и предраковые изменения.' },
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'ВПЧ-тест и биопсия', desc: 'Определение высокоонкогенных типов вируса папилломы человека. При кольпоскопических находках — прицельная биопсия.' },
]

const treatments = [
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Динамическое наблюдение', desc: 'При простой эктопии без атипии, нормальном ПАП-тесте и отсутствии ВПЧ — регулярное обследование без вмешательства.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Радиоволновое воздействие', desc: 'Современный метод деструкции изменённого эпителия. Малоболезненный, амбулаторный, с коротким периодом восстановления.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Лазерная коагуляция', desc: 'Применяется при обширных зонах изменений или высокоонкогенном ВПЧ. Проводится в амбулаторных условиях.' },
]

const steps = [
  { n: '01', title: 'Приём гинеколога', desc: 'Осмотр в зеркалах, сбор анамнеза. При необходимости — забор мазков прямо на консультации.' },
  { n: '02', title: 'Кольпоскопия', desc: 'Расширенный осмотр шейки матки с увеличением. Оценка трансформационной зоны и зон атипии.' },
  { n: '03', title: 'Лабораторная верификация', desc: 'ПАП-тест, ВПЧ-тест, при необходимости — прицельная биопсия с гистологическим исследованием.' },
  { n: '04', title: 'Выбор тактики', desc: 'Наблюдение, деструктивное лечение или хирургическое — в зависимости от результатов. Врач подробно объясняет каждый вариант.' },
  { n: '05', title: 'Контроль после лечения', desc: 'ПАП-тест и кольпоскопия через 3–6 месяцев после вмешательства для оценки результата.' },
]

const relatedArticles = [
  { href: '/blog/eroziya-sheyki-matki', title: 'Эрозия шейки матки. Мифы и правда' },
  { href: '/blog/kak-prokhodit-priem-ginekologa', title: 'Как проходит приём гинеколога' },
]

export function EroziyaSheykyMatki() {
  return (
    <div>
      <section className="relative overflow-hidden pt-6 pb-10">
        <div className="container-clay relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[0.618fr_0.382fr] gap-10 lg:gap-16 items-start">
            <div>
              <div className="badge-specialty-peach-filled inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5">
                <Zap size={12} />
                Гинекология · Приморский район СПб
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
                Эрозия шейки матки:{' '}
                <span className="heading-accent">диагностика и лечение в СПб</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Приём гинеколога, кольпоскопия и ПАП-тест — в Клинике Одинцова на Богатырском проспекте, рядом с м. Комендантский проспект.
              </p>
              <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl">
                «Эрозия» — одна из самых часто встречающихся находок при гинекологическом осмотре. Врач объяснит, что именно выявлено, нужно ли лечение и какой вариант подходит в вашей ситуации.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary gap-2">
                  Записаться к гинекологу
                  <ArrowRight size={16} />
                </button>
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary">
                  Проверить, нужна ли операция
                </button>
              </div>
            </div>
            <HeroDoctorCard doctors={SPECIALTY_DOCTORS} />
          </div>
        </div>
      </section>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { val: '~40', unit: '%', label: 'Женщин репродуктивного возраста имеют эктопию' },
                { val: '3', unit: 'года', label: 'Рекомендуемый интервал ПАП-теста' },
                { val: 'CIN', unit: '', label: 'Дисплазия требует активной тактики' },
                { val: 'Амбул.', unit: '', label: 'Формат большинства вмешательств' },
              ].map((s) => (
                <div key={s.label} className="clay clay-card card-interactive p-4 text-center">
                  <div className="flex items-end justify-center gap-0.5">
                    <span className="text-3xl sm:text-4xl font-serif font-light text-clay-peach leading-none">{s.val}</span>
                    {s.unit && <span className="text-lg font-bold text-clay-peach leading-none pb-0.5">{s.unit}</span>}
                  </div>
                  <p className="text-xs text-clay-muted mt-1.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Что такое эрозия шейки матки</h2>
            <p className="text-clay-muted mb-4 max-w-2xl leading-relaxed">
              В большинстве случаев «эрозия» — это эктопия: смещение цилиндрического эпителия цервикального канала на наружную поверхность шейки матки. Она видна при осмотре как красноватый участок вокруг наружного зева и у молодых женщин является вариантом нормы.
            </p>
            <p className="text-clay-muted mb-6 max-w-2xl leading-relaxed">
              Опасность представляет не сама эктопия, а дисплазия — атипичные изменения клеток эпителия, которые могут развиться на её фоне при персистирующей ВПЧ-инфекции. Именно поэтому важны регулярный ПАП-тест и кольпоскопия.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {symptoms.map((s, i) => (
                <FadeInSection key={i} staggerIndex={i} className="h-full">
                  <div className="clay clay-card card-interactive flex items-center gap-3 px-4 py-3">
                    {s.icon}
                    <span className="text-sm font-medium text-clay-dark">{s.text}</span>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-7">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика эрозии шейки матки</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Полноценная диагностика включает несколько взаимодополняющих методов</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {diagnostics.map((d, i) => (
                <FadeInSection key={d.title} staggerIndex={i} className="h-full">
                  <div className={`clay ${d.card} card-interactive p-6`}>
                    <div className="flex items-start gap-4 mb-3">
                      <div className={d.bg}>{d.icon}</div>
                      <h3 className="font-bold text-clay-dark text-lg leading-tight pt-1">{d.title}</h3>
                    </div>
                    <p className="text-clay-muted text-sm leading-relaxed">{d.desc}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-7">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Лечение эрозии шейки матки</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Тактика зависит от цитологии, кольпоскопической картины и данных ВПЧ-теста</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {treatments.map((t, i) => (
                <FadeInSection key={t.title} staggerIndex={i} className="h-full">
                  <div className={`clay ${t.card} card-interactive p-6`}>
                    <div className="flex items-start gap-4 mb-3">
                      <div className={t.bg}>{t.icon}</div>
                      <h3 className="font-bold text-clay-dark text-lg leading-tight pt-1">{t.title}</h3>
                    </div>
                    <p className="text-clay-muted text-sm leading-relaxed">{t.desc}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div>
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">Маршрут пациентки</h2>
                <p className="text-clay-muted mb-6 leading-relaxed">Пошагово — от осмотра до обоснованного решения</p>
                <div className="space-y-4">
                  {steps.map((s, i) => (
                    <FadeInSection key={s.n} staggerIndex={i} className="h-full">
                      <div className="clay clay-card card-interactive flex items-start gap-3 px-4 py-4">
                        <div className="relative overflow-hidden flex-shrink-0">
                          <span className="deco-numeral absolute -top-4 -right-2 opacity-30">{s.n}</span>
                          <div className="relative z-10 num-badge text-sm w-8 h-8">{s.n}</div>
                        </div>
                        <div>
                          <p className="font-semibold text-clay-dark text-sm">{s.title}</p>
                          <p className="text-clay-muted text-xs leading-relaxed mt-0.5">{s.desc}</p>
                        </div>
                      </div>
                    </FadeInSection>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="clay clay-card-peach p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/15 -translate-y-1/2 translate-x-1/3" />
                  <h3 className="font-bold text-clay-dark text-xl mb-2">Второе мнение гинеколога</h3>
                  <p className="text-clay-text text-sm leading-relaxed mb-4">
                    Вам уже рекомендовали прижигание или операцию? Принесите результаты анализов и кольпоскопии — гинеколог оценит показания и объяснит варианты.
                  </p>
                  <div className="flex items-center gap-2 bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-clay-dark text-sm font-bold">
                    Цена: 0 ₽
                  </div>
                  <button type="button" data-booking-btn="true" className="clay btn-clay-white mt-4 text-sm py-2.5 w-full justify-center">
                    Проверить, нужна ли операция
                  </button>
                </div>
                <div className="clay clay-card card-interactive p-6">
                  <h3 className="font-bold text-clay-dark text-lg mb-3">Когда стоит обратиться</h3>
                  <div className="space-y-2.5">
                    {[
                      'Гинеколог нашёл эрозию и нужно разобраться',
                      'Контактные кровянистые выделения',
                      'Не делали ПАП-тест более 3 лет',
                      'Выявлен ВПЧ высокого риска',
                      'Назначено прижигание, хотите уточнить',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <CheckCircle size={16} className="text-clay-peach flex-shrink-0" />
                        <span className="text-sm text-clay-dark">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Наши гинекологи</h2>
              <p className="text-clay-muted">Ведут приём в Приморском районе Санкт-Петербурга</p>
            </div>
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-10">
              {SPECIALTY_DOCTORS.map((doc) => (
                <DoctorCard key={doc.slug} doctor={doc} />
              ))}
            </div>
            <div className="sm:hidden flex gap-4 pt-10 overflow-x-auto scroll-smooth snap-x snap-mandatory -mx-4 px-4 pb-4">
              {SPECIALTY_DOCTORS.map((doc) => (
                <div key={doc.slug} className="snap-start flex-shrink-0 w-[80vw]">
                  <DoctorCard doctor={doc} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Цены на гинекологию в СПб</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {PRICE_CATEGORY.items.map((item) => (
                <div key={item.name} className="clay clay-card card-interactive flex items-center justify-between gap-4 px-5 py-4">
                  <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                  <span className="text-clay-peach font-bold text-sm whitespace-nowrap">{formatPriceLabel(item.price, item.isFrom)}</span>
                </div>
              ))}
            </div>
            <div className="text-center">
              <a href={PRICE_CATEGORY.fullPriceHref} className="clay btn-clay-secondary text-sm">
                Полный прайс-лист →
              </a>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-xl heading-serif text-clay-dark mb-5">Полезные материалы</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedArticles.map((a) => (
                <a key={a.href} href={a.href} className="clay clay-card-soft-peach card-interactive p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
                  <BookOpen size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-peach transition-colors">{a.title}</p>
                    <p className="text-clay-muted text-xs">Читать статью →</p>
                  </div>
                </a>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <a href="/gynecology" className="clay clay-card card-interactive p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
                <Zap size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-peach transition-colors">Гинекология — обзор направления</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Приём гинеколога и диагностика в Клинике Одинцова</p>
                </div>
              </a>
              <a href="/second-opinion" className="clay clay-card card-interactive p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
                <MessageCircle size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-peach transition-colors">Бесплатное второе мнение</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Рекомендовали лечение? Обсудим показания</p>
                </div>
              </a>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card-soft-peach p-6 md:p-8 text-center">
              <Clock size={40} className="text-clay-peach mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
                Запишитесь к гинекологу в Санкт-Петербурге
              </h2>
              <p className="text-clay-muted mb-5 max-w-md mx-auto">
                Клиника Одинцова: Богатырский проспект, д. 22 к. 1, рядом с м. Комендантский проспект и м. Старая Деревня.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
                  Записаться на приём
                  <ArrowRight size={16} />
                </button>
                <a href={TELEGRAM_URL} className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                  Написать в Telegram
                </a>
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
