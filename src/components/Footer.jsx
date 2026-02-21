import { Phone, MapPin, Clock, MessageCircle, Award, Star, Zap } from 'lucide-react'

const facts = [
  {
    icon: <Zap size={22} className="text-white" />,
    color: 'clay-card-mint',
    title: 'Технология ВАБ',
    desc: 'EnCor Enspire (США) — самое деликатное удаление образований без скальпеля',
  },
  {
    icon: <Award size={22} className="text-white" />,
    color: 'clay-card-peach',
    title: 'Опытные врачи',
    desc: 'Средний стаж — 15 лет. Только доказательная медицина без гипердиагностики',
  },
  {
    icon: <Clock size={22} className="text-white" />,
    color: 'clay-card-blue',
    title: 'Быстрый сервис',
    desc: 'Запись день в день. Ответ администратора в WhatsApp за 2 минуты',
  },
  {
    icon: <MapPin size={22} className="text-white" />,
    color: 'clay-card-lavender',
    title: 'Удобное расположение',
    desc: 'Санкт-Петербург, пр. Богатырский 22 к. 1, пом. 38Н. Рядом с метро «Старая деревня»',
  },
]

const links = [
  { label: 'Маммология и ВАБ', to: '/mammology' },
  { label: 'Гинекология', to: '/gynecology' },
  { label: 'Эндокринология', to: '/endocrinology' },
  { label: 'Неврология', to: '/neurology' },
  { label: 'Второе мнение', to: '/second-opinion' },
  { label: 'Цены и гарантии', to: '/prices' },
]

export function Footer() {
  return (
    <footer className="pt-16 pb-8">
      <div className="container-clay">
        {/* Key facts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {facts.map((fact) => (
            <div key={fact.title} className={`clay ${fact.color} p-5`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center">
                  {fact.icon}
                </div>
              </div>
              <h4 className="font-bold text-white text-sm mb-1.5">{fact.title}</h4>
              <p className="text-white/85 text-xs leading-relaxed">{fact.desc}</p>
            </div>
          ))}
        </div>

        {/* Main footer */}
        <div className="clay clay-card p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(145deg, #68D8B8, #44C4A0)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-clay-dark leading-none">Клиника Одинцова</p>
                  <p className="text-xs text-clay-muted mt-0.5">Экспертная медицина</p>
                </div>
              </div>
              <p className="text-sm text-clay-muted leading-relaxed mb-5">
                Высокие технологии ВАБ и доказательный подход в маммологии, гинекологии, эндокринологии и неврологии.
              </p>
              <div className="flex gap-3">
                <a
                  href="https://wa.me/79119258022"
                  className="clay clay-card p-2.5 rounded-2xl hover:scale-105 transition-transform"
                  aria-label="WhatsApp"
                >
                  <MessageCircle size={18} className="text-clay-mint" />
                </a>
                <a
                  href="https://t.me/odintsovclinic"
                  className="clay clay-card p-2.5 rounded-2xl hover:scale-105 transition-transform"
                  aria-label="Telegram"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-clay-blue" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Nav links */}
            <div>
              <h4 className="font-bold text-clay-dark mb-4 text-sm">Направления и услуги</h4>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link.to}>
                    <a
                      href={link.to}
                      className="text-sm text-clay-muted hover:text-clay-mint transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-clay-dark mb-4 text-sm">Контакты</h4>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="icon-circle-mint w-9 h-9 text-sm shrink-0 mt-0.5">
                    <Phone size={15} className="text-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-clay-muted">Телефон</p>
                    <a href="tel:+78127482210" className="text-sm font-semibold text-clay-dark hover:text-clay-mint transition-colors">
                      +7 (812) 748-22-10
                    </a>
                    <a href="tel:+79119258022" className="text-sm font-semibold text-clay-dark hover:text-clay-mint transition-colors">
                      +7 (911) 925-80-22
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="icon-circle-peach w-9 h-9 text-sm mt-0.5">
                    <MapPin size={15} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-clay-muted">Адрес</p>
                    <p className="text-sm font-semibold text-clay-dark">
                      Санкт-Петербург,
                      <br />
                      пр. Богатырский 22 к. 1, пом. 38Н
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="icon-circle-blue w-9 h-9 text-sm">
                    <Clock size={15} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-clay-muted">Часы работы</p>
                    <p className="text-sm font-semibold text-clay-dark">Пн–Пт: 9:00–20:00</p>
                    <p className="text-sm font-semibold text-clay-dark">Сб–Вс: 10:00–18:00</p>
                  </div>
                </div>
              </div>
              <a href="/second-opinion" className="clay btn-clay-primary mt-5 w-full justify-center text-sm py-3">
                Записаться онлайн
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 px-2">
          <p className="text-xs text-clay-muted">© 2026 ООО «Клиника Одинцова». Все права защищены.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-xs text-clay-muted hover:text-clay-mint transition-colors">
              Политика конфиденциальности
            </a>
            <a href="#" className="text-xs text-clay-muted hover:text-clay-mint transition-colors">
              Лицензии
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
