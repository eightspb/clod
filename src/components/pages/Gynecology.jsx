import { ArrowRight, Heart, CheckCircle, Star, Clock, MessageCircle, Smile, Users } from 'lucide-react'
import { TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { DoctorCard } from '../DoctorCard.jsx'
import { FaqSection } from '../FaqSection.jsx'

export const GYNECOLOGY_FAQ = [
  {
    question: 'Что входит в первичный приём гинеколога?',
    answer: 'На первичном приёме врач уточняет жалобы, проводит осмотр, при необходимости назначает УЗИ малого таза, мазки и анализы. Объём обследования зависит от клинической ситуации и обсуждается заранее.',
  },
  {
    question: 'Нужно ли лечить эрозию шейки матки?',
    answer: 'В большинстве случаев - нет. То, что раньше называли «эрозией», чаще всего является эктопией - нормальным вариантом строения шейки матки. Лечение требуется только при подтверждённой дисплазии по результатам кольпоскопии и биопсии.',
  },
  {
    question: 'Нужно ли лечить уреаплазму?',
    answer: 'Нет, если нет симптомов. Уреаплазма - условно-патогенный микроорганизм, который присутствует у большинства здоровых женщин. Лечение назначается только при наличии воспаления, жалоб или при планировании беременности.',
  },
  {
    question: 'Как часто нужно ходить к гинекологу?',
    answer: 'Профилактический осмотр - раз в год. При наличии хронических заболеваний, планировании беременности или жалобах - по назначению врача.',
  },
  {
    question: 'Можно ли прийти на приём во время менструации?',
    answer: 'Для экстренных жалоб - да. Для планового осмотра и взятия мазков лучше прийти на 5–7 день цикла. Уточните у администратора при записи.',
  },
]

const SPECIALTY_DOCTORS = DOCTORS.filter((d) =>
  /^гинеколог/i.test(d.specialization)
)

const features = [
  {
    icon: <Smile size={22} className="text-white" />,
    bg: 'icon-circle-peach',
    card: 'clay-card-soft-peach',
    title: 'Спокойный приём',
    subtitle: 'Осмотр без лишнего напряжения',
    desc: 'Объясняем каждый этап, не торопим и не усиливаем тревогу. Используем щадящие инструменты и подбираем формат осмотра по ситуации.',
    badge: 'Бережный формат',
  },
  {
    icon: <CheckCircle size={22} className="text-white" />,
    bg: 'icon-circle-mint',
    card: 'clay-card-soft-mint',
    title: 'Лечение по показаниям',
    subtitle: 'Без лишних назначений',
    desc: 'Не назначаем терапию только по факту находки в анализе. Оцениваем жалобы, осмотр, результаты исследований и выбираем дальнейший шаг только при наличии медицинских оснований.',
    badge: 'Доказательный подход',
  },
  {
    icon: <Clock size={22} className="text-white" />,
    bg: 'icon-circle-blue',
    card: 'clay-card-soft-blue',
    title: 'Прозрачный маршрут',
    subtitle: 'Осмотр, исследования и план',
    desc: 'По итогам визита вы понимаете, что уже ясно, какие исследования действительно нужны и когда ждать следующий контроль.',
    badge: 'Понятный следующий шаг',
  },
]

export function Gynecology({ servicesData = [] }) {
  const myths = [
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

  const defaultServices = [
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

  const services = servicesData.length > 0 
    ? servicesData.map(s => s.title) 
    : defaultServices

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pt-8 pb-12">

        <div className="container-clay relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5" style={{ background: 'rgba(245,168,140,0.15)', color: '#D0785A' }}>
              <Heart size={12} />
              Бережная гинекология
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-clay-dark leading-tight mb-5">
              Гинекология в Санкт-Петербурге:{' '}
              <span className="text-clay-peach">спокойный приём</span> и понятный план наблюдения
            </h1>
            <p className="text-lg text-clay-muted font-medium mb-3">
              Бережный приём с уважением к вашему времени, деликатному осмотру и объяснением каждого шага
            </p>
            <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl">
              Санкт-Петербург, Приморский район, Богатырский проспект. Удобно добираться от м. Комендантский проспект и м. Старая Деревня. Мы работаем спокойно: без давления, без лишних назначений и с опорой на показания.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2" style={{ background: 'linear-gradient(145deg, #FAC0A8, #F0A080)', boxShadow: '10px 10px 24px hsl(18, 12%, 60%), inset -4px -4px 9px hsla(18, 25%, 42%, 0.65), inset 0px 7px 14px hsla(18, 60%, 88%, 0.5)' }}>
                Записаться на приём
                <ArrowRight size={16} />
              </button>
              <a href="/prices" className="clay btn-clay-secondary">
                Посмотреть цены
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { val: '1', label: 'первичный визит для оценки жалоб и анамнеза' },
              { val: 'УЗИ', label: 'малого таза и дополнительные исследования по показаниям' },
              { val: 'План', label: 'наблюдения, лечения или дообследования' },
              { val: 'Связь', label: 'с врачом и администратором по организационным вопросам' },
            ].map((s) => (
              <div key={s.label} className="clay clay-card p-4 text-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-clay-peach leading-none mb-1.5">{s.val}</div>
                <p className="text-xs text-clay-muted leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-7">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Что делает нас особенными</h2>
            <p className="text-clay-muted max-w-lg mx-auto">Три принципа, которые делают приём спокойным, понятным и медицински обоснованным</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className={`clay ${f.card} p-6 flex flex-col`}>
                <div className={`${f.bg} mb-4`}>{f.icon}</div>
                <h3 className="font-bold text-clay-dark text-lg mb-1">{f.title}</h3>
                <p className="text-clay-peach text-sm font-semibold mb-3">{f.subtitle}</p>
                <p className="text-clay-muted text-sm leading-relaxed flex-1 mb-4">{f.desc}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold self-start" style={{ background: 'rgba(245,168,140,0.15)', color: '#C07050' }}>
                  <CheckCircle size={12} />
                  {f.badge}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-4">С чем можно обратиться</h2>
              <p className="text-clay-muted leading-relaxed mb-6">
                Ведём приём так, чтобы вы понимали, что происходит сейчас, что важно проверить по показаниям и когда нужен следующий контроль.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {services.map((s) => (
                  <div key={s} className="clay clay-card flex items-center gap-3 px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-clay-peach flex-shrink-0" />
                    <span className="text-sm font-medium text-clay-dark">{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold text-clay-dark mb-2">Разбираем частые заблуждения</h2>
              <p className="text-clay-muted text-sm mb-4">Спокойно объясняем, где нужна помощь, а где достаточно наблюдения</p>
              {myths.map((m, i) => (
                <div key={i} className="clay clay-card p-5">
                  <p className="font-semibold text-clay-dark text-sm mb-2">{m.myth}</p>
                  <p className="text-clay-muted text-sm leading-relaxed border-l-2 border-clay-peach pl-3">{m.truth}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ROUTE */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-soft-peach p-6 md:p-8">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-wide text-clay-peach mb-3">Маршрут пациента</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Как проходит приём</h2>
              <p className="text-clay-muted leading-relaxed mb-6">
                Мы заранее объясняем, что входит в консультацию, какие обследования нужны по показаниям и когда будет понятен следующий шаг.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                { n: '01', title: 'Запись и подготовка', desc: 'Уточняем жалобы, срок цикла и важные детали перед визитом.' },
                { n: '02', title: 'Осмотр и беседа', desc: 'Проводим приём спокойно и без лишней спешки.' },
                { n: '03', title: 'Исследования по показаниям', desc: 'УЗИ, мазки и анализы назначаем только при медицинской необходимости.' },
                { n: '04', title: 'План и контроль', desc: 'Обсуждаем лечение, наблюдение и сроки следующего визита.' },
              ].map((step) => (
                <div key={step.n} className="clay clay-card p-4">
                  <div className="num-badge text-sm w-8 h-8 mb-3">{step.n}</div>
                  <p className="font-semibold text-clay-dark text-sm mb-1">{step.title}</p>
                  <p className="text-clay-muted text-xs leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DOCTORS */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Гинекологи клиники</h2>
            <p className="text-clay-muted">Специалисты, с которыми можно спокойно обсудить жалобы, обследования и дальнейший план</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SPECIALTY_DOCTORS.map((doc) => (
              <DoctorCard key={doc.slug} doctor={doc} />
            ))}
          </div>
        </div>
      </section>

      {/* PRICES */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Ориентировочные цены на гинекологию в СПб</h2>
            <p className="text-clay-muted">Стоимость зависит от объёма осмотра и обследований, которые нужны по показаниям</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[
              { name: 'Первичная консультация гинеколога', price: 'от 3 500 ₽' },
              { name: 'УЗИ органов малого таза', price: 'от 2 500 ₽' },
              { name: 'Кольпоскопия', price: 'от 3 000 ₽' },
              { name: 'ПЦР-диагностика ИППП (расширенная)', price: 'от 4 500 ₽' },
            ].map((item) => (
              <div key={item.name} className="clay clay-card flex items-center justify-between gap-4 px-5 py-4">
                <span className="text-sm font-medium text-clay-dark leading-snug">{item.name}</span>
                <span className="font-bold text-sm whitespace-nowrap" style={{ color: '#C07050' }}>{item.price}</span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <a href="/prices" className="clay btn-clay-secondary text-sm">
              Полный прайс-лист →
            </a>
          </div>
        </div>
      </section>

      {/* INTERNAL LINKS */}
      <section className="section">
        <div className="container-clay">
          <h2 className="text-xl font-extrabold text-clay-dark mb-5">Полезные разделы</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a href="/doctors" className="clay clay-card-soft-peach p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
              <Users size={20} className="mt-0.5 flex-shrink-0" style={{ color: '#C07050' }} />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Наши гинекологи</p>
                <p className="text-clay-muted text-xs leading-relaxed">Специалисты с доказательным подходом и опытом в профильной помощи</p>
              </div>
            </a>
            <a href="/prices" className="clay clay-card p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
              <CheckCircle size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Цены на услуги</p>
                <p className="text-clay-muted text-xs leading-relaxed">Полный прайс-лист на все гинекологические услуги</p>
              </div>
            </a>
            <a href="/contacts" className="clay clay-card-soft-blue p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
              <Clock size={20} className="text-clay-blue mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Как добраться</p>
                <p className="text-clay-muted text-xs leading-relaxed">Адрес, маршрут и удобные ориентиры в Приморском районе</p>
              </div>
            </a>
            <button type="button" data-booking-btn="true" className="clay clay-card p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow text-left">
              <MessageCircle size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Записаться на приём</p>
                <p className="text-clay-muted text-xs leading-relaxed">Поможем выбрать удобное время и формат визита</p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-soft-peach p-6 md:p-8 text-center">
            <Star size={40} className="text-clay-peach mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">
              Нужен спокойный приём без лишнего давления?
            </h2>
            <p className="text-clay-muted mb-5 max-w-md mx-auto">
              Подскажем, как подготовиться к визиту, и при необходимости заранее обсудим исследования и стоимость.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button type="button" data-booking-btn="true" className="clay btn-clay-primary gap-2" style={{ background: 'linear-gradient(145deg, #FAC0A8, #F0A080)', boxShadow: '10px 10px 24px hsl(18, 12%, 60%), inset -4px -4px 9px hsla(18, 25%, 42%, 0.65), inset 0px 7px 14px hsla(18, 60%, 88%, 0.5)' }}>
                Записаться на приём
                <ArrowRight size={16} />
              </button>
              <a href={TELEGRAM_URL} className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                Telegram
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="container-clay">
        <FaqSection items={GYNECOLOGY_FAQ} title="Частые вопросы о гинекологии" />
      </div>
    </div>
  )
}
