import { useState, useEffect, useCallback, useRef } from 'react'
import { STYLE_PREFIX, PROMPTS, AVAILABLE_MODELS } from '../../lib/blog-prompts.js'

const POLL_MS = 3000

async function applyImages(slugs) {
  const res = await fetch('/api/generate-image', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slugs }),
  })
  return res.json()
}

function ArticleCard({ article, job, imageUrl, version, applied, onSubmit, onApply, onRefresh }) {
  const defaultPrompt = PROMPTS[article.slug]
    ? `${STYLE_PREFIX} ${PROMPTS[article.slug].scene}`
    : ''
  const [prompt, setPrompt] = useState(job?.prompt || defaultPrompt)
  const [model, setModel] = useState(job?.model || AVAILABLE_MODELS[0].id)
  const [showPrompt, setShowPrompt] = useState(false)
  const [applyStatus, setApplyStatus] = useState('')
  const isPending = job?.status === 'pending'
  const isFailed = job?.status === 'failed'
  const hasImage = !!imageUrl
  const isUnsplash = article.image?.includes('unsplash.com')
  const imgKey = version || 'init'
  const displayImage = hasImage
    ? `${imageUrl}?_=${imgKey}`
    : article.image
  const needsApply = hasImage && !applied && !isPending
  const handleGenerate = useCallback(() => {
    onSubmit(article.slug, prompt, model)
  }, [article.slug, prompt, model, onSubmit])
  const handleRefresh = useCallback(() => {
    if (onRefresh) onRefresh(article.slug)
  }, [article.slug, onRefresh])
  const handleApply = useCallback(async () => {
    setApplyStatus('applying')
    try {
      const data = await applyImages([article.slug])
      const result = data.results?.[article.slug]
      if (result?.applied) {
        setApplyStatus('done')
        if (onApply) onApply(article.slug)
      } else {
        setApplyStatus(result?.error || 'Ошибка применения')
      }
    } catch (err) {
      setApplyStatus(err.message)
    }
  }, [article.slug, onApply])
  return (
    <div className={`blog-gen-card ${isPending ? 'blog-gen-card-active' : ''}`}>
      <div className="blog-gen-card-image">
        {displayImage && (
          <img key={`${article.slug}-${imgKey}`} src={displayImage} alt={article.imageAlt || article.title} />
        )}
        {isPending && <div className="blog-gen-card-overlay"><div className="blog-gen-spinner-lg" /></div>}
        <div className="blog-gen-card-badges">
          <span className="blog-gen-badge blog-gen-badge-category">{article.category}</span>
          {isPending && <span className="blog-gen-badge blog-gen-badge-pending">Генерация...</span>}
          {hasImage && !isPending && applied && <span className="blog-gen-badge blog-gen-badge-applied">Применено</span>}
          {hasImage && !isPending && !applied && <span className="blog-gen-badge blog-gen-badge-generated">AI</span>}
          {!hasImage && !isPending && isUnsplash && <span className="blog-gen-badge blog-gen-badge-unsplash">Unsplash</span>}
          {isFailed && <span className="blog-gen-badge blog-gen-badge-failed">Ошибка</span>}
        </div>
        {hasImage && !isPending && job?.model && (
          <span className="blog-gen-model-badge">
            {AVAILABLE_MODELS.find(m => m.id === job.model)?.name || job.model}
          </span>
        )}
        {hasImage && !isPending && (
          <button type="button" className="blog-gen-refresh-btn" onClick={handleRefresh} title="Обновить превью">
            ↻
          </button>
        )}
      </div>
      <div className="blog-gen-card-body">
        <h3 className="blog-gen-card-title">{article.title}</h3>
        <p className="blog-gen-card-desc">{article.description}</p>
        {isFailed && job?.error && (
          <div className="blog-gen-status blog-gen-status-error">{job.error}</div>
        )}
        {job?.status === 'completed' && job?.size && (
          <div className="blog-gen-status blog-gen-status-success">
            {AVAILABLE_MODELS.find(m => m.id === job.model)?.name || job.model}, {Math.round(job.size / 1024)} KB
          </div>
        )}
        {applyStatus === 'done' && (
          <div className="blog-gen-status blog-gen-status-success">Frontmatter обновлён</div>
        )}
        {applyStatus && applyStatus !== 'done' && applyStatus !== 'applying' && (
          <div className="blog-gen-status blog-gen-status-error">{applyStatus}</div>
        )}
        <button
          type="button"
          className="blog-gen-toggle-prompt"
          onClick={() => setShowPrompt(!showPrompt)}
        >
          {showPrompt ? 'Скрыть промпт' : 'Показать промпт'}
        </button>
        {showPrompt && (
          <div className="blog-gen-prompt-section">
            <label className="blog-gen-label">Промпт</label>
            <textarea
              className="blog-gen-textarea"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={5}
            />
            <div className="blog-gen-model-row">
              <label className="blog-gen-label">Модель</label>
              <select className="blog-gen-select" value={model} onChange={e => setModel(e.target.value)}>
                {AVAILABLE_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name} - {m.description}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div className="blog-gen-actions">
          <button
            type="button"
            className="blog-gen-btn blog-gen-btn-primary"
            onClick={handleGenerate}
            disabled={isPending}
          >
            {isPending ? 'Генерация...' : hasImage ? 'Перегенерировать' : 'Сгенерировать'}
          </button>
          {needsApply && (
            <button
              type="button"
              className="blog-gen-btn blog-gen-btn-apply"
              onClick={handleApply}
              disabled={applyStatus === 'applying'}
            >
              {applyStatus === 'applying' ? 'Применяю...' : 'Применить'}
            </button>
          )}
          {applied && hasImage && (
            <button type="button" className="blog-gen-btn blog-gen-btn-applied" disabled>
              Применено
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function detectApplied(articles, images) {
  const applied = {}
  for (const a of articles) {
    if (images[a.slug] && a.image === images[a.slug]) {
      applied[a.slug] = true
    }
  }
  return applied
}

export function BlogImageGenerator({ articles }) {
  const [jobs, setJobs] = useState({})
  const [images, setImages] = useState({})
  const [versions, setVersions] = useState({})
  const [applied, setApplied] = useState({})
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [bulkModel, setBulkModel] = useState(AVAILABLE_MODELS[0].id)
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState('')
  const [applyAllStatus, setApplyAllStatus] = useState('')
  const pollRef = useRef(null)
  const prevJobsRef = useRef({})
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/generate-image')
      const data = await res.json()
      const newJobs = data.jobs || {}
      const prev = prevJobsRef.current
      for (const [slug, job] of Object.entries(newJobs)) {
        if (job.status === 'completed' && prev[slug]?.status === 'pending') {
          setVersions(v => ({ ...v, [slug]: Date.now() }))
        }
      }
      prevJobsRef.current = newJobs
      setJobs(newJobs)
      setImages(data.images || {})
    } catch {
      return
    }
  }, [])
  useEffect(() => { fetchState() }, [fetchState])
  useEffect(() => {
    setApplied(detectApplied(articles, images))
  }, [articles, images])
  const hasPending = Object.values(jobs).some(j => j.status === 'pending')
  useEffect(() => {
    if (hasPending) {
      pollRef.current = setInterval(fetchState, POLL_MS)
      return () => clearInterval(pollRef.current)
    }
    if (pollRef.current) clearInterval(pollRef.current)
  }, [hasPending, fetchState])
  const bumpVersion = useCallback((slug) => {
    setVersions(prev => ({ ...prev, [slug]: Date.now() }))
  }, [])
  const handleSubmit = useCallback(async (slug, prompt, model) => {
    setJobs(prev => ({ ...prev, [slug]: { status: 'pending', prompt, model, createdAt: new Date().toISOString() } }))
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, prompt, model }),
      })
      const data = await res.json()
      if (data.job) {
        setJobs(prev => ({ ...prev, [slug]: data.job }))
        if (data.job.imageUrl) {
          setImages(prev => ({ ...prev, [slug]: data.job.imageUrl }))
          bumpVersion(slug)
        }
      }
    } catch (err) {
      setJobs(prev => ({ ...prev, [slug]: { status: 'failed', error: err.message, prompt, model } }))
    }
  }, [bumpVersion])
  const handleApplied = useCallback((slug) => {
    setApplied(prev => ({ ...prev, [slug]: true }))
  }, [])
  const handleBulk = useCallback(async () => {
    const pending = filteredArticles.filter(a => !images[a.slug])
    if (pending.length === 0) { setBulkProgress('Все уже сгенерированы'); return }
    setBulkRunning(true)
    setBulkProgress(`Запуск 0/${pending.length}...`)
    let submitted = 0
    for (const article of pending) {
      const prompt = PROMPTS[article.slug]
        ? `${STYLE_PREFIX} ${PROMPTS[article.slug].scene}`
        : null
      if (!prompt) continue
      await handleSubmit(article.slug, prompt, bulkModel)
      submitted++
      setBulkProgress(`Запущено ${submitted}/${pending.length}...`)
      await new Promise(r => setTimeout(r, 500))
    }
    setBulkProgress(`Запущено ${submitted} заданий`)
    setBulkRunning(false)
  }, [filteredArticles, images, bulkModel, handleSubmit])
  const handleApplyAll = useCallback(async () => {
    const unapplied = Object.keys(images).filter(slug => !applied[slug])
    if (unapplied.length === 0) { setApplyAllStatus('Все уже применены'); return }
    setApplyAllStatus(`Применяю ${unapplied.length} изображений...`)
    try {
      const data = await applyImages(unapplied)
      const results = data.results || {}
      let ok = 0
      let fail = 0
      for (const [slug, r] of Object.entries(results)) {
        if (r.applied) {
          ok++
          setApplied(prev => ({ ...prev, [slug]: true }))
        } else {
          fail++
        }
      }
      setApplyAllStatus(`Применено: ${ok}, ошибок: ${fail}`)
    } catch (err) {
      setApplyAllStatus(`Ошибка: ${err.message}`)
    }
  }, [images, applied])
  const categories = ['all', ...new Set(articles.map(a => a.category))]
  const filteredArticles = articles.filter(article => {
    if (filter === 'generated') return !!images[article.slug]
    if (filter === 'unsplash') return !images[article.slug]
    if (filter === 'pending') return jobs[article.slug]?.status === 'pending'
    if (filter === 'failed') return jobs[article.slug]?.status === 'failed'
    if (filter === 'unapplied') return images[article.slug] && !applied[article.slug]
    if (filter !== 'all') return article.category === filter
    return true
  }).filter(article => {
    if (!search) return true
    const q = search.toLowerCase()
    return article.title.toLowerCase().includes(q) || article.slug.includes(q)
  })
  const totalImages = Object.keys(images).length
  const totalApplied = Object.keys(applied).length
  const totalPending = Object.values(jobs).filter(j => j.status === 'pending').length
  const totalFailed = Object.values(jobs).filter(j => j.status === 'failed').length
  const totalUnapplied = totalImages - totalApplied
  return (
    <div className="blog-gen-container">
      <div className="blog-gen-header">
        <div>
          <h1 className="blog-gen-title">Генератор постеров для блога</h1>
          <p className="blog-gen-subtitle">
            {totalImages}/{articles.length} сгенерировано, {totalApplied} применено
            {totalPending > 0 && <span className="blog-gen-pending-count"> | {totalPending} в процессе</span>}
            {totalFailed > 0 && <span className="blog-gen-failed-count"> | {totalFailed} ошибок</span>}
          </p>
        </div>
        <div className="blog-gen-progress-bar">
          <div className="blog-gen-progress-fill" style={{ width: `${(totalImages / articles.length) * 100}%` }} />
          {totalPending > 0 && (
            <div className="blog-gen-progress-pending" style={{ width: `${(totalPending / articles.length) * 100}%`, left: `${(totalImages / articles.length) * 100}%` }} />
          )}
        </div>
      </div>
      <div className="blog-gen-toolbar">
        <input
          type="text"
          className="blog-gen-search"
          placeholder="Поиск по названию..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="blog-gen-filters">
          <button type="button" className={`blog-gen-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            Все ({articles.length})
          </button>
          <button type="button" className={`blog-gen-filter ${filter === 'generated' ? 'active' : ''}`} onClick={() => setFilter('generated')}>
            AI ({totalImages})
          </button>
          <button type="button" className={`blog-gen-filter ${filter === 'unsplash' ? 'active' : ''}`} onClick={() => setFilter('unsplash')}>
            Unsplash ({articles.length - totalImages})
          </button>
          {totalUnapplied > 0 && (
            <button type="button" className={`blog-gen-filter ${filter === 'unapplied' ? 'active' : ''}`} onClick={() => setFilter('unapplied')}>
              Не применено ({totalUnapplied})
            </button>
          )}
          {totalPending > 0 && (
            <button type="button" className={`blog-gen-filter ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
              В процессе ({totalPending})
            </button>
          )}
          {totalFailed > 0 && (
            <button type="button" className={`blog-gen-filter ${filter === 'failed' ? 'active' : ''}`} onClick={() => setFilter('failed')}>
              Ошибки ({totalFailed})
            </button>
          )}
          {categories.filter(c => c !== 'all').map(cat => (
            <button key={cat} type="button" className={`blog-gen-filter ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat)}>
              {cat}
            </button>
          ))}
        </div>
        <div className="blog-gen-bulk">
          <select className="blog-gen-select" value={bulkModel} onChange={e => setBulkModel(e.target.value)}>
            {AVAILABLE_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button
            type="button"
            className="blog-gen-btn blog-gen-btn-primary"
            onClick={handleBulk}
            disabled={bulkRunning}
          >
            {bulkRunning ? 'Запуск...' : 'Сгенерировать все'}
          </button>
          {totalUnapplied > 0 && (
            <button
              type="button"
              className="blog-gen-btn blog-gen-btn-apply"
              onClick={handleApplyAll}
            >
              Применить все ({totalUnapplied})
            </button>
          )}
          {(bulkProgress || applyAllStatus) && (
            <span className="blog-gen-bulk-status">{applyAllStatus || bulkProgress}</span>
          )}
        </div>
      </div>
      <div className="blog-gen-grid">
        {filteredArticles.map(article => (
          <ArticleCard
            key={article.slug}
            article={article}
            job={jobs[article.slug]}
            imageUrl={images[article.slug]}
            version={versions[article.slug] || 0}
            applied={!!applied[article.slug]}
            onSubmit={handleSubmit}
            onApply={handleApplied}
            onRefresh={bumpVersion}
          />
        ))}
      </div>
      {filteredArticles.length === 0 && (
        <p className="blog-gen-empty">Нет статей, соответствующих фильтру</p>
      )}
    </div>
  )
}
