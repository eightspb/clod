import { useState } from 'react'
import { Phone, CheckCircle, Send } from 'lucide-react'

export function AppointmentFormSection() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
      setName('')
      setPhone('')
    }, 800)
  }
  return (
    <section id="appointment-form" className="section">
      <div className="container-clay">
          <div className="clay clay-card p-6 md:p-8 relative overflow-hidden max-w-2xl mx-auto">
          <div className="blob-mint absolute -top-10 -right-10 w-40 h-40 opacity-30 pointer-events-none" />
          <div className="blob-peach absolute -bottom-10 -left-10 w-32 h-32 opacity-25 pointer-events-none" />
          <div className="relative z-10">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-3 badge-specialty-mint">
                <Phone size={12} />
                Запись онлайн
              </div>
              <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-2">
                Записаться на приём
              </h2>
              <p className="text-clay-muted">
                Оставьте контакты - администратор свяжется с вами в рабочее время
              </p>
            </div>
            {isSubmitted ? (
              <div className="clay clay-card-soft-mint p-6 text-center">
                <CheckCircle size={40} className="text-clay-mint mx-auto mb-3" />
                <p className="font-bold text-clay-dark text-lg mb-1">Заявка принята!</p>
                <p className="text-clay-muted text-sm">Мы свяжемся с вами в рабочее время и согласуем удобный формат связи.</p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="mt-4 text-sm text-clay-mint-dark font-semibold hover:underline"
                >
                  Отправить ещё одну заявку
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="appt-name" className="text-sm font-semibold text-clay-dark">
                    Ваше имя
                  </label>
                  <input
                    id="appt-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Например, Анна"
                    required
                    className="clay clay-card px-4 py-3 text-sm text-clay-dark placeholder:text-clay-muted focus:ring-2 focus:ring-clay-mint focus:ring-offset-2 w-full"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="appt-phone" className="text-sm font-semibold text-clay-dark">
                    Телефон
                  </label>
                  <input
                    id="appt-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                    required
                    className="clay clay-card px-4 py-3 text-sm text-clay-dark placeholder:text-clay-muted focus:ring-2 focus:ring-clay-mint focus:ring-offset-2 w-full"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim() || !phone.trim()}
                  className="clay btn-clay-primary gap-2 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>Отправляем...</>
                  ) : (
                    <>
                      <Send size={16} />
                      Записаться
                    </>
                  )}
                </button>
                <p className="text-xs text-clay-muted text-center">
                  Нажимая кнопку, вы соглашаетесь с обработкой персональных данных
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
