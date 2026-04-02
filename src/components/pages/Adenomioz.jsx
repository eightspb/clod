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
    answer: 'Аденомиоз — состояние, при котором ткань эндометрия (внутренней оболочки матки) врастает в миометрий — мышечный слой стенки матки. Это вызывает утолщение стенок матки, воспаление и болезненные менструации. Аденомиоз отличается от эндометриоза локализацией: при эндометриозе очаги находятся за пределами матки.',
  },
  {
    question: 'Какие симптомы у аденомиоза?',
    answer: 'Классическая триада: болезненные менструации (боль начинается за 1–2 дня до месячных), обильные кровотечения со сгустками (часто приводят к анемии) и тазовая боль вне менструации. Также могут наблюдаться боль при половом контакте и трудности с зачатием.',
  },
  {
    question: 'Как диагностируют аденомиоз?',
    answer: 'Основные методы — трансвагинальное УЗИ (неоднородность миометрия, «окошки», асимметричное утолщение стенок) и МРТ малого таза (более информативна при диффузной форме). Гистологическое подтверждение возможно только после операции — при рутинном обследовании диагноз ставится клинически.',
  },
  {
    question: 'Можно ли вылечить аденомиоз без операции?',
    answer: 'Да. Медикаментозная терапия (прогестины, левоноргестрел-содержащая ВМС, агонисты ГнРГ) уменьшает боль и кровотечения. Гистерэктомия — радикальное решение, но показана не всем. Выбор зависит от выраженности симптомов, возраста и репродуктивных планов.',
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
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Сильная боль за 1–2 дня до и во время менструации' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Обильные менструации со сгустками крови' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Хроническая тазовая боль вне менструации' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Боль при половом контакте (диспареуния)' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Анемия на фоне обильных кровотечений' },
  { icon: <Eye size={20} className="text-clay-peach" />, text: 'Трудности с зачатием и невынашивание' },
]

const diagnostics = [
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Трансвагинальное УЗИ', desc: 'Выявляет неоднородность миометрия, асимметричное утолщение стенок матки и характерные «окошки» — косвенные признаки аденомиоза.' },
  { icon: <Eye size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'МРТ малого таза', desc: 'Более информативна при диффузном аденомиозе. Позволяет оценить глубину инвазии и дифференцировать с миомой матки.' },
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Клиническая оценка', desc: 'Сбор анамнеза, оценка болевого синдрома, анализ крови (гемоглобин, ферритин). Гинеколог формирует диагноз на основе совокупности данных.' },
]

const treatments = [
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Гормональная терапия', desc: 'Прогестины, ЛНГ-ВМС (Мирена), агонисты ГнРГ — уменьшают очаги, снижают кровотечение и болевой синдром.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Эмболизация маточных артерий', desc: 'Малоинвазивная методика: перекрытие кровоснабжения очагов аденомиоза. Сохраняет матку, применяется при определённых формах.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Хирургическое лечение', desc: 'Гистерэктомия — радикальный вариант при тяжёлом аденомиозе у женщин, не планирующих беременность. Решение принимается совместно с пациенткой.' },
]

const steps = [
  { n: '01', title: 'Приём гинеколога', desc: 'Сбор анамнеза, оценка характера боли и кровотечений, бимануальное исследование.' },
  { n: '02', title: 'Инструментальная диагностика', desc: 'Трансвагинальное УЗИ, при необходимости — МРТ малого таза. Лабораторный контроль (гемоглобин, ферритин).' },
  { n: '03', title: 'Постановка диагноза', desc: 'Гинеколог определяет форму аденомиоза (диффузный, очаговый, узловой) и степень распространённости.' },
  { n: '04', title: 'Подбор лечения', desc: 'Медикаментозная терапия, установка ЛНГ-ВМС или хирургическое лечение — в зависимости от клинической картины и планов пациентки.' },
  { n: '05', title: 'Наблюдение и контроль', desc: 'УЗИ-контроль через 3–6 месяцев, оценка эффективности терапии, коррекция при необходимости.' },
]

const relatedArticles = [
  { href: '/blog/adenomioz-prichiny-simptomy-lechenie', title: 'Аденомиоз: когда матка «болит изнутри»' },
  { href: '/blog/endometrioz-prichiny-simptomy', title: 'Эндометриоз: причины, симптомы и лечение' },
  { href: '/blog/tazovye-boli-u-zhenshchin', title: 'Тазовые боли у женщин: 6 причин' },
]

export function Adenomioz() {
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
                Аденомиоз:{' '}
                <span className="heading-accent">диагностика и лечение в СПб</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Приём гинеколога, УЗИ и подбор терапии при аденомиозе — в Клинике Одинцова на Богатырском проспекте, рядом с м. Комендантский проспект.
              </p>
              <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl">
                Аденомиоз — одна из частых причин болезненных и обильных менструаций. Гинеколог определит форму заболевания и подберёт лечение, которое облегчит симптомы и сохранит репродуктивную функцию.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary gap-2">
                  Записаться к гинекологу
                  <ArrowRight size={16} />
                </button>
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary">
                  Получить второе мнение
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
                { val: '20–35', unit: '%', label: 'Женщин старше 35 лет имеют признаки аденомиоза' },
                { val: 'УЗИ', unit: '', label: 'Первичный метод диагностики' },
                { val: 'ЛНГ-ВМС', unit: '', label: 'Эффективный метод лечения' },
                { val: '3–6', unit: 'мес', label: 'До контрольного обследования' },
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
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Что такое аденомиоз</h2>
            <p className="text-clay-muted mb-4 max-w-2xl leading-relaxed">
              Аденомиоз — состояние, при котором ткань эндометрия (внутренней оболочки матки) прорастает в миометрий — мышечный слой стенки матки. Это приводит к утолщению стенок, хроническому воспалению и боли при каждой менструации.
            </p>
            <p className="text-clay-muted mb-6 max-w-2xl leading-relaxed">
              В отличие от эндометриоза, при котором очаги находятся за пределами матки, аденомиоз поражает саму матку. Он бывает диффузным (распространённым), очаговым и узловым (аденомиома). Часто сочетается с миомой матки и эндометриозом.
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика аденомиоза</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Сочетание инструментальных и клинических методов для точного диагноза</p>
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Лечение аденомиоза</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Тактика зависит от формы, выраженности симптомов и репродуктивных планов</p>
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
                <p className="text-clay-muted mb-6 leading-relaxed">От диагностики до контроля над симптомами</p>
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
                    Вам предложили гистерэктомию или другое лечение? Принесите результаты УЗИ и анализов — гинеколог оценит ситуацию и обсудит альтернативы.
                  </p>
                  <div className="flex items-center gap-2 bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-clay-dark text-sm font-bold">
                    Цена: 0 ₽
                  </div>
                  <button type="button" data-booking-btn="true" className="clay btn-clay-white mt-4 text-sm py-2.5 w-full justify-center">
                    Получить второе мнение
                  </button>
                </div>
                <div className="clay clay-card card-interactive p-6">
                  <h3 className="font-bold text-clay-dark text-lg mb-3">Когда стоит обратиться</h3>
                  <div className="space-y-2.5">
                    {[
                      'Очень болезненные менструации',
                      'Обильные месячные со сгустками',
                      'Хроническая боль внизу живота',
                      'Анемия на фоне кровотечений',
                      'Трудности с зачатием',
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div className="mt-4">
              <a href="/gynecology" className="clay clay-card card-interactive p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow inline-flex max-w-md">
                <Zap size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-peach transition-colors">Гинекология — обзор направления</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Приём гинеколога и диагностика в Клинике Одинцова</p>
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
        <FaqSection items={ADENOMIOZ_FAQ} title="Частые вопросы об аденомиозе" />
      </div>
    </div>
  )
}
