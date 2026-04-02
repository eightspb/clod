import { RING_COLOR_MAP } from '../lib/constants.js'
import { StarRating } from './StarRating.jsx'

const COLOR_MAP = {
  mint: { shadow: 'rgba(27,107,90,0.22)', line: 'card-interactive-mint' },
  peach: { shadow: 'rgba(196,120,92,0.22)', line: 'card-interactive-peach' },
  blue: { shadow: 'rgba(74,127,165,0.22)', line: 'card-interactive-blue' },
  lavender: { shadow: 'rgba(123,104,160,0.18)', line: '' },
}

export function DoctorCard({ doctor }) {
  if (!doctor || !doctor.name) return null
  const initials = doctor.name.split(' ').slice(0, 2).map((w) => w[0]).join('')
  const ring = RING_COLOR_MAP[doctor.ringColor] || 'avatar-ring-mint'
  const colors = COLOR_MAP[doctor.ringColor] || COLOR_MAP.mint
  return (
    <article className={`clay clay-card card-interactive ${colors.line} flex flex-col relative overflow-visible pt-60 h-full`}>
      <div className="absolute -top-4 -left-4 z-10">
        <div
          className={`${ring} flex-shrink-0`}
          style={{ padding: '3px', borderRadius: '9999px', boxShadow: `0 8px 24px ${colors.shadow}, 0 2px 8px rgba(0,0,0,0.10)` }}
        >
          {doctor.photo
            ? (
              <img
                src={doctor.photo}
                alt={`${doctor.specialization ? doctor.specialization.split(',')[0].toLowerCase() + ' ' : ''}${doctor.name}, клиника Одинцова, СПб`}
                className="object-cover block"
                style={{
                  width: '264px',
                  height: '264px',
                  borderRadius: '9999px',
                }}
                loading="lazy"
                width="264"
                height="264"
              />
            )
            : (
              <div
                className="clay-card-soft-mint flex items-center justify-center"
                style={{
                  width: '264px',
                  height: '264px',
                  borderRadius: '9999px',
                }}
              >
                <span className="text-2xl font-bold text-clay-muted">{initials}</span>
              </div>
            )
          }
        </div>
      </div>
      <div className="px-5 pb-5 flex flex-col flex-1">
        <div className="flex justify-end mb-1.5">
          <div className="clay clay-card-soft-mint px-3 py-1.5 rounded-xl text-center flex-shrink-0">
            <p className="text-xs text-clay-muted leading-none mb-0.5">Стаж</p>
            <p className="text-sm font-extrabold text-clay-mint leading-none">{doctor.experienceYears} лет</p>
          </div>
        </div>
        <h3 className="heading-serif text-xl font-normal text-clay-dark leading-snug mb-2">{doctor.name}</h3>
        {doctor.tagline && (
          <p className="text-clay-muted text-sm leading-relaxed mb-4 flex-1 line-clamp-4">{doctor.tagline}</p>
        )}
        {doctor.proDoctorovRating && (
          <div className="mb-3 text-sm">
            <StarRating
              score={doctor.proDoctorovRating.score}
              reviewCount={doctor.proDoctorovRating.reviewCount}
              url={doctor.proDoctorovUrl}
              size={14}
              variant="compact"
            />
            <span className="ml-1.5 text-xs text-clay-muted">ПроДокторов</span>
          </div>
        )}
        <div className="mt-auto pt-4 border-t border-clay-bg flex items-center justify-between gap-2">
          <div className="clay clay-card-soft-blue px-3 py-2 rounded-xl min-w-0 w-[61.8%]">
            <p className="text-[14px] font-semibold text-clay-dark leading-tight truncate">
              {doctor.specialization.split(',')[0]}
            </p>
            {doctor.specialization.split(',')[1] && (
              <p className="text-[14px] text-clay-muted leading-tight truncate mt-1">
                {doctor.specialization.split(',').slice(1).join(',').trim()}
              </p>
            )}
          </div>
          <a
            href={doctor.slug ? `/doctors/${doctor.slug}` : '/doctors'}
            className="clay btn-clay-primary text-[14px] py-2.5 px-3 gap-1 flex-1 text-center justify-center min-w-0"
          >
            Подробнее
          </a>
        </div>
      </div>
    </article>
  )
}
