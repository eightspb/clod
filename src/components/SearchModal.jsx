import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

const DEBOUNCE_MS = 300
const MAX_RESULTS = 8

function SearchResult({ result, onClose }) {
  const url = result.url.replace(/^https?:\/\/[^/]+/, '')
  const breadcrumb = url.replace(/^\//, '').replace(/\//g, ' › ') || 'Главная'
  return (
    <a
      href={url}
      onClick={onClose}
      className="block px-4 py-3 rounded-2xl hover:bg-clay-bg transition-colors duration-150 group"
    >
      <div className="text-sm font-semibold text-clay-dark group-hover:text-clay-mint transition-colors leading-snug mb-0.5">
        {result.meta?.title || result.url}
      </div>
      {result.excerpt && (
        <div
          className="text-xs text-clay-muted leading-relaxed search-result-excerpt line-clamp-2"
          dangerouslySetInnerHTML={{ __html: result.excerpt }}
        />
      )}
      <div className="text-xs text-clay-mint/70 mt-1 font-medium">{breadcrumb}</div>
    </a>
  )
}

export function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [pagefind, setPagefind] = useState(null)
  const [initError, setInitError] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || pagefind || initError) {
      return
    }
    const pagefindUrl = '/pagefind/pagefind.js'
    async function loadPagefind() {
      try {
        const probe = await fetch(pagefindUrl, { method: 'HEAD' })
        if (!probe.ok) {
          setInitError(true)
          return
        }
        const pf = await new Function('url', 'return import(url)')(pagefindUrl)
        await pf.init()
        setPagefind(pf)
      } catch {
        setInitError(true)
      }
    }
    loadPagefind()
  }, [isOpen, pagefind, initError])

  const runSearch = useCallback(async (value, pf) => {
    if (!value.trim() || !pf) {
      setResults([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const searchResult = await pf.search(value)
      const data = await Promise.all(
        searchResult.results.slice(0, MAX_RESULTS).map((r) => r.data())
      )
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  function handleQueryChange(event) {
    const value = event.target.value
    setQuery(value)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      runSearch(value, pagefind)
    }, DEBOUNCE_MS)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  function handleClose() {
    setQuery('')
    setResults([])
    onClose()
  }

  if (!isOpen) {
    return null
  }

  const showEmpty = !isLoading && query.trim().length > 0 && results.length === 0 && !initError
  const showResults = !isLoading && results.length > 0

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-16 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Поиск по сайту"
    >
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-2xl clay clay-card rounded-3xl shadow-clay-lg overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-clay-bg">
          <Search size={20} className="text-clay-muted flex-shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleQueryChange}
            placeholder="Поиск по сайту..."
            className="flex-1 bg-transparent text-clay-dark placeholder-clay-muted text-base outline-none"
            autoComplete="off"
            spellCheck="false"
          />
          {isLoading && (
            <Loader2 size={18} className="text-clay-muted animate-spin flex-shrink-0" aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl hover:bg-clay-bg transition-colors flex-shrink-0"
            aria-label="Закрыть поиск"
          >
            <X size={18} className="text-clay-muted" />
          </button>
        </div>
        {initError && (
          <div className="px-5 py-8 text-center text-clay-muted text-sm">
            Поиск недоступен. Пожалуйста, откройте собранную версию сайта.
          </div>
        )}
        {showResults && (
          <div className="max-h-[60vh] overflow-y-auto px-3 py-3">
            {results.map((result) => (
              <SearchResult key={result.url} result={result} onClose={handleClose} />
            ))}
          </div>
        )}
        {showEmpty && (
          <div className="px-5 py-8 text-center">
            <Search size={32} className="text-clay-muted/40 mx-auto mb-3" aria-hidden="true" />
            <p className="text-clay-muted text-sm">Ничего не найдено</p>
            <p className="text-clay-muted/60 text-xs mt-1">Попробуйте другой запрос</p>
          </div>
        )}
        {!query && !initError && (
          <div className="px-5 py-6 text-center text-clay-muted/60 text-xs">
            Начните вводить для поиска по страницам, врачам и статьям
          </div>
        )}
      </div>
    </div>
  )
}
