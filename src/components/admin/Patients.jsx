import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, EyeOff, PhoneCall, Search, ShieldX, UserRound } from 'lucide-react'
import { useAdminFetch } from '../../lib/useAdminFetch.js'

const EMPTY_PAGE = Object.freeze({ number: 1, size: 50, total: 0, pages: 0 })
const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'short', timeStyle: 'short' })
const INPUT_CLASS = 'min-h-11 rounded-xl border border-clay-admin-border bg-white px-3 text-sm text-clay-dark outline-none transition focus:border-clay-mint'
const SMALL_BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-clay-admin-border bg-white px-4 text-sm font-semibold text-clay-admin-dark transition hover:border-clay-mint hover:text-clay-mint disabled:cursor-not-allowed disabled:opacity-45'
const CALL_STATUS_LABELS = Object.freeze({ ringing: 'Входящий', queued: 'В очереди', connected: 'Разговор', on_hold: 'Удержание', finalizing: 'Завершается', answered: 'Отвечен', missed: 'Пропущен' })

function date(value) {
  if (typeof value !== 'string') return '—'
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

/**
 * Renders the masked patient journal with audited, temporary PII access.
 */
export function Patients() {
  const { loading, error, fetchData } = useAdminFetch()
  const [patients, setPatients] = useState([])
  const [page, setPage] = useState(EMPTY_PAGE)
  const [phone, setPhone] = useState('')
  const [appliedPhone, setAppliedPhone] = useState('')
  const [revealed, setRevealed] = useState({})
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')
  const [destroyTarget, setDestroyTarget] = useState(undefined)
  const [expandedPatient, setExpandedPatient] = useState('')
  const [callHistory, setCallHistory] = useState({})
  const timers = useRef(new Map())
  const load = useCallback(async (number, exactPhone) => {
    const parameters = new URLSearchParams({ page: String(number), pageSize: '50' })
    if (exactPhone) parameters.set('phone', exactPhone)
    const result = await fetchData(`/api/admin/patients?${parameters}`, { errorMessage: 'Не удалось загрузить пациентов' })
    if (!result) return
    setPatients(Array.isArray(result.data) ? result.data : [])
    setPage(result.page ?? EMPTY_PAGE)
  }, [fetchData])
  useEffect(() => { load(1, '') }, [load])
  useEffect(() => () => {
    for (const timer of timers.current.values()) clearTimeout(timer)
    timers.current.clear()
  }, [])
  function apply(event) {
    event.preventDefault()
    const exactPhone = phone.trim()
    setAppliedPhone(exactPhone)
    load(1, exactPhone)
  }
  function hide(id) {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setRevealed((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }
  async function reveal(patient) {
    setBusy(`reveal:${patient.id}`)
    setActionError('')
    try {
      const result = await mutate(`/api/admin/patients/${patient.id}/reveal`, { method: 'POST' })
      setRevealed((current) => ({ ...current, [patient.id]: result.data.phone }))
      const previous = timers.current.get(patient.id)
      if (previous) clearTimeout(previous)
      timers.current.set(patient.id, setTimeout(() => hide(patient.id), 30_000))
    } catch {
      setActionError('Не удалось показать телефон')
    } finally {
      setBusy('')
    }
  }
  async function destroy() {
    if (!destroyTarget) return
    setBusy(`destroy:${destroyTarget.id}`)
    setActionError('')
    try {
      const result = await mutate(`/api/admin/patients/${destroyTarget.id}/personal-data`, { method: 'DELETE', body: JSON.stringify({ confirmation: 'УНИЧТОЖИТЬ' }) })
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
  if (loading && patients.length === 0) return <div role="status" className="clay-card flex min-h-48 items-center justify-center p-8 text-clay-admin-muted">Загружаем пациентов…</div>
  if (error && patients.length === 0) return <div role="alert" className="clay-card border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">{error}</div>
  return (
    <section className="space-y-5" aria-label="Журнал пациентов">
      <div className="clay-card-soft-mint overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-mint">Локальная база</p><h1 className="mt-2 font-serif text-2xl text-clay-dark sm:text-3xl">Пациенты клиники</h1><p className="mt-2 text-sm text-clay-muted">Телефон скрыт по умолчанию. Каждое раскрытие журналируется и исчезает с экрана через 30 секунд.</p></div>
          <div className="rounded-2xl bg-white/80 px-5 py-3 text-sm text-clay-admin-muted"><span className="block text-2xl font-bold text-clay-admin-dark">{page.total}</span>карточек в журнале</div>
        </div>
      </div>
      <form aria-label="Фильтры пациентов" className="clay-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end" onSubmit={apply}>
        <label className="flex flex-1 flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Точный телефон<input className={INPUT_CLASS} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+7 921 555-01-29" autoComplete="off" /></label>
        <button type="submit" className="btn-clay-primary min-h-11 px-6 py-2.5"><Search aria-hidden="true" size={17} />Найти</button>
      </form>
      {actionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{actionError}</div>}
      <div className="clay-card overflow-hidden">
        {patients.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center text-clay-admin-muted"><UserRound aria-hidden="true" size={34} /><strong className="text-clay-admin-dark">Пациенты не найдены</strong><span className="text-sm">Проверьте точный номер или сбросьте фильтр.</span></div> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] border-collapse text-left text-sm"><thead className="bg-clay-admin-bg text-xs uppercase tracking-wider text-clay-admin-muted"><tr><th className="px-5 py-3">Пациент</th><th className="px-5 py-3">Телефон</th><th className="px-5 py-3">Первое обращение</th><th className="px-5 py-3">Последнее обращение</th><th className="px-5 py-3 text-right">Действия</th></tr></thead><tbody>{patients.map((patient) => {
          const name = patient.name || 'Обезличенный пациент'
          const destroyed = Boolean(patient.piiDestroyedAt)
          const phoneValue = revealed[patient.id] || patient.phoneMask
          const history = callHistory[patient.id]
          return <Fragment key={patient.id}><tr className="border-t border-clay-admin-border align-middle"><td className="px-5 py-4"><span className="block font-semibold text-clay-admin-dark">{name}</span>{destroyed && <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Данные уничтожены</span>}</td><td className="px-5 py-4 font-mono text-clay-text">{phoneValue || '—'}</td><td className="px-5 py-4 text-clay-admin-muted">{date(patient.firstSeenAt)}</td><td className="px-5 py-4 text-clay-admin-muted">{date(patient.lastSeenAt)}</td><td className="px-5 py-4"><div className="flex flex-wrap justify-end gap-2"><button type="button" className={SMALL_BUTTON} disabled={busy === `calls:${patient.id}`} onClick={() => toggleCalls(patient)} aria-expanded={expandedPatient === patient.id} aria-label={`История звонков ${name}`}><PhoneCall aria-hidden="true" size={16} />Звонки</button>{!destroyed && (revealed[patient.id] ? <button type="button" className={SMALL_BUTTON} onClick={() => hide(patient.id)} aria-label={`Скрыть телефон ${name}`}><EyeOff aria-hidden="true" size={16} />Скрыть</button> : <button type="button" className={SMALL_BUTTON} disabled={busy === `reveal:${patient.id}`} onClick={() => reveal(patient)} aria-label={`Показать телефон ${name}`}><Eye aria-hidden="true" size={16} />Показать</button>)}{!destroyed && <button type="button" className={`${SMALL_BUTTON} border-red-200 text-red-700 hover:border-red-400 hover:text-red-800`} onClick={() => setDestroyTarget(patient)} aria-label={`Уничтожить данные ${name}`}><ShieldX aria-hidden="true" size={16} />Уничтожить</button>}</div></td></tr>{expandedPatient === patient.id && <tr className="border-t border-clay-admin-border bg-clay-admin-bg/60"><td colSpan={5} className="px-5 py-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-serif text-lg text-clay-dark">Звонки пациента</h2><p className="mt-1 text-xs text-clay-admin-muted">Маскированная история, время по Москве</p></div>{history && <span className="text-xs font-semibold text-clay-admin-muted">{history.page.total} звонков</span>}</div>{!history ? <div role="status" className="py-6 text-sm text-clay-admin-muted">Загружаем историю…</div> : history.data.length === 0 ? <p className="py-6 text-sm text-clay-admin-muted">Звонков пока нет</p> : <div className="mt-4 space-y-2">{history.data.map((call) => <div key={call.entryId} className="grid gap-2 rounded-xl border border-clay-admin-border bg-white px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"><span className="font-semibold text-clay-admin-dark">{date(call.startedAt)}</span><span className="text-sm text-clay-admin-muted">{CALL_STATUS_LABELS[call.status] || call.status}</span><span className="font-mono text-sm text-clay-admin-dark">{call.callerMask || '—'}</span></div>)}</div>}{history && <div className="mt-4 flex items-center justify-end gap-3"><button type="button" className={SMALL_BUTTON} disabled={history.page.number <= 1 || busy === `calls:${patient.id}`} onClick={() => loadCalls(patient, history.page.number - 1)} aria-label="Предыдущая страница звонков">Назад</button><span className="text-xs text-clay-admin-muted">{history.page.number} из {history.page.pages || 1}</span><button type="button" className={SMALL_BUTTON} disabled={history.page.number >= history.page.pages || busy === `calls:${patient.id}`} onClick={() => loadCalls(patient, history.page.number + 1)} aria-label="Следующая страница звонков">Далее</button></div>}</td></tr>}</Fragment>
        })}</tbody></table></div>}
      </div>
      <div className="flex items-center justify-between gap-3"><button type="button" className={SMALL_BUTTON} disabled={page.number <= 1 || loading} onClick={() => load(page.number - 1, appliedPhone)} aria-label="Предыдущая страница"><ChevronLeft aria-hidden="true" size={17} />Назад</button><span className="text-sm text-clay-admin-muted">Страница {page.number}{page.pages > 0 ? ` из ${page.pages}` : ''}</span><button type="button" className={SMALL_BUTTON} disabled={page.pages === 0 || page.number >= page.pages || loading} onClick={() => load(page.number + 1, appliedPhone)} aria-label="Следующая страница">Далее<ChevronRight aria-hidden="true" size={17} /></button></div>
      {destroyTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDestroyTarget(undefined) }}><section role="dialog" aria-modal="true" aria-labelledby="destroy-patient-title" onKeyDown={(event) => { if (event.key === 'Escape') setDestroyTarget(undefined) }} className="clay-card-lg w-full max-w-lg p-6"><ShieldX aria-hidden="true" className="text-red-600" size={28} /><h2 id="destroy-patient-title" className="mt-4 font-serif text-2xl text-clay-dark">Уничтожить персональные данные?</h2><p className="mt-3 text-sm text-clay-muted">ФИО, телефон и отпечаток будут удалены безвозвратно. Обезличенная история записей сохранится.</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button autoFocus type="button" className={SMALL_BUTTON} onClick={() => setDestroyTarget(undefined)}>Отмена</button><button type="button" disabled={busy === `destroy:${destroyTarget.id}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-700 px-5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50" onClick={destroy}>Уничтожить безвозвратно</button></div></section></div>}
    </section>
  )
}
