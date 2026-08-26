import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, BookOpen } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { DoctorCard } from '../DoctorCard.jsx'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { HeroDoctorCard } from '../HeroDoctorCard.jsx'

export const MASTOPATIYA_FAQ = [
  {
    question: 'Что такое мастопатия?',
    answer: 'Мастопатия (фиброзно-кистозная болезнь) - доброкачественное изменение структуры молочной железы с нарушением соотношения железистой, соединительной и жировой ткани. Это не рак и не предрак, а изменения, требующие наблюдения и при необходимости - коррекции. Встречается у 30-50% женщин репродуктивного возраста.',
  },
  {
    question: 'Нужно ли лечить мастопатию?',
    answer: 'Диффузная мастопатия без выраженных симптомов нередко не требует активного вмешательства - достаточно наблюдения, УЗИ раз в год и коррекции образа жизни. При узловых формах, нарастании болей или выявлении подозрительных изменений врач обсудит варианты лечения, в том числе возможность ВАБ.',
  },
  {
    question: 'Чем мастопатия отличается от рака?',
    answer: 'Мастопатия - доброкачественный процесс. Злокачественная опухоль имеет принципиально иную морфологическую картину. Однако на фоне мастопатии труднее выявить ранний рак, поэтому регулярные обследования (УЗИ, маммография по показаниям) особенно важны.',
  },
  {
    question: 'Влияют ли гормоны на мастопатию?',
    answer: 'Да, мастопатия тесно связана с гормональным фоном: нарушением соотношения эстрогенов и прогестерона, заболеваниями щитовидной железы и яичников. Именно поэтому важен комплексный подход - гинеколог и эндокринолог при необходимости дополняют маммолога.',
  },
  {
    question: 'Что делать, если грудь болит каждый месяц перед менструацией?',
    answer: 'Цикличная болезненность (мастодиния) - частый симптом диффузной мастопатии. Сама по себе она не опасна, но снижает качество жизни. Врач оценит выраженность симптомов и при необходимости порекомендует методы коррекции - от изменения образа жизни до медикаментозной поддержки.',
  },
  {
    question: 'Как часто нужно делать УЗИ при мастопатии?',
    answer: 'При диффузных изменениях без образований - раз в 12 месяцев. При выявленных узлах или быстрой динамике - раз в 6 месяцев или чаще, по усмотрению врача. После 40 лет к УЗИ добавляют маммографию.',
  },
]

const SPECIALTY_DOCTORS = DOCTORS.filter((d) =>
  /онколог-маммолог/i.test(d.specialization)
)

const PRICE_CATEGORY = getShortPriceCategoryBySlug('mammology')

const symptoms = [
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Болезненность груди перед менструацией' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Диффузная тяжесть и распирание' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Мелкозернистые уплотнения при пальпации' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Уплотнение, меняющееся в течение цикла' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Прозрачные или молочные выделения из соска' },
  { icon: <Eye size={20} className="text-clay-mint" />, text: 'Единичный или множественные узлы' },
]

const diagnostics = [
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'УЗИ молочных желёз', desc: 'Первичный скрининг структуры ткани, оценка кист и узловых образований. Предпочтительно в 1-ю фазу цикла (5-12 день).' },
  { icon: <Eye size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Маммография', desc: 'Рекомендуется женщинам старше 40 лет. Дополняет УЗИ, выявляет кальцинаты и изменения жировой ткани.' },
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Биопсия при узловых формах', desc: 'Цитологическое или гистологическое исследование для исключения злокачественного процесса при выявленных узлах.' },
]

const treatments = [
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Наблюдение и образ жизни', desc: 'При диффузных формах без симптоматики - регулярный УЗИ-контроль. Врач даёт рекомендации по питанию, уровню стресса и нижнему белью.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Медикаментозная коррекция', desc: 'При выраженных болях и гормональном дисбалансе врач может порекомендовать фитопрепараты, местные гели или гормональную поддержку по показаниям.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'ВАБ при узловых формах', desc: 'При крупных узлах или кистах маммолог рассматривает ВАБ как малоинвазивный вариант. Решение принимается после очной оценки.' },
]

const steps = [
  { n: '01', title: 'Консультация онколога-маммолога', desc: 'Осмотр, изучение снимков, сбор жалоб. УЗИ - сразу на приёме при необходимости.' },
  { n: '02', title: 'Оценка типа мастопатии', desc: 'Дифференциация диффузной и узловой форм. При узловой - определение показаний к биопсии.' },
  { n: '03', title: 'Лабораторная и гормональная картина', desc: 'При необходимости направление на анализы гормонов и консультацию гинеколога или эндокринолога.' },
  { n: '04', title: 'Выбор тактики', desc: 'Врач объясняет: наблюдение, медикаментозная поддержка или малоинвазивное вмешательство по показаниям.' },
]

const relatedArticles = [
  { href: '/blog/mylnaya-opera-o-kistoznoy-mastopatii', title: 'Мыльная опера о кистозной мастопатии' },
  { href: '/blog/mammografiya-ili-uzi', title: 'Маммография или УЗИ: что выбрать' },
]

const PAGE_STATS = [
  { val: '30-50', unit: '%', label: 'Женщин репродуктивного возраста имеют мастопатию' },
  { val: '1-12', unit: '', label: 'Предпочтительный день цикла для УЗИ' },
  { val: '2', unit: 'типа', label: 'Диффузная и узловая формы' },
  { val: 'Ежегодно', unit: '', label: 'Рекомендуемый контроль УЗИ' },
]

const VISIT_REASONS = [
  { text: 'Грудь болит перед менструацией' },
  { text: 'УЗИ выявило диффузные изменения' },
  { text: 'Появился новый узел или уплотнение' },
  { text: 'Выделения из соска без травмы' },
  { text: 'Плановый визит, не были у маммолога более года' },
]

const EXTRA_LINKS = [
  { href: '/mammology', title: 'Маммология - обзор направления', desc: 'Консультация, УЗИ и ВАБ в Клинике Одинцова' },
  { href: '/vab', title: 'ВАБ - подробнее о процедуре', desc: 'Малоинвазивное удаление узловых образований' },
]

const PAGE = {
  specialtyLabel: 'Маммология, Приморский район СПб',
}

export function Mastopatiya() {
  return (
    <div className="bg-[color:var(--surface-page)]">
      <section className="relative overflow-hidden grain-overlay border-b border-[color:var(--border-color)] bg-[color:var(--surface-accent)]">
        <div className="absolute inset-0 hero-gradient pointer-events-none" />
        <div className="container-clay relative z-10 py-8 md:py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-12 items-center">
            <div className="max-w-3xl self-start text-left">
              <div className="badge-specialty-mint-filled inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5">
                <Zap size={12} />
                {PAGE.specialtyLabel}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl heading-display text-clay-dark leading-tight mb-5">
                Мастопатия молочной железы:{' '}
                <span className="heading-accent">наблюдение и лечение в СПб</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Приём онколога-маммолога, УЗИ и подбор тактики наблюдения в Клинике Одинцова на Богатырском проспекте.
              </p>
              <p className="text-clay-muted leading-relaxed mb-6 max-w-2xl">
                Мастопатия встречается часто и не всегда требует активного лечения. Врач оценит тип изменений и предложит понятный план наблюдения или коррекции.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
                  Записаться на приём
                  <ArrowRight size={16} />
                </button>
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary">
                  Обсудить заключение
                </button>
              </div>
            </div>
            <div className="hidden lg:block [&_.hero-doctor-card-inner]:overflow-hidden [&_.hero-doctor-photo-link]:max-h-[260px] [&_.hero-doctor-photo-link]:overflow-hidden [&_.hero-doctor-photo]:max-h-[260px] [&_.hero-doctor-photo]:object-contain [&_.hero-doctor-info]:p-4">
              <HeroDoctorCard doctors={SPECIALTY_DOCTORS} />
            </div>
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
                      <span className="text-3xl sm:text-4xl font-serif font-light text-clay-mint leading-none">{s.val}</span>
                      {s.unit && <span className="text-sm font-bold text-clay-mint leading-none pb-1">{s.unit}</span>}
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">Что такое мастопатия</h2>
                <div className="space-y-4 text-clay-muted leading-relaxed">
                  <p>Мастопатия (фиброзно-кистозная болезнь) - доброкачественное изменение структуры молочной железы. Развивается на фоне гормональных влияний и может проявляться болезненностью, уплотнениями и кистами.</p>
                  <p>Различают диффузную форму с равномерными изменениями ткани и узловую форму с чёткими уплотнениями. Узловая форма требует морфологического исследования для исключения атипии.</p>
                </div>
              </div>
              <aside className="clay clay-card-soft-mint p-5 md:p-6">
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика мастопатии</h2>
                <p className="text-clay-muted leading-relaxed mb-6">Комплекс методов помогает оценить структуру ткани, отличить диффузные изменения от узловых и выбрать тактику.</p>
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Тактика лечения</h2>
                <p className="text-clay-muted leading-relaxed mb-6">Подход определяется типом мастопатии, выраженностью симптомов и результатами обследования.</p>
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
                <p className="text-clay-muted leading-relaxed mb-7">От первого приёма до понятного плана наблюдения.</p>
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
                <div className="clay clay-card-mint p-6 relative overflow-hidden">
                  <h3 className="font-bold text-clay-dark text-xl mb-2">Бесплатное второе мнение</h3>
                  <p className="text-clay-text text-sm leading-relaxed mb-4">Вам уже назначили лечение или операцию по поводу мастопатии? Принесите снимки, онколог-маммолог проверит заключение и расскажет о возможных вариантах.</p>
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-white/65 border border-white/80 px-4 py-2.5 text-clay-dark text-sm font-bold mb-4">
                    Цена: 0 ₽
                  </div>
                  <button type="button" data-booking-btn="true" className="clay btn-clay-white text-sm py-2.5 w-full justify-center">
                    Обсудить заключение
                  </button>
                </div>
                <div className="clay clay-card p-6">
                  <h3 className="font-bold text-clay-dark text-lg mb-4">Когда стоит обратиться</h3>
                  <div className="space-y-3">
                    {VISIT_REASONS.map((item) => (
                      <div key={item.text} className="flex items-start gap-3">
                        <CheckCircle size={16} className="text-clay-mint mt-0.5 flex-shrink-0" />
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
                  <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Наши маммологи</h2>
                  <p className="text-clay-muted leading-relaxed max-w-2xl">Специалисты, которые ведут приём по маммологии в СПб.</p>
                </div>
                <div className="hidden sm:grid sm:grid-cols-2 gap-6 pt-8">
                  {SPECIALTY_DOCTORS.map((doc) => (
                    <DoctorCard key={doc.slug} doctor={doc} />
                  ))}
                </div>
                <div className="sm:hidden flex gap-4 pt-8 overflow-x-auto scroll-smooth snap-x snap-mandatory -mx-4 px-4 pb-4">
                  {SPECIALTY_DOCTORS.map((doc) => (
                    <div key={doc.slug} className="snap-start flex-shrink-0 w-[80vw]">
                      <DoctorCard doctor={doc} />
                    </div>
                  ))}
                </div>
              </div>
              <aside className="clay clay-card-lg p-5 md:p-6">
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Цены на маммологию в СПб</h2>
                <p className="text-clay-muted leading-relaxed mb-5">Базовые позиции для первичного визита. Полный перечень доступен в разделе цен.</p>
                <div className="divide-y divide-[color:var(--border-color)]">
                  {PRICE_CATEGORY.items.map((item) => (
                    <div key={item.name} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                      <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                      <span className="text-clay-mint font-bold text-sm whitespace-nowrap">{formatPriceLabel(item.price, item.isFrom)}</span>
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
              <div className="clay clay-card-soft-mint p-6 md:p-8">
                <Clock size={34} className="text-clay-mint mb-4" />
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Запишитесь к маммологу в Санкт-Петербурге</h2>
                <p className="text-clay-muted mb-5 leading-relaxed">Клиника Одинцова находится на Богатырском проспекте, рядом с м. Комендантский проспект и м. Старая Деревня.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2">
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
                    <a key={a.href} href={a.href} className="clay clay-card-soft-mint card-interactive card-interactive-mint p-5 flex items-start gap-3 group">
                      <BookOpen size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-mint transition-colors">{a.title}</p>
                        <p className="text-clay-muted text-xs">Читать статью</p>
                      </div>
                    </a>
                  ))}
                  {EXTRA_LINKS.map((a) => (
                    <a key={a.href} href={a.href} className="clay clay-card card-interactive card-interactive-mint p-5 flex items-start gap-3 group">
                      <Zap size={20} className="text-clay-mint mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-mint transition-colors">{a.title}</p>
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
        <FaqSection items={MASTOPATIYA_FAQ} title="Частые вопросы о мастопатии" />
      </div>
    </div>
  )
}
