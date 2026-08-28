import { ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react'

const TOGGLE_CLASS = 'flex min-h-11 w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-semibold text-clay-admin-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-mint'

/**
 * Renders a controlled, accessible filter disclosure with applied summaries.
 */
export function FilterPanel({ scope, open, active, summaries = [], onToggle, onReset, children }) {
  const label = `${open ? 'Скрыть' : 'Показать'} фильтры ${scope}`
  return <section className="clay-card overflow-hidden" aria-label={`Панель фильтров ${scope}`}><button type="button" className={TOGGLE_CLASS} aria-expanded={open} aria-label={label} onClick={onToggle}><span className="flex items-center gap-2"><SlidersHorizontal aria-hidden="true" size={18} />Фильтры{active > 0 && <span className="rounded-full bg-clay-admin-bg px-2.5 py-1 text-xs text-clay-mint">{active} активных</span>}</span><ChevronDown aria-hidden="true" size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} /></button>{!open && summaries.length > 0 && <div className="flex flex-wrap gap-2 border-t border-clay-admin-border px-4 py-3">{summaries.map((summary) => <span key={summary} className="rounded-full bg-clay-admin-bg px-3 py-1 text-xs font-semibold text-clay-admin-muted">{summary}</span>)}{onReset && <button type="button" className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-clay-mint hover:bg-clay-admin-bg" onClick={onReset}><RotateCcw aria-hidden="true" size={14} />Сбросить</button>}</div>}{open && <div className="border-t border-clay-admin-border p-4">{children}</div>}</section>
}
