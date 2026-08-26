import { ArrowRight, Activity, TrendingUp, Scale, CheckCircle, Zap, MessageCircle, Users, Clock } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { DoctorCard } from '../DoctorCard.jsx'
import { HeroDoctorCard } from '../HeroDoctorCard.jsx'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'

export const ENDOCRINOLOGY_FAQ = [
  {
    question: 'Когда нужно обратиться к эндокринологу?',
    answer: 'К эндокринологу стоит обратиться при необъяснимой усталости, резком изменении веса, выпадении волос, постоянной зябкости или потливости, нарушениях сна и перепадах настроения. Также консультация нужна при выявленных узлах щитовидной железы, повышенном сахаре крови или при планировании беременности.',
  },
  {
    question: 'Какие симптомы указывают на проблемы с щитовидной железой?',
    answer: 'Усталость, набор веса при обычном питании, зябкость, сухость кожи, запоры и подавленное настроение могут указывать на гипотиреоз. Раздражительность, потливость, учащённое сердцебиение и потеря веса могут указывать на гипертиреоз. Для уточнения диагноза врач назначит анализ крови на гормоны щитовидной железы.',
  },
  {
    question: 'Какие анализы нужны перед приёмом эндокринолога?',
    answer: 'На первичный приём можно прийти без анализов. Врач назначит только те исследования, которые действительно нужны по вашим жалобам. Если у вас есть свежие результаты (ТТГ, Т4, глюкоза, витамин D), возьмите их с собой, чтобы не дублировать обследование.',
  },
  {
    question: 'Чем отличается гипотиреоз от гипертиреоза?',
    answer: 'Гипотиреоз - это снижение функции щитовидной железы, при котором организм замедляется: появляются усталость, зябкость, набор веса и сонливость. Гипертиреоз - избыточная активность железы с противоположными симптомами: тревожность, потливость, учащённый пульс и потеря веса. Оба состояния корректируются при правильно подобранной терапии.',
  },
  {
    question: 'Как часто нужно проверять щитовидную железу?',
    answer: 'Здоровым людям достаточно проверять уровень ТТГ раз в 2-3 года. При выявленных нарушениях (гипотиреоз, узлы, аутоиммунный тиреоидит) контроль проводится раз в 6-12 месяцев. Женщинам при планировании беременности проверка щитовидной железы обязательна.',
  },
  {
    question: 'Можно ли прийти без направления терапевта?',
    answer: 'Да, направление не требуется. Вы можете записаться к эндокринологу напрямую по телефону, через мессенджер или онлайн-форму на сайте. На первичном приёме врач оценит жалобы, осмотрит вас и определит необходимый объём обследования.',
  },
]

const SPECIALTY_DOCTORS = DOCTORS.filter((d) =>
  /^эндокринолог/i.test(d.specialization)
)
const ENDOCRINOLOGY_PRICE_CATEGORY = getShortPriceCategoryBySlug('endocrinology')

const ENDOCRINOLOGY_FEATURES = [
  {
    icon: <Activity size={22} className="text-white" />,
    bg: 'icon-circle-blue',
    title: 'Комплексная диагностика',
    subtitle: 'Смотрим шире одного анализа',
    desc: 'Анализируем жалобы, анамнез и только необходимые лабораторные показатели, чтобы понять причину симптомов без лишнего обследования.',
    badge: 'По показаниям',
  },
  {
    icon: <Zap size={22} className="text-white" />,
    bg: 'icon-circle-yellow',
    title: 'Пошаговое наблюдение',
    subtitle: 'Сроки зависят от причины',
    desc: 'Первые изменения оцениваем на повторном визите. Сроки коррекции зависят от диагноза, исходных анализов и ответа на терапию.',
    badge: 'Контроль в динамике',
  },
  {
    icon: <Scale size={22} className="text-white" />,
    bg: 'icon-circle-peach',
    title: 'Работа с весом',
    subtitle: 'Без жёстких диет и обещаний',
    desc: 'Ищем медицинские причины набора веса и обсуждаем реалистичный план коррекции. Лекарственная поддержка назначается только при наличии показаний.',
    badge: 'Осознанный план',
  },
]

const ENDOCRINOLOGY_SYMPTOMS = [
  'Постоянная усталость без причины',
  'Набор веса, который нельзя сбросить',
  'Нарушения сна (бессонница или сонливость)',
  'Выпадение волос',
  'Зябкость рук и ног',
  'Тревожность и перепады настроения',
  'Отёки',
  'Снижение либидо',
  'Ухудшение памяти и концентрации',
  'Сухость кожи',
]

const ENDOCRINOLOGY_CONDITION_NAMES = [
  'Гипотиреоз',
  'Гипертиреоз',
  'Диабет 2 типа',
  'Инсулинорезистентность',
  'Дефицит витамина D',
  'Нарушения обмена веществ',
  'СПКЯ',
  'Нарушение обмена железа',
]

const ENDOCRINOLOGY_WORK_STEPS = [
  { n: '01', title: 'Первичный приём', desc: 'Разбираем жалобы, историю болезни и результаты прошлых обследований. Не назначаем лишнего.' },
  { n: '02', title: 'Диагностика по показаниям', desc: 'Врач выбирает только те анализы и УЗИ, которые действительно помогут уточнить причину симптомов.' },
  { n: '03', title: 'Индивидуальный план', desc: 'Обсуждаем лечение, коррекцию дефицитов и, при необходимости, изменения питания и образа жизни.' },
  { n: '04', title: 'Контроль и корректировка', desc: 'Повторный визит помогает оценить динамику и при необходимости скорректировать терапию.' },
]

const ENDOCRINOLOGY_CONDITIONS = [
  { href: '/gipotireoz', title: 'Гипотиреоз', desc: 'Диагностика и подбор заместительной терапии' },
  { href: '/tireoidit-khashimoto', title: 'Тиреоидит Хашимото', desc: 'Аутоиммунный тиреоидит: анализы на антитела, УЗИ и терапия' },
]

const ENDOCRINOLOGY_ROUTE_LINK_CLASSNAME = 'group rounded-[18px] border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-5 py-4 shadow-[var(--shadow-xs)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--border-color-strong)] hover:shadow-[var(--shadow-sm)]'

export function Endocrinology() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden grain-overlay">
        <div className="absolute inset-0 hero-gradient pointer-events-none" />
        <div className="container-clay relative z-10 py-8 md:py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-14 items-center">
            <div className="max-w-3xl self-start text-left">
              <div className="mb-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-4 py-2 text-sm font-semibold text-clay-dark shadow-[var(--shadow-xs)]">
                  <Activity size={12} />
                  Эндокринология
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl heading-display text-clay-dark leading-tight mb-5">
                Эндокринология в Санкт-Петербурге:{' '}
                <span className="heading-accent">спокойный разбор</span> гормонов и обмена веществ
              </h1>
              <p className="text-base sm:text-lg text-clay-muted leading-relaxed mb-6 max-w-2xl">
                Если усталость, вес или сон мешают повседневной жизни, разберём причины по анализам и симптомам
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary btn-specialty-blue gap-2">
                  Записаться к эндокринологу
                  <ArrowRight size={16} />
                </button>
                <a href="/prices" className="clay btn-clay-secondary">
                  Посмотреть цены
                </a>
              </div>
            </div>
            <HeroDoctorCard doctors={SPECIALTY_DOCTORS} />
          </div>
        </div>
      </section>

      {/* SYMPTOMS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8">
              <div className="grid gap-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
                <div>
                  <h2 className="text-xl sm:text-2xl heading-serif text-clay-dark mb-3">Узнаёте себя?</h2>
                  <p className="text-clay-muted text-sm leading-relaxed mb-4">
                    Если несколько симптомов сочетаются между собой, это повод обсудить гормональный и метаболический профиль на приёме
                  </p>
                  <p className="text-clay-muted text-sm leading-relaxed">
                    Санкт-Петербург, Приморский район, Богатырский проспект. Удобно добираться от м. Комендантский проспект и м. Старая Деревня. Сначала ищем причину, затем обсуждаем план лечения без лишних обещаний.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ENDOCRINOLOGY_SYMPTOMS.map((s) => (
                    <div key={s} className="flex items-center gap-2.5 rounded-2xl border border-[color:var(--border-color)] bg-white px-3 py-2.5">
                      <CheckCircle size={16} className="text-clay-blue flex-shrink-0" />
                      <span className="text-sm text-clay-dark">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* FEATURES */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="max-w-3xl mb-7">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Наш подход к лечению</h2>
              <p className="text-clay-muted">Три принципа, которые помогают понять причину и не перегрузить вас лишними назначениями</p>
            </div>
            <div className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-sm)]">
              {ENDOCRINOLOGY_FEATURES.map((f, i) => (
                <FadeInSection key={f.title} staggerIndex={i}>
                  <div className={`grid gap-4 px-5 py-5 md:grid-cols-[56px_minmax(0,1fr)_auto] md:items-center ${i === ENDOCRINOLOGY_FEATURES.length - 1 ? '' : 'border-b border-[color:var(--border-color)]'}`}>
                    <div className={f.bg}>{f.icon}</div>
                    <div>
                      <h3 className="font-bold text-clay-dark text-lg leading-tight">{f.title}</h3>
                      <p className="text-clay-blue text-sm font-semibold mt-1">{f.subtitle}</p>
                      <p className="text-clay-muted text-sm leading-relaxed mt-2">{f.desc}</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--surface-blue)] px-3 py-1.5 text-xs font-semibold text-clay-blue md:justify-self-end">
                      <CheckCircle size={12} />
                      {f.badge}
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* CONDITIONS + APPROACH */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-8">
              <div>
                <h2 className="text-2xl heading-serif text-clay-dark mb-4">С чем можно обратиться</h2>
                <p className="text-clay-muted text-sm leading-relaxed mb-5">
                  Диагностика и лечение эндокринных нарушений с опорой на жалобы, осмотр и лабораторные данные
                </p>
                <div className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-xs)]">
                  {ENDOCRINOLOGY_CONDITION_NAMES.map((name, i) => (
                    <div key={name} className={`flex items-center gap-3 px-4 py-3 ${i === ENDOCRINOLOGY_CONDITION_NAMES.length - 1 ? '' : 'border-b border-[color:var(--border-color)]'}`}>
                      <CheckCircle size={16} className="text-clay-blue flex-shrink-0" />
                      <span className="text-sm font-semibold text-clay-dark">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-2xl heading-serif text-clay-dark mb-4">Как строится работа</h2>
                <div className="clay clay-card p-5 md:p-6">
                  <div className="divide-y divide-[color:var(--border-color)]">
                    {ENDOCRINOLOGY_WORK_STEPS.map((s) => (
                      <div key={s.n} className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 py-4 first:pt-0 last:pb-0">
                        <div className="num-badge text-sm w-8 h-8 flex-shrink-0">{s.n}</div>
                        <div>
                          <p className="font-semibold text-clay-dark text-sm mb-1">{s.title}</p>
                          <p className="text-clay-muted text-xs leading-relaxed">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* DOCTORS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="max-w-3xl mb-8">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Эндокринологи клиники</h2>
              <p className="text-clay-muted">Специалисты, которые помогут разобраться в причинах жалоб и подобрать план по показаниям</p>
            </div>
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
              {SPECIALTY_DOCTORS.map((doc) => (
                <DoctorCard key={doc.slug} doctor={doc} />
              ))}
            </div>
            <div className="sm:hidden flex gap-4 pt-6 overflow-x-auto scroll-smooth snap-x snap-mandatory -mx-4 px-4 pb-4">
              {SPECIALTY_DOCTORS.map((doc) => (
                <div key={doc.slug} className="snap-start flex-shrink-0 w-[80vw]">
                  <DoctorCard doctor={doc} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* PRICES */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="max-w-3xl mb-8">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Ориентировочные цены на эндокринологию в СПб</h2>
              <p className="text-clay-muted">Точная стоимость зависит от объёма приёма и обследований, которые нужны по ситуации</p>
            </div>
            <div className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-sm)] mb-5">
              {ENDOCRINOLOGY_PRICE_CATEGORY.items.map((item, i) => (
                <div key={item.name} className={`flex items-center justify-between gap-4 px-5 py-4 ${i === ENDOCRINOLOGY_PRICE_CATEGORY.items.length - 1 ? '' : 'border-b border-[color:var(--border-color)]'}`}>
                  <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                  <span className="text-clay-blue font-bold text-sm whitespace-nowrap">{formatPriceLabel(item.price, item.isFrom)}</span>
                </div>
              ))}
            </div>
            <a href={ENDOCRINOLOGY_PRICE_CATEGORY.fullPriceHref} className="clay btn-clay-secondary text-sm">
              Полный прайс-лист →
            </a>
          </div>
        </section>
      </FadeInSection>

      {/* CONDITIONS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Заболевания по эндокринологии</h2>
            <p className="text-clay-muted mb-6 max-w-2xl">Подробно о заболевании: симптомы, диагностика, современные методы лечения</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ENDOCRINOLOGY_CONDITIONS.map((c, i) => (
                <FadeInSection key={c.href} staggerIndex={i} className="h-full">
                  <a href={c.href} className={`${ENDOCRINOLOGY_ROUTE_LINK_CLASSNAME} flex h-full flex-col`}>
                    <h3 className="font-bold text-clay-dark text-lg mb-2 group-hover:text-clay-blue transition-colors">{c.title}</h3>
                    <p className="text-clay-muted text-sm leading-relaxed mb-4 flex-1">{c.desc}</p>
                    <span className="text-sm font-semibold text-clay-blue flex items-center gap-1">
                      Подробнее <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </a>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* INTERNAL LINKS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-xl heading-serif text-clay-dark mb-5">Полезные разделы</h2>
            <div className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-sm)]">
              <a href="/doctors" className="group grid gap-3 px-5 py-5 transition-colors duration-200 hover:bg-[color:var(--surface-card-hover)] md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-center">
                <Users size={20} className="text-clay-blue mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-blue transition-colors">Наши эндокринологи</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Специалисты с доказательным подходом и клиническим опытом</p>
                </div>
                <ArrowRight size={16} className="hidden text-clay-blue transition-transform duration-200 group-hover:translate-x-0.5 md:block" />
              </a>
              <a href={ENDOCRINOLOGY_PRICE_CATEGORY.fullPriceHref} className="group grid gap-3 border-t border-[color:var(--border-color)] px-5 py-5 transition-colors duration-200 hover:bg-[color:var(--surface-card-hover)] md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-center">
                <CheckCircle size={20} className="text-clay-blue mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-blue transition-colors">Цены на услуги</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Официальный полный прайс-лист клиники по эндокринологии</p>
                </div>
                <ArrowRight size={16} className="hidden text-clay-blue transition-transform duration-200 group-hover:translate-x-0.5 md:block" />
              </a>
              <a href="/contacts" className="group grid gap-3 border-t border-[color:var(--border-color)] px-5 py-5 transition-colors duration-200 hover:bg-[color:var(--surface-card-hover)] md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-center">
                <Clock size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-peach transition-colors">Как добраться</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Адрес, маршрут и ориентиры в Приморском районе</p>
                </div>
                <ArrowRight size={16} className="hidden text-clay-peach transition-transform duration-200 group-hover:translate-x-0.5 md:block" />
              </a>
              <button type="button" data-booking-btn="true" className="group grid w-full gap-3 border-t border-[color:var(--border-color)] px-5 py-5 text-left transition-colors duration-200 hover:bg-[color:var(--surface-card-hover)] md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-center">
                <MessageCircle size={20} className="text-clay-blue mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-blue transition-colors">Записаться на приём</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Поможем выбрать удобное время и формат визита</p>
                </div>
                <ArrowRight size={16} className="hidden text-clay-blue transition-transform duration-200 group-hover:translate-x-0.5 md:block" />
              </button>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* CTA */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <TrendingUp size={32} className="text-clay-blue mb-4" />
                  <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
                    Нужен спокойный разбор гормонов и самочувствия?
                  </h2>
                  <p className="text-clay-muted max-w-2xl">
                    Запишитесь на приём. Разберём жалобы, обсудим анализы и составим план без лишних обещаний.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                  <button type="button" data-booking-btn="true" className="clay btn-clay-primary btn-specialty-blue gap-2">
                    Записаться
                    <ArrowRight size={16} />
                  </button>
                  <a href={TELEGRAM_URL} className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                    Telegram
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      <div className="container-clay">
        <FaqSection items={ENDOCRINOLOGY_FAQ} title="Частые вопросы об эндокринологии" />
      </div>
    </div>
  )
}
