import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Eye, EyeOff, FolderOpen, PhoneCall, Search, ShieldX, UserRound } from 'lucide-react'
import { moscowFilterEnd, moscowFilterStart } from '../../lib/admin-filter-date.js'
import { handleDialogKeyDown } from './dialog-keyboard.js'
import { FilterPanel } from './FilterPanel.jsx'
import { PatientDetails } from './PatientDetails.jsx'
import { ROW_BUTTON } from './row-button.js'
import { PatientHistoryIssues } from './PatientHistoryIssues.jsx'

const EMPTY_PAGE = Object.freeze({ number: 1, size: 50, total: 0, pages: 0 })
const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'short', timeStyle: 'short' })
const INPUT_CLASS = 'min-h-11 rounded-xl border border-clay-admin-border bg-white px-3 text-sm text-clay-dark outline-none transition focus:border-clay-mint'
const SMALL_BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-clay-admin-border bg-white px-4 text-sm font-semibold text-clay-admin-dark transition hover:border-clay-mint hover:text-clay-mint disabled:cursor-not-allowed disabled:opacity-45'
const CALL_STATUS_LABELS = Object.freeze({ ringing: 'Входящий', queued: 'В очереди', connected: 'Разговор', on_hold: 'Удержание', finalizing: 'Завершается', answered: 'Отвечен', missed: 'Пропущен' })
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMPTY_FILTERS = Object.freeze({ phone: '', piiStatus: '', history: '', issues: '', fromDate: '', toDate: '' })
const PII_LABELS = Object.freeze({ active: 'Активные данные', destroyed: 'Данные уничтожены' })
const HISTORY_LABELS = Object.freeze({ with_visits: 'Есть исторические визиты', without_visits: 'Нет исторических визитов' })
const ISSUE_LABELS = Object.freeze({ with_issues: 'Есть проблемы сопоставления', without_issues: 'Нет проблем сопоставления' })

function date(value) {
  if (typeof value !== 'string') return '—'
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? DATE_FORMAT.format(parsed) : '—'
}

async function mutate(url, options) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers } })
  if (response.status === 401) {
    window.location.href = '/admin/login'
    throw new Error('Unauthorized')
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

function deepLinkedPatient() {
  if (typeof window === 'undefined') return ''
  const value = new URLSearchParams(window.location.search).get('patient') || ''
  return UUID_PATTERN.test(value) ? value.toLowerCase() : ''
}

/**
 * Renders the masked patient journal with audited, temporary PII access.
 */
export function Patients() {
  const [initialPatient] = useState(deepLinkedPatient)
  const [patients, setPatients] = useState([])
  const [page, setPage] = useState(EMPTY_PAGE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS })
  const [applied, setApplied] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [revealed, setRevealed] = useState({})
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')
  const [destroyTarget, setDestroyTarget] = useState(undefined)
  const [destroyPhrase, setDestroyPhrase] = useState('')
  const [expandedPatient, setExpandedPatient] = useState('')
  const [callHistory, setCallHistory] = useState({})
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatient)
  const [selectionGeneration, setSelectionGeneration] = useState(0)
  const [showHistoryIssues, setShowHistoryIssues] = useState(false)
  const timers = useRef(new Map())
  const revealEpoch = useRef(0)
  const revealGenerations = useRef(new Map())
  const loadGeneration = useRef(0)
  const listedPatient = useRef(initialPatient)
  const destroyButtons = useRef(new Map())
  const hide = useCallback((id) => {
    revealGenerations.current.set(id, (revealGenerations.current.get(id) ?? 0) + 1)
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setBusy((current) => current === `reveal:${id}` ? '' : current)
    setRevealed((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }, [])
  const clearReveals = useCallback(() => {
    revealEpoch.current += 1
    for (const timer of timers.current.values()) clearTimeout(timer)
    timers.current.clear()
    setBusy((current) => current.startsWith('reveal:') ? '' : current)
    setRevealed({})
  }, [])
  const load = useCallback(async (number, active, patientId = '') => {
    const generation = loadGeneration.current + 1
    loadGeneration.current = generation
    const parameters = new URLSearchParams({ page: String(number), pageSize: '50' })
    if (active.phone) parameters.set('phone', active.phone)
    if (active.piiStatus) parameters.set('piiStatus', active.piiStatus)
    if (active.history) parameters.set('history', active.history)
    if (active.issues) parameters.set('issues', active.issues)
    if (active.fromDate && active.toDate) {
      parameters.set('from', moscowFilterStart(active.fromDate))
      parameters.set('to', moscowFilterEnd(active.toDate))
    }
    if (patientId) parameters.set('patient', patientId)
    setLoading(true)
    setError('')
    try {
      const result = await mutate(`/api/admin/patients?${parameters}`, { method: 'GET' })
      if (loadGeneration.current !== generation) return
      setPatients(Array.isArray(result.data) ? result.data : [])
      setPage(result.page ?? EMPTY_PAGE)
      listedPatient.current = patientId
    } catch {
      if (loadGeneration.current === generation) {
        setPatients([])
        setPage(EMPTY_PAGE)
        setError('Не удалось загрузить пациентов')
      }
    } finally {
      if (loadGeneration.current === generation) setLoading(false)
    }
  }, [])
  useEffect(() => { load(1, EMPTY_FILTERS, initialPatient) }, [initialPatient, load])
  useEffect(() => {
    const clearIfHidden = () => { if (document.visibilityState !== 'visible') clearReveals() }
    const followLocation = () => { const patientId = deepLinkedPatient(); clearReveals(); setSelectionGeneration((current) => current + 1); setSelectedPatientId(patientId); load(1, EMPTY_FILTERS, patientId) }
    document.addEventListener('visibilitychange', clearIfHidden)
    window.addEventListener('pagehide', clearReveals)
    window.addEventListener('popstate', followLocation)
    return () => {
      loadGeneration.current += 1
      document.removeEventListener('visibilitychange', clearIfHidden)
      window.removeEventListener('pagehide', clearReveals)
      window.removeEventListener('popstate', followLocation)
      clearReveals()
    }
  }, [clearReveals, load])
  function clearPatient() {
    clearReveals()
    const url = new URL(window.location.href)
    url.searchParams.delete('patient')
    window.history.replaceState({}, '', `${url.pathname}${url.search}`)
    setSelectedPatientId('')
  }
  function apply(event) {
    event.preventDefault()
    const next = Object.freeze({ ...filters, phone: filters.phone.trim() })
    clearPatient()
    setApplied(next)
    setFilters(next)
    setFiltersOpen(false)
    load(1, next, '')
  }
  async function reveal(patient) {
    const epoch = revealEpoch.current
    const generation = (revealGenerations.current.get(patient.id) ?? 0) + 1
    revealGenerations.current.set(patient.id, generation)
    setBusy(`reveal:${patient.id}`)
    setActionError('')
    try {
      const result = await mutate(`/api/admin/patients/${patient.id}/reveal`, { method: 'POST' })
      if (revealEpoch.current !== epoch || revealGenerations.current.get(patient.id) !== generation) return
      const phone = result?.data?.phone
      if (typeof phone !== 'string' || phone.length === 0) throw new TypeError('Patient reveal response is invalid')
      setRevealed((current) => ({ ...current, [patient.id]: phone }))
      const previous = timers.current.get(patient.id)
      if (previous) clearTimeout(previous)
      timers.current.set(patient.id, setTimeout(() => hide(patient.id), 30_000))
    } catch {
      if (revealEpoch.current === epoch && revealGenerations.current.get(patient.id) === generation) setActionError('Не удалось показать телефон')
    } finally {
      if (revealEpoch.current === epoch && revealGenerations.current.get(patient.id) === generation) setBusy((current) => current === `reveal:${patient.id}` ? '' : current)
    }
  }
  async function destroy() {
    if (!destroyTarget) return
    setBusy(`destroy:${destroyTarget.id}`)
    setActionError('')
    try {
      const result = await mutate(`/api/admin/patients/${destroyTarget.id}/personal-data`, { method: 'DELETE', body: JSON.stringify({ confirmation: destroyPhrase.trim(), patientId: destroyTarget.id }) })
      hide(destroyTarget.id)
      setPatients((current) => current.map((patient) => patient.id === destroyTarget.id ? { ...patient, name: null, phoneMask: null, piiDestroyedAt: result.data.destroyedAt } : patient))
      setDestroyTarget(undefined)
    } catch {
      setActionError('Не удалось уничтожить персональные данные')
    } finally {
      setBusy('')
    }
  }
  async function loadCalls(patient, number) {
    setBusy(`calls:${patient.id}`)
    setActionError('')
    try {
      const result = await mutate(`/api/admin/patients/${patient.id}?callsPage=${number}&callsPageSize=10`, { method: 'GET' })
      setCallHistory((current) => ({ ...current, [patient.id]: result.calls }))
    } catch {
      setActionError('Не удалось загрузить звонки пациента')
    } finally {
      setBusy('')
    }
  }
  function toggleCalls(patient) {
    if (expandedPatient === patient.id) {
      setExpandedPatient('')
      return
    }
    setExpandedPatient(patient.id)
    if (!callHistory[patient.id]) loadCalls(patient, 1)
  }
  function selectPatient(id) {
    clearReveals()
    const url = new URL(window.location.href)
    url.searchParams.set('patient', id)
    window.history.pushState({}, '', `${url.pathname}${url.search}`)
    setSelectionGeneration((current) => current + 1)
    setSelectedPatientId(id)
  }
  function closePatient() {
    const reload = listedPatient.current.length > 0
    clearPatient()
    if (reload) load(1, applied, '')
  }
  function changePage(number) {
    clearPatient()
    load(number, applied, '')
  }
  function resetFilters() {
    setFilters({ ...EMPTY_FILTERS })
    setApplied(EMPTY_FILTERS)
    setFiltersOpen(false)
    clearPatient()
    load(1, EMPTY_FILTERS, '')
  }
  function patientDestroyed(result) {
    setPatients((current) => current.map((patient) => patient.id === result.id ? { ...patient, name: null, phoneMask: null, piiDestroyedAt: result.destroyedAt } : patient))
    closePatient()
  }
  function closeDestroyDialog() {
    const id = destroyTarget?.id
    setDestroyTarget(undefined)
    setDestroyPhrase('')
    if (id) destroyButtons.current.get(id)?.focus()
  }
  if (loading && patients.length === 0) return <div role="status" className="clay-card flex min-h-48 items-center justify-center p-8 text-clay-admin-muted">Загружаем пациентов…</div>
  const activeFilters = [applied.phone, applied.piiStatus, applied.history, applied.issues].filter(Boolean).length + (applied.fromDate && applied.toDate ? 1 : 0)
  const summaries = [applied.phone && `Телефон: ${applied.phone}`, applied.piiStatus && PII_LABELS[applied.piiStatus], applied.history && HISTORY_LABELS[applied.history], applied.issues && ISSUE_LABELS[applied.issues], applied.fromDate && applied.toDate && `${applied.fromDate} — ${applied.toDate}`].filter(Boolean)
  return (
    <section className="space-y-5" aria-label="Журнал пациентов">
      <div className="clay-card-soft-mint overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-mint">Локальная база</p><h1 className="mt-2 font-serif text-2xl text-clay-dark sm:text-3xl">Пациенты клиники</h1><p className="mt-2 text-sm text-clay-muted">Телефон скрыт по умолчанию. Каждое раскрытие журналируется и исчезает с экрана через 30 секунд.</p></div>
          <div className="rounded-2xl bg-white/80 px-5 py-3 text-sm text-clay-admin-muted"><span className="block text-2xl font-bold text-clay-admin-dark">{page.total}</span>карточек в журнале</div>
        </div>
      </div>
      <FilterPanel scope="пациентов" open={filtersOpen} active={activeFilters} summaries={summaries} onToggle={() => setFiltersOpen((current) => !current)} onReset={resetFilters}>
        <form aria-label="Фильтры пациентов" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" onSubmit={apply}>
          <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Точный телефон<input className={INPUT_CLASS} value={filters.phone} onChange={(event) => setFilters((current) => ({ ...current, phone: event.target.value }))} placeholder="+7 921 555-01-29" autoComplete="off" /></label>
          <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Состояние данных<select className={`admin-select ${INPUT_CLASS}`} value={filters.piiStatus} onChange={(event) => setFilters((current) => ({ ...current, piiStatus: event.target.value }))}><option value="">Любое состояние</option><option value="active">Активные</option><option value="destroyed">Обезличенные</option></select></label>
          <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Исторические визиты<select className={`admin-select ${INPUT_CLASS}`} value={filters.history} onChange={(event) => setFilters((current) => ({ ...current, history: event.target.value }))}><option value="">Неважно</option><option value="with_visits">Есть визиты</option><option value="without_visits">Нет визитов</option></select></label>
          <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Проблемы сопоставления<select className={`admin-select ${INPUT_CLASS}`} value={filters.issues} onChange={(event) => setFilters((current) => ({ ...current, issues: event.target.value }))}><option value="">Неважно</option><option value="with_issues">Есть проблемы</option><option value="without_issues">Нет проблем</option></select></label>
          <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Последнее обращение с<input type="date" className={INPUT_CLASS} value={filters.fromDate} max={filters.toDate || undefined} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} /></label>
          <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Последнее обращение по<input type="date" className={INPUT_CLASS} value={filters.toDate} min={filters.fromDate || undefined} onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} /></label>
          <div className="flex gap-3 sm:col-span-2 xl:col-span-3 xl:justify-end"><button type="button" className={SMALL_BUTTON} onClick={resetFilters}>Сбросить</button><button type="submit" className="btn-clay-primary min-h-11 px-6 py-2.5" disabled={Boolean(filters.fromDate) !== Boolean(filters.toDate)}><Search aria-hidden="true" size={17} />Применить</button></div>
        </form>
      </FilterPanel>
      {error && <div role="alert" className="clay-card border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">{error}</div>}
      {actionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{actionError}</div>}
      {!error && <div className="clay-card overflow-hidden">
        {patients.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center text-clay-admin-muted"><UserRound aria-hidden="true" size={34} /><strong className="text-clay-admin-dark">Пациенты не найдены</strong><span className="text-sm">Проверьте точный номер или сбросьте фильтр.</span></div> : <div className="overflow-x-auto"><table className="w-full min-w-[940px] border-collapse text-left text-sm"><thead className="bg-clay-admin-bg text-xs uppercase tracking-wider text-clay-admin-muted"><tr><th className="px-4 py-2.5">Пациент</th><th className="px-4 py-2.5">Телефон</th><th className="px-4 py-2.5">История</th><th className="px-4 py-2.5 whitespace-nowrap">Первое обращение</th><th className="px-4 py-2.5 whitespace-nowrap">Последнее обращение</th><th className="w-[264px] px-4 py-2.5 text-right">Действия</th></tr></thead><tbody>{patients.map((patient) => {
          const name = patient.name || 'Обезличенный пациент'
          const destroyed = Boolean(patient.piiDestroyedAt)
          const phoneValue = revealed[patient.id] || patient.phoneMask
          const history = callHistory[patient.id]
          return <Fragment key={patient.id}><tr className="border-t border-clay-admin-border align-middle"><td className="px-4 py-2.5"><a className="block font-semibold text-clay-mint hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-mint" href={`/admin/patients?patient=${encodeURIComponent(patient.id)}`}>{name}</a>{destroyed && <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Данные уничтожены</span>}</td><td className="whitespace-nowrap px-4 py-2.5 font-mono"><a className="text-clay-mint hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-mint" href={`/admin/patients?patient=${encodeURIComponent(patient.id)}`}>{phoneValue || '—'}</a></td><td className="px-4 py-2.5 text-xs font-semibold text-clay-admin-muted">{patient.externalIdentifierCount ?? 0} карты · {patient.historicalVisitCount ?? 0} визитов · {patient.issueCount ?? 0} проблем<span className="mt-0.5 block font-normal">Других фамилий: {patient.previousLastNameCount ?? 0}</span></td><td className="whitespace-nowrap px-4 py-2.5 text-clay-admin-muted">{date(patient.firstSeenAt)}</td><td className="whitespace-nowrap px-4 py-2.5 text-clay-admin-muted">{date(patient.lastSeenAt)}</td><td className="px-4 py-2.5"><div className="ml-auto grid w-[252px] grid-cols-2 gap-1.5"><button type="button" className={ROW_BUTTON} onClick={() => selectPatient(patient.id)} aria-expanded={selectedPatientId === patient.id} aria-label={`Открыть карточку ${name}`}><FolderOpen aria-hidden="true" size={16} />Карточка</button><button type="button" className={ROW_BUTTON} disabled={busy === `calls:${patient.id}`} onClick={() => toggleCalls(patient)} aria-expanded={expandedPatient === patient.id} aria-label={`История звонков ${name}`}><PhoneCall aria-hidden="true" size={16} />Звонки</button>{!destroyed && patient.phoneMask && (revealed[patient.id] ? <button type="button" className={ROW_BUTTON} onClick={() => hide(patient.id)} aria-label={`Скрыть телефон ${name}`}><EyeOff aria-hidden="true" size={16} />Скрыть</button> : <button type="button" className={ROW_BUTTON} disabled={busy === `reveal:${patient.id}`} onClick={() => reveal(patient)} aria-label={`Показать телефон ${name}`}><Eye aria-hidden="true" size={16} />Показать</button>)}{!destroyed && <button ref={(node) => { if (node) destroyButtons.current.set(patient.id, node); else destroyButtons.current.delete(patient.id) }} type="button" className={`${ROW_BUTTON} border-red-200 text-red-700 hover:border-red-400 hover:text-red-800`} onClick={() => setDestroyTarget(patient)} aria-label={`Уничтожить данные ${name}`}><ShieldX aria-hidden="true" size={16} />Уничтожить</button>}</div></td></tr>{expandedPatient === patient.id && <tr className="border-t border-clay-admin-border bg-clay-admin-bg/60"><td colSpan={6} className="px-4 py-4"><div className="flex items-center justify-between gap-4"><div><h2 className="font-serif text-lg text-clay-dark">Звонки пациента</h2><p className="mt-1 text-xs text-clay-admin-muted">Маскированная история, время по Москве</p></div>{history && <span className="text-xs font-semibold text-clay-admin-muted">{history.page.total} звонков</span>}</div>{!history ? <div role="status" className="py-6 text-sm text-clay-admin-muted">Загружаем историю…</div> : history.data.length === 0 ? <p className="py-6 text-sm text-clay-admin-muted">Звонков пока нет</p> : <div className="mt-4 space-y-2">{history.data.map((call) => <div key={call.entryId} className="grid gap-2 rounded-xl border border-clay-admin-border bg-white px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"><span className="font-semibold text-clay-admin-dark">{date(call.startedAt)}</span><span className="text-sm text-clay-admin-muted">{CALL_STATUS_LABELS[call.status] || call.status}</span><a className="font-mono text-sm font-semibold text-clay-mint hover:underline" href={`/admin/patients?patient=${encodeURIComponent(patient.id)}`}>{call.callerMask || '—'}</a></div>)}</div>}{history && <div className="mt-4 flex items-center justify-end gap-3"><button type="button" className={SMALL_BUTTON} disabled={history.page.number <= 1 || busy === `calls:${patient.id}`} onClick={() => loadCalls(patient, history.page.number - 1)} aria-label="Предыдущая страница звонков">Назад</button><span className="text-xs text-clay-admin-muted">{history.page.number} из {history.page.pages || 1}</span><button type="button" className={SMALL_BUTTON} disabled={history.page.number >= history.page.pages || busy === `calls:${patient.id}`} onClick={() => loadCalls(patient, history.page.number + 1)} aria-label="Следующая страница звонков">Далее</button></div>}</td></tr>}{selectedPatientId === patient.id && !loading && <tr className="border-t border-clay-admin-border bg-clay-admin-bg/40"><td colSpan={6} className="p-4 sm:p-5"><PatientDetails key={`${selectedPatientId}:${selectionGeneration}`} patientId={selectedPatientId} onClose={closePatient} onDestroyed={patientDestroyed} /></td></tr>}</Fragment>
        })}</tbody></table></div>}
      </div>}
      {!error && <div className="flex items-center justify-between gap-3"><button type="button" className={SMALL_BUTTON} disabled={page.number <= 1 || loading} onClick={() => changePage(page.number - 1)} aria-label="Предыдущая страница"><ChevronLeft aria-hidden="true" size={17} />Назад</button><span className="text-sm text-clay-admin-muted">Страница {page.number}{page.pages > 0 ? ` из ${page.pages}` : ''}</span><button type="button" className={SMALL_BUTTON} disabled={page.pages === 0 || page.number >= page.pages || loading} onClick={() => changePage(page.number + 1)} aria-label="Следующая страница">Далее<ChevronRight aria-hidden="true" size={17} /></button></div>}
      <div className="flex justify-end"><button type="button" className={SMALL_BUTTON} aria-expanded={showHistoryIssues} onClick={() => setShowHistoryIssues((current) => !current)} aria-label={showHistoryIssues ? 'Скрыть проблемы сопоставления' : 'Показать проблемы сопоставления'}><AlertTriangle aria-hidden="true" size={17} />{showHistoryIssues ? 'Скрыть проблемы' : 'Проблемы сопоставления'}</button></div>
      {showHistoryIssues && <PatientHistoryIssues />}
      {destroyTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDestroyDialog() }}><section role="dialog" aria-modal="true" aria-labelledby="destroy-patient-title" tabIndex={-1} onKeyDown={(event) => handleDialogKeyDown(event, closeDestroyDialog)} className="clay-card-lg w-full max-w-lg p-6"><ShieldX aria-hidden="true" className="text-red-600" size={28} /><h2 id="destroy-patient-title" className="mt-4 font-serif text-2xl text-clay-dark">Уничтожить персональные данные?</h2><p className="mt-3 text-sm text-clay-muted">ФИО, телефон и отпечаток будут удалены безвозвратно. Обезличенная история записей сохранится.</p><label className="mt-4 flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Введите слово УНИЧТОЖИТЬ<input className={INPUT_CLASS} value={destroyPhrase} autoComplete="off" onChange={(event) => setDestroyPhrase(event.target.value)} /></label><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button autoFocus type="button" className={SMALL_BUTTON} onClick={closeDestroyDialog}>Отмена</button><button type="button" disabled={busy === `destroy:${destroyTarget.id}` || destroyPhrase.trim() !== 'УНИЧТОЖИТЬ'} className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-700 px-5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50" onClick={destroy}>Уничтожить безвозвратно</button></div></section></div>}
    </section>
  )
}
