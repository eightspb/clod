import { Phone, CalendarCheck } from 'lucide-react'
import { PHONE_NUMBER, PHONE_DISPLAY } from '../lib/contacts.js'

export function StickyCTA() {
  return (
    <div
      className="fixed inset-x-3 md:hidden z-40 pointer-events-none"
      style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div
        className="pointer-events-auto overflow-hidden rounded-3xl border border-black/5 backdrop-blur-md shadow-[0_10px_28px_rgba(61,74,68,0.14)]"
        style={{
          background: 'rgba(251,248,243,0.98)',
        }}
      >
        <div className="flex items-stretch gap-0">
          <a
            href={`tel:${PHONE_NUMBER}`}
            className="flex-1 flex min-h-14 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-clay-dark hover:text-clay-mint transition-colors"
            aria-label={`Позвонить: ${PHONE_DISPLAY}`}
          >
            <Phone size={18} />
            Позвонить
          </a>
          <div className="w-px shrink-0 self-stretch bg-black/5" />
          <button
            type="button"
            data-booking-btn="true"
            className="flex-1 flex min-h-14 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-clay-dark"
            style={{ background: 'linear-gradient(145deg, #d9f1ea, #bddfd4)' }}
            aria-label="Записаться"
          >
            <CalendarCheck size={18} />
            Записаться сейчас
          </button>
        </div>
      </div>
    </div>
  )
}
