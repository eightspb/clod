import { PhoneOff } from 'lucide-react'
import { telephonySilence } from '../../lib/telephony-freshness.js'

const TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' })

/**
 * Red banner for a MANGO webhook stream that fell silent inside clinic hours; a silently changed
 * API Realtime address produces no error anywhere else.
 */
export function TelephonyFreshnessAlert({ lastEventAt }) {
  if (lastEventAt === undefined) return null
  const silence = telephonySilence({ lastEventAt, now: new Date() })
  if (!silence.stale) return null
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <PhoneOff aria-hidden="true" size={20} className="mt-0.5 shrink-0" />
      <p><strong className="font-bold">Телефония молчит.</strong> Событий MANGO не было с {TIME_FORMAT.format(new Date(silence.sinceAt))} по Москве. Проверьте историю запросов к API в кабинете MANGO и allowlist адресов API Realtime в <code>nginx.https.conf</code>.</p>
    </div>
  )
}
