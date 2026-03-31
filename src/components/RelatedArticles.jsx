const CATEGORY_ACCENT = {
  'Маммология': 'text-emerald-700 bg-emerald-50/90',
  'Диагностика': 'text-sky-700 bg-sky-50/90',
  'Эндокринология': 'text-orange-700 bg-orange-50/90',
  'Гинекология': 'text-violet-700 bg-violet-50/90',
  'Нутрициология': 'text-violet-700 bg-violet-50/90',
  'События клиники': 'text-orange-700 bg-orange-50/90',
  'Клинические случаи': 'text-emerald-700 bg-emerald-50/90',
  'Видео': 'text-sky-700 bg-sky-50/90',
}

const PILLAR_PAGES = {
  'Маммология': { label: 'Маммология', href: '/mammology' },
  'Гинекология': { label: 'Гинекология', href: '/gynecology' },
  'Эндокринология': { label: 'Эндокринология', href: '/endocrinology' },
  'Нутрициология': { label: 'Нутрициология', href: '/nutrition' },
  'Диагностика': { label: 'Маммология', href: '/mammology' },
}

function truncateDescription(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...'
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function RelatedCard({ article }) {
  if (!article || !article.title) return null
  const accent = CATEGORY_ACCENT[article.category] || 'text-clay-teal bg-teal-50/90'
  return (
    <a
      href={`/blog/${article.slug}`}
      className="clay-card flex flex-col overflow-hidden no-underline group hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
    >
      {article.image && (
        <div className="w-full h-44 overflow-hidden relative bg-gray-100">
          <img
            src={article.image}
            alt={article.imageAlt || article.title}
            loading="lazy"
            width="400"
            height="176"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-clay-dark/40 via-transparent to-transparent opacity-70" />
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${accent}`}>
            {article.category}
          </span>
          <span className="text-xs text-clay-muted">
            {formatDate(article.publishDate)}
          </span>
        </div>
        <h3 className="text-base font-bold text-clay-dark leading-snug mb-2 line-clamp-2 group-hover:text-clay-teal transition-colors">
          {article.title}
        </h3>
        <p className="text-sm text-clay-muted leading-relaxed line-clamp-2 flex-1">
          {truncateDescription(article.description, 120)}
        </p>
        <span className="mt-3 text-sm font-semibold text-clay-teal flex items-center gap-1 group-hover:translate-x-1 transition-transform duration-300">
          Читать
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </span>
      </div>
    </a>
  )
}

export function PillarPageLink({ category }) {
  const pillar = PILLAR_PAGES[category]
  if (!pillar) return null
  return (
    <a
      href={pillar.href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-clay-teal hover:underline transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      Раздел «{pillar.label}»
    </a>
  )
}

export function RelatedArticles({ articles }) {
  if (!articles || articles.length === 0) return null
  return (
    <section className="mt-16 pt-10 border-t border-gray-100">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 rounded-full bg-clay-mint" />
        <h2 className="text-2xl font-bold text-clay-dark tracking-tight">
          Читайте также
        </h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <RelatedCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  )
}
