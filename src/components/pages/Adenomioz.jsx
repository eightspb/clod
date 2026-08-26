import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, BookOpen } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { DoctorCard } from '../DoctorCard.jsx'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { HeroDoctorCard } from '../HeroDoctorCard.jsx'

export const ADENOMIOZ_FAQ = [
  {
    question: 'Что такое аденомиоз?',
    answer: 'Аденомиоз - состояние, при котором ткань эндометрия (внутренней оболочки матки) врастает в миометрий - мышечный слой стенки матки. Это вызывает утолщение стенок матки, воспаление и болезненные менструации. Аденомиоз отличается от эндометриоза локализацией: при эндометриозе очаги находятся за пределами матки.',
  },
  {
    question: 'Какие симптомы у аденомиоза?',
    answer: 'Классическая триада: болезненные менструации (боль начинается за 1-2 дня до месячных), обильные кровотечения со сгустками (часто приводят к анемии) и тазовая боль вне менструации. Также могут наблюдаться боль при половом контакте и трудности с зачатием.',
  },
  {
    question: 'Как диагностируют аденомиоз?',
    answer: 'Основные методы - трансвагинальное УЗИ (неоднородность миометрия, «окошки», асимметричное утолщение стенок) и МРТ малого таза (более информативна при диффузной форме). Гистологическое подтверждение возможно только после операции - при рутинном обследовании диагноз ставится клинически.',
  },
  {
    question: 'Можно ли вылечить аденомиоз без операции?',
    answer: 'Да. Медикаментозная терапия (прогестины, левоноргестрел-содержащая ВМС, агонисты ГнРГ) уменьшает боль и кровотечения. Гистерэктомия - радикальное решение, но показана не всем. Выбор зависит от выраженности симптомов, возраста и репродуктивных планов.',
  },
  {
    question: 'Влияет ли аденомиоз на возможность забеременеть?',
    answer: 'Аденомиоз может затруднять имплантацию эмбриона и повышать риск невынашивания. При планировании беременности гинеколог подберёт тактику лечения, которая улучшит условия для зачатия. В ряде случаев медикаментозная подготовка перед ЭКО повышает шансы на успех.',
  },
  {
    question: 'Когда нужно обратиться к гинекологу?',
    answer: 'Поводом для консультации служат: очень болезненные менструации (требующие обезболивания), обильные месячные со сгустками, хроническая боль внизу живота, боль при половом контакте, безуспешные попытки забеременеть.',
  },
]

const SPECIALTY_DOCTORS = DOCTORS.filter((d) =>
  /гинеколог/i.test(d.specialization)
)

const PRICE_CATEGORY = getShortPriceCategoryBySlug('gynecology')

const symptoms = [
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Сильная боль за 1-2 дня до и во время менструации' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Обильные менструации со сгустками крови' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Хроническая тазовая боль вне менструации' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Боль при половом контакте (диспареуния)' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Анемия на фоне обильных кровотечений' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Трудности с зачатием и невынашивание' },
]

const diagnostics = [
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Трансвагинальное УЗИ', desc: 'Выявляет неоднородность миометрия, асимметричное утолщение стенок матки и характерные «окошки» - косвенные признаки аденомиоза.' },
  { icon: <Eye size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'МРТ малого таза', desc: 'Более информативна при диффузном аденомиозе. Позволяет оценить глубину инвазии и дифференцировать с миомой матки.' },
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Клиническая оценка', desc: 'Сбор анамнеза, оценка болевого синдрома, анализ крови (гемоглобин, ферритин). Гинеколог формирует диагноз на основе совокупности данных.' },
]

const treatments = [
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Гормональная терапия', desc: 'Прогестины, ЛНГ-ВМС (Мирена), агонисты ГнРГ - уменьшают очаги, снижают кровотечение и болевой синдром.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Эмболизация маточных артерий', desc: 'Малоинвазивная методика: перекрытие кровоснабжения очагов аденомиоза. Сохраняет матку, применяется при определённых формах.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Хирургическое лечение', desc: 'Гистерэктомия - радикальный вариант при тяжёлом аденомиозе у женщин, не планирующих беременность. Решение принимается совместно с пациенткой.' },
]

const steps = [
  { n: '01', title: 'Приём гинеколога', desc: 'Сбор анамнеза, оценка характера боли и кровотечений, бимануальное исследование.' },
  { n: '02', title: 'Инструментальная диагностика', desc: 'Трансвагинальное УЗИ, при необходимости - МРТ малого таза. Лабораторный контроль (гемоглобин, ферритин).' },
  { n: '03', title: 'Постановка диагноза', desc: 'Гинеколог определяет форму аденомиоза (диффузный, очаговый, узловой) и степень распространённости.' },
  { n: '04', title: 'Подбор лечения', desc: 'Медикаментозная терапия, установка ЛНГ-ВМС или хирургическое лечение - в зависимости от клинической картины и планов пациентки.' },
  { n: '05', title: 'Наблюдение и контроль', desc: 'УЗИ-контроль через 3-6 месяцев, оценка эффективности терапии, коррекция при необходимости.' },
]

const relatedArticles = [
  { href: '/blog/adenomioz-prichiny-simptomy-lechenie', title: 'Аденомиоз: когда матка «болит изнутри»' },
  { href: '/blog/endometrioz-prichiny-simptomy', title: 'Эндометриоз: причины, симптомы и лечение' },
  { href: '/blog/tazovye-boli-u-zhenshchin', title: 'Тазовые боли у женщин: 6 причин' },
]

const PAGE_STATS = [
  { val: '20-35', unit: '%', label: 'Женщин старше 35 лет имеют признаки аденомиоза' },
  { val: 'УЗИ', unit: '', label: 'Первичный метод диагностики' },
  { val: 'ЛНГ-ВМС', unit: '', label: 'Эффективный метод лечения' },
  { val: '3-6', unit: 'мес', label: 'До контрольного обследования' },
]

const VISIT_REASONS = [
  { text: 'Очень болезненные менструации' },
  { text: 'Обильные месячные со сгустками' },
  { text: 'Хроническая боль внизу живота' },
  { text: 'Анемия на фоне кровотечений' },
  { text: 'Трудности с зачатием' },
]

const EXTRA_LINKS = [
  { href: '/gynecology', title: 'Гинекология - обзор направления', desc: 'Приём гинеколога и диагностика в Клинике Одинцова' },
]

const PAGE = {
  specialtyLabel: 'Гинекология, Приморский район СПб',
}

export function Adenomioz() {
  return (
    <div className="bg-[color:var(--surface-page)]">
      <section className="relative overflow-hidden grain-overlay border-b border-[color:var(--border-color)] bg-[color:var(--surface-accent)]">
        <div className="absolute inset-0 hero-gradient pointer-events-none" />
        <div className="container-clay relative z-10 py-8 md:py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-12 items-center">
            <div className="max-w-3xl">
              <div className="badge-specialty-peach-filled inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5">
                <Zap size={12} />
                {PAGE.specialtyLabel}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl heading-display text-clay-dark leading-tight mb-5">
                Аденомиоз:{' '}
                <span className="heading-accent">диагностика и лечение в СПб</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Приём гинеколога, УЗИ и подбор терапии при аденомиозе в Клинике Одинцова на Богатырском проспекте.
              </p>
              <p className="text-clay-muted leading-relaxed mb-6 max-w-2xl">
                Аденомиоз часто связан с болезненными и обильными менструациями. Гинеколог определит форму заболевания и обсудит лечение с учётом ваших планов.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary btn-specialty-peach gap-2">
                  Записаться к гинекологу
                  <ArrowRight size={16} />
                </button>
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary">
                  Получить второе мнение
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">Что такое аденомиоз</h2>
                <div className="space-y-4 text-clay-muted leading-relaxed">
                  <p>Аденомиоз - состояние, при котором ткань эндометрия прорастает в миометрий, мышечный слой стенки матки. Это приводит к утолщению стенок, хроническому воспалению и боли при менструации.</p>
                  <p>В отличие от эндометриоза, при котором очаги находятся за пределами матки, аденомиоз поражает саму матку. Он бывает диффузным, очаговым и узловым.</p>
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика аденомиоза</h2>
                <p className="text-clay-muted leading-relaxed mb-6">Сочетание инструментальных и клинических методов помогает уточнить форму заболевания и степень выраженности симптомов.</p>
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Лечение аденомиоза</h2>
                <p className="text-clay-muted leading-relaxed mb-6">Тактика зависит от формы, выраженности симптомов, возраста и репродуктивных планов.</p>
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
                <p className="text-clay-muted leading-relaxed mb-7">От диагностики до контроля над симптомами.</p>
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
                  <p className="text-clay-text text-sm leading-relaxed mb-4">Вам предложили гистерэктомию или другое лечение? Принесите результаты УЗИ и анализов, гинеколог оценит ситуацию и обсудит альтернативы.</p>
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-white/65 border border-white/80 px-4 py-2.5 text-clay-dark text-sm font-bold mb-4">
                    Цена: 0 ₽
                  </div>
                  <button type="button" data-booking-btn="true" className="clay btn-clay-white text-sm py-2.5 w-full justify-center">
                    Получить второе мнение
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
        <FaqSection items={ADENOMIOZ_FAQ} title="Частые вопросы об аденомиозе" />
      </div>
    </div>
  )
}
