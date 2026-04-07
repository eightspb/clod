import { ArrowRight, Zap, Eye, Shield, Microscope, CheckCircle, Clock, BookOpen } from 'lucide-react'
import { useHeroFit } from '../../lib/useHeroFit.js'
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
    answer: 'Тиреоидит Хашимото (аутоиммунный тиреоидит) — хроническое заболевание, при котором иммунная система вырабатывает антитела против клеток щитовидной железы. Это приводит к постепенному разрушению ткани железы и, как следствие, к снижению выработки гормонов (гипотиреозу). Самая частая причина гипотиреоза в регионах с достаточным потреблением йода.',
  },
  {
    question: 'Как проявляется тиреоидит Хашимото?',
    answer: 'Заболевание может долго протекать бессимптомно. По мере снижения функции железы появляются симптомы гипотиреоза: усталость, зябкость, набор веса, отёчность, сухость кожи, выпадение волос. В начальной стадии возможен хашитоксикоз — короткий период повышенной функции с тревожностью, сердцебиением и раздражительностью.',
  },
  {
    question: 'Какие анализы нужны для диагностики?',
    answer: 'Основные анализы: ТТГ (скрининг), свободный Т4, антитела к ТПО (анти-ТПО) и антитела к тиреоглобулину (анти-ТГ). УЗИ щитовидной железы оценивает структуру, объём и признаки аутоиммунного воспаления (сниженная эхогенность, неоднородность). Диагноз ставит эндокринолог по совокупности данных.',
  },
  {
    question: 'Нужно ли лечить тиреоидит Хашимото?',
    answer: 'Сам аутоиммунный процесс специфического лечения не имеет. Лечат его следствие — гипотиреоз (заместительная терапия левотироксином). При эутиреозе (нормальные гормоны) и повышенных антителах — динамическое наблюдение: контроль ТТГ и УЗИ раз в 6–12 месяцев.',
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
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Анализ крови (ТТГ, Т4, антитела)', desc: 'ТТГ и свободный Т4 — оценка функции. Анти-ТПО и анти-ТГ — маркеры аутоиммунного процесса. Повышенные антитела при нормальном ТТГ — повод для наблюдения.' },
  { icon: <Eye size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'УЗИ щитовидной железы', desc: 'Оценивает объём, структуру и эхогенность. При Хашимото типичны: сниженная эхогенность, неоднородная структура, иногда — узловые образования.' },
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Консультация эндокринолога', desc: 'Интерпретация результатов, клиническая оценка, определение стадии заболевания и выбор тактики — наблюдение или заместительная терапия.' },
]

const treatments = [
  { icon: <Shield size={22} className="text-white" />, bg: 'icon-circle-blue', card: 'clay-card-soft-blue', title: 'Заместительная терапия', desc: 'Левотироксин при манифестном гипотиреозе. Доза подбирается индивидуально под контролем ТТГ. Цель — нормализация уровня гормонов и устранение симптомов.' },
  { icon: <Zap size={22} className="text-white" />, bg: 'icon-circle-peach', card: 'clay-card-soft-peach', title: 'Динамическое наблюдение', desc: 'При эутиреозе с повышенными антителами — контроль ТТГ и УЗИ каждые 6–12 месяцев. Лечение начинают при развитии гипотиреоза.' },
  { icon: <Microscope size={22} className="text-white" />, bg: 'icon-circle-mint', card: 'clay-card-soft-mint', title: 'Коррекция микронутриентов', desc: 'Оценка уровня селена, витамина D, железа, цинка. При дефиците — коррекция, которая может улучшить функцию железы и самочувствие.' },
]

const steps = [
  { n: '01', title: 'Консультация эндокринолога', desc: 'Сбор анамнеза, оценка симптомов, пальпация щитовидной железы. Назначение обследования.' },
  { n: '02', title: 'Лабораторная диагностика', desc: 'ТТГ, свободный Т4, анти-ТПО, анти-ТГ. При необходимости — дополнительные показатели (Т3, витамин D, ферритин).' },
  { n: '03', title: 'УЗИ щитовидной железы', desc: 'Оценка структуры, объёма и признаков аутоиммунного воспаления. При узлах — решение о ТАБ (тонкоигольная биопсия).' },
  { n: '04', title: 'Определение тактики', desc: 'Наблюдение при эутиреозе или назначение левотироксина при гипотиреозе. Рекомендации по питанию и образу жизни.' },
  { n: '05', title: 'Регулярный мониторинг', desc: 'Контроль ТТГ через 6–8 недель после начала терапии, затем — раз в 6–12 месяцев. УЗИ — ежегодно.' },
]

const relatedArticles = [
  { href: '/blog/zabolevaniya-schitovidnoy-zhelezy', title: 'Заболевания щитовидной железы: гипотиреоз и Хашимото' },
  { href: '/blog/simptomy-gipotireoza-i-gipertireoza', title: 'Симптомы гипотиреоза и гипертиреоза: в чём разница' },
  { href: '/blog/autoimmunyye-zabolevaniya-u-zhenshchin', title: 'Аутоиммунные заболевания у женщин' },
]

export function TireoiditKhashimoto() {
  const heroRef = useHeroFit()
  return (
    <div>
      <section ref={heroRef} className="relative overflow-hidden pt-6 pb-10">
        <div className="container-clay relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[0.618fr_0.382fr] gap-10 lg:gap-16 items-start">
            <div>
              <div className="badge-specialty-blue-filled inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5">
                <Zap size={12} />
                Эндокринология · Приморский район СПб
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-clay-dark leading-tight mb-5">
                Тиреоидит Хашимото:{' '}
                <span className="heading-accent">диагностика и лечение в СПб</span>
              </h1>
              <p className="text-lg text-clay-muted leading-relaxed mb-4 font-medium max-w-2xl">
                Приём эндокринолога, анализы на антитела и гормоны щитовидной железы — в Клинике Одинцова на Богатырском проспекте, рядом с м. Комендантский проспект.
              </p>
              <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl">
                Тиреоидит Хашимото — самая частая причина гипотиреоза. При своевременной диагностике и наблюдении у эндокринолога заболевание хорошо контролируется.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary gap-2">
                  Записаться к эндокринологу
                  <ArrowRight size={16} />
                </button>
                <button type="button" data-booking-btn="true" className="clay btn-clay-secondary">
                  Проверить щитовидную железу
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
                { val: '5–10', unit: '%', label: 'Распространённость среди женщин' },
                { val: 'Анти-ТПО', unit: '', label: 'Ключевой маркер аутоиммунного процесса' },
                { val: '×10', unit: '', label: 'Женщины болеют чаще мужчин' },
                { val: '6–12', unit: 'мес', label: 'Интервал контрольных обследований' },
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
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Что такое тиреоидит Хашимото</h2>
            <p className="text-clay-muted mb-4 max-w-2xl leading-relaxed">
              Тиреоидит Хашимото (аутоиммунный тиреоидит) — хроническое заболевание, при котором иммунная система атакует клетки щитовидной железы. Антитела (анти-ТПО, анти-ТГ) вызывают постепенное разрушение ткани железы и снижение выработки гормонов.
            </p>
            <p className="text-clay-muted mb-6 max-w-2xl leading-relaxed">
              Это самая частая причина гипотиреоза в регионах с достаточным потреблением йода. Заболевание может долго протекать бессимптомно, компенсируясь увеличением железы (зоб). В начальной фазе возможен хашитоксикоз — период повышенной функции с тревожностью и сердцебиением.
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Диагностика тиреоидита Хашимото</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Лабораторные анализы и УЗИ позволяют поставить диагноз без инвазивных процедур</p>
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Лечение тиреоидита Хашимото</h2>
              <p className="text-clay-muted max-w-lg mx-auto">Подход зависит от стадии заболевания и уровня гормонов</p>
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
                <p className="text-clay-muted mb-6 leading-relaxed">От первых анализов до стабильного наблюдения</p>
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
                    Вам поставили диагноз «тиреоидит Хашимото» и назначили лечение? Принесите анализы и результаты УЗИ — эндокринолог оценит ситуацию и даст своё заключение.
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
                      'Повышенные антитела к ТПО в анализах',
                      'Увеличение щитовидной железы (зоб)',
                      'Симптомы гипотиреоза (усталость, набор веса)',
                      'Семейная история заболеваний щитовидной железы',
                      'Хотите уточнить дозу левотироксина',
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <FaqSection items={TIREOIDIT_FAQ} title="Частые вопросы о тиреоидите Хашимото" />
      </div>
    </div>
  )
}
