import { Accessibility as AccessibilityIcon, Phone, MessageCircle, Car, Users, Eye, Type } from 'lucide-react'
import { PHONE_NUMBER, PHONE_DISPLAY, TELEGRAM_URL, ADDRESS } from '../../lib/contacts.js'

const MEASURES = [
  {
    icon: Users,
    iconBg: 'icon-circle-mint',
    title: 'Сопровождение администратором',
    desc: 'Администратор встречает пациента с ограниченными возможностями у входа, помогает пройти в кабинет и оформить документы.',
  },
  {
    icon: Car,
    iconBg: 'icon-circle-blue',
    title: 'Помощь при входе',
    desc: 'Если вы передвигаетесь на коляске или вам трудно ходить, предупредите при записи: администратор встретит у входа, поможет войти и проводит до кабинета без ожидания в очереди.',
  },
  {
    icon: Eye,
    iconBg: 'icon-circle-peach',
    title: 'Помощь при нарушениях зрения и слуха',
    desc: 'Документы озвучиваются администратором, допускается присутствие сопровождающего и переводчика русского жестового языка на приёме.',
  },
  {
    icon: Type,
    iconBg: 'icon-circle-lavender',
    title: 'Доступный сайт',
    desc: 'Кнопки «A+ / A / A−» в углу экрана увеличивают текст на всех страницах, сайт работает с клавиатуры и экранными дикторами.',
  },
]

export function Accessibility() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient pointer-events-none" aria-hidden="true" />
        <div className="container-clay relative z-10 py-8 md:py-10">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[color:var(--surface-card)] px-4 py-2 font-semibold text-clay-dark shadow-[var(--shadow-xs)]">
              <AccessibilityIcon size={14} aria-hidden="true" />
              Пациентам
            </div>
            <h1 className="text-4xl sm:text-5xl heading-display text-clay-dark leading-tight mb-5">Доступная среда</h1>
            <p className="text-lg text-clay-muted leading-relaxed max-w-2xl">
              Клиника принимает пациентов с инвалидностью и ограниченной мобильностью. Чтобы визит прошёл спокойно, сообщите о своих потребностях при записи: администратор подготовит помощь и подберёт удобное время без ожидания.
            </p>
          </div>
        </div>
      </section>
      <section className="section pt-4">
        <div className="container-clay">
          <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-6">Как организована помощь</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {MEASURES.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="clay clay-card p-6 flex gap-4 h-full">
                  <div className={`${item.iconBg} flex-shrink-0`}>
                    <Icon size={20} className="text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-clay-dark mb-2">{item.title}</h3>
                    <p className="text-clay-muted leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
      <section className="section pt-0">
        <div className="container-clay">
          <div className="clay cta-gradient-card p-6 md:p-8">
            <h2 className="text-2xl sm:text-3xl heading-serif text-clay-dark mb-3">Предупредите о визите заранее</h2>
            <p className="text-clay-muted mb-2 max-w-2xl leading-relaxed">
              Позвоните или напишите в Telegram и расскажите, какая помощь нужна. Адрес клиники: {ADDRESS}.
            </p>
            <p className="text-clay-muted mb-6 max-w-2xl leading-relaxed">
              Ответственный за организацию доступной среды — администратор клиники; замечания и предложения по доступности принимаются по тем же контактам.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-primary inline-flex items-center gap-2">
                <Phone size={16} aria-hidden="true" />
                {PHONE_DISPLAY}
              </a>
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="clay btn-clay-secondary inline-flex items-center gap-2">
                <MessageCircle size={16} aria-hidden="true" />
                Telegram
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
