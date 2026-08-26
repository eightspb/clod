import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, BookOpen } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { DoctorCard } from '../DoctorCard.jsx'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { HeroDoctorCard } from '../HeroDoctorCard.jsx'

export const TIREOIDIT_FAQ = [
  {
    question: 'Что такое тиреоидит Хашимото?',
    answer: 'Тиреоидит Хашимото (аутоиммунный тиреоидит) - хроническое заболевание, при котором иммунная система вырабатывает антитела против клеток щитовидной железы. Это приводит к постепенному разрушению ткани железы и, как следствие, к снижению выработки гормонов (гипотиреозу). Самая частая причина гипотиреоза в регионах с достаточным потреблением йода.',
  },
  {
    question: 'Как проявляется тиреоидит Хашимото?',
    answer: 'Заболевание может долго протекать бессимптомно. По мере снижения функции железы появляются симптомы гипотиреоза: усталость, зябкость, набор веса, отёчность, сухость кожи, выпадение волос. В начальной стадии возможен хашитоксикоз - короткий период повышенной функции с тревожностью, сердцебиением и раздражительностью.',
  },
  {
    question: 'Какие анализы нужны для диагностики?',
    answer: 'Основные анализы: ТТГ (скрининг), свободный Т4, антитела к ТПО (анти-ТПО) и антитела к тиреоглобулину (анти-ТГ). УЗИ щитовидной железы оценивает структуру, объём и признаки аутоиммунного воспаления (сниженная эхогенность, неоднородность). Диагноз ставит эндокринолог по совокупности данных.',
  },
  {
    question: 'Нужно ли лечить тиреоидит Хашимото?',
    answer: 'Сам аутоиммунный процесс специфического лечения не имеет. Лечат его следствие - гипотиреоз (заместительная терапия левотироксином). При эутиреозе (нормальные гормоны) и повышенных антителах - динамическое наблюдение: контроль ТТГ и УЗИ раз в 6-12 месяцев.',
  },
  {
    question: 'Влияет ли питание на течение тиреоидита Хашимото?',
    answer: 'Избыточное потребление йода может усилить аутоиммунное воспаление при Хашимото. Селен участвует в конверсии Т4 в Т3 и защите клеток железы. Цинк, железо и витамин D также влияют на функцию щитовидной железы. Диетические рекомендации подбирает врач индивидуально.',
  },
  {
    question: 'Когда обратиться к эндокринологу?',
    answer: 'Поводом для консультации служат: повышенный ТТГ или антитела к ТПО в анализах, симптомы гипотиреоза (усталость, набор веса, зябкость), увеличение щитовидной железы (зоб), семейная история аутоиммунных заболеваний щитовидной железы.',
  },
]

const SPECIALTY_DOCTORS = DOCTORS.filter((d) =>
  /эндокринолог/i.test(d.specialization)
)

const PRICE_CATEGORY = getShortPriceCategoryBySlug('endocrinology')

const symptoms = [
  { icon: <Eye size={20} className="text-clay-blue" />, text: 'Хроническая усталость и сонливость' },
  { icon: <Eye size={20} className="text-clay-blue" />, text: 'Набор веса без изменения питания' },
  { icon: <Eye size={20} className="text-clay-blue" />, text: 'Зябкость, непереносимость холода' },
  { icon: <Eye size={20} className="text-clay-blue" />, text: 'Сухость кожи, ломкость ногтей, выпадение волос' },
  { icon: <Eye size={20} className="text-clay-blue" />, text: 'Отёчность лица и конечностей' },
  { icon: <Eye size={20} className="text-clay-blue" />, text: 'Увеличение щитовидной железы (зоб)' },
]

const diagnostics = [
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Анализ крови (ТТГ, Т4, антитела)', desc: 'ТТГ и свободный Т4 - оценка функции. Анти-ТПО и анти-ТГ - маркеры аутоиммунного процесса. Повышенные антитела при нормальном ТТГ - повод для наблюдения.' },
  { icon: <Eye size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'УЗИ щитовидной железы', desc: 'Оценивает объём, структуру и эхогенность. При Хашимото типичны: сниженная эхогенность, неоднородная структура, иногда - узловые образования.' },
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Консультация эндокринолога', desc: 'Интерпретация результатов, клиническая оценка, определение стадии заболевания и выбор тактики - наблюдение или заместительная терапия.' },
]

const treatments = [
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Заместительная терапия', desc: 'Левотироксин при манифестном гипотиреозе. Доза подбирается индивидуально под контролем ТТГ. Цель - нормализация уровня гормонов и устранение симптомов.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Динамическое наблюдение', desc: 'При эутиреозе с повышенными антителами - контроль ТТГ и УЗИ каждые 6-12 месяцев. Лечение начинают при развитии гипотиреоза.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Коррекция микронутриентов', desc: 'Оценка уровня селена, витамина D, железа, цинка. При дефиците - коррекция, которая может улучшить функцию железы и самочувствие.' },
]

const steps = [
  { n: '01', title: 'Консультация эндокринолога', desc: 'Сбор анамнеза, оценка симптомов, пальпация щитовидной железы. Назначение обследования.' },
  { n: '02', title: 'Лабораторная диагностика', desc: 'ТТГ, свободный Т4, анти-ТПО, анти-ТГ. При необходимости - дополнительные показатели (Т3, витамин D, ферритин).' },
  { n: '03', title: 'УЗИ щитовидной железы', desc: 'Оценка структуры, объёма и признаков аутоиммунного воспаления. При узлах - решение о ТАБ (тонкоигольная биопсия).' },
  { n: '04', title: 'Определение тактики', desc: 'Наблюдение при эутиреозе или назначение левотироксина при гипотиреозе. Рекомендации по питанию и образу жизни.' },
  { n: '05', title: 'Регулярный мониторинг', desc: 'Контроль ТТГ через 6-8 недель после начала терапии, затем - раз в 6-12 месяцев. УЗИ - ежегодно.' },
]

const relatedArticles = [
  { href: '/blog/zabolevaniya-schitovidnoy-zhelezy', title: 'Заболевания щитовидной железы: гипотиреоз и Хашимото' },
  { href: '/blog/simptomy-gipotireoza-i-gipertireoza', title: 'Симптомы гипотиреоза и гипертиреоза: в чём разница' },
  { href: '/blog/autoimmunyye-zabolevaniya-u-zhenshchin', title: 'Аутоиммунные заболевания у женщин' },
]

const PAGE_STATS = [
  { val: '5-10', unit: '%', label: 'Распространённость среди женщин' },
  { val: 'Анти-ТПО', unit: '', label: 'Ключевой маркер аутоиммунного процесса' },
  { val: '×10', unit: '', label: 'Женщины болеют чаще мужчин' },
  { val: '6-12', unit: 'мес', label: 'Интервал контрольных обследований' },
]

const VISIT_REASONS = [
  { text: 'Повышенные антитела к ТПО в анализах' },
  { text: 'Увеличение щитовидной железы (зоб)' },
  { text: 'Симптомы гипотиреоза: усталость, набор веса' },
  { text: 'Семейная история заболеваний щитовидной железы' },
  { text: 'Хотите уточнить дозу левотироксина' },
]

const EXTRA_LINKS = [
  { href: '/endocrinology', title: 'Эндокринология - обзор направления', desc: 'Консультация, анализы и ведение в Клинике Одинцова' },
]

const PAGE = {
  specialtyLabel: 'Эндокринология, Приморский район СПб',
}

export function TireoiditKhashimoto() {
  return (
    <div className="bg-[color:var(--surface-page)]">
      <section className="relative overflow-hidden grain-overlay border-b border-[color:var(--border-color)] bg-[color:var(--surface-accent)]">
        <div className="absolute inset-0 hero-gradient pointer-events-none" />
        <div className="container-clay relative z-10 py-8 md:py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-12 items-center">
            <div className="max-w-3xl">
              <div className="badge-specialty-blue-filled inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5">
                <Zap size={12} />
                {PAGE.specialtyLabel}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl heading-display text-clay-dark leading-tight mb-5">
                Тиреоидит Хашимото:{' '}
                <span className="heading-accent">диагностика и лечение в СПб</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Приём эндокринолога, анализы на антитела и гормоны щитовидной железы в Клинике Одинцова.
              </p>
              <p className="text-clay-muted leading-relaxed mb-6 max-w-2xl">
                Тиреоидит Хашимото часто требует наблюдения, а не срочных решений. Эндокринолог поможет оценить анализы, УЗИ и риски гипотиреоза.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary btn-specialty-blue gap-2">
                  Записаться к эндокринологу
                  <ArrowRight size={16} />
                </button>
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary">
                  Проверить щитовидную железу
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
                      <span className="text-3xl sm:text-4xl font-serif font-light text-clay-blue leading-none">{s.val}</span>
                      {s.unit && <span className="text-sm font-bold text-clay-blue leading-none pb-1">{s.unit}</span>}
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">Что такое тиреоидит Хашимото</h2>
                <div className="space-y-4 text-clay-muted leading-relaxed">
                  <p>Тиреоидит Хашимото - хроническое заболевание, при котором иммунная система атакует клетки щитовидной железы. Антитела вызывают постепенное разрушение ткани железы и снижение выработки гормонов.</p>
                  <p>Это частая причина гипотиреоза. Заболевание может долго протекать бессимптомно, поэтому важны контроль ТТГ, антител и УЗИ по индивидуальному графику.</p>
                </div>
              </div>
              <aside className="clay clay-card-soft-blue p-5 md:p-6">
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика тиреоидита Хашимото</h2>
                <p className="text-clay-muted leading-relaxed mb-6">Лабораторные анализы и УЗИ позволяют поставить диагноз без инвазивных процедур в большинстве случаев.</p>
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Лечение тиреоидита Хашимото</h2>
                <p className="text-clay-muted leading-relaxed mb-6">Подход зависит от стадии заболевания, уровня гормонов и самочувствия пациента.</p>
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Маршрут пациента</h2>
                <p className="text-clay-muted leading-relaxed mb-7">От первых анализов до стабильного наблюдения.</p>
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
                <div className="clay clay-card-blue p-6 relative overflow-hidden">
                  <h3 className="font-bold text-clay-dark text-xl mb-2">Второе мнение эндокринолога</h3>
                  <p className="text-clay-text text-sm leading-relaxed mb-4">Вам поставили диагноз тиреоидит Хашимото и назначили лечение? Принесите анализы и результаты УЗИ, эндокринолог оценит ситуацию и даст своё заключение.</p>
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
                        <CheckCircle size={16} className="text-clay-blue mt-0.5 flex-shrink-0" />
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
                  <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Наши эндокринологи</h2>
                  <p className="text-clay-muted leading-relaxed max-w-2xl">Ведут приём по эндокринологии в Приморском районе СПб.</p>
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Цены на эндокринологию в СПб</h2>
                <p className="text-clay-muted leading-relaxed mb-5">Основные позиции для первичного визита. Полный перечень доступен в разделе цен.</p>
                <div className="divide-y divide-[color:var(--border-color)]">
                  {PRICE_CATEGORY.items.map((item) => (
                    <div key={item.name} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                      <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                      <span className="text-clay-blue font-bold text-sm whitespace-nowrap">{formatPriceLabel(item.price, item.isFrom)}</span>
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
              <div className="clay clay-card-soft-blue p-6 md:p-8">
                <Clock size={34} className="text-clay-blue mb-4" />
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Запишитесь к эндокринологу в Санкт-Петербурге</h2>
                <p className="text-clay-muted mb-5 leading-relaxed">Клиника Одинцова находится на Богатырском проспекте, рядом с м. Комендантский проспект и м. Старая Деревня.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="button" data-booking-btn="true" className="clay btn-clay-primary btn-specialty-blue gap-2">
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
                    <a key={a.href} href={a.href} className="clay clay-card-soft-blue card-interactive card-interactive-blue p-5 flex items-start gap-3 group">
                      <BookOpen size={20} className="text-clay-blue mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-blue transition-colors">{a.title}</p>
                        <p className="text-clay-muted text-xs">Читать статью</p>
                      </div>
                    </a>
                  ))}
                  {EXTRA_LINKS.map((a) => (
                    <a key={a.href} href={a.href} className="clay clay-card card-interactive card-interactive-blue p-5 flex items-start gap-3 group">
                      <Zap size={20} className="text-clay-blue mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-blue transition-colors">{a.title}</p>
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
        <FaqSection items={TIREOIDIT_FAQ} title="Частые вопросы о тиреоидите Хашимото" />
      </div>
    </div>
  )
}
