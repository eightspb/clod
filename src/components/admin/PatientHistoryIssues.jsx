import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'

const EMPTY_PAGE = Object.freeze({ number: 1, size: 50, total: 0, pages: 0 })
const SMALL_BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-clay-admin-border bg-white px-4 text-sm font-semibold text-clay-admin-dark transition hover:border-clay-mint hover:text-clay-mint disabled:cursor-not-allowed disabled:opacity-45'
const INPUT_CLASS = 'min-h-11 rounded-xl border border-clay-admin-border bg-white px-3 text-sm text-clay-dark outline-none transition focus:border-clay-mint'
const EVIDENCE_LABELS = Object.freeze({ EXACT_EHR: 'Точный MEDESK ID', EXACT_CLINIC_CARD: 'Точная карта клиники', LEADING_ZERO_CLINIC_CARD: 'Карта с исправленным ведущим нулём', PHONE_COMPATIBLE_NAME: 'Телефон и совместимое имя', EXACT_FULL_NAME: 'Точное полное имя', CONFLICTING_COMMENT_EVIDENCE: 'Противоречивые данные комментария' })
const STATUS_LABELS = Object.freeze({ ambiguous: 'Неоднозначный визит', unmatched: 'Не сопоставлен' })

async function page(url) {
  const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
  if (response.status === 401) {
    window.location.href = '/admin/login'
    throw new Error('Unauthorized')
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

/** Renders the read-only queue of unresolved historical visits. */
export function PatientHistoryIssues() {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState(EMPTY_PAGE)
  const [status, setStatus] = useState('ambiguous')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const requestGeneration = useRef(0)
  const load = useCallback(async (number, currentStatus) => {
    const generation = requestGeneration.current + 1
    requestGeneration.current = generation
    setIsLoading(true)
    setErrorMessage('')
    try {
      const query = new URLSearchParams({ page: String(number), pageSize: '50', status: currentStatus })
      const result = await page(`/api/admin/patient-history/issues?${query}`)
      if (requestGeneration.current !== generation) return
      setItems(Array.isArray(result.data) ? result.data : [])
      setPagination(result.page ?? EMPTY_PAGE)
    } catch {
      if (requestGeneration.current === generation) {
        setItems([])
        setPagination(EMPTY_PAGE)
        setErrorMessage('Не удалось загрузить проблемы сопоставления')
      }
    } finally {
      if (requestGeneration.current === generation) setIsLoading(false)
    }
  }, [])
  useEffect(() => {
    load(1, status)
    return () => { requestGeneration.current += 1 }
  }, [load, status])
  if (isLoading && items.length === 0) return <div role="status" className="clay-card flex min-h-40 items-center justify-center p-6 text-clay-admin-muted">Загружаем проблемы сопоставления…</div>
  return (
    <section role="region" aria-label="Проблемы сопоставления визитов" className="clay-card space-y-4 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-peach">Контроль качества</p><h2 className="mt-2 font-serif text-2xl text-clay-dark">Проблемы сопоставления</h2><p className="mt-1 text-sm text-clay-admin-muted">Только просмотр причин и кандидатов, без автоматического объединения.</p></div><label className="flex min-w-56 flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-clay-admin-muted">Статус проблемы<select className={INPUT_CLASS} value={status} onChange={(event) => setStatus(event.target.value)}><option value="ambiguous">Неоднозначные</option><option value="unmatched">Не сопоставленные</option></select></label></div>
      {errorMessage ? <div role="alert" className="border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">{errorMessage}</div> : items.length === 0 ? <p className="py-6 text-center text-sm text-clay-admin-muted">Проблем этого типа нет</p> : <div className="space-y-2">{items.map((item) => <article key={item.id} className="rounded-xl border border-clay-admin-border bg-white px-4 py-3"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-amber-600" size={18} /><div><strong className="text-sm text-clay-admin-dark">{STATUS_LABELS[item.linkStatus] || item.linkStatus}</strong><p className="mt-1 text-xs text-clay-admin-muted">Строка источника {item.sourceRow} · {item.startsAt || 'дата не указана'}</p></div></div><span className="rounded-full bg-clay-admin-bg px-3 py-1 text-xs font-semibold text-clay-admin-dark">{item.candidates.length} кандидатов</span></div>{item.candidates.length > 0 && <ul className="mt-3 space-y-2 border-t border-clay-admin-border pt-3">{item.candidates.map((candidate) => <li key={`${candidate.patientId}:${candidate.evidenceCode}`} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-clay-text">{EVIDENCE_LABELS[candidate.evidenceCode] || candidate.evidenceCode} · {candidate.score}</span><a className="inline-flex min-h-11 items-center font-semibold text-clay-mint hover:underline" href={`/admin/patients?patient=${encodeURIComponent(candidate.patientId)}`}>Открыть кандидата</a></li>)}</ul>}</article>)}</div>}
      {!errorMessage && <div className="flex items-center justify-between gap-3"><button type="button" className={SMALL_BUTTON} disabled={pagination.number <= 1 || isLoading} onClick={() => load(pagination.number - 1, status)} aria-label="Предыдущая страница проблем"><ChevronLeft aria-hidden="true" size={16} />Назад</button><span className="text-xs text-clay-admin-muted">Страница {pagination.number} из {pagination.pages || 1}</span><button type="button" className={SMALL_BUTTON} disabled={pagination.pages === 0 || pagination.number >= pagination.pages || isLoading} onClick={() => load(pagination.number + 1, status)} aria-label="Следующая страница проблем">Далее<ChevronRight aria-hidden="true" size={16} /></button></div>}
    </section>
  )
}
