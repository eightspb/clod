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
    answer: 'Гипотиреоз — состояние, при котором щитовидная железа вырабатывает недостаточное количество гормонов (тироксина и трийодтиронина). Из-за этого замедляются обменные процессы в организме. Различают первичный гипотиреоз (повреждение самой железы), вторичный (нарушение регуляции со стороны гипофиза) и субклинический (ТТГ повышен, но Т4 в норме).',
  },
  {
    question: 'Как проявляется гипотиреоз?',
    answer: 'Наиболее частые симптомы: хроническая усталость, сонливость, набор веса без изменения питания, зябкость, отёчность лица и конечностей, запоры, сухость кожи, выпадение волос, брадикардия, снижение концентрации и памяти. Симптомы нарастают постепенно и нередко остаются незамеченными долгое время.',
  },
  {
    question: 'Как диагностируют гипотиреоз?',
    answer: 'Первый шаг — анализ крови на ТТГ (тиреотропный гормон). При отклонении дополнительно определяют свободный Т4, антитела к ТПО. УЗИ щитовидной железы оценивает структуру и размер. Окончательный диагноз ставит эндокринолог после очного приёма.',
  },
  {
    question: 'Нужно ли принимать таблетки пожизненно?',
    answer: 'При первичном гипотиреозе, вызванном аутоиммунным тиреоидитом или операцией на щитовидной железе, — как правило, да. При субклиническом гипотиреозе и некоторых преходящих формах врач может выбрать наблюдение без лечения или временную терапию. Решение принимается индивидуально.',
  },
  {
    question: 'Можно ли вылечить гипотиреоз без таблеток?',
    answer: 'Первичный гипотиреоз, связанный с разрушением ткани железы, требует заместительной терапии. Некоторые транзиторные формы (например, послеродовой тиреоидит) могут разрешиться самостоятельно. Самостоятельно отменять назначенное лечение не следует — контроль уровня ТТГ обязателен.',
  },
  {
    question: 'Когда нужно обратиться к эндокринологу?',
    answer: 'Поводом для консультации служат: постоянная усталость без явной причины, беспричинный набор веса, зябкость, отёки, ухудшение памяти или концентрации, изменение лабораторных показателей — в том числе случайно выявленный повышенный ТТГ.',
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
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Анализ крови (ТТГ, Т4 св.)', desc: 'Уровень ТТГ — первичный скрининговый показатель. При его отклонении определяют свободный тироксин (Т4) и антитела к ТПО.' },
  { icon: <Eye size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'УЗИ щитовидной железы', desc: 'Оценивает объём, структуру, эхогенность и признаки аутоиммунного воспаления. Дополняет лабораторные данные.' },
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Консультация эндокринолога', desc: 'Сбор анамнеза, интерпретация анализов, клиническая оценка симптомов — и подбор тактики ведения.' },
]

const treatments = [
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Заместительная терапия', desc: 'Левотироксин — стандарт лечения при манифестном гипотиреозе. Доза подбирается индивидуально по ТТГ под контролем эндокринолога.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Наблюдение при субклиническом', desc: 'При лёгком повышении ТТГ без симптоматики врач может выбрать динамическое наблюдение с лабораторным контролем каждые 6 месяцев.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Регулярный мониторинг', desc: 'Контроль ТТГ, коррекция дозы по результатам — обязательный элемент ведения. Частота зависит от стабильности состояния.' },
]

const steps = [
  { n: '01', title: 'Консультация эндокринолога', desc: 'Врач собирает анамнез, оценивает симптомы и назначает лабораторное обследование.' },
  { n: '02', title: 'Лабораторная и инструментальная диагностика', desc: 'ТТГ, свободный Т4, антитела к ТПО, УЗИ щитовидной железы.' },
  { n: '03', title: 'Постановка диагноза', desc: 'Эндокринолог интерпретирует результаты, определяет форму гипотиреоза.' },
  { n: '04', title: 'Подбор лечения', desc: 'При необходимости — назначение левотироксина с начальной дозой, безопасной для конкретного пациента.' },
  { n: '05', title: 'Контроль и корректировка', desc: 'Повторный анализ ТТГ через 6–8 недель, коррекция дозы, затем — наблюдение раз в 6–12 месяцев.' },
]

const relatedArticles = [
  { href: '/blog/gipotireoz-simptomy-lechenie', title: 'Гипотиреоз: симптомы, диагностика и лечение' },
  { href: '/blog/simptomy-gipotireoza-i-gipertireoza', title: 'Симптомы гипотиреоза и гипертиреоза: в чём разница' },
]

export function Gipotireoz() {
  return (
    <div>
      <section className="relative overflow-hidden pt-6 pb-10">
        <div className="container-clay relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[0.618fr_0.382fr] gap-10 lg:gap-16 items-start">
            <div>
              <div className="badge-specialty-blue-filled inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5">
                <Zap size={12} />
                Эндокринология · Приморский район СПб
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
                Гипотиреоз:{' '}
                <span className="heading-accent">диагностика и лечение в Санкт-Петербурге</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Приём эндокринолога, анализы на гормоны щитовидной железы и подбор лечения — в Клинике Одинцова на Богатырском проспекте, рядом с м. Комендантский проспект.
              </p>
              <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl">
                Гипотиреоз хорошо поддаётся лечению при правильно подобранной дозе. Главное — вовремя выявить состояние и начать наблюдение у эндокринолога.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary gap-2">
                  Записаться к эндокринологу
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
                { val: 'ТТГ', unit: '', label: 'Первичный скрининговый показатель' },
                { val: '2–3', unit: '%', label: 'Распространённость в популяции' },
                { val: '6–8', unit: 'нед', label: 'До контрольного анализа после начала терапии' },
                { val: 'Регулярно', unit: '', label: 'Мониторинг ТТГ при лечении' },
              ].map((s) => (
                <div key={s.label} className="clay clay-card card-interactive p-4 text-center">
                  <div className="flex items-end justify-center gap-0.5">
                    <span className="text-3xl sm:text-4xl font-serif font-light text-clay-blue leading-none">{s.val}</span>
                    {s.unit && <span className="text-lg font-bold text-clay-blue leading-none pb-0.5">{s.unit}</span>}
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
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Что такое гипотиреоз</h2>
            <p className="text-clay-muted mb-4 max-w-2xl leading-relaxed">
              Гипотиреоз — снижение функции щитовидной железы, при котором в организм поступает недостаточно тиреоидных гормонов. Это замедляет обмен веществ и затрагивает работу большинства органов.
            </p>
            <p className="text-clay-muted mb-6 max-w-2xl leading-relaxed">
              Наиболее частая причина — аутоиммунный тиреоидит (болезнь Хашимото). Также гипотиреоз развивается после удаления щитовидной железы, лечения радиоактивным йодом или как следствие дефицита йода.
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика гипотиреоза</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Диагноз ставится по анализам крови и данным осмотра эндокринолога</p>
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Лечение гипотиреоза</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Подход зависит от формы, степени тяжести и сопутствующих состояний</p>
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
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">Маршрут пациента</h2>
                <p className="text-clay-muted mb-6 leading-relaxed">От первого приёма до стабильных показателей</p>
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
                <div className="clay clay-card-blue p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/15 -translate-y-1/2 translate-x-1/3" />
                  <h3 className="font-bold text-clay-dark text-xl mb-2">Второе мнение эндокринолога</h3>
                  <p className="text-clay-text text-sm leading-relaxed mb-4">
                    Вам поставили диагноз в другой клинике или назначили лечение? Принесите результаты анализов — эндокринолог рассмотрит ситуацию и даст своё заключение.
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
                      'Анализ показал повышенный ТТГ',
                      'Постоянная усталость без видимых причин',
                      'Набор веса без изменений в питании',
                      'Выпадение волос, сухость кожи',
                      'Вы принимаете тироксин и хотите уточнить дозу',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <CheckCircle size={16} className="text-clay-blue flex-shrink-0" />
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Наши эндокринологи</h2>
              <p className="text-clay-muted">Ведут приём по эндокринологии в Приморском районе СПб</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {SPECIALTY_DOCTORS.map((doc) => (
                <DoctorCard key={doc.slug} doctor={doc} />
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Цены на эндокринологию в СПб</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {PRICE_CATEGORY.items.map((item) => (
                <div key={item.name} className="clay clay-card card-interactive flex items-center justify-between gap-4 px-5 py-4">
                  <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                  <span className="text-clay-blue font-bold text-sm whitespace-nowrap">{formatPriceLabel(item.price, item.isFrom)}</span>
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
                <a key={a.href} href={a.href} className="clay clay-card-soft-blue card-interactive p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
                  <BookOpen size={20} className="text-clay-blue mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-blue transition-colors">{a.title}</p>
                    <p className="text-clay-muted text-xs">Читать статью →</p>
                  </div>
                </a>
              ))}
            </div>
            <div className="mt-4">
              <a href="/endocrinology" className="clay clay-card card-interactive p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
                <Zap size={20} className="text-clay-blue mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-blue transition-colors">Эндокринология — обзор направления</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Консультация, анализы и ведение в Клинике Одинцова</p>
                </div>
              </a>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card-soft-blue p-6 md:p-8 text-center">
              <Clock size={40} className="text-clay-blue mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
                Запишитесь к эндокринологу в Санкт-Петербурге
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
        <FaqSection items={GIPOTIREOZ_FAQ} title="Частые вопросы о гипотиреозе" />
      </div>
    </div>
  )
}
