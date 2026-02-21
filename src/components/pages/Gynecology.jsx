import { ArrowRight, Heart, CheckCircle, Star, Clock, MessageCircle, Smile } from 'lucide-react'
import { DOCTORS } from '../../lib/doctors-data'

const RING_MAP = {
  mint: 'avatar-ring-mint',
  peach: 'avatar-ring-peach',
  blue: 'avatar-ring-blue',
  lavender: 'avatar-ring-lavender',
}

const SPECIALTY_DOCTORS = DOCTORS.filter((d) =>
  /^гинеколог/i.test(d.specialization)
).map((doc) => {
  const parts = doc.name.split(' ')
  return {
    ...doc,
    initials: (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase(),
    exp: `${doc.experienceYears} лет`,
    ring: RING_MAP[doc.ringColor] || 'avatar-ring-peach',
  }
})

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
    desc: 'УЗИ малого таза, кольпоскопия и забор всех необходимых тестов — за один визит. Результаты приходят в ваш телефон через 24 часа. Все данные в защищённом личном кабинете.',
    badge: '24 часа до результата',
  },
]

export function Gynecology({ servicesData = [] }) {
  const myths = [
    {
      myth: '«У меня эрозия — нужно срочно прижигать»',
      truth: 'Эктопия шейки матки — это физиологическая норма. Большинству пациентов лечение не требуется. Мы оцениваем под кольпоскопом и принимаем решение по реальным данным.',
    },
    {
      myth: '«Нашли уреаплазму — нужно лечиться»',
      truth: 'Уреаплазма — условно-патогенный микроорганизм. Лечение показано только при симптомах или при подготовке к беременности, но не «на всякий случай».',
    },
    {
      myth: '«Кольпит лечат только антибиотиками»',
      truth: 'Выбор терапии зависит от возбудителя. Мы всегда берём посев и назначаем лечение строго по результатам. Не угадываем — лечим точно.',
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
      <section className="relative overflow-hidden pt-8 pb-20">

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
              Бережная гинекология:{' '}
              <span className="text-clay-peach">экспертный осмотр</span> без боли и «запугивания»
            </h1>
            <p className="text-lg text-clay-muted font-medium mb-3">
              «Боюсь, что будут стыдить, сделают больно или найдут инфекции, которых нет»
            </p>
            <p className="text-clay-muted leading-relaxed mb-8 max-w-2xl">
              Ваши страхи нам понятны. В нашей клинике осмотр — это партнёрство, а не инквизиция. Мы уважаем вас, ваше тело и ваше время. И никогда не назначим лечение, если оно не нужно.
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
              { val: '95%', label: 'пациенток — самый комфортный осмотр в жизни' },
              { val: '0%', label: 'гипердиагностики — не лечим лишнее' },
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
          <div className="text-center mb-10">
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
              <p className="text-clay-muted text-sm mb-4">Страхи, с которыми к нам приходят — и правда, которую мы рассказываем</p>
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
              <div key={doc.slug} className="clay clay-card p-6 flex flex-col relative overflow-visible">
                <div className="pointer-events-none absolute top-4 right-10 w-3 h-3 rounded-full opacity-50" style={{ background: '#FAC8B0' }} />
                <div className="pointer-events-none absolute top-10 right-5 w-2 h-2 rounded-full opacity-35" style={{ background: '#A8D8F4' }} />
                <div className="pointer-events-none absolute bottom-20 right-5 w-2.5 h-2.5 rounded-full opacity-45" style={{ background: '#A0E4D4' }} />

                <div className="flex items-start justify-between mb-4">
                  <div className={`${doc.ring} flex-shrink-0`}>
                    {doc.photo
                      ? <img src={doc.photo} alt={doc.name} className="w-48 h-48 rounded-full object-cover" loading="lazy" width="192" height="192" />
                      : (
                        <div className="w-48 h-48 rounded-full flex items-center justify-center" style={{ background: 'rgba(78,200,168,0.08)' }}>
                          <span className="text-6xl font-bold text-clay-muted">{doc.initials}</span>
                        </div>
                      )
                    }
                  </div>
                  <div className="clay clay-card-soft-mint px-3 py-1.5 rounded-xl text-center flex-shrink-0">
                    <p className="text-xs text-clay-muted leading-none mb-0.5">Стаж</p>
                    <p className="text-sm font-extrabold text-clay-mint leading-none">{doc.exp}</p>
                  </div>
                </div>

                <h4 className="font-bold text-clay-dark text-base leading-snug mb-2">{doc.name}</h4>

                {doc.tagline && (
                  <p className="text-clay-muted text-sm leading-relaxed mb-4 flex-1 line-clamp-5">{doc.tagline}</p>
                )}

                <div className="mt-auto pt-3 border-t border-clay-bg flex items-center justify-between gap-2">
                  <div className="clay clay-card-soft-blue px-3 py-1.5 rounded-xl min-w-0 flex-1 mr-2">
                    <p className="text-xs font-semibold text-clay-dark leading-tight truncate">{doc.specialization.split(',')[0]}</p>
                    {doc.specialization.split(',')[1] && (
                      <p className="text-xs text-clay-muted leading-tight truncate">{doc.specialization.split(',').slice(1).join(',').trim()}</p>
                    )}
                  </div>
                  <a href={`/doctors/${doc.slug}`} className="clay btn-clay-primary text-xs py-2 px-4 gap-1 flex-shrink-0">
                    Подробнее
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-soft-peach p-8 md:p-12 text-center">
            <Star size={40} className="text-clay-peach mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">
              Запишитесь на бережный осмотр
            </h2>
            <p className="text-clay-muted mb-8 max-w-md mx-auto">
              Ответим в WhatsApp в течение 2 минут. Запись день в день — доступна по будням.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/second-opinion" className="clay btn-clay-primary gap-2" style={{ background: 'linear-gradient(145deg, #FAC0A8, #F0A080)', boxShadow: '10px 10px 24px hsl(18, 12%, 60%), inset -4px -4px 9px hsla(18, 25%, 42%, 0.65), inset 0px 7px 14px hsla(18, 60%, 88%, 0.5)' }}>
                Записаться на приём
                <ArrowRight size={16} />
              </a>
              <a href="https://wa.me/79119258022" className="clay btn-clay-secondary gap-2">
                <MessageCircle size={16} />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
