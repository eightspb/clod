import { Activity, ServerCrash } from 'lucide-react'

const CHECK_LABELS = Object.freeze({ health: 'Приложение', tls: 'Сертификат TLS', disk: 'Диск', memory: 'Память', containers: 'Контейнеры', backup: 'Бэкап' })
const TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' })

function label(check) {
  return `${CHECK_LABELS[check.name] || check.name}: ${check.detail || (check.ok ? 'ок' : 'сбой')}`
}

/**
 * Surfaces the host monitor (scripts/monitor.sh) inside the admin dashboard: without an external
 * uptime service this is where TLS expiry, disk pressure, and a stale backup become visible.
 */
export function MonitorStatusPanel({ monitor }) {
  if (!monitor || !monitor.available) return <p className="rounded-2xl border border-clay-admin-border bg-white px-4 py-3 text-sm text-clay-admin-muted">Монитор сервера не настроен: запустите <code>scripts/install-monitor-timer.sh</code> на хосте.</p>
  const failing = Array.isArray(monitor.failing) ? monitor.failing : []
  const checkedAt = TIME_FORMAT.format(new Date(monitor.checkedAt))
  if (monitor.stale || failing.length > 0) {
    return (
      <div role="alert" aria-label="Мониторинг сервера" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <ServerCrash aria-hidden="true" size={20} className="mt-0.5 shrink-0" />
        <div>
          {monitor.stale && <p><strong className="font-bold">Монитор не отчитывался</strong> с {checkedAt} по Москве: проверьте <code>systemctl status clod-monitor.timer</code> на хосте.</p>}
          {failing.length > 0 && <ul className="list-disc pl-5">{failing.map((check) => <li key={check.name}>{label(check)}</li>)}</ul>}
        </div>
      </div>
    )
  }
  return (
    <div role="status" aria-label="Мониторинг сервера" className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <Activity aria-hidden="true" size={20} className="shrink-0" />
      <p>Сервер в норме, проверка в {checkedAt} по Москве: {monitor.checks.map(label).join(' · ')}</p>
    </div>
  )
}
