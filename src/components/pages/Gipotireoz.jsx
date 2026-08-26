import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, BookOpen } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { DoctorCard } from '../DoctorCard.jsx'
import { HeroDoctorCard } from '../HeroDoctorCard.jsx'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'

export const GIPOTIREOZ_FAQ = [
  {
    question: 'Что такое гипотиреоз?',
    answer: 'Гипотиреоз - состояние, при котором щитовидная железа вырабатывает недостаточное количество гормонов (тироксина и трийодтиронина). Из-за этого замедляются обменные процессы в организме. Различают первичный гипотиреоз (повреждение самой железы), вторичный (нарушение регуляции со стороны гипофиза) и субклинический (ТТГ повышен, но Т4 в норме).',
  },
  {
    question: 'Как проявляется гипотиреоз?',
    answer: 'Наиболее частые симптомы: хроническая усталость, сонливость, набор веса без изменения питания, зябкость, отёчность лица и конечностей, запоры, сухость кожи, выпадение волос, брадикардия, снижение концентрации и памяти. Симптомы нарастают постепенно и нередко остаются незамеченными долгое время.',
  },
  {
    question: 'Как диагностируют гипотиреоз?',
    answer: 'Первый шаг - анализ крови на ТТГ (тиреотропный гормон). При отклонении дополнительно определяют свободный Т4, антитела к ТПО. УЗИ щитовидной железы оценивает структуру и размер. Окончательный диагноз ставит эндокринолог после очного приёма.',
  },
  {
    question: 'Нужно ли принимать таблетки пожизненно?',
    answer: 'При первичном гипотиреозе, вызванном аутоиммунным тиреоидитом или операцией на щитовидной железе, - как правило, да. При субклиническом гипотиреозе и некоторых преходящих формах врач может выбрать наблюдение без лечения или временную терапию. Решение принимается индивидуально.',
  },
  {
    question: 'Можно ли вылечить гипотиреоз без таблеток?',
    answer: 'Первичный гипотиреоз, связанный с разрушением ткани железы, требует заместительной терапии. Некоторые транзиторные формы (например, послеродовой тиреоидит) могут разрешиться самостоятельно. Самостоятельно отменять назначенное лечение не следует - контроль уровня ТТГ обязателен.',
  },
  {
    question: 'Когда нужно обратиться к эндокринологу?',
    answer: 'Поводом для консультации служат: постоянная усталость без явной причины, беспричинный набор веса, зябкость, отёки, ухудшение памяти или концентрации, изменение лабораторных показателей - в том числе случайно выявленный повышенный ТТГ.',
  },
]

const SPECIALTY_DOCTORS = DOCTORS.filter((d) =>
  /эндокринолог/i.test(d.specialization)
)

const PRICE_CATEGORY = getShortPriceCategoryBySlug('endocrinology')

const symptoms = [
  { icon: <Eye size={20} className="text-clay-blue" />, text: 'Постоянная усталость и сонливость' },
  { icon: <Eye size={20} className="text-clay-blue" />, text: 'Набор веса при обычном питании' },
  { icon: <Eye size={20} className="text-clay-blue" />, text: 'Зябкость, плохая переносимость холода' },
  { icon: <Eye size={20} className="text-clay-blue" />, text: 'Отёчность лица, рук и ног' },
  { icon: <Eye size={20} className="text-clay-blue" />, text: 'Сухость кожи и выпадение волос' },
  { icon: <Eye size={20} className="text-clay-blue" />, text: 'Замедленное сердцебиение, запоры' },
]

const diagnostics = [
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Анализ крови (ТТГ, Т4 св.)', desc: 'Уровень ТТГ - первичный скрининговый показатель. При его отклонении определяют свободный тироксин (Т4) и антитела к ТПО.' },
  { icon: <Eye size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'УЗИ щитовидной железы', desc: 'Оценивает объём, структуру, эхогенность и признаки аутоиммунного воспаления. Дополняет лабораторные данные.' },
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Консультация эндокринолога', desc: 'Сбор анамнеза, интерпретация анализов, клиническая оценка симптомов - и подбор тактики ведения.' },
]

const treatments = [
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Заместительная терапия', desc: 'Левотироксин - стандарт лечения при манифестном гипотиреозе. Доза подбирается индивидуально по ТТГ под контролем эндокринолога.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Наблюдение при субклиническом', desc: 'При лёгком повышении ТТГ без симптоматики врач может выбрать динамическое наблюдение с лабораторным контролем каждые 6 месяцев.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Регулярный мониторинг', desc: 'Контроль ТТГ, коррекция дозы по результатам - обязательный элемент ведения. Частота зависит от стабильности состояния.' },
]

const steps = [
  { n: '01', title: 'Консультация эндокринолога', desc: 'Врач собирает анамнез, оценивает симптомы и назначает лабораторное обследование.' },
  { n: '02', title: 'Лабораторная и инструментальная диагностика', desc: 'ТТГ, свободный Т4, антитела к ТПО, УЗИ щитовидной железы.' },
  { n: '03', title: 'Постановка диагноза', desc: 'Эндокринолог интерпретирует результаты, определяет форму гипотиреоза.' },
  { n: '04', title: 'Подбор лечения', desc: 'При необходимости - назначение левотироксина с начальной дозой, безопасной для конкретного пациента.' },
  { n: '05', title: 'Контроль и корректировка', desc: 'Повторный анализ ТТГ через 6-8 недель, коррекция дозы, затем - наблюдение раз в 6-12 месяцев.' },
]

const relatedArticles = [
  { href: '/blog/gipotireoz-simptomy-lechenie', title: 'Гипотиреоз: симптомы, диагностика и лечение' },
  { href: '/blog/simptomy-gipotireoza-i-gipertireoza', title: 'Симптомы гипотиреоза и гипертиреоза: в чём разница' },
]

const PAGE_STATS = [
  { val: 'ТТГ', unit: '', label: 'Первичный скрининговый показатель' },
  { val: '2-3', unit: '%', label: 'Распространённость в популяции' },
  { val: '6-8', unit: 'нед', label: 'До контрольного анализа после начала терапии' },
  { val: 'Регулярно', unit: '', label: 'Мониторинг ТТГ при лечении' },
]

const VISIT_REASONS = [
  { text: 'Анализ показал повышенный ТТГ' },
  { text: 'Постоянная усталость без видимых причин' },
  { text: 'Набор веса без изменений в питании' },
  { text: 'Выпадение волос, сухость кожи' },
  { text: 'Вы принимаете тироксин и хотите уточнить дозу' },
]

const EXTRA_LINKS = [
  { href: '/endocrinology', title: 'Эндокринология - обзор направления', desc: 'Консультация, анализы и ведение в Клинике Одинцова' },
]

const PAGE = {
  specialtyLabel: 'Эндокринология, Приморский район СПб',
}

export function Gipotireoz() {
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
                Гипотиреоз:{' '}
                <span className="heading-accent">диагностика и лечение в Санкт-Петербурге</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Приём эндокринолога, анализы на гормоны щитовидной железы и подбор лечения в Клинике Одинцова.
              </p>
              <p className="text-clay-muted leading-relaxed mb-6 max-w-2xl">
                Гипотиреоз требует точной диагностики и регулярного контроля. Эндокринолог поможет разобрать анализы и выбрать тактику наблюдения или терапии.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary btn-specialty-blue gap-2">
                  Записаться к эндокринологу
                  <ArrowRight size={16} />
                </button>
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary">
                  Разобрать анализы
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">Что такое гипотиреоз</h2>
                <div className="space-y-4 text-clay-muted leading-relaxed">
                  <p>Гипотиреоз - снижение функции щитовидной железы, при котором в организм поступает недостаточно тиреоидных гормонов. Это замедляет обмен веществ и затрагивает работу большинства органов.</p>
                  <p>Наиболее частая причина - аутоиммунный тиреоидит. Также гипотиреоз развивается после удаления щитовидной железы, лечения радиоактивным йодом или как следствие дефицита йода.</p>
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика гипотиреоза</h2>
                <p className="text-clay-muted leading-relaxed mb-6">Диагноз ставится по анализам крови, УЗИ и данным очного осмотра эндокринолога.</p>
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Лечение гипотиреоза</h2>
                <p className="text-clay-muted leading-relaxed mb-6">Подход зависит от формы, степени тяжести, симптомов и сопутствующих состояний.</p>
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
                <p className="text-clay-muted leading-relaxed mb-7">От первого приёма до стабильных показателей.</p>
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
                  <p className="text-clay-text text-sm leading-relaxed mb-4">Вам поставили диагноз в другой клинике или назначили лечение? Принесите результаты анализов, эндокринолог рассмотрит ситуацию и даст своё заключение.</p>
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-white/65 border border-white/80 px-4 py-2.5 text-clay-dark text-sm font-bold mb-4">
                    Цена: 0 ₽
                  </div>
                  <button type="button" data-booking-btn="true" className="clay btn-clay-white text-sm py-2.5 w-full justify-center">
                    Разобрать анализы
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
        <FaqSection items={GIPOTIREOZ_FAQ} title="Частые вопросы о гипотиреозе" />
      </div>
    </div>
  )
}
