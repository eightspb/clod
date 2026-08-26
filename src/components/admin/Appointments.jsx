import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, CircleAlert, Search, XCircle } from 'lucide-react'
import { moscowDayBounds } from '../../lib/clinic-time.js'
import { useAdminFetch } from '../../lib/useAdminFetch.js'

const EMPTY_PAGE = Object.freeze({ number: 1, size: 50, total: 0, pages: 0 })
const EMPTY_FILTERS = Object.freeze({ status: '', source: '' })
const STATUS_LABELS = Object.freeze({ pending: 'Ожидает', confirmed: 'Подтверждена', cancelled: 'Отменена', failed: 'Ошибка', needs_review: 'Требует проверки' })
const SOURCE_LABELS = Object.freeze({ website: 'С сайта', admin_medflex: 'Создана администратором', admin_existing: 'Внесена из МИС' })
const STATUS_CLASSES = Object.freeze({ pending: 'bg-amber-50 text-amber-800', confirmed: 'bg-emerald-50 text-emerald-800', cancelled: 'bg-slate-100 text-slate-700', failed: 'bg-red-50 text-red-700', needs_review: 'bg-orange-50 text-orange-800' })
const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'short', timeStyle: 'short' })
const INPUT_CLASS = 'min-h-11 rounded-xl border border-clay-admin-border bg-white px-3 text-sm text-clay-dark outline-none transition focus:border-clay-mint'
const SMALL_BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-clay-admin-border bg-white px-4 text-sm font-semibold text-clay-admin-dark transition hover:border-clay-mint hover:text-clay-mint disabled:cursor-not-allowed disabled:opacity-45'
const NOW = () => new Date()

function date(value) {
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? DATE_FORMAT.format(parsed) : '—'
}

async function mutate(url, options) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers } })
  if (response.status === 401) {
    window.location.href = '/admin/login'
    throw new Error('Unauthorized')
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

function initialFilters(now) {
  const value = { ...EMPTY_FILTERS }
  if (typeof window === 'undefined') return Object.freeze(value)
  const parameters = new URLSearchParams(window.location.search)
  const status = parameters.get('status')
  const source = parameters.get('source')
  if (Object.hasOwn(STATUS_LABELS, status)) value.status = status
  if (Object.hasOwn(SOURCE_LABELS, source)) value.source = source
  if (parameters.get('date') === 'today') {
    const bounds = moscowDayBounds(now)
    value.from = bounds.start
    value.to = bounds.end
  }
  else if (parameters.get('range') === 'upcoming') value.from = now.toISOString()
  return Object.freeze(value)
}

/**
 * Renders the appointment operations journal and its guarded status actions.
 */
export function Appointments({ clock = NOW }) {
  const { loading, error, fetchData } = useAdminFetch()
  const [initial] = useState(() => initialFilters(clock()))
  const [appointments, setAppointments] = useState([])
  const [page, setPage] = useState(EMPTY_PAGE)
  const [filters, setFilters] = useState({ status: initial.status, source: initial.source })
  const [applied, setApplied] = useState(initial)
  const [cancelTarget, setCancelTarget] = useState(undefined)
  const [resolveTarget, setResolveTarget] = useState(undefined)
  const [claimId, setClaimId] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const load = useCallback(async (number, active) => {
    const parameters = new URLSearchParams({ page: String(number), pageSize: '50' })
    if (active.status) parameters.set('status', active.status)
    if (active.source) parameters.set('source', active.source)
    if (active.from) parameters.set('from', active.from)
    if (active.to) parameters.set('to', active.to)
    const result = await fetchData(`/api/admin/appointments?${parameters}`, { errorMessage: 'Не удалось загрузить записи' })
    if (!result) return
    setAppointments(Array.isArray(result.data) ? result.data : [])
    setPage(result.page ?? EMPTY_PAGE)
  }, [fetchData])
  useEffect(() => { load(1, initial) }, [initial, load])
  function apply(event) {
    event.preventDefault()
    const next = { ...filters }
    setApplied(next)
    load(1, next)
  }
  function replace(updated) {
    setAppointments((current) => current.map((appointment) => appointment.id === updated.id ? updated : appointment))
  }
  async function cancel() {
    if (!cancelTarget) return
    setBusy(true)
    setActionError('')
    try {
      const result = await mutate(`/api/admin/appointments/${cancelTarget.id}/cancel`, { method: 'POST', body: JSON.stringify({ confirmation: 'ОТМЕНИТЬ' }) })
      replace(result.data.appointment)
      setCancelTarget(undefined)
    } catch {
      setActionError('Не удалось отменить запись. Проверьте состояние в Medflex.')
    } finally {
      setBusy(false)
    }
  }
  async function resolve() {
    if (!resolveTarget) return
    setBusy(true)
    setActionError('')
    try {
      const result = await mutate(`/api/admin/appointments/${resolveTarget.id}/resolve`, { method: 'POST', body: JSON.stringify({ claimId: claimId.trim() }) })
      replace(result.data)
      setResolveTarget(undefined)
      setClaimId('')
    } catch {
      setActionError('Не удалось подтвердить запись. Проверьте Claim ID и текущий статус.')
    } finally {
      setBusy(false)
    }
  }
  if (loading && appointments.length === 0) return <div role="status" className="clay-card flex min-h-48 items-center justify-center p-8 text-clay-admin-muted">Загружаем записи…</div>
  if (error && appointments.length === 0) return <div role="alert" className="clay-card border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">{error}</div>
  return (
    <section className="space-y-5" aria-label="Журнал записей">
      <div className="clay-card-soft-blue p-5 sm:p-6"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-blue">Операционный журнал</p><h1 className="mt-2 font-serif text-2xl text-clay-dark sm:text-3xl">Записи на приём</h1><p className="mt-2 text-sm text-clay-muted">Сайт, администратор и уже существующие приёмы собраны в одном журнале. Время показано по Москве.</p></div><div className="rounded-2xl bg-white/80 px-5 py-3 text-sm text-clay-admin-muted"><span className="block text-2xl font-bold text-clay-admin-dark">{page.total}</span>записей по фильтру</div></div></div>
      <form aria-label="Фильтры записей" className="clay-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end" onSubmit={apply}><label className="flex flex-1 flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Статус записи<select className={INPUT_CLASS} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Все статусы</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex flex-1 flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Источник записи<select className={INPUT_CLASS} value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))}><option value="">Все источники</option>{Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="submit" className="btn-clay-primary min-h-11 px-6 py-2.5"><Search aria-hidden="true" size={17} />Применить</button></form>
      {actionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{actionError}</div>}
      <div className="clay-card overflow-hidden">{appointments.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center text-clay-admin-muted"><CalendarClock aria-hidden="true" size={34} /><strong className="text-clay-admin-dark">Записи не найдены</strong><span className="text-sm">Измените фильтры или дождитесь новых обращений.</span></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1040px] border-collapse text-left text-sm"><thead className="bg-clay-admin-bg text-xs uppercase tracking-wider text-clay-admin-muted"><tr><th className="px-5 py-3">Дата и пациент</th><th className="px-5 py-3">Врач</th><th className="px-5 py-3">Источник</th><th className="px-5 py-3">Статус</th><th className="px-5 py-3">Стоимость</th><th className="px-5 py-3 text-right">Действия</th></tr></thead><tbody>{appointments.map((appointment) => <tr key={appointment.id} className="border-t border-clay-admin-border align-middle"><td className="px-5 py-4"><span className="block font-semibold text-clay-admin-dark">{date(appointment.startsAt)}</span><span className="mt-1 block text-xs text-clay-admin-muted"><span>{appointment.patient.name || 'Обезличенный пациент'}</span><span aria-hidden="true"> · </span><span>{appointment.patient.phoneMask || 'без телефона'}</span></span></td><td className="px-5 py-4"><span className="block font-semibold text-clay-admin-dark">{appointment.doctorName}</span><span className="mt-1 block text-xs text-clay-admin-muted">{appointment.serviceName || appointment.specialityName}</span></td><td className="px-5 py-4 text-clay-admin-muted">{SOURCE_LABELS[appointment.source] || appointment.source}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${STATUS_CLASSES[appointment.status] || 'bg-slate-100 text-slate-700'}`}>{STATUS_LABELS[appointment.status] || appointment.status}</span></td><td className="px-5 py-4 font-semibold text-clay-admin-dark">{Number.isSafeInteger(appointment.priceKopecks) ? `${new Intl.NumberFormat('ru-RU').format(appointment.priceKopecks / 100)} ₽` : '—'}</td><td className="px-5 py-4"><div className="flex justify-end gap-2">{appointment.status === 'confirmed' && <button type="button" className={`${SMALL_BUTTON} border-red-200 text-red-700`} onClick={() => setCancelTarget(appointment)} aria-label={`Отменить запись ${appointment.patient.name || 'пациента'}`}><XCircle aria-hidden="true" size={16} />Отменить</button>}{appointment.status === 'needs_review' && <button type="button" className={SMALL_BUTTON} onClick={() => { setResolveTarget(appointment); setClaimId('') }} aria-label={`Подтвердить запись ${appointment.patient.name || 'пациента'}`}><CircleAlert aria-hidden="true" size={16} />Разрешить</button>}</div></td></tr>)}</tbody></table></div>}</div>
      <div className="flex items-center justify-between gap-3"><button type="button" className={SMALL_BUTTON} disabled={page.number <= 1 || loading} onClick={() => load(page.number - 1, applied)} aria-label="Предыдущая страница"><ChevronLeft aria-hidden="true" size={17} />Назад</button><span className="text-sm text-clay-admin-muted">Страница {page.number}{page.pages > 0 ? ` из ${page.pages}` : ''}</span><button type="button" className={SMALL_BUTTON} disabled={page.pages === 0 || page.number >= page.pages || loading} onClick={() => load(page.number + 1, applied)} aria-label="Следующая страница">Далее<ChevronRight aria-hidden="true" size={17} /></button></div>
      {cancelTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setCancelTarget(undefined) }}><section role="dialog" aria-modal="true" aria-labelledby="cancel-appointment-title" onKeyDown={(event) => { if (event.key === 'Escape') setCancelTarget(undefined) }} className="clay-card-lg w-full max-w-lg p-6"><XCircle aria-hidden="true" className="text-red-600" size={28} /><h2 id="cancel-appointment-title" className="mt-4 font-serif text-2xl text-clay-dark">Отменить запись?</h2>{cancelTarget.source === 'admin_existing' ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Это действие не отменяет приём в Medflex или МИС</p> : <p className="mt-3 text-sm text-clay-muted">Сначала система запросит отмену в Medflex и только после подтверждения изменит локальный статус.</p>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button autoFocus type="button" className={SMALL_BUTTON} onClick={() => setCancelTarget(undefined)}>Назад</button><button type="button" disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-700 px-5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50" onClick={cancel}>Подтвердить отмену</button></div></section></div>}
      {resolveTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><section role="dialog" aria-modal="true" aria-labelledby="resolve-appointment-title" onKeyDown={(event) => { if (event.key === 'Escape') setResolveTarget(undefined) }} className="clay-card-lg w-full max-w-lg p-6"><CircleAlert aria-hidden="true" className="text-orange-600" size={28} /><h2 id="resolve-appointment-title" className="mt-4 font-serif text-2xl text-clay-dark">Подтвердить запись вручную</h2><p className="mt-3 text-sm text-clay-muted">Укажите Claim ID только после проверки фактической записи в Medflex.</p><label className="mt-5 flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Claim ID Medflex<input autoFocus className={INPUT_CLASS} value={claimId} onChange={(event) => setClaimId(event.target.value)} /></label><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className={SMALL_BUTTON} onClick={() => setResolveTarget(undefined)}>Отмена</button><button type="button" disabled={busy || claimId.trim().length === 0} className="btn-clay-primary min-h-11 px-5 py-2.5" onClick={resolve}>Сохранить подтверждение</button></div></section></div>}
    </section>
  )
}
