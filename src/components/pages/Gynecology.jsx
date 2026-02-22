import { ArrowRight, Heart, CheckCircle, Star, Clock, MessageCircle, Smile, Users } from 'lucide-react'
import { WHATSAPP_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data'
import { DoctorCard } from '../DoctorCard.jsx'
import { FaqSection } from '../FaqSection.jsx'

const GYNECOLOGY_FAQ = [
  {
    question: 'Что входит в первичный приём гинеколога?',
    answer: 'На первичном приёме гинеколог проводит осмотр, УЗИ малого таза, при необходимости берёт мазки и назначает анализы. Всё - за один визит. Результаты базовых анализов готовы через 24 часа.',
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
    title: 'Максимальный комфорт',
    subtitle: '95% пациенток отмечают это',
    desc: 'Используем инструменты минимального размера и подогретые гели. Тёплая атмосфера, без спешки, без осуждений. 95% пациенток говорят, что это был их самый комфортный осмотр.',
    badge: '95% комфорт',
  },
  {
    icon: <CheckCircle size={22} className="text-white" />,
    bg: 'icon-circle-mint',
    card: 'clay-card-soft-mint',
    title: 'Доказательный подход',
    subtitle: '0% гипердиагностики',
    desc: 'Мы не лечим «уреаплазму» или «эрозию» просто потому что они есть. Строго следуем международным клиническим рекомендациям: назначаем лечение только там, где оно действительно нужно.',
    badge: '0% лишних диагнозов',
  },
  {
    icon: <Clock size={22} className="text-white" />,
    bg: 'icon-circle-blue',
    card: 'clay-card-soft-blue',
    title: 'Всё за один приём',
    subtitle: 'Результаты через 24 часа',
    desc: 'УЗИ малого таза, кольпоскопия и забор всех необходимых тестов - за один визит. Результаты приходят в ваш телефон через 24 часа. Все данные в защищённом личном кабинете.',
    badge: '24 часа до результата',
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
      truth: 'Выбор терапии зависит от возбудителя. Мы всегда берём посев и назначаем лечение строго по результатам. Не угадываем - лечим точно.',
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
          <a href="/" className="inline-flex items-center gap-1 text-sm text-clay-muted hover:text-clay-mint transition-colors mb-6">
            ← Назад на главную
          </a>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5" style={{ background: 'rgba(245,168,140,0.15)', color: '#D0785A' }}>
              <Heart size={12} />
              Бережная гинекология
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-clay-dark leading-tight mb-5">
              Гинекология в Санкт-Петербурге:{' '}
              <span className="text-clay-peach">бережный осмотр</span> без боли и «запугивания»
            </h1>
            <p className="text-lg text-clay-muted font-medium mb-3">
              «Боюсь, что будут стыдить, сделают больно или найдут инфекции, которых нет»
            </p>
            <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl">
              Ваши страхи нам понятны. В нашей клинике осмотр - это партнёрство, а не инквизиция. Мы уважаем вас, ваше тело и ваше время. И никогда не назначим лечение, если оно не нужно.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/second-opinion" className="clay btn-clay-primary gap-2" style={{ background: 'linear-gradient(145deg, #FAC0A8, #F0A080)', boxShadow: '10px 10px 24px hsl(18, 12%, 60%), inset -4px -4px 9px hsla(18, 25%, 42%, 0.65), inset 0px 7px 14px hsla(18, 60%, 88%, 0.5)' }}>
                Записаться на приём
                <ArrowRight size={16} />
              </a>
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
              { val: '95%', label: 'пациенток - самый комфортный осмотр в жизни' },
              { val: '0%', label: 'гипердиагностики - не лечим лишнее' },
              { val: '24ч', label: 'до получения результатов анализов' },
              { val: '1', label: 'визит для полного скрининга' },
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
            <p className="text-clay-muted max-w-lg mx-auto">Три принципа, которые отличают нашу гинекологию</p>
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
              <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-4">
                Полный спектр гинекологических услуг
              </h2>
              <p className="text-clay-muted leading-relaxed mb-6">
                Ведение за одним специалистом от диагностики до результата. Ничего лишнего, ничего пропущенного.
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
              <h2 className="text-2xl font-extrabold text-clay-dark mb-2">Развенчиваем мифы</h2>
              <p className="text-clay-muted text-sm mb-4">Страхи, с которыми к нам приходят - и правда, которую мы рассказываем</p>
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

      {/* DOCTORS */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Гинекологи клиники</h2>
            <p className="text-clay-muted">Специалисты, которые проведут консультацию и лечение</p>
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
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">Цены на гинекологию в СПб</h2>
            <p className="text-clay-muted">Фиксированные цены без скрытых доплат</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a href="/doctors" className="clay clay-card-soft-peach p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
              <Users size={20} className="mt-0.5 flex-shrink-0" style={{ color: '#C07050' }} />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Наши гинекологи</p>
                <p className="text-clay-muted text-xs leading-relaxed">Специалисты с доказательным подходом и опытом от 10 лет</p>
              </div>
            </a>
            <a href="/prices" className="clay clay-card p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
              <CheckCircle size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Цены на услуги</p>
                <p className="text-clay-muted text-xs leading-relaxed">Полный прайс-лист на все гинекологические услуги</p>
              </div>
            </a>
            <a href="/second-opinion" className="clay clay-card p-5 flex items-start gap-3 group hover:shadow-lg transition-shadow">
              <MessageCircle size={20} className="text-clay-peach mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-clay-dark text-sm mb-1">Записаться на приём</p>
                <p className="text-clay-muted text-xs leading-relaxed">Ответим в WhatsApp в течение 2 минут</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-soft-peach p-6 md:p-8 text-center">
            <Star size={40} className="text-clay-peach mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">
              Запишитесь на бережный осмотр
            </h2>
            <p className="text-clay-muted mb-5 max-w-md mx-auto">
              Ответим в WhatsApp в течение 2 минут. Запись день в день - доступна по будням.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/second-opinion" className="clay btn-clay-primary gap-2" style={{ background: 'linear-gradient(145deg, #FAC0A8, #F0A080)', boxShadow: '10px 10px 24px hsl(18, 12%, 60%), inset -4px -4px 9px hsla(18, 25%, 42%, 0.65), inset 0px 7px 14px hsla(18, 60%, 88%, 0.5)' }}>
                Записаться на приём
                <ArrowRight size={16} />
              </a>
              <a href={WHATSAPP_URL} className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                <MessageCircle size={16} />
                WhatsApp
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
