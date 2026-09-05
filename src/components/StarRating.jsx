import { Star } from 'lucide-react'

export function StarRating({ score, reviewCount, url, size = 14, variant = 'compact' }) {
  const fullStars = Math.floor(score)
  const hasHalf = score - fullStars >= 0.5
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)
  const stars = [
    ...Array(fullStars).fill('full'),
    ...(hasHalf ? ['half'] : []),
    ...Array(emptyStars).fill('empty'),
  ]
  const content = (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5">
        {stars.map((type, i) => (
          <Star
            key={i}
            size={size}
            className={type === 'empty' ? 'text-clay-muted opacity-30' : 'text-yellow-400'}
            fill={type === 'full' ? 'currentColor' : type === 'half' ? 'url(#half-fill)' : 'none'}
            strokeWidth={type === 'empty' ? 1.5 : 0}
          />
        ))}
      </span>
      {variant !== 'stars' && (
        <span className="font-semibold text-clay-dark">{score.toFixed(1)}</span>
      )}
      {variant === 'full' && (
        <span className="text-clay-muted">· {reviewCount} отзывов</span>
      )}
      {variant === 'compact' && (
        <span className="text-clay-muted text-xs">({reviewCount})</span>
      )}
    </span>
  )
  if (!url) return <span>{content}</span>
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center hover:opacity-80 transition-opacity"
      aria-label={`${score.toFixed(1)} (${reviewCount}) - рейтинг на ПроДокторов`}
    >
      {content}
    </a>
  )
}
