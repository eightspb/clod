import { ArrowRight, Award, Clock, Heart, Microscope, Shield, Star, Users, Zap, CheckCircle, Phone } from 'lucide-react'
import { PHONE_NUMBER } from '../../lib/contacts.js'

const ADVANTAGES = [
  {
    icon: Shield,
    iconBg: 'icon-circle-mint',
    title: 'Доказательная медицина',
    desc: 'Только методы с доказанной эффективностью. Никакой гипердиагностики и лишних назначений — только то, что действительно нужно.',
  },
  {
    icon: Zap,
    iconBg: 'icon-circle-blue',
    title: 'Технология ВАБ',
    desc: 'Флагманская технология клиники: удаление образований груди за 30 минут без скальпеля, швов и наркоза. Прокол 2 мм.',
  },
  {
    icon: Users,
    iconBg: 'icon-circle-peach',
    title: 'Эксперты с опытом 15+ лет',
    desc: 'Каждый врач клиники прошёл обучение в ведущих медицинских центрах России и Европы. Средний стаж — более 15 лет.',
  },
  {
    icon: Clock,
    iconBg: 'icon-circle-lavender',
    title: 'Результаты за 24 часа',
    desc: 'Анализы и заключения поступают в личный кабинет в течение суток. Доктор остаётся на связи в мессенджере.',
  },
  {
    icon: Heart,
    iconBg: 'icon-circle-mint',
    title: 'Бережный подход',
    desc: 'Атмосфера пятизвёздочного отеля, а не больницы. Осмотры без дискомфорта, объяснения без медицинского жаргона.',
  },
  {
    icon: Award,
    iconBg: 'icon-circle-peach',
    title: 'Прозрачное ценообразование',
    desc: 'Цена, названная на консультации — финальная. Никаких доплат в день процедуры, никаких скрытых расходов.',
  },
]

const EQUIPMENT = [
  {
    icon: '🔬',
    title: 'Система XISHAN (Сишань)',
    desc: 'Роботизированная установка для вакуумной аспирационной биопсии под контролем УЗИ. Позволяет удалять образования до 3 см через прокол 2 мм.',
    tag: 'Флагман',
    tagColor: '#3AB89A',
    tagBg: 'rgba(78,200,168,0.12)',
  },
  {
    icon: '📡',
    title: 'УЗИ экспертного класса',
    desc: 'Ультразвуковые аппараты с разрешением, позволяющим выявлять образования от 2 мм. Все врачи клиники владеют УЗИ-диагностикой.',
    tag: 'Диагностика',
    tagColor: '#4880B0',
    tagBg: 'rgba(78,158,200,0.12)',
  },
  {
    icon: '🧪',
    title: 'Собственная лаборатория',
    desc: 'Гистологические и цитологические исследования выполняются в партнёрских лабораториях с сертификацией ISO. Результаты — в течение 24 часов.',
    tag: 'Лаборатория',
    tagColor: '#7060A8',
    tagBg: 'rgba(155,142,200,0.12)',
  },
  {
    icon: '💻',
    title: 'Цифровой личный кабинет',
    desc: 'Все результаты, снимки и протоколы хранятся в зашифрованном облаке. Доступ 24/7 из любой точки мира, возможность поделиться с другим специалистом.',
    tag: 'Цифровой',
    tagColor: '#D07858',
    tagBg: 'rgba(240,168,136,0.12)',
  },
]

export function About() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pt-8 pb-12">
        <div className="blob-mint absolute -top-32 -left-32 w-96 h-96 opacity-20 pointer-events-none" style={{ zIndex: 0 }} />
        <div className="blob-peach absolute -bottom-24 -right-24 w-80 h-80 opacity-15 pointer-events-none" style={{ zIndex: 0 }} />
        <div className="container-clay relative z-10">
          <a href="/" className="inline-flex items-center gap-1 text-sm text-clay-muted hover:text-clay-mint transition-colors mb-6">
            ← Назад на главную
          </a>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5" style={{ background: 'rgba(78,200,168,0.12)', color: '#3AB89A' }}>
              <Heart size={12} />
              Санкт-Петербург
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-clay-dark leading-tight mb-5">
              О клинике{' '}
              <span className="text-clay-mint">Одинцова</span>
            </h1>
            <p className="text-clay-muted leading-relaxed mb-5 max-w-2xl text-lg">
              Экспертная медицина в маммологии, гинекологии, эндокринологии и неврологии. Мы помогаем принимать осознанные решения о здоровье.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/second-opinion" className="clay btn-clay-primary gap-2">
                Записаться на приём
                <ArrowRight size={16} />
              </a>
              <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-secondary gap-2">
                <Phone size={16} />
                Позвонить
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* HISTORY / MISSION */}
      <section className="section">
        <div className="container-clay">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-clay-dark mb-6">
                История и миссия
              </h2>
              <div className="space-y-5 text-clay-muted leading-relaxed">
                <p>
                  Клиника Одинцова основана в Санкт-Петербурге командой врачей, объединённых общей идеей: медицина должна быть честной, доступной и ориентированной на пациента. Мы начинали как небольшой маммологический центр в Приморском районе и за несколько лет выросли в многопрофильную клинику экспертного уровня.
                </p>
                <p>
                  Наша миссия — помочь каждому пациенту принять осознанное решение о своём здоровье. Мы не назначаем лишних анализов, не направляем на операцию там, где можно обойтись малоинвазивной процедурой, и всегда объясняем, почему выбрали именно этот метод лечения.
                </p>
                <p>
                  Флагманская технология клиники — вакуумная аспирационная биопсия (ВАБ). Благодаря ей каждый третий пациент, пришедший с направлением на полостную операцию из другой клиники, решает проблему за 30 минут без скальпеля и швов. Это не просто медицинская процедура — это другой стандарт помощи.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: '1/3', color: 'text-clay-mint', card: 'clay-card-soft-mint', label: 'пациентов избегают операции', desc: 'Благодаря технологии ВАБ' },
                { val: '15+', color: 'text-clay-peach', card: 'clay-card-soft-peach', label: 'лет стаж врачей', desc: 'Средний опыт специалистов' },
                { val: '4', color: 'text-clay-blue', card: 'clay-card-soft-blue', label: 'направления медицины', desc: 'Маммология, гинекология, эндокринология, неврология' },
                { val: '4.9', color: 'text-clay-lavender', card: 'clay-card-soft-lavender', label: 'средняя оценка', desc: 'По отзывам на Яндексе и ПроДокторов' },
              ].map((s) => (
                <div key={s.val} className={`clay ${s.card} p-5`}>
                  <div className={`text-3xl font-extrabold ${s.color} leading-none mb-1`}>{s.val}</div>
                  <p className="font-bold text-clay-dark text-sm mb-1">{s.label}</p>
                  <p className="text-clay-muted text-xs leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ADVANTAGES */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-clay-dark mb-3">
              Наши преимущества
            </h2>
            <p className="text-clay-muted max-w-xl mx-auto">
              Шесть причин, почему пациенты выбирают Клинику Одинцова
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ADVANTAGES.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="clay clay-card p-6 flex flex-col gap-4">
                  <div className={item.iconBg}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-clay-dark mb-2">{item.title}</h3>
                    <p className="text-clay-muted text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* EQUIPMENT */}
      <section className="section">
        <div className="container-clay">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-clay-dark mb-3">
              Оборудование и технологии
            </h2>
            <p className="text-clay-muted max-w-xl mx-auto">
              Современная база для точной диагностики и малоинвазивного лечения
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {EQUIPMENT.map((item) => (
              <div key={item.title} className="clay clay-card p-6 flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: item.tagBg }}
                >
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-clay-dark">{item.title}</h3>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
                      style={{ background: item.tagBg, color: item.tagColor }}
                    >
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-clay-muted text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card-mint p-6 md:p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/10 translate-y-1/2" />
            <div className="relative z-10">
              <Star size={40} className="text-white/80 mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                Готовы записаться?
              </h2>
              <p className="text-white/90 text-lg mb-5 max-w-xl mx-auto">
                Позвоните нам или оставьте заявку — ответим в течение 15 минут и подберём удобное время.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href="/second-opinion" className="clay btn-clay-white gap-2">
                  Записаться онлайн
                  <ArrowRight size={16} />
                </a>
                <a href={`tel:${PHONE_NUMBER}`} className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 text-white font-semibold text-sm hover:bg-white/30 transition-colors">
                  <Phone size={16} />
                  Позвонить
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
