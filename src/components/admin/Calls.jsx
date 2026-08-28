import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, EyeOff, PhoneCall, Search, ShieldX } from 'lucide-react'
import { useAdminFetch } from '../../lib/useAdminFetch.js'

const EMPTY_PAGE = Object.freeze({ number: 1, size: 50, total: 0, pages: 0 })
const EMPTY_METRICS = Object.freeze({ active: 0, incoming: 0, answered: 0, missed: 0, answerRate: 0, averageWaitSeconds: 0, averageTalkSeconds: 0 })
const EMPTY_FILTERS = Object.freeze({ status: '', lineNumber: '', operatorExtension: '' })
const STATUS_LABELS = Object.freeze({ ringing: 'Входящий', queued: 'В очереди', connected: 'Разговор', on_hold: 'Удержание', finalizing: 'Завершается', answered: 'Отвечен', missed: 'Пропущен' })
const STATUS_CLASSES = Object.freeze({ ringing: 'bg-sky-50 text-sky-800', queued: 'bg-violet-50 text-violet-800', connected: 'bg-emerald-50 text-emerald-800', on_hold: 'bg-amber-50 text-amber-800', finalizing: 'bg-slate-100 text-slate-700', answered: 'bg-teal-50 text-teal-800', missed: 'bg-red-50 text-red-700' })
const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'short', timeStyle: 'short' })
const INPUT_CLASS = 'min-h-11 rounded-xl border border-clay-admin-border bg-white px-3 text-sm text-clay-dark outline-none transition focus:border-clay-mint'
const SELECT_CLASS = `admin-select ${INPUT_CLASS}`
const SMALL_BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-clay-admin-border bg-white px-4 text-sm font-semibold text-clay-admin-dark transition hover:border-clay-mint hover:text-clay-mint disabled:cursor-not-allowed disabled:opacity-45'

function date(value) {
  if (typeof value !== 'string') return '—'
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? DATE_FORMAT.format(parsed) : '—'
}

function duration(value) {
  if (!Number.isFinite(value)) return '—'
  if (value < 60) return `${value} с`
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return seconds === 0 ? `${minutes} мин` : `${minutes} мин ${seconds} с`
}

function initialFilters() {
  if (typeof window === 'undefined') return { ...EMPTY_FILTERS }
  const status = new URLSearchParams(window.location.search).get('status') || ''
  return { ...EMPTY_FILTERS, status: Object.prototype.hasOwnProperty.call(STATUS_LABELS, status) ? status : '' }
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

function MetricCard({ label, value, tone = 'text-clay-admin-dark' }) {
  return <div className="clay-card p-4"><span className="block text-[11px] font-bold uppercase tracking-wider text-clay-admin-muted">{label}</span><strong className={`mt-2 block text-2xl ${tone}`}>{value}</strong></div>
}

/**
 * Renders the privacy-safe live MANGO call journal.
 */
export function Calls() {
  const { loading, error, fetchData } = useAdminFetch()
  const [initial] = useState(initialFilters)
  const [calls, setCalls] = useState([])
  const [activeCalls, setActiveCalls] = useState([])
  const [page, setPage] = useState(EMPTY_PAGE)
  const [metrics, setMetrics] = useState(EMPTY_METRICS)
  const [filters, setFilters] = useState(initial)
  const [revealed, setRevealed] = useState({})
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')
  const [destroyTarget, setDestroyTarget] = useState(undefined)
  const pageRef = useRef(1)
  const appliedRef = useRef(initial)
  const revealTimers = useRef(new Map())
  const load = useCallback(async (number, active) => {
    const parameters = new URLSearchParams({ page: String(number), pageSize: '50' })
    if (active.status) parameters.set('status', active.status)
    if (active.lineNumber) parameters.set('lineNumber', active.lineNumber)
    if (active.operatorExtension) parameters.set('operatorExtension', active.operatorExtension)
    const result = await fetchData(`/api/admin/calls?${parameters}`, { errorMessage: 'Не удалось загрузить звонки' })
    if (!result) return
    setCalls(Array.isArray(result.data) ? result.data : [])
    setActiveCalls(Array.isArray(result.activeCalls) ? result.activeCalls : [])
    setPage(result.page ?? EMPTY_PAGE)
    setMetrics(result.metrics ?? EMPTY_METRICS)
    pageRef.current = result.page?.number ?? number
  }, [fetchData])
  useEffect(() => {
    load(1, initial)
    const refresh = () => { if (document.visibilityState === 'visible') load(pageRef.current, appliedRef.current) }
    const interval = setInterval(refresh, 5_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [initial, load])
  useEffect(() => () => {
    for (const timer of revealTimers.current.values()) clearTimeout(timer)
    revealTimers.current.clear()
  }, [])
  function apply(event) {
    event.preventDefault()
    const next = Object.freeze({ status: filters.status, lineNumber: filters.lineNumber.trim(), operatorExtension: filters.operatorExtension.trim() })
    appliedRef.current = next
    pageRef.current = 1
    load(1, next)
  }
  function changePage(number) {
    pageRef.current = number
    load(number, appliedRef.current)
  }
  function hide(entryId) {
    const timer = revealTimers.current.get(entryId)
    if (timer) clearTimeout(timer)
    revealTimers.current.delete(entryId)
    setRevealed((current) => {
      const next = { ...current }
      delete next[entryId]
      return next
    })
  }
  async function reveal(call) {
    setBusy(`reveal:${call.entryId}`)
    setActionError('')
    try {
      const result = await mutate(`/api/admin/calls/${encodeURIComponent(call.entryId)}/reveal`, { method: 'POST' })
      setRevealed((current) => ({ ...current, [call.entryId]: result.data.phone }))
      const previous = revealTimers.current.get(call.entryId)
      if (previous) clearTimeout(previous)
      revealTimers.current.set(call.entryId, setTimeout(() => hide(call.entryId), 30_000))
    } catch {
      setActionError('Не удалось показать номер звонящего')
    } finally {
      setBusy('')
    }
  }
  async function destroy() {
    if (!destroyTarget) return
    setBusy(`destroy:${destroyTarget.entryId}`)
    setActionError('')
    try {
      const result = await mutate(`/api/admin/calls/${encodeURIComponent(destroyTarget.entryId)}/caller`, { method: 'DELETE', body: JSON.stringify({ confirmation: 'УНИЧТОЖИТЬ' }) })
      hide(destroyTarget.entryId)
      setCalls((current) => current.map((call) => call.entryId === destroyTarget.entryId ? { ...call, patientId: null, callerMask: null, repeatCaller: null, piiDestroyedAt: result.data.destroyedAt } : call))
      setActiveCalls((current) => current.map((call) => call.entryId === destroyTarget.entryId ? { ...call, patientId: null, callerMask: null, repeatCaller: null, piiDestroyedAt: result.data.destroyedAt } : call))
      setDestroyTarget(undefined)
    } catch {
      setActionError('Не удалось уничтожить данные звонящего')
    } finally {
      setBusy('')
    }
  }
  if (loading && calls.length === 0) return <div role="status" className="clay-card flex min-h-48 items-center justify-center p-8 text-clay-admin-muted">Загружаем звонки…</div>
  if (error && calls.length === 0) return <div role="alert" className="clay-card border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">{error}</div>
  return (
    <section className="space-y-5" aria-label="Журнал звонков клиники">
      <div className="clay-card-soft-blue overflow-hidden p-5 sm:p-6"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-blue">MANGO OFFICE · live</p><h1 className="mt-2 font-serif text-2xl text-clay-dark sm:text-3xl">Журнал звонков</h1><p className="mt-2 text-sm text-clay-muted">Входящие обновляются каждые 5 секунд. Номера скрыты, а время показано по Москве.</p></div><div className="flex items-center gap-2 rounded-2xl bg-white/80 px-5 py-3 text-sm font-semibold text-clay-admin-muted"><span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50"></span><span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span></span>Мониторинг включён</div></div></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7"><MetricCard label="Активные сейчас" value={metrics.active} tone="text-emerald-700" /><MetricCard label="Входящие сегодня" value={metrics.incoming} /><MetricCard label="Отвеченные" value={metrics.answered} /><MetricCard label="Пропущенные" value={metrics.missed} tone="text-red-700" /><MetricCard label="Доля ответов" value={`${metrics.answerRate}%`} /><MetricCard label="Среднее ожидание" value={duration(metrics.averageWaitSeconds)} /><MetricCard label="Средний разговор" value={duration(metrics.averageTalkSeconds)} /></div>
      <section role="region" aria-label="Текущие звонки" className="clay-card overflow-hidden p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Сейчас на линии</p><h2 className="mt-1 font-serif text-2xl text-clay-dark">Текущие звонки</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">Активных: {activeCalls.length}</span></div>{activeCalls.length === 0 ? <p className="py-6 text-sm text-clay-admin-muted">Сейчас активных звонков нет</p> : <div className="mt-4 grid gap-3 lg:grid-cols-2">{activeCalls.map((call) => { const phone = revealed[call.entryId] || call.callerMask; return <article key={call.entryId} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${STATUS_CLASSES[call.status] || 'bg-slate-100 text-slate-700'}`}>{STATUS_LABELS[call.status] || call.status}</span><span className="text-xs font-semibold text-clay-admin-muted">с {date(call.startedAt)}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><span className="block text-[11px] font-bold uppercase tracking-wider text-clay-admin-muted">Звонящий</span><strong className="mt-1 block font-mono text-clay-admin-dark">{phone || '—'}</strong>{call.patientId ? <a className="mt-1 inline-flex text-xs font-semibold text-clay-mint hover:underline" href={`/admin/patients?patient=${encodeURIComponent(call.patientId)}`}>Карточка пациента</a> : <span className="mt-1 block text-xs text-clay-admin-muted">Новый звонящий</span>}</div><div><span className="block text-[11px] font-bold uppercase tracking-wider text-clay-admin-muted">Маршрут</span><strong className="mt-1 block font-mono text-clay-admin-dark">+{call.lineNumber}</strong><span className="mt-1 block text-xs text-clay-admin-muted">{call.operatorExtension ? `доб. ${call.operatorExtension}` : 'без оператора'}</span></div></div><div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-emerald-200 pt-3 text-sm text-clay-admin-muted"><span>Ожидание: {duration(call.waitSeconds)}</span><span>Разговор: {duration(call.talkSeconds)}</span></div></article> })}</div>}</section>
      <form aria-label="Фильтры звонков" className="clay-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end" onSubmit={apply}><label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Статус звонка<select className={SELECT_CLASS} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Все статусы</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Линия клиники<input className={INPUT_CLASS} value={filters.lineNumber} onChange={(event) => setFilters((current) => ({ ...current, lineNumber: event.target.value }))} placeholder="+7 812 748-22-10" /></label><label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Добавочный<input className={INPUT_CLASS} value={filters.operatorExtension} onChange={(event) => setFilters((current) => ({ ...current, operatorExtension: event.target.value }))} inputMode="numeric" placeholder="123" /></label><button type="submit" className="btn-clay-primary min-h-11 px-6 py-2.5"><Search aria-hidden="true" size={17} />Применить</button></form>
      {actionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{actionError}</div>}
      <div className="clay-card overflow-hidden">{calls.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center text-clay-admin-muted"><PhoneCall aria-hidden="true" size={36} /><strong className="text-clay-admin-dark">Звонков не найдено</strong><span className="text-sm">Измените фильтры или дождитесь нового входящего.</span></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1120px] border-collapse text-left text-sm"><thead className="bg-clay-admin-bg text-xs uppercase tracking-wider text-clay-admin-muted"><tr><th className="px-5 py-3">Время</th><th className="px-5 py-3">Звонящий</th><th className="px-5 py-3">Статус</th><th className="px-5 py-3">Линия / оператор</th><th className="px-5 py-3">Ожидание / разговор</th><th className="px-5 py-3 text-right">Действия</th></tr></thead><tbody>{calls.map((call) => {
          const destroyed = Boolean(call.piiDestroyedAt)
          const phone = revealed[call.entryId] || call.callerMask
          return <tr key={call.entryId} className="border-t border-clay-admin-border align-middle"><td className="px-5 py-4"><span className="block font-semibold text-clay-admin-dark">{date(call.startedAt)}</span><span className="mt-1 block text-xs text-clay-admin-muted">{call.repeatCaller ? 'Повторный звонок' : 'Первое обращение'}</span></td><td className="px-5 py-4"><span className="block font-mono font-semibold text-clay-admin-dark">{phone || '—'}</span>{destroyed ? <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Данные уничтожены</span> : call.patientId ? <a className="mt-1 inline-flex text-xs font-semibold text-clay-mint hover:underline" href={`/admin/patients?patient=${encodeURIComponent(call.patientId)}`} aria-label="Открыть пациента">Карточка пациента</a> : <span className="mt-1 block text-xs text-clay-admin-muted">Новый звонящий</span>}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${STATUS_CLASSES[call.status] || 'bg-slate-100 text-slate-700'}`}>{STATUS_LABELS[call.status] || call.status}</span></td><td className="px-5 py-4"><span className="block font-mono text-clay-admin-dark">+{call.lineNumber}</span><span className="mt-1 block text-xs text-clay-admin-muted">{call.operatorExtension ? `доб. ${call.operatorExtension}` : 'без оператора'}</span></td><td className="px-5 py-4 text-clay-admin-muted"><span className="block">Ожидание: {duration(call.waitSeconds)}</span><span className="mt-1 block">Разговор: {duration(call.talkSeconds)}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-2">{!destroyed && (revealed[call.entryId] ? <button type="button" className={SMALL_BUTTON} onClick={() => hide(call.entryId)} aria-label={`Скрыть номер ${call.callerMask}`}><EyeOff aria-hidden="true" size={16} />Скрыть</button> : <button type="button" className={SMALL_BUTTON} disabled={busy === `reveal:${call.entryId}`} onClick={() => reveal(call)} aria-label={`Показать номер ${call.callerMask}`}><Eye aria-hidden="true" size={16} />Показать</button>)}{!destroyed && <button type="button" className={`${SMALL_BUTTON} border-red-200 text-red-700 hover:border-red-400 hover:text-red-800`} onClick={() => setDestroyTarget(call)} aria-label={`Уничтожить номер ${call.callerMask}`}><ShieldX aria-hidden="true" size={16} />Уничтожить</button>}</div></td></tr>
        })}</tbody></table></div>}</div>
      <div className="flex items-center justify-between gap-3"><button type="button" className={SMALL_BUTTON} disabled={page.number <= 1 || loading} onClick={() => changePage(page.number - 1)} aria-label="Предыдущая страница"><ChevronLeft aria-hidden="true" size={17} />Назад</button><span className="text-sm text-clay-admin-muted">Страница {page.number}{page.pages > 0 ? ` из ${page.pages}` : ''}<span className="hidden sm:inline"> · {page.total} звонков</span></span><button type="button" className={SMALL_BUTTON} disabled={page.pages === 0 || page.number >= page.pages || loading} onClick={() => changePage(page.number + 1)} aria-label="Следующая страница">Далее<ChevronRight aria-hidden="true" size={17} /></button></div>
      {destroyTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDestroyTarget(undefined) }}><section role="dialog" aria-modal="true" aria-labelledby="destroy-caller-title" onKeyDown={(event) => { if (event.key === 'Escape') setDestroyTarget(undefined) }} className="clay-card-lg w-full max-w-lg p-6"><ShieldX aria-hidden="true" className="text-red-600" size={28} /><h2 id="destroy-caller-title" className="mt-4 font-serif text-2xl text-clay-dark">Уничтожить данные звонящего?</h2><p className="mt-3 text-sm text-clay-muted">Номер, маска, отпечаток и связь с пациентом будут удалены безвозвратно. Обезличенные показатели звонка сохранятся.</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button autoFocus type="button" className={SMALL_BUTTON} onClick={() => setDestroyTarget(undefined)}>Отмена</button><button type="button" disabled={busy === `destroy:${destroyTarget.entryId}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-700 px-5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50" onClick={destroy}>Уничтожить безвозвратно</button></div></section></div>}
    </section>
  )
}
