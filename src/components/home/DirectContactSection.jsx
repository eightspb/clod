import { CheckCircle, MessageCircle, Phone } from 'lucide-react'
import { PHONE_NUMBER, TELEGRAM_URL } from '../../lib/contacts.js'

const HOME_REASONS = [
  'Врачи объясняют решения простым языком и без давления',
  'Маршрут пациента строим от жалобы к следующему шагу',
  'По необходимости организуем очный приём в Санкт-Петербурге',
  'После приёма подсказываем, какие документы и результаты взять с собой',
]

export function DirectContactSection() {
  return (
    <section className="section">
      <div className="container-clay">
        <div className="clay clay-card-soft-mint p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4 uppercase tracking-wider badge-specialty-mint">
                <MessageCircle size={12} />
                Прямая связь
              </div>
              <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">
                Связь с лечащим врачом
              </h2>
              <p className="text-clay-muted leading-relaxed mb-4">
                После процедуры лечащий врач остаётся на связи. Если появятся вопросы, мы поможем с ними в день обращения и подскажем дальнейший шаг.
              </p>
              <div className="space-y-3">
                {HOME_REASONS.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle size={16} className="text-clay-mint flex-shrink-0" />
                    <span className="text-sm text-clay-dark">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="clay clay-card p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="icon-circle-mint">
                  <Phone size={18} className="text-white" />
                </div>
              <div>
                <p className="font-bold text-clay-dark">Записаться на приём</p>
                <p className="text-xs text-clay-muted">Подскажем удобный формат связи</p>
              </div>
            </div>
              <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-secondary gap-2 justify-center">
                <Phone size={16} />
                Позвонить
              </a>
              <a href={TELEGRAM_URL} className="clay btn-clay-secondary gap-2 justify-center" target="_blank" rel="noopener noreferrer">
                <MessageCircle size={16} />
                Написать в Telegram
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
