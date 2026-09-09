import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const SMALL_BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-clay-admin-border bg-white px-4 text-sm font-semibold text-clay-admin-dark transition hover:border-clay-mint hover:text-clay-mint disabled:cursor-not-allowed disabled:opacity-45'
const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'short', timeStyle: 'short' })
const ACTION_LABELS = Object.freeze({ reveal: 'Показ телефона', reveal_full: 'Показ досье', search: 'Поиск по телефону', destroy: 'Уничтожение' })
const SUBJECT_LABELS = Object.freeze({ patient: 'Пациент', call: 'Звонок' })
const EMPTY = Object.freeze({ data: Object.freeze([]), page: Object.freeze({ number: 1, size: 50, total: 0, pages: 0 }) })

function date(value) {
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? DATE_FORMAT.format(parsed) : '—'
}

function subjectLink(entry) {
  if (entry.subject === 'patient') return <a className="font-mono text-xs text-clay-mint hover:underline" href={`/admin/patients?patient=${encodeURIComponent(entry.subjectId)}`}>{entry.subjectId.slice(0, 8)}</a>
  return <span className="font-mono text-xs text-clay-admin-muted">{entry.subjectId.slice(0, 8)}</span>
}

/**
 * Paginated journal of personal-data access (PatientAccess + MangoCallAccess) with user names.
 * With `patientId` it lists only that patient's entries, for the patient card.
 */
export function AccessLog({ patientId, pageSize = 50 }) {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(EMPTY)
  const [error, setError] = useState('')
  useEffect(() => {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (patientId) query.set('patientId', patientId)
    let cancelled = false
    fetch(`/api/admin/access?${query}`, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.href = '/admin/login'
          return
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const payload = await response.json()
        if (!cancelled) setResult(payload)
      })
      .catch(() => { if (!cancelled) setError('Не удалось загрузить журнал доступа') })
    return () => { cancelled = true }
  }, [page, pageSize, patientId])
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>
  return (
    <section className="space-y-3" aria-label="Журнал доступа к персональным данным">
      {result.data.length === 0 ? <p className="py-5 text-sm text-clay-admin-muted">Записей о доступе нет</p> : (
        <div className="overflow-x-auto rounded-2xl border border-clay-admin-border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-clay-admin-muted"><tr><th className="w-40 px-4 py-2.5">Время</th><th className="px-4 py-2.5">Пользователь</th><th className="w-40 px-4 py-2.5">Действие</th>{!patientId && <th className="w-32 px-4 py-2.5">Объект</th>}<th className="px-4 py-2.5">Причина</th></tr></thead>
            <tbody>
              {result.data.map((entry) => (
                <tr key={entry.id} className="border-t border-clay-admin-border align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-clay-admin-muted">{date(entry.createdAt)}</td>
                  <td className="px-4 py-2.5"><span className="block font-semibold text-clay-admin-dark">{entry.user.displayName}</span>{entry.user.login && <span className="block font-mono text-xs text-clay-admin-muted">{entry.user.login}</span>}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{ACTION_LABELS[entry.action] ?? entry.action}</td>
                  {!patientId && <td className="whitespace-nowrap px-4 py-2.5">{SUBJECT_LABELS[entry.subject] ?? entry.subject} {subjectLink(entry)}</td>}
                  <td className="px-4 py-2.5 text-clay-admin-muted">{entry.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {result.page.pages > 1 && <div className="flex items-center gap-3"><button type="button" className={SMALL_BUTTON} disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Предыдущая страница"><ChevronLeft aria-hidden="true" size={17} /></button><span className="text-sm text-clay-admin-muted">Страница {result.page.number} из {result.page.pages}</span><button type="button" className={SMALL_BUTTON} disabled={page >= result.page.pages} onClick={() => setPage(page + 1)} aria-label="Следующая страница"><ChevronRight aria-hidden="true" size={17} /></button></div>}
    </section>
  )
}
