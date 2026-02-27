import { Phone, CalendarCheck } from 'lucide-react'
import { PHONE_NUMBER, PHONE_DISPLAY } from '../lib/contacts.js'

export function StickyCTA() {
  return (
    <div className="fixed bottom-0 left-0 right-0 md:hidden z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div
        className="flex items-stretch gap-0"
        style={{
          background: 'rgba(247,243,239,0.97)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(78,200,168,0.2)',
          boxShadow: '0 -4px 24px rgba(61,74,68,0.12)',
        }}
      >
        <a
          href={`tel:${PHONE_NUMBER}`}
          className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold text-clay-dark hover:text-clay-mint transition-colors"
          aria-label={`Позвонить: ${PHONE_DISPLAY}`}
        >
          <Phone size={18} />
          Позвонить
        </a>
        <div className="w-px" style={{ background: 'rgba(78,200,168,0.2)' }} />
        <button
          type="button"
          data-booking-btn="true"
          className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold text-white"
          style={{ background: 'linear-gradient(145deg, #68D8B8, #44C4A0)' }}
          aria-label="Записаться"
        >
          <CalendarCheck size={18} />
          Записаться
        </button>
      </div>
    </div>
  )
}
