import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, EyeOff, FileClock, ShieldX, X } from 'lucide-react'
import { handleDialogKeyDown } from './dialog-keyboard.js'

const EMPTY_PAGE = Object.freeze({ data: Object.freeze([]), page: Object.freeze({ number: 1, size: 10, total: 0, pages: 0 }) })
const SMALL_BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-clay-admin-border bg-white px-4 text-sm font-semibold text-clay-admin-dark transition hover:border-clay-mint hover:text-clay-mint disabled:cursor-not-allowed disabled:opacity-45'
const INPUT_CLASS = 'min-h-11 rounded-xl border border-clay-admin-border bg-white px-3 text-sm text-clay-dark outline-none transition focus:border-clay-mint'
const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'short', timeStyle: 'short' })
const VISIT_STATUS_LABELS = Object.freeze({ '': 'Статус не указан', cancelled: 'Отменён', completed: 'Завершён', confirmed: 'Подтверждён', noshow: 'Не явился', tentative: 'Предварительный', unknown: 'Неизвестен' })
const LINK_STATUS_LABELS = Object.freeze({ linked: 'Сопоставлен', ambiguous: 'Неоднозначно', unmatched: 'Не сопоставлен' })
const ISSUE_LABELS = Object.freeze({ COMPONENT_IDENTITY_CONFLICT: 'Конфликт личности', CONFLICTING_STRONG_IDENTIFIER: 'Конфликт идентификаторов', INCOMPLETE_PATIENT_NAME: 'Неполное имя', INSUFFICIENT_IDENTITY_EVIDENCE: 'Недостаточно данных', SHARED_CARD_DIFFERENT_PEOPLE: 'Общая карта у разных людей', SUPPLEMENTAL_EHR_AMBIGUOUS: 'Неоднозначная дополнительная карта', SUPPLEMENTAL_EHR_NOT_FOUND: 'Дополнительная карта не найдена', SUPPLEMENTAL_INSUFFICIENT_EVIDENCE: 'Недостаточно данных дополнительной карты', SUPPLEMENTAL_NAME_ONLY_MATCH: 'Совпало только имя', SHORT_ROW: 'Неполная строка', INVALID_START_DATE: 'Некорректная дата начала', INVALID_END_DATE: 'Некорректная дата окончания', CONTROL_CHAR_VALUE: 'Недопустимый символ', VALUE_TOO_LARGE: 'Слишком большое значение', AMBIGUOUS_LEFT_JOIN: 'Неоднозначная связь источников', INSUFFICIENT_LEFT_JOIN_EVIDENCE: 'Недостаточно данных для связи источников', INVALID_NORMALIZED_VALUE: 'Некорректное нормализованное значение' })
const NAME_HISTORY_LABELS = Object.freeze({ surname_change: 'Подтверждённая прежняя фамилия', identity_alias: 'Вариант фамилии с неизвестным порядком', source_correction: 'Исправление фамилии в источнике' })

function date(value) {
  if (typeof value !== 'string') return 'Дата не указана'
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? DATE_FORMAT.format(parsed) : 'Дата не указана'
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers } })
  if (response.status === 401) {
    window.location.href = '/admin/login'
    throw new Error('Unauthorized')
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

function countLabel(value, one, few, many) {
  const lastTwo = value % 100
  const last = value % 10
  const noun = lastTwo >= 11 && lastTwo <= 14 ? many : last === 1 ? one : last >= 2 && last <= 4 ? few : many
  return `${value} ${noun}`
}

function detailUrl(patientId, visitsPage, visitsStatus, issuesPage) {
  const query = new URLSearchParams({ callsPage: '1', callsPageSize: '10', visitsPage: String(visitsPage), visitsPageSize: '10' })
  if (visitsStatus) query.set('visitsStatus', visitsStatus)
  query.set('issuesPage', String(issuesPage))
  query.set('issuesPageSize', '10')
  return `/api/admin/patients/${encodeURIComponent(patientId)}?${query}`
}

/** Renders one protected patient card with independently paginated safe history. */
export function PatientDetails({ patientId, onClose, onDestroyed }) {
  const [patient, setPatient] = useState(undefined)
  const [visits, setVisits] = useState(EMPTY_PAGE)
  const [issues, setIssues] = useState(EMPTY_PAGE)
  const [attachments, setAttachments] = useState([])
  const [visitsStatus, setVisitsStatus] = useState('')
  const [activeTab, setActiveTab] = useState('visits')
  const [revealed, setRevealed] = useState(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirmDestroy, setConfirmDestroy] = useState(false)
  const revealTimer = useRef(undefined)
  const revealGeneration = useRef(0)
  const loadGeneration = useRef(0)
  const destroyTrigger = useRef(undefined)
  const clearReveal = useCallback(() => {
    revealGeneration.current += 1
    if (revealTimer.current) clearTimeout(revealTimer.current)
    revealTimer.current = undefined
    setRevealed(undefined)
    setBusy((current) => current === 'reveal' ? '' : current)
  }, [])
  const load = useCallback(async (visitsPage, issuePage, status) => {
    const generation = loadGeneration.current + 1
    loadGeneration.current = generation
    clearReveal()
    setIsLoading(true)
    setErrorMessage('')
    try {
      const result = await requestJson(detailUrl(patientId, visitsPage, status, issuePage))
      if (loadGeneration.current !== generation) return
      setPatient(result.data)
      setVisits(result.history?.visits ?? EMPTY_PAGE)
      setIssues(result.history?.issues ?? EMPTY_PAGE)
      setAttachments(Array.isArray(result.history?.attachments) ? result.history.attachments : [])
    } catch {
      if (loadGeneration.current === generation) {
        setVisits(EMPTY_PAGE)
        setIssues(EMPTY_PAGE)
        setAttachments([])
        setErrorMessage('Не удалось загрузить карточку пациента')
      }
    } finally {
      if (loadGeneration.current === generation) setIsLoading(false)
    }
  }, [clearReveal, patientId])
  useEffect(() => { load(1, 1, '') }, [load])
  useEffect(() => {
    const clearIfHidden = () => { if (document.visibilityState !== 'visible') clearReveal() }
    document.addEventListener('visibilitychange', clearIfHidden)
    window.addEventListener('pagehide', clearReveal)
    return () => {
      loadGeneration.current += 1
      document.removeEventListener('visibilitychange', clearIfHidden)
      window.removeEventListener('pagehide', clearReveal)
      clearReveal()
    }
  }, [clearReveal])
  function changeTab(next) {
    clearReveal()
    setActiveTab(next)
  }
  function changeVisitStatus(event) {
    const status = event.target.value
    setVisitsStatus(status)
    load(1, issues.page.number, status)
  }
  async function reveal() {
    const generation = revealGeneration.current + 1
    revealGeneration.current = generation
    setBusy('reveal')
    setActionError('')
    try {
      const result = await requestJson(`/api/admin/patients/${encodeURIComponent(patientId)}/reveal`, { method: 'POST' })
      if (revealGeneration.current !== generation) return
      setRevealed(result.data)
      if (revealTimer.current) clearTimeout(revealTimer.current)
      revealTimer.current = setTimeout(clearReveal, 30_000)
    } catch {
      if (revealGeneration.current === generation) setActionError('Не удалось раскрыть персональные данные')
    } finally {
      if (revealGeneration.current === generation) setBusy('')
    }
  }
  function closeConfirmation() {
    setConfirmDestroy(false)
    destroyTrigger.current?.focus()
  }
  async function destroy() {
    setBusy('destroy')
    setActionError('')
    try {
      const result = await requestJson(`/api/admin/patients/${encodeURIComponent(patientId)}/personal-data`, { method: 'DELETE', body: JSON.stringify({ confirmation: 'УНИЧТОЖИТЬ' }) })
      clearReveal()
      setConfirmDestroy(false)
      onDestroyed(result.data)
    } catch {
      setActionError('Не удалось уничтожить персональные данные')
    } finally {
      setBusy('')
    }
  }
  if (isLoading && !patient) return <div role="status" className="clay-card flex min-h-44 items-center justify-center p-6 text-clay-admin-muted">Загружаем карточку…</div>
  if (errorMessage && !patient) return <div role="alert" className="clay-card border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">{errorMessage}</div>
  if (!patient) return null
  const destroyed = Boolean(patient.piiDestroyedAt)
  return (
    <section role="region" aria-label={`Карточка пациента ${patient.name || 'Обезличенный пациент'}`} className="clay-card space-y-5 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-mint">Защищённая карточка</p><h2 className="mt-2 font-serif text-2xl text-clay-dark">{patient.name || 'Обезличенный пациент'}</h2><p className="mt-1 font-mono text-sm text-clay-admin-muted">{patient.phoneMask || 'Телефон отсутствует'}</p></div><button type="button" className={SMALL_BUTTON} onClick={onClose} aria-label="Закрыть карточку пациента"><X aria-hidden="true" size={17} />Закрыть</button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-clay-admin-bg p-4"><span className="text-xs text-clay-admin-muted">Внешние карты</span><strong className="mt-1 block text-clay-admin-dark">{countLabel(patient.externalIdentifierCount, 'внешняя карта', 'внешние карты', 'внешних карт')}</strong></div><div className="rounded-2xl bg-clay-admin-bg p-4"><span className="text-xs text-clay-admin-muted">Карты клиники</span><strong className="mt-1 block text-clay-admin-dark">{countLabel(patient.clinicCardCount, 'карта', 'карты', 'карт')}</strong></div><div className="rounded-2xl bg-clay-admin-bg p-4"><span className="text-xs text-clay-admin-muted">Другие фамилии</span><strong className="mt-1 block text-clay-admin-dark">{countLabel(patient.previousLastNameCount, 'фамилия', 'фамилии', 'фамилий')}</strong></div><div className="rounded-2xl bg-clay-admin-bg p-4"><span className="text-xs text-clay-admin-muted">История</span><strong className="mt-1 block text-clay-admin-dark">{patient.historicalVisitCount} визитов · {patient.issueCount} проблем</strong></div></div>
      {errorMessage && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</div>}
      {actionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{actionError}</div>}
      {!destroyed && <div className="flex flex-wrap gap-3">{revealed ? <button type="button" className={SMALL_BUTTON} onClick={clearReveal}><EyeOff aria-hidden="true" size={17} />Скрыть персональные данные</button> : <button type="button" className={SMALL_BUTTON} disabled={busy === 'reveal'} onClick={reveal}><Eye aria-hidden="true" size={17} />Раскрыть персональные данные</button>}<button ref={destroyTrigger} type="button" className={`${SMALL_BUTTON} border-red-200 text-red-700 hover:border-red-400 hover:text-red-800`} onClick={() => setConfirmDestroy(true)}><ShieldX aria-hidden="true" size={17} />Уничтожить персональные данные</button></div>}
      {revealed && <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4" aria-label="Раскрытые персональные данные"><p className="text-xs font-bold uppercase tracking-wider text-amber-800">Раскрыто на 30 секунд</p><div className="grid gap-4 lg:grid-cols-2"><section><h3 className="font-semibold text-clay-admin-dark">Профиль и контакты</h3><p className="mt-2 text-sm text-clay-text">{[revealed.profile.lastName, revealed.profile.firstName, revealed.profile.secondName].filter(Boolean).join(' ') || 'Имя отсутствует'}</p><p className="mt-1 font-mono text-sm text-clay-text">{revealed.profile.phone || 'Телефон отсутствует'}</p><p className="mt-1 text-sm text-clay-text">{revealed.profile.birthday || 'Дата рождения отсутствует'}</p>{revealed.contacts.map((contact) => <p key={`${contact.kind}:${contact.value}`} className="mt-1 text-sm text-clay-text">{contact.kind === 'phone' ? 'Телефон' : 'Email'}: {contact.value}</p>)}</section><section><h3 className="font-semibold text-clay-admin-dark">Другие фамилии и карты</h3>{revealed.previousLastNames.length === 0 ? <p className="mt-2 text-sm text-clay-admin-muted">Нет других фамилий</p> : revealed.previousLastNames.map((name) => <p key={`${name.lastName}:${name.reason}`} className="mt-2 text-sm text-clay-text">{name.lastName} · {NAME_HISTORY_LABELS[name.reason]}</p>)}{revealed.externalIdentifiers.map((identifier) => <p key={`${identifier.system}:${identifier.value}`} className="mt-1 font-mono text-sm text-clay-text">{identifier.system}: {identifier.value}</p>)}</section><section><h3 className="font-semibold text-clay-admin-dark">Паспорт, адрес и прочие данные</h3><pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-clay-text">{JSON.stringify(revealed.privateData, null, 2)}</pre></section><section><h3 className="font-semibold text-clay-admin-dark">Согласия и материалы</h3>{revealed.consents.map((consent) => <p key={`${consent.type}:${consent.sourceName}`} className="mt-2 text-sm text-clay-text">SMS-уведомления: {consent.status === 'granted' ? 'разрешены' : 'не разрешены'}</p>)}<p className="mt-2 text-sm text-clay-admin-muted">Материалов: {revealed.attachments.length}</p></section></div></div>}
      <div role="tablist" aria-label="Разделы истории пациента" className="flex flex-wrap gap-2"><button role="tab" type="button" aria-selected={activeTab === 'visits'} className={SMALL_BUTTON} onClick={() => changeTab('visits')}>Исторические визиты</button><button role="tab" type="button" aria-selected={activeTab === 'issues'} className={SMALL_BUTTON} onClick={() => changeTab('issues')}>Проблемы данных</button></div>
      {activeTab === 'visits' && <section role="tabpanel" aria-label="Исторические визиты" className="space-y-4"><label className="flex max-w-sm flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Статус связи визитов<select className={INPUT_CLASS} value={visitsStatus} onChange={changeVisitStatus}><option value="">Все статусы</option><option value="linked">Сопоставленные</option><option value="ambiguous">Неоднозначные</option><option value="unmatched">Не сопоставленные</option></select></label>{visits.data.length === 0 ? <p className="py-5 text-sm text-clay-admin-muted">Исторических визитов нет</p> : <div className="space-y-2">{visits.data.map((visit) => { const protectedVisit = revealed?.historicalVisits.find(({ id }) => id === visit.id); return <article key={visit.id} className="rounded-xl border border-clay-admin-border bg-white px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-clay-admin-dark">{date(visit.startsAt)}</span><span className="text-sm text-clay-admin-muted">{VISIT_STATUS_LABELS[visit.sourceStatus] || visit.sourceStatus}</span><span className="rounded-full bg-clay-admin-bg px-3 py-1 text-xs font-semibold text-clay-admin-dark">{LINK_STATUS_LABELS[visit.linkStatus] || visit.linkStatus}</span></div>{protectedVisit && <div className="mt-3 border-t border-amber-200 pt-3 text-sm text-clay-text"><p>{protectedVisit.doctor || 'Врач не указан'}</p><pre className="mt-1 whitespace-pre-wrap break-words font-sans">{JSON.stringify(protectedVisit.details, null, 2)}</pre></div>}</article> })}</div>}<div className="flex items-center justify-end gap-3"><button type="button" className={SMALL_BUTTON} disabled={visits.page.number <= 1 || isLoading} onClick={() => load(visits.page.number - 1, issues.page.number, visitsStatus)} aria-label="Предыдущая страница визитов"><ChevronLeft aria-hidden="true" size={16} />Назад</button><span className="text-xs text-clay-admin-muted">{visits.page.number} из {visits.page.pages || 1}</span><button type="button" className={SMALL_BUTTON} disabled={visits.page.pages === 0 || visits.page.number >= visits.page.pages || isLoading} onClick={() => load(visits.page.number + 1, issues.page.number, visitsStatus)} aria-label="Следующая страница визитов">Далее<ChevronRight aria-hidden="true" size={16} /></button></div></section>}
      {activeTab === 'issues' && <section role="tabpanel" aria-label="Проблемы данных" className="space-y-4">{issues.data.length === 0 ? <p className="py-5 text-sm text-clay-admin-muted">Проблем данных нет</p> : <div className="space-y-2">{issues.data.map((issue) => <article key={issue.id} className="flex items-start gap-3 rounded-xl border border-clay-admin-border bg-white px-4 py-3"><FileClock aria-hidden="true" className="mt-0.5 shrink-0 text-clay-blue" size={18} /><div><strong className="text-sm text-clay-admin-dark">{ISSUE_LABELS[issue.code] || issue.code}</strong><p className="mt-1 text-xs text-clay-admin-muted">Строка источника {issue.sourceRow}</p></div></article>)}</div>}<div className="flex items-center justify-end gap-3"><button type="button" className={SMALL_BUTTON} disabled={issues.page.number <= 1 || isLoading} onClick={() => load(visits.page.number, issues.page.number - 1, visitsStatus)} aria-label="Предыдущая страница проблем пациента">Назад</button><span className="text-xs text-clay-admin-muted">{issues.page.number} из {issues.page.pages || 1}</span><button type="button" className={SMALL_BUTTON} disabled={issues.page.pages === 0 || issues.page.number >= issues.page.pages || isLoading} onClick={() => load(visits.page.number, issues.page.number + 1, visitsStatus)} aria-label="Следующая страница проблем пациента">Далее</button></div></section>}
      {attachments.length > 0 && <p className="text-sm text-clay-admin-muted">Внешних материалов: {attachments.length}</p>}
      {confirmDestroy && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeConfirmation() }}><section role="dialog" aria-modal="true" aria-labelledby="destroy-patient-title" tabIndex={-1} onKeyDown={(event) => handleDialogKeyDown(event, closeConfirmation)} className="clay-card-lg w-full max-w-lg p-6"><ShieldX aria-hidden="true" className="text-red-600" size={28} /><h2 id="destroy-patient-title" className="mt-4 font-serif text-2xl text-clay-dark">Уничтожить персональные данные?</h2><p className="mt-3 text-sm text-clay-muted">Профиль, контакты, паспорт, адрес, другие фамилии и защищённые детали истории будут удалены безвозвратно. Обезличенная история сохранится.</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button autoFocus type="button" className={SMALL_BUTTON} onClick={closeConfirmation}>Отмена</button><button type="button" disabled={busy === 'destroy'} className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-700 px-5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50" onClick={destroy}>Уничтожить безвозвратно</button></div></section></div>}
    </section>
  )
}
