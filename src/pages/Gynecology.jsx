import { Link } from 'react-router-dom'
import { ArrowRight, Heart, CheckCircle, Star, Clock, MessageCircle, Smile } from 'lucide-react'

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

const services = [
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

export default function Gynecology() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pt-8 pb-20">
        <div className="blob-peach absolute -top-12 -right-12 w-72 h-72 opacity-60 pointer-events-none" />
        <div className="blob-mint absolute bottom-0 -left-10 w-56 h-56 opacity-50 pointer-events-none" />
        <div className="orb w-5 h-5 top-28 left-1/3 opacity-55" style={{ background: 'linear-gradient(145deg, #A8D8F4, #78BCE8)' }} />
        <div className="orb w-4 h-4 bottom-20 right-1/4 opacity-60" style={{ background: 'linear-gradient(145deg, #68D8B8, #44C4A0)' }} />

        <div className="container-clay relative z-10">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-clay-muted hover:text-clay-mint transition-colors mb-6">
            ← Назад на главную
          </Link>
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
              <Link to="/second-opinion" className="btn-clay-primary gap-2" style={{ background: 'linear-gradient(145deg, #FAC0A8, #F0A080)' }}>
                Записаться на приём
                <ArrowRight size={16} />
              </Link>
              <Link to="/prices" className="btn-clay-secondary">
                Посмотреть цены
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="pb-8">
        <div className="container-clay">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { val: '95%', label: 'пациенток — самый комфортный осмотр в жизни' },
              { val: '0%', label: 'гипердиагностики — не лечим лишнее' },
              { val: '24ч', label: 'до получения результатов анализов' },
              { val: '1', label: 'визит для полного скрининга' },
            ].map((s) => (
              <div key={s.label} className="clay-card p-4 text-center">
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
              <div key={f.title} className={`${f.card} p-6 flex flex-col`}>
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
                  <div key={s} className="clay-card flex items-center gap-3 px-4 py-3">
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
                <div key={i} className="clay-card p-5">
                  <p className="font-semibold text-clay-dark text-sm mb-2">{m.myth}</p>
                  <p className="text-clay-muted text-sm leading-relaxed border-l-2 border-clay-peach pl-3">{m.truth}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-clay">
          <div className="clay-card-soft-peach p-8 md:p-12 text-center">
            <Star size={40} className="text-clay-peach mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-3">
              Запишитесь на бережный осмотр
            </h2>
            <p className="text-clay-muted mb-8 max-w-md mx-auto">
              Ответим в WhatsApp в течение 2 минут. Запись день в день — доступна по будням.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/second-opinion" className="btn-clay-primary gap-2" style={{ background: 'linear-gradient(145deg, #FAC0A8, #F0A080)', boxShadow: '5px 5px 16px rgba(240,160,128,0.42), -3px -3px 8px rgba(255,255,255,0.5)' }}>
                Записаться на приём
                <ArrowRight size={16} />
              </Link>
              <a href="https://wa.me/78001234567" className="btn-clay-secondary gap-2">
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
