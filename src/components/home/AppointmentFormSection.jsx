import { CalendarCheck, Phone } from 'lucide-react'

export function AppointmentFormSection() {
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
                Запишитесь на приём
              </h2>
              <p className="text-clay-muted">
                Выберите врача, свободную дату и удобное время в онлайн-записи
              </p>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                data-booking-btn="true"
                className="clay btn-clay-primary min-h-11 justify-center gap-2"
              >
                <CalendarCheck size={18} aria-hidden="true" />
                Записаться онлайн
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
