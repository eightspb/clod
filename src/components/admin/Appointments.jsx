import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, CircleAlert, Search, XCircle } from 'lucide-react'
import { moscowFilterEnd, moscowFilterStart } from '../../lib/admin-filter-date.js'
import { moscowDayBounds } from '../../lib/clinic-time.js'
import { useAdminFetch } from '../../lib/useAdminFetch.js'
import { FilterPanel } from './FilterPanel.jsx'
import { ROW_BUTTON } from './row-button.js'

const EMPTY_PAGE = Object.freeze({ number: 1, size: 50, total: 0, pages: 0 })
const EMPTY_FILTERS = Object.freeze({ status: '', source: '', doctorId: '', period: '', fromDate: '', toDate: '' })
const STATUS_LABELS = Object.freeze({ pending: 'Ожидает', confirmed: 'Подтверждена', cancelled: 'Отменена', failed: 'Ошибка', needs_review: 'Требует проверки' })
const SOURCE_LABELS = Object.freeze({ website: 'С сайта', admin_medflex: 'Создана администратором', admin_existing: 'Внесена из МИС' })
const STATUS_CLASSES = Object.freeze({ pending: 'bg-amber-50 text-amber-800', confirmed: 'bg-emerald-50 text-emerald-800', cancelled: 'bg-slate-100 text-slate-700', failed: 'bg-red-50 text-red-700', needs_review: 'bg-orange-50 text-orange-800' })
const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'short', timeStyle: 'short' })
const INPUT_CLASS = 'admin-select min-h-11 rounded-xl border border-clay-admin-border bg-white px-3 text-sm text-clay-dark outline-none transition focus:border-clay-mint'
const SMALL_BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-clay-admin-border bg-white px-4 text-sm font-semibold text-clay-admin-dark transition hover:border-clay-mint hover:text-clay-mint disabled:cursor-not-allowed disabled:opacity-45'
const NOW = () => new Date()
const PERIOD_LABELS = Object.freeze({ today: 'Сегодня', upcoming: 'Предстоящие', last7: 'Прошедшие 7 дней', custom: 'Свой период' })

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
    value.period = 'today'
  }
  else if (parameters.get('range') === 'upcoming') {
    value.from = now.toISOString()
    value.period = 'upcoming'
  }
  return Object.freeze(value)
}

function resolvedFilters(filters, now) {
  const next = { ...filters }
  delete next.from
  delete next.to
  if (filters.period === 'today') {
    const bounds = moscowDayBounds(now)
    next.from = bounds.start
    next.to = bounds.end
  }
  if (filters.period === 'upcoming') next.from = now.toISOString()
  if (filters.period === 'last7') {
    next.from = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString()
    next.to = now.toISOString()
  }
  if (filters.period === 'custom' && filters.fromDate && filters.toDate) {
    next.from = moscowFilterStart(filters.fromDate)
    next.to = moscowFilterEnd(filters.toDate)
  }
  return Object.freeze(next)
}

function doctorOptions(catalog) {
  if (!Array.isArray(catalog)) return []
  return catalog.flatMap((doctor) => {
    const links = Array.isArray(doctor.medflexLinks) && doctor.medflexLinks.length > 0 ? doctor.medflexLinks : [{ medflexDoctorId: doctor.medflexDoctorId, active: doctor.active !== false }]
    return links.filter((link) => Number.isSafeInteger(link.medflexDoctorId)).map((link) => Object.freeze({ key: `${doctor.id}:${link.medflexDoctorId}`, name: doctor.name, medflexDoctorId: link.medflexDoctorId, active: link.active !== false }))
  })
}

/**
 * Renders the appointment operations journal and its guarded status actions.
 */
export function Appointments({ clock = NOW }) {
  const { loading, error, fetchData } = useAdminFetch()
  const [initial] = useState(() => initialFilters(clock()))
  const [appointments, setAppointments] = useState([])
  const [page, setPage] = useState(EMPTY_PAGE)
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, status: initial.status, source: initial.source, period: initial.period || '' })
  const [applied, setApplied] = useState(initial)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [doctors, setDoctors] = useState([])
  const [doctorsLoaded, setDoctorsLoaded] = useState(false)
  const [doctorError, setDoctorError] = useState('')
  const [cancelTarget, setCancelTarget] = useState(undefined)
  const [resolveTarget, setResolveTarget] = useState(undefined)
  const [claimId, setClaimId] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const load = useCallback(async (number, active) => {
    const parameters = new URLSearchParams({ page: String(number), pageSize: '50' })
    if (active.status) parameters.set('status', active.status)
    if (active.source) parameters.set('source', active.source)
    if (active.doctorId) parameters.set('doctorId', active.doctorId)
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
    const next = resolvedFilters(filters, clock())
    setApplied(next)
    setFiltersOpen(false)
    load(1, next)
  }
  async function toggleFilters() {
    const opening = !filtersOpen
    setFiltersOpen(opening)
    if (!opening || doctorsLoaded) return
    setDoctorError('')
    try {
      const response = await fetch('/api/admin/doctors', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const result = await response.json()
      setDoctors(doctorOptions(result.doctors))
      setDoctorsLoaded(true)
    } catch {
      setDoctorError('Не удалось загрузить список врачей')
    }
  }
  function resetFilters() {
    const next = { ...EMPTY_FILTERS }
    setFilters(next)
    setApplied(EMPTY_FILTERS)
    setFiltersOpen(false)
    load(1, EMPTY_FILTERS)
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
  const activeFilters = [applied.status, applied.source, applied.doctorId, applied.period].filter(Boolean).length
  const selectedDoctor = doctors.find(({ medflexDoctorId }) => String(medflexDoctorId) === String(applied.doctorId))
  const summaries = [applied.status && STATUS_LABELS[applied.status], applied.source && SOURCE_LABELS[applied.source], selectedDoctor?.name, applied.period && PERIOD_LABELS[applied.period]].filter(Boolean)
  return (
    <section className="space-y-5" aria-label="Журнал записей">
      <div className="clay-card-soft-blue p-5 sm:p-6"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-blue">Операционный журнал</p><h1 className="mt-2 font-serif text-2xl text-clay-dark sm:text-3xl">Записи на приём</h1><p className="mt-2 text-sm text-clay-muted">Сайт, администратор и уже существующие приёмы собраны в одном журнале. Время показано по Москве.</p></div><div className="rounded-2xl bg-white/80 px-5 py-3 text-sm text-clay-admin-muted"><span className="block text-2xl font-bold text-clay-admin-dark">{page.total}</span>записей по фильтру</div></div></div>
      <FilterPanel scope="записей" open={filtersOpen} active={activeFilters} summaries={summaries} onToggle={toggleFilters} onReset={resetFilters}><form aria-label="Фильтры записей" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" onSubmit={apply}><label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Статус записи<select className={`admin-select ${INPUT_CLASS}`} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Все статусы</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Источник записи<select className={`admin-select ${INPUT_CLASS}`} value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))}><option value="">Все источники</option>{Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Врач<select className={`admin-select ${INPUT_CLASS}`} value={filters.doctorId} onChange={(event) => setFilters((current) => ({ ...current, doctorId: event.target.value }))}><option value="">Все врачи</option>{doctors.map((doctor) => <option key={doctor.key} value={doctor.medflexDoctorId}>{doctor.name}{doctor.active ? '' : ' (неактивен)'}</option>)}</select>{doctorError && <span className="normal-case tracking-normal text-red-700">{doctorError}</span>}</label><label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Период<select className={`admin-select ${INPUT_CLASS}`} value={filters.period} onChange={(event) => setFilters((current) => ({ ...current, period: event.target.value }))}><option value="">За всё время</option>{Object.entries(PERIOD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Приём с<input type="date" className={INPUT_CLASS} disabled={filters.period !== 'custom'} value={filters.fromDate} max={filters.toDate || undefined} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} /></label><label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Приём по<input type="date" className={INPUT_CLASS} disabled={filters.period !== 'custom'} value={filters.toDate} min={filters.fromDate || undefined} onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} /></label><div className="flex gap-3 sm:col-span-2 xl:col-span-3 xl:justify-end"><button type="button" className={SMALL_BUTTON} onClick={resetFilters}>Сбросить</button><button type="submit" className="btn-clay-primary min-h-11 px-6 py-2.5" disabled={filters.period === 'custom' && (!filters.fromDate || !filters.toDate)}><Search aria-hidden="true" size={17} />Применить</button></div></form></FilterPanel>
      {actionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{actionError}</div>}
      <div className="clay-card overflow-hidden">{appointments.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center text-clay-admin-muted"><CalendarClock aria-hidden="true" size={34} /><strong className="text-clay-admin-dark">Записи не найдены</strong><span className="text-sm">Измените фильтры или дождитесь новых обращений.</span></div> : <div className="overflow-x-auto"><table className="w-full min-w-[960px] border-collapse text-left text-sm"><thead className="bg-clay-admin-bg text-xs uppercase tracking-wider text-clay-admin-muted"><tr><th className="px-4 py-2.5">Дата и пациент</th><th className="px-4 py-2.5">Врач</th><th className="px-4 py-2.5 whitespace-nowrap">Источник</th><th className="px-4 py-2.5">Статус</th><th className="px-4 py-2.5 whitespace-nowrap">Стоимость</th><th className="w-[144px] px-4 py-2.5 text-right">Действия</th></tr></thead><tbody>{appointments.map((appointment) => <tr key={appointment.id} className="border-t border-clay-admin-border align-middle"><td className="px-4 py-2.5"><span className="block whitespace-nowrap font-semibold text-clay-admin-dark">{date(appointment.startsAt)}</span><a className="mt-0.5 inline-flex text-xs font-semibold text-clay-mint hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-mint" href={`/admin/patients?patient=${encodeURIComponent(appointment.patient.id)}`} aria-label={`Открыть карточку ${appointment.patient.name || 'обезличенного пациента'}`}><span>{appointment.patient.name || 'Обезличенный пациент'}</span><span aria-hidden="true"> · </span><span>{appointment.patient.phoneMask || 'без телефона'}</span></a></td><td className="px-4 py-2.5"><span className="block font-semibold text-clay-admin-dark">{appointment.doctorName}</span><span className="mt-0.5 block text-xs text-clay-admin-muted">{appointment.serviceName || appointment.specialityName}</span></td><td className="whitespace-nowrap px-4 py-2.5 text-clay-admin-muted">{SOURCE_LABELS[appointment.source] || appointment.source}</td><td className="px-4 py-2.5"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLASSES[appointment.status] || 'bg-slate-100 text-slate-700'}`}>{STATUS_LABELS[appointment.status] || appointment.status}</span></td><td className="whitespace-nowrap px-4 py-2.5 font-semibold text-clay-admin-dark">{Number.isSafeInteger(appointment.priceKopecks) ? `${new Intl.NumberFormat('ru-RU').format(appointment.priceKopecks / 100)} ₽` : '—'}</td><td className="px-4 py-2.5"><div className="ml-auto flex w-[132px] flex-col gap-1.5">{appointment.status === 'confirmed' && <button type="button" className={`${ROW_BUTTON} border-red-200 text-red-700`} onClick={() => setCancelTarget(appointment)} aria-label={`Отменить запись ${appointment.patient.name || 'пациента'}`}><XCircle aria-hidden="true" size={16} />Отменить</button>}{appointment.status === 'needs_review' && <button type="button" className={ROW_BUTTON} onClick={() => { setResolveTarget(appointment); setClaimId('') }} aria-label={`Подтвердить запись ${appointment.patient.name || 'пациента'}`}><CircleAlert aria-hidden="true" size={16} />Разрешить</button>}</div></td></tr>)}</tbody></table></div>}</div>
      <div className="flex items-center justify-between gap-3"><button type="button" className={SMALL_BUTTON} disabled={page.number <= 1 || loading} onClick={() => load(page.number - 1, applied)} aria-label="Предыдущая страница"><ChevronLeft aria-hidden="true" size={17} />Назад</button><span className="text-sm text-clay-admin-muted">Страница {page.number}{page.pages > 0 ? ` из ${page.pages}` : ''}</span><button type="button" className={SMALL_BUTTON} disabled={page.pages === 0 || page.number >= page.pages || loading} onClick={() => load(page.number + 1, applied)} aria-label="Следующая страница">Далее<ChevronRight aria-hidden="true" size={17} /></button></div>
      {cancelTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setCancelTarget(undefined) }}><section role="dialog" aria-modal="true" aria-labelledby="cancel-appointment-title" onKeyDown={(event) => { if (event.key === 'Escape') setCancelTarget(undefined) }} className="clay-card-lg w-full max-w-lg p-6"><XCircle aria-hidden="true" className="text-red-600" size={28} /><h2 id="cancel-appointment-title" className="mt-4 font-serif text-2xl text-clay-dark">Отменить запись?</h2>{cancelTarget.source === 'admin_existing' ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Это действие не отменяет приём в Medflex или МИС</p> : <p className="mt-3 text-sm text-clay-muted">Сначала система запросит отмену в Medflex и только после подтверждения изменит локальный статус.</p>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button autoFocus type="button" className={SMALL_BUTTON} onClick={() => setCancelTarget(undefined)}>Назад</button><button type="button" disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-700 px-5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50" onClick={cancel}>Подтвердить отмену</button></div></section></div>}
      {resolveTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><section role="dialog" aria-modal="true" aria-labelledby="resolve-appointment-title" onKeyDown={(event) => { if (event.key === 'Escape') setResolveTarget(undefined) }} className="clay-card-lg w-full max-w-lg p-6"><CircleAlert aria-hidden="true" className="text-orange-600" size={28} /><h2 id="resolve-appointment-title" className="mt-4 font-serif text-2xl text-clay-dark">Подтвердить запись вручную</h2><p className="mt-3 text-sm text-clay-muted">Укажите Claim ID только после проверки фактической записи в Medflex.</p><label className="mt-5 flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Claim ID Medflex<input autoFocus className={INPUT_CLASS} value={claimId} onChange={(event) => setClaimId(event.target.value)} /></label><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className={SMALL_BUTTON} onClick={() => setResolveTarget(undefined)}>Отмена</button><button type="button" disabled={busy || claimId.trim().length === 0} className="btn-clay-primary min-h-11 px-5 py-2.5" onClick={resolve}>Сохранить подтверждение</button></div></section></div>}
    </section>
  )
}
