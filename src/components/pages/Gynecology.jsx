import { ArrowRight, Heart, CheckCircle, Star, Clock, MessageCircle, Smile, Users } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { getShortPriceCategoryBySlug, formatPriceLabel } from '../../lib/price-list.js'
import { FaqSection } from '../FaqSection.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { ResponsiveDoctorHero } from '../ResponsiveDoctorHero.jsx'
import { ResponsiveDoctorCollection } from '../ResponsiveDoctorCollection.jsx'

export const GYNECOLOGY_FAQ = [
  {
    question: 'Как часто нужно посещать гинеколога?',
    answer: 'Профилактический осмотр рекомендуется раз в год даже при отсутствии жалоб. При хронических заболеваниях, планировании беременности или появлении новых симптомов врач может назначить более частые визиты. Регулярные осмотры помогают вовремя выявить изменения на ранней стадии.',
  },
  {
    question: 'Как подготовиться к приёму гинеколога?',
    answer: 'Оптимально прийти на 5-7 день менструального цикла. Это удобнее для осмотра и взятия мазков. За 1-2 дня до визита стоит воздержаться от спринцевания и вагинальных свечей. Если есть результаты прошлых обследований, возьмите их с собой.',
  },
  {
    question: 'Какие анализы берут на приёме?',
    answer: 'Набор анализов зависит от жалоб и клинической ситуации. Чаще всего на первичном приёме берут мазок на флору и мазок на онкоцитологию (ПАП-тест). При необходимости врач назначает ПЦР на инфекции, УЗИ малого таза или гормональный скрининг.',
  },
  {
    question: 'Что делать при нарушении менструального цикла?',
    answer: 'Записаться на приём к гинекологу для оценки причины. Нарушения цикла могут быть связаны с гормональными изменениями, стрессом, заболеваниями щитовидной железы или органов малого таза. Врач назначит обследование по показаниям и подберёт тактику.',
  },
  {
    question: 'Нужно ли лечить эрозию шейки матки?',
    answer: 'В большинстве случаев нет. То, что раньше называли «эрозией», чаще всего является эктопией - нормальным вариантом строения шейки матки. Лечение требуется только при подтверждённой дисплазии по результатам кольпоскопии и цитологического исследования.',
  },
  {
    question: 'Можно ли записаться на приём онлайн?',
    answer: 'Да, записаться можно через форму на сайте, по телефону или в мессенджере. Направление от другого врача не требуется. Администратор поможет выбрать удобное время и подскажет, как подготовиться к визиту.',
  },
]

const SPECIALTY_DOCTORS = DOCTORS.filter((d) =>
  /^гинеколог/i.test(d.specialization)
)
const GYNECOLOGY_PRICE_CATEGORY = getShortPriceCategoryBySlug('gynecology')

const GYNECOLOGY_FEATURES = [
  {
    icon: <Smile size={22} className="text-white" />,
    bg: 'icon-circle-peach',
    title: 'Спокойный приём',
    subtitle: 'Осмотр без лишнего напряжения',
    desc: 'Объясняем каждый этап, не торопим и не усиливаем тревогу. Используем щадящие инструменты и подбираем формат осмотра по ситуации.',
    badge: 'Бережный формат',
  },
  {
    icon: <CheckCircle size={22} className="text-white" />,
    bg: 'icon-circle-mint',
    title: 'Лечение по показаниям',
    subtitle: 'Без лишних назначений',
    desc: 'Не назначаем терапию только по факту находки в анализе. Оцениваем жалобы, осмотр, результаты исследований и выбираем дальнейший шаг только при наличии медицинских оснований.',
    badge: 'Доказательный подход',
  },
  {
    icon: <Clock size={22} className="text-white" />,
    bg: 'icon-circle-blue',
    title: 'Прозрачный маршрут',
    subtitle: 'Осмотр, исследования и план',
    desc: 'По итогам визита вы понимаете, что уже ясно, какие исследования действительно нужны и когда ждать следующий контроль.',
    badge: 'Понятный следующий шаг',
  },
]

const GYNECOLOGY_CONDITIONS = [
  { href: '/eroziya-sheyki-matki', title: 'Эрозия шейки матки', desc: 'Кольпоскопия, лазерная и радиоволновая деструкция по показаниям' },
  { href: '/endometrioz', title: 'Эндометриоз', desc: 'Диагностика, гормональная терапия и лапароскопическое лечение' },
  { href: '/adenomioz', title: 'Аденомиоз', desc: 'УЗИ, МРТ малого таза и подбор индивидуальной терапии' },
]

const GYNECOLOGY_MYTHS = [
  {
    myth: '«У меня эрозия - нужно срочно прижигать»',
    truth: 'Эктопия шейки матки - это физиологическая норма. Большинству пациентов лечение не требуется. Мы оцениваем под кольпоскопом и принимаем решение по реальным данным.',
  },
  {
    myth: '«Нашли уреаплазму - нужно лечиться»',
    truth: 'Уреаплазма - условно-патогенный микроорганизм. Лечение показано только при симптомах или при подготовке к беременности, но не «на всякий случай».',
  },
  {
    myth: '«Кольпит лечат только антибиотиками»',
    truth: 'Выбор терапии зависит от причины воспаления. Врач ориентируется на жалобы, осмотр и результаты обследований, а не на универсальную схему для всех.',
  },
]

const GYNECOLOGY_DEFAULT_SERVICES = [
  'Осмотр у гинеколога',
  'УЗИ органов малого таза',
  'Кольпоскопия',
  'Мазок на флору и онкоцитологию',
  'ПЦР-диагностика ИППП',
  'Подбор контрацепции',
  'Лечение кольпита и вагиноза',
  'Гормональный скрининг',
  'Подготовка к беременности',
  'Лечение кисты яичника',
]

const GYNECOLOGY_STATS = [
  { val: '1', label: 'первичный визит для оценки жалоб и анамнеза' },
  { val: 'УЗИ', label: 'малого таза и дополнительные исследования по показаниям' },
  { val: 'План', label: 'наблюдения, лечения или дообследования' },
  { val: 'Связь', label: 'с врачом и администратором по организационным вопросам' },
]

const GYNECOLOGY_ROUTE_STEPS = [
  { n: '01', title: 'Запись и подготовка', desc: 'Уточняем жалобы, срок цикла и важные детали перед визитом.' },
  { n: '02', title: 'Осмотр и беседа', desc: 'Проводим приём спокойно и без лишней спешки.' },
  { n: '03', title: 'Исследования по показаниям', desc: 'УЗИ, мазки и анализы назначаем только при медицинской необходимости.' },
  { n: '04', title: 'План и контроль', desc: 'Обсуждаем лечение, наблюдение и сроки следующего визита.' },
]

const GYNECOLOGY_ROUTE_LINK_CLASSNAME = 'group rounded-[18px] border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-5 py-4 shadow-[var(--shadow-xs)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--border-color-strong)] hover:shadow-[var(--shadow-sm)]'

export function Gynecology({ servicesData = [] }) {
  const services = servicesData.length > 0
    ? servicesData.map(s => s.title)
    : GYNECOLOGY_DEFAULT_SERVICES
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden grain-overlay">
        <div className="absolute inset-0 hero-gradient pointer-events-none" />
        <div className="container-clay relative z-10 py-8 md:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-14 items-center">
            <div className="max-w-3xl self-start text-left">
              <div className="mb-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-4 py-2 text-sm font-semibold text-clay-dark shadow-[var(--shadow-xs)]">
                  <Heart size={12} />
                  Бережная гинекология
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl heading-display text-clay-dark leading-tight mb-5">
                Гинекология в Санкт-Петербурге:{' '}
                <span className="heading-accent">спокойный приём</span> и понятный план наблюдения
              </h1>
              <p className="text-base sm:text-lg text-clay-muted leading-relaxed mb-6 max-w-2xl">
                Бережный приём с уважением к вашему времени, деликатному осмотру и объяснением каждого шага
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button type="button" data-booking-btn="true" className="clay btn-clay-primary btn-specialty-peach gap-2">
                  Записаться на приём
                  <ArrowRight size={16} />
                </button>
                <a href="/prices" className="clay btn-clay-secondary">
                  Посмотреть цены
                </a>
              </div>
            </div>
            <ResponsiveDoctorHero doctors={SPECIALTY_DOCTORS} label="Карусель гинекологов в начале страницы" ctaHref="/second-opinion" />
          </div>
        </div>
      </section>

      {/* STATS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-sm)]">
              <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="border-b border-[color:var(--border-color)] p-5 md:p-6 lg:border-b-0 lg:border-r">
                  <p className="text-sm font-semibold text-clay-dark mb-2">Приём без давления</p>
                  <p className="text-sm leading-relaxed text-clay-muted">
                    Санкт-Петербург, Приморский район, Богатырский проспект. Удобно добираться от м. Комендантский проспект и м. Старая Деревня. Мы работаем спокойно: без давления, без лишних назначений и с опорой на показания.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4">
                  {GYNECOLOGY_STATS.map((s) => (
                    <div key={s.label} className="border-b border-r border-[color:var(--border-color)] p-4 last:border-r-0 sm:border-b-0">
                      <div className="text-3xl sm:text-4xl font-serif font-light text-clay-peach leading-none mb-2">{s.val}</div>
                      <p className="text-xs text-clay-muted leading-tight">{s.label}</p>
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Что делает нас особенными</h2>
              <p className="text-clay-muted">Три принципа, которые делают приём спокойным, понятным и медицински обоснованным</p>
            </div>
            <div className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-sm)]">
              {GYNECOLOGY_FEATURES.map((f, i) => (
                <FadeInSection key={f.title} staggerIndex={i}>
                  <div className={`grid gap-4 px-5 py-5 md:grid-cols-[56px_minmax(0,1fr)_auto] md:items-center ${i === GYNECOLOGY_FEATURES.length - 1 ? '' : 'border-b border-[color:var(--border-color)]'}`}>
                    <div className={f.bg}>{f.icon}</div>
                    <div>
                      <h3 className="font-bold text-clay-dark text-lg leading-tight">{f.title}</h3>
                      <p className="text-clay-peach text-sm font-semibold mt-1">{f.subtitle}</p>
                      <p className="text-clay-muted text-sm leading-relaxed mt-2">{f.desc}</p>
                    </div>
                    <div className="badge-specialty-peach inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold md:justify-self-end">
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

      {/* SERVICES */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-8 items-start">
              <div>
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-4">С чем можно обратиться</h2>
                <p className="text-clay-muted leading-relaxed mb-6">
                  Ведём приём так, чтобы вы понимали, что происходит сейчас, что важно проверить по показаниям и когда нужен следующий контроль.
                </p>
                <div className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-xs)]">
                  {services.map((s, i) => (
                    <div key={s} className={`flex items-center gap-3 px-4 py-3 ${i === services.length - 1 ? '' : 'border-b border-[color:var(--border-color)]'}`}>
                      <CheckCircle size={16} className="text-clay-peach flex-shrink-0" />
                      <span className="text-sm font-medium text-clay-dark">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-2xl heading-serif text-clay-dark mb-2">Разбираем частые заблуждения</h2>
                <p className="text-clay-muted text-sm mb-4">Спокойно объясняем, где нужна помощь, а где достаточно наблюдения</p>
                <div className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-xs)]">
                  {GYNECOLOGY_MYTHS.map((m, i) => (
                    <div key={m.myth} className={`p-5 ${i === GYNECOLOGY_MYTHS.length - 1 ? '' : 'border-b border-[color:var(--border-color)]'}`}>
                      <p className="font-semibold text-clay-dark text-sm mb-2">{m.myth}</p>
                      <p className="text-clay-muted text-sm leading-relaxed">{m.truth}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ROUTE */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="clay clay-card p-6 md:p-8">
              <div className="max-w-3xl">
                <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Как проходит приём</h2>
                <p className="text-clay-muted leading-relaxed mb-6">
                  Мы заранее объясняем, что входит в приём, какие обследования нужны по показаниям и когда будет понятен следующий шаг.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                {GYNECOLOGY_ROUTE_STEPS.map((step) => (
                  <div key={step.n} className="rounded-[18px] border border-[color:var(--border-color)] bg-[color:var(--surface-card)] p-4">
                    <div className="num-badge text-sm w-8 h-8 mb-3">{step.n}</div>
                    <p className="font-semibold text-clay-dark text-sm mb-1">{step.title}</p>
                    <p className="text-clay-muted text-xs leading-relaxed">{step.desc}</p>
                  </div>
                ))}
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
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Гинекологи клиники</h2>
              <p className="text-clay-muted">Специалисты, с которыми можно спокойно обсудить жалобы, обследования и дальнейший план</p>
            </div>
            <ResponsiveDoctorCollection
              doctors={SPECIALTY_DOCTORS}
              label="Карусель гинекологов клиники"
              mobileClassName="md:hidden pt-6"
              desktopClassName="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6"
            />
          </div>
        </section>
      </FadeInSection>

      {/* PRICES */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <div className="max-w-3xl mb-8">
              <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Ориентировочные цены на гинекологию в СПб</h2>
              <p className="text-clay-muted">Стоимость зависит от объёма осмотра и обследований, которые нужны по показаниям</p>
            </div>
            <div className="overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-white shadow-[var(--shadow-sm)] mb-5">
              {GYNECOLOGY_PRICE_CATEGORY.items.map((item, i) => (
                <div key={item.name} className={`flex items-center justify-between gap-4 px-5 py-4 ${i === GYNECOLOGY_PRICE_CATEGORY.items.length - 1 ? '' : 'border-b border-[color:var(--border-color)]'}`}>
                  <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                  <span className="text-clay-peach font-bold text-sm whitespace-nowrap">{formatPriceLabel(item.price, item.isFrom)}</span>
                </div>
              ))}
            </div>
            <a href={GYNECOLOGY_PRICE_CATEGORY.fullPriceHref} className="clay btn-clay-secondary text-sm">
              Полный прайс-лист →
            </a>
          </div>
        </section>
      </FadeInSection>

      {/* CONDITIONS */}
      <FadeInSection>
        <section className="section">
          <div className="container-clay">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Заболевания по гинекологии</h2>
            <p className="text-clay-muted mb-6 max-w-2xl">Подробно о заболевании: симптомы, диагностика, современные методы лечения</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {GYNECOLOGY_CONDITIONS.map((c, i) => (
                <FadeInSection key={c.href} staggerIndex={i} className="h-full">
                  <a href={c.href} className={`${GYNECOLOGY_ROUTE_LINK_CLASSNAME} flex h-full flex-col`}>
                    <h3 className="font-bold text-clay-dark text-lg mb-2 group-hover:text-clay-peach transition-colors">{c.title}</h3>
                    <p className="text-clay-muted text-sm leading-relaxed mb-4 flex-1">{c.desc}</p>
                    <span className="text-clay-peach text-sm font-semibold flex items-center gap-1">
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
                <Users size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-peach transition-colors">Наши гинекологи</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Специалисты с доказательным подходом и опытом в профильной помощи</p>
                </div>
                <ArrowRight size={16} className="hidden text-clay-peach transition-transform duration-200 group-hover:translate-x-0.5 md:block" />
              </a>
              <a href={GYNECOLOGY_PRICE_CATEGORY.fullPriceHref} className="group grid gap-3 border-t border-[color:var(--border-color)] px-5 py-5 transition-colors duration-200 hover:bg-[color:var(--surface-card-hover)] md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-center">
                <CheckCircle size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-peach transition-colors">Цены на услуги</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Официальный полный прайс-лист клиники по гинекологии</p>
                </div>
                <ArrowRight size={16} className="hidden text-clay-peach transition-transform duration-200 group-hover:translate-x-0.5 md:block" />
              </a>
              <a href="/contacts" className="group grid gap-3 border-t border-[color:var(--border-color)] px-5 py-5 transition-colors duration-200 hover:bg-[color:var(--surface-card-hover)] md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-center">
                <Clock size={20} className="text-clay-blue mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-blue transition-colors">Как добраться</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Адрес, маршрут и удобные ориентиры в Приморском районе</p>
                </div>
                <ArrowRight size={16} className="hidden text-clay-blue transition-transform duration-200 group-hover:translate-x-0.5 md:block" />
              </a>
              <button type="button" data-booking-btn="true" className="group grid w-full gap-3 border-t border-[color:var(--border-color)] px-5 py-5 text-left transition-colors duration-200 hover:bg-[color:var(--surface-card-hover)] md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-center">
                <MessageCircle size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-clay-dark text-sm mb-1 group-hover:text-clay-peach transition-colors">Записаться на приём</p>
                  <p className="text-clay-muted text-xs leading-relaxed">Поможем выбрать удобное время и формат визита</p>
                </div>
                <ArrowRight size={16} className="hidden text-clay-peach transition-transform duration-200 group-hover:translate-x-0.5 md:block" />
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
                  <Star size={32} className="text-clay-peach mb-4" />
                  <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">
                    Нужен спокойный приём без лишнего давления?
                  </h2>
                  <p className="text-clay-muted max-w-2xl">
                    Подскажем, как подготовиться к визиту, и при необходимости заранее обсудим исследования и стоимость.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                  <button type="button" data-booking-btn="true" className="clay btn-clay-primary btn-specialty-peach gap-2">
                    Записаться на приём
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
        <FaqSection items={GYNECOLOGY_FAQ} title="Частые вопросы о гинекологии" />
      </div>
    </div>
  )
}
