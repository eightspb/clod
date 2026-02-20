import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle, Clock, Shield, Zap, Heart, Brain, Activity, Star, ChevronRight, Phone, MessageCircle } from 'lucide-react'

const services = [
  {
    icon: '🩺',
    color: 'clay-card-soft-mint',
    iconBg: 'icon-circle-mint',
    tag: 'Флагман',
    title: 'Маммология и ВАБ',
    desc: 'Удаление новообразований груди за 30 минут через прокол 2 мм. Без скальпеля, без наркоза, без швов.',
    stat: '30 мин',
    statLabel: 'процедура',
    to: '/mammology',
  },
  {
    icon: '🌸',
    color: 'clay-card-soft-peach',
    iconBg: 'icon-circle-peach',
    title: 'Гинекология',
    desc: 'Бережный осмотр без боли. 0% гипердиагностики — лечим только то, что требует лечения.',
    stat: '95%',
    statLabel: 'комфорт',
    to: '/gynecology',
  },
  {
    icon: '⚡',
    color: 'clay-card-soft-blue',
    iconBg: 'icon-circle-blue',
    title: 'Эндокринология',
    desc: 'Точная настройка метаболизма по данным анализов. Возвращаем энергию и контроль над весом.',
    stat: '14 дней',
    statLabel: 'до результата',
    to: '/endocrinology',
  },
  {
    icon: '🧠',
    color: 'clay-card-soft-lavender',
    iconBg: 'icon-circle-lavender',
    title: 'Неврология',
    desc: 'Жизнь без мигреней и боли в спине. Устраняем причину за 1–3 визита без гор таблеток.',
    stat: '1–3',
    statLabel: 'визита',
    to: '/neurology',
  },
]

const whyItems = [
  { icon: <Shield size={20} className="text-white" />, bg: 'icon-circle-mint', title: 'Доказательная медицина', desc: 'Не назначаем лечение без показаний. Только то, что действительно нужно.' },
  { icon: <Zap size={20} className="text-white" />, bg: 'icon-circle-peach', title: 'Высокие технологии', desc: 'Оборудование последнего поколения. Технология ВАБ EnCor Enspire (США).' },
  { icon: <Clock size={20} className="text-white" />, bg: 'icon-circle-blue', title: 'Сервис без ожидания', desc: 'Запись день в день. Ответ администратора в WhatsApp за 2 минуты.' },
  { icon: <Heart size={20} className="text-white" />, bg: 'icon-circle-lavender', title: 'Без боли и стресса', desc: 'Тёплая атмосфера, подогретые гели, инструменты минимального размера.' },
]

const doctors = [
  { name: 'Одинцова Елена Петровна', spec: 'Маммолог-онколог', exp: '18 лет', ring: 'avatar-ring-peach', initials: 'ОЕ' },
  { name: 'Смирнова Ирина Вадимовна', spec: 'Гинеколог', exp: '14 лет', ring: 'avatar-ring-blue', initials: 'СИ' },
  { name: 'Козлов Андрей Михайлович', spec: 'Эндокринолог', exp: '16 лет', ring: 'avatar-ring-mint', initials: 'КА' },
  { name: 'Волкова Наталья Сергеевна', spec: 'Невролог', exp: '12 лет', ring: 'avatar-ring-lavender', initials: 'ВН' },
]

export default function Home() {
  return (
    <div>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-8 pb-20 md:pt-12 md:pb-28">
        {/* Blobs */}
        <div className="blob-mint absolute -top-16 -right-16 w-72 h-72 md:w-96 md:h-96 opacity-70 pointer-events-none" />
        <div className="blob-peach absolute -bottom-10 -left-10 w-56 h-56 opacity-60 pointer-events-none" />
        <div className="blob-blue absolute top-1/2 -left-20 w-40 h-40 opacity-40 pointer-events-none" />

        {/* Orbs */}
        <div className="orb w-4 h-4 top-24 left-1/4 opacity-60" style={{ background: 'linear-gradient(145deg, #FAC8B0, #F0A888)' }} />
        <div className="orb w-6 h-6 bottom-32 right-1/3 opacity-50" style={{ background: 'linear-gradient(145deg, #A8D8F4, #78BCE8)' }} />
        <div className="orb w-3 h-3 top-1/3 right-1/4 opacity-60" style={{ background: 'linear-gradient(145deg, #CCC0EC, #B4A4DC)' }} />

        <div className="container-clay relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6 text-clay-mint" style={{ background: 'rgba(78,200,168,0.12)', border: '1px solid rgba(78,200,168,0.2)' }}>
              <span className="w-2 h-2 rounded-full bg-clay-mint animate-pulse" />
              Принимаем пациентов сегодня
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-clay-dark leading-tight mb-6">
              Клиника экспертной медицины:{' '}
              <span className="text-clay-mint">высокие технологии</span> ВАБ и доказательный подход
            </h1>
            <p className="text-base sm:text-lg text-clay-muted leading-relaxed mb-8 max-w-2xl">
              Решаем сложные медицинские задачи в маммологии, гинекологии, эндокринологии и неврологии. Без госпитализации, без общего наркоза и без «лишних» диагнозов.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/second-opinion" className="btn-clay-primary gap-2">
                Записаться онлайн
                <ArrowRight size={16} />
              </Link>
              <Link to="/mammology" className="btn-clay-secondary">
                Узнать о ВАБ
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── ВАБ FLAGSHIP ── */}
      <section className="section">
        <div className="container-clay">
          <div className="clay-card-mint p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/10 translate-y-1/2" />
            <div className="relative z-10">
              <div className="inline-block px-4 py-1.5 rounded-full bg-white/25 text-white text-xs font-bold mb-4 uppercase tracking-wider">
                Флагман клиники
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3">
                Удаление образований в груди за 30 минут
              </h2>
              <p className="text-white/90 text-lg mb-8">Без скальпеля и швов. Прокол 2 мм полностью заживает за 2 месяца.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-white/20 rounded-2xl p-5 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                      <Zap size={18} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">Технология ВАБ</h4>
                      <p className="text-white/85 text-sm leading-relaxed">Роботизированное удаление опухоли до 3 см под контролем УЗИ. В 10 раз информативнее обычной пункции.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/20 rounded-2xl p-5 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                      <Shield size={18} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">Бесплатное второе мнение</h4>
                      <p className="text-white/85 text-sm leading-relaxed">Если вам уже назначили операцию — мы перепроверим диагноз. Каждый 3-й случай решается с ВАБ.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/mammology" className="btn-clay-white text-sm py-3">
                  Подробнее о ВАБ
                  <ArrowRight size={14} />
                </Link>
                <Link to="/second-opinion" className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 text-white font-semibold text-sm hover:bg-white/30 transition-colors">
                  Бесплатное второе мнение
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-clay-dark mb-3">Направления клиники</h2>
            <p className="text-clay-muted max-w-xl mx-auto">Комплексная помощь по четырём ключевым направлениям — от диагностики до результата</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {services.map((s) => (
              <Link key={s.to} to={s.to} className="group block">
                <div className={`${s.color} p-6 h-full flex flex-col transition-transform duration-200 group-hover:-translate-y-1`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`${s.iconBg} text-2xl`}>
                        <span>{s.icon}</span>
                      </div>
                      <div>
                        {s.tag && (
                          <span className="stat-pill text-xs mb-1 block w-fit">{s.tag}</span>
                        )}
                        <h3 className="font-bold text-clay-dark text-lg leading-tight">{s.title}</h3>
                      </div>
                    </div>
                    <div className="clay-card px-3 py-1.5 text-center">
                      <p className="font-extrabold text-clay-mint text-base leading-none">{s.stat}</p>
                      <p className="text-clay-muted text-xs">{s.statLabel}</p>
                    </div>
                  </div>
                  <p className="text-clay-muted text-sm leading-relaxed flex-1 mb-4">{s.desc}</p>
                  <div className="flex items-center gap-1 text-clay-mint text-sm font-semibold">
                    Подробнее <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US ── */}
      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-clay-dark mb-4">
                Почему выбирают<br />
                <span className="text-clay-mint">Клинику Одинцова</span>
              </h2>
              <p className="text-clay-muted leading-relaxed mb-8">
                Мы не просто лечим — мы помогаем вам принимать осознанные решения. Доказательная медицина, современные технологии и уважение к вашему времени.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {whyItems.map((item) => (
                  <div key={item.title} className="clay-card p-4 flex items-start gap-3">
                    <div className={`${item.bg}`}>{item.icon}</div>
                    <div>
                      <h4 className="font-bold text-clay-dark text-sm mb-1">{item.title}</h4>
                      <p className="text-clay-muted text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="clay-card-soft-mint p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl font-extrabold text-clay-mint leading-none">1/3</div>
                  <div>
                    <p className="font-bold text-clay-dark mb-1">пациентов избегают операции</p>
                    <p className="text-clay-muted text-sm leading-relaxed">Каждый третий пациент, пришедший с направлением на операцию из другой клиники, решает проблему с помощью ВАБ за 30 минут.</p>
                  </div>
                </div>
              </div>
              <div className="clay-card-soft-peach p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl font-extrabold text-clay-peach leading-none">15+</div>
                  <div>
                    <p className="font-bold text-clay-dark mb-1">лет средний стаж врачей</p>
                    <p className="text-clay-muted text-sm leading-relaxed">Работаем только с экспертами, прошедшими обучение в ведущих клиниках России и Европы.</p>
                  </div>
                </div>
              </div>
              <div className="clay-card-soft-blue p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl font-extrabold text-clay-blue leading-none">24ч</div>
                  <div>
                    <p className="font-bold text-clay-dark mb-1">результаты анализов</p>
                    <p className="text-clay-muted text-sm leading-relaxed">Все результаты приходят на ваш телефон. Личный кабинет с доступом из любой точки мира.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DOCTORS ── */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-clay-dark mb-3">Наши врачи</h2>
            <p className="text-clay-muted">Эксперты с доказательным подходом</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {doctors.map((doc) => (
              <div key={doc.name} className="clay-card p-5 flex flex-col items-center text-center">
                <div className={`${doc.ring} mb-4`}>
                  <div className="w-20 h-20 rounded-full bg-clay-bg flex items-center justify-center">
                    <span className="text-2xl font-bold text-clay-muted">{doc.initials}</span>
                  </div>
                </div>
                <h4 className="font-bold text-clay-dark text-sm leading-tight mb-1">{doc.name}</h4>
                <p className="text-clay-mint text-xs font-semibold mb-2">{doc.spec}</p>
                <div className="clay-card-soft-mint px-3 py-1 rounded-full text-xs text-clay-mint font-semibold">
                  Стаж {doc.exp}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="section">
        <div className="container-clay">
          <div className="clay-card p-8 md:p-12 text-center relative overflow-hidden">
            <div className="blob-peach absolute -top-10 -right-10 w-40 h-40 opacity-50 pointer-events-none" />
            <div className="blob-mint absolute -bottom-10 -left-10 w-40 h-40 opacity-40 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-clay-dark mb-3">
                Не знаете, к кому обратиться?
              </h2>
              <p className="text-clay-muted text-lg mb-8 max-w-xl mx-auto">
                Позвоните нам или напишите в мессенджер — поможем разобраться и направим к нужному специалисту.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href="tel:+78001234567" className="btn-clay-primary gap-2">
                  <Phone size={16} />
                  Позвонить
                </a>
                <a href="https://t.me/klinika_odincova" className="btn-clay-secondary gap-2">
                  <MessageCircle size={16} />
                  Telegram
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
