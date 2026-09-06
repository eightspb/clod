import { Phone, MapPin, Clock, Award, Zap } from 'lucide-react'
import {
  PHONE_NUMBER, PHONE_DISPLAY, PHONE_NUMBER_2, PHONE_DISPLAY_2,
  TELEGRAM_URL, VK_URL, ADDRESS, HOURS_WEEKDAY, HOURS_WEEKEND,
} from '../lib/contacts.js'
import { FOOTER_LINKS } from '../lib/nav.js'
import { CLINIC_FACTS } from '../lib/clinic-info.js'

const FACT_ICONS = { Zap, Award, Clock, MapPin }
const FACT_COPY = {
  'Технология ВАБ': {
    title: 'ВАБ как щадящая технология',
    desc: 'Процедуру проводим по показаниям и с понятным обсуждением альтернатив.',
  },
  'Опытные доктора': {
    title: 'Опытные врачи',
    desc: 'Средний стаж специалистов около 15 лет. Решения принимаем на основании клинической картины и обследований.',
  },
  'Быстрый сервис': {
    title: 'Организация без задержек',
    desc: 'Помогаем с записью и обратной связью в рабочее время без лишней суеты.',
  },
  'Удобное расположение': {
    title: 'Удобный маршрут',
    desc: 'Санкт-Петербург, Приморский район, Богатырский проспект. Удобно добраться от метро «Комендантский проспект» и «Старая Деревня».',
  },
}

const FOOTER_FACTS = CLINIC_FACTS.map((fact) => ({
  ...fact,
  ...(FACT_COPY[fact.title] ?? {}),
}))

export function Footer() {
  return (
    <footer className="pt-16 pb-8">
      <div className="container-clay">
        {/* Key facts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {FOOTER_FACTS.map((fact) => {
            const Icon = FACT_ICONS[fact.iconName]
            return (
              <div key={fact.title} className={`clay ${fact.color} p-4 overflow-hidden card-interactive`}>
                <div className="rounded-[16px] bg-white/74 backdrop-blur-sm p-4 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-clay-card flex items-center justify-center shadow-sm">
                      <Icon size={22} className="text-clay-ink" />
                    </div>
                  </div>
                  <h4 className="font-bold text-clay-ink text-sm mb-1.5">{fact.title}</h4>
                  <p className="text-clay-text text-xs leading-relaxed">{fact.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Main footer */}
        <div className="clay clay-card p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <div className="mb-4">
                <img
                  src="/images/logo.webp"
                  alt="Клиника доктора Одинцова"
                  width="184"
                  height="40"
                  className="h-10 w-auto"
                />
              </div>
              <p className="text-sm text-clay-muted leading-relaxed mb-5">
                Клиника экспертной медицины в Санкт-Петербурге: маммология, гинекология, эндокринология и нутрициология. Приём ведём по показаниям, с понятным маршрутом и без лишних назначений.
              </p>
              <div className="flex gap-3">
                <a
                  href={TELEGRAM_URL}
                  className="clay clay-card p-2.5 rounded-2xl hover:scale-105 transition-transform"
                  aria-label="Telegram"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-clay-blue" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </a>
                <a
                  href={VK_URL}
                  className="clay clay-card p-2.5 rounded-2xl hover:scale-105 transition-transform"
                  aria-label="ВКонтакте"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-clay-blue">
                    <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14C20.67 22 22 20.67 22 15.07V8.93C22 3.33 20.67 2 15.07 2zm3.08 13.5h-1.69c-.64 0-.84-.51-1.99-1.67-1-.98-1.44-.98-1.69-.98-.34 0-.44.1-.44.57v1.52c0 .41-.13.65-1.19.65-1.75 0-3.69-1.06-5.06-3.04C4.7 10.13 4.18 8.18 4.18 7.77c0-.25.1-.49.57-.49h1.69c.42 0 .58.19.74.64.82 2.37 2.19 4.45 2.76 4.45.21 0 .31-.1.31-.64V9.56c-.06-1.15-.67-1.25-.67-1.66 0-.2.16-.4.42-.4h2.66c.36 0 .48.19.48.6v3.23c0 .36.16.48.26.48.21 0 .39-.12.78-.51 1.2-1.35 2.06-3.43 2.06-3.43.11-.25.31-.49.73-.49h1.69c.51 0 .62.26.51.6-.21 1-.68 1.74-1.5 2.8-.14.19-.19.28 0 .49.14.16.59.55.89.88.55.6 1.37 1.56 1.37 2.08.01.41-.2.65-.61.65z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Nav links */}
            <div className="md:col-span-2">
              <nav aria-label="Навигация по сайту" className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-bold text-clay-dark mb-3 text-sm">Направления</h4>
                  <ul className="flex flex-col gap-2">
                    {FOOTER_LINKS.directions.map((link) => (
                      <li key={link.to}>
                        <a href={link.to} className="text-sm text-clay-muted hover:text-clay-mint transition-colors duration-200">
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-clay-dark mb-3 text-sm">Клиника</h4>
                  <ul className="flex flex-col gap-2">
                    {FOOTER_LINKS.clinic.map((link) => (
                      <li key={link.to}>
                        <a href={link.to} className="text-sm text-clay-muted hover:text-clay-mint transition-colors duration-200">
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-clay-dark mb-3 text-sm">Пациентам</h4>
                  <ul className="flex flex-col gap-2">
                    {FOOTER_LINKS.patients.map((link) => (
                      <li key={link.to}>
                        <a href={link.to} className="text-sm text-clay-muted hover:text-clay-mint transition-colors duration-200">
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>
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
                    <a href={`tel:${PHONE_NUMBER}`} className="text-sm font-semibold text-clay-dark hover:text-clay-mint transition-colors">
                      {PHONE_DISPLAY}
                    </a>
                    <a href={`tel:${PHONE_NUMBER_2}`} className="text-sm font-semibold text-clay-dark hover:text-clay-mint transition-colors">
                      {PHONE_DISPLAY_2}
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
                      {ADDRESS}
                    </p>
                    <p className="text-xs text-clay-muted mt-0.5">Приморский район</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="icon-circle-blue w-9 h-9 text-sm">
                    <Clock size={15} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-clay-muted">Часы работы</p>
                    <p className="text-sm font-semibold text-clay-dark">{HOURS_WEEKDAY}</p>
                    <p className="text-sm font-semibold text-clay-dark">{HOURS_WEEKEND}</p>
                  </div>
                </div>
              </div>
              <button type="button" id="footer-booking-btn" data-booking-btn="true" className="clay btn-clay-primary mt-5 w-full flex justify-center text-sm py-3">
                Записаться на приём
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 px-2">
          <p className="text-xs text-clay-muted">© 2026 ООО «Клиника Одинцова». Все права защищены.</p>
          <div className="flex items-center gap-4">
            <a href="/privacy-policy" className="text-xs text-clay-muted hover:text-clay-mint transition-colors">
              Политика конфиденциальности
            </a>
            <a href="/licenses" className="text-xs text-clay-muted hover:text-clay-mint transition-colors">
              Лицензии
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
