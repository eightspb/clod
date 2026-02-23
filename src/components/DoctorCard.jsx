import { RING_COLOR_MAP } from '../lib/constants.js'

export function DoctorCard({ doctor }) {
  if (!doctor || !doctor.name) return null

  const initials = doctor.name.split(' ').slice(0, 2).map((w) => w[0]).join('')
  const ring = RING_COLOR_MAP[doctor.ringColor] || 'avatar-ring-mint'

  return (
    <article className="clay clay-card p-6 flex flex-col relative overflow-visible group">
      {/* Decorative dots */}
      <div className="pointer-events-none absolute top-4 right-10 w-3 h-3 rounded-full opacity-50" style={{ background: '#FAC8B0' }} />
      <div className="pointer-events-none absolute top-10 right-5 w-2 h-2 rounded-full opacity-35" style={{ background: '#A8D8F4' }} />
      <div className="pointer-events-none absolute bottom-20 right-5 w-2.5 h-2.5 rounded-full opacity-45" style={{ background: '#A0E4D4' }} />

      {/* Top row: photo + experience badge */}
      <div className="flex items-start justify-between mb-4">
        <div className={`${ring} flex-shrink-0`}>
          {doctor.photo
            ? (
              <img
                src={doctor.photo}
                alt={doctor.name}
                className="w-40 h-40 rounded-full object-cover"
                loading="lazy"
                width="160"
                height="160"
              />
            )
            : (
              <div className="w-40 h-40 rounded-full flex items-center justify-center" style={{ background: 'rgba(78,200,168,0.08)' }}>
                <span className="text-2xl font-bold text-clay-muted">{initials}</span>
              </div>
            )
          }
        </div>
        <div className="clay clay-card-soft-mint px-3 py-1.5 rounded-xl text-center flex-shrink-0">
          <p className="text-xs text-clay-muted leading-none mb-0.5">Стаж</p>
          <p className="text-sm font-extrabold text-clay-mint leading-none">{doctor.experienceYears} лет</p>
        </div>
      </div>

      {/* Name */}
      <h4 className="font-bold text-clay-dark text-base leading-snug mb-2">{doctor.name}</h4>

      {/* Tagline */}
      {doctor.tagline && (
        <p className="text-clay-muted text-sm leading-relaxed mb-4 flex-1 line-clamp-5">{doctor.tagline}</p>
      )}

      {/* Specialization + link */}
      <div className="mt-auto pt-3 border-t border-clay-bg flex items-center justify-between gap-2">
        <div className="clay clay-card-soft-blue px-3 py-1.5 rounded-xl min-w-0 flex-1 mr-2">
          <p className="text-xs font-semibold text-clay-dark leading-tight truncate">
            {doctor.specialization.split(',')[0]}
          </p>
          {doctor.specialization.split(',')[1] && (
            <p className="text-xs text-clay-muted leading-tight truncate">
              {doctor.specialization.split(',').slice(1).join(',').trim()}
            </p>
          )}
        </div>
        <a
          href={doctor.slug ? `/doctors/${doctor.slug}` : '/doctors'}
          className="clay btn-clay-primary text-xs py-2 px-4 gap-1 flex-shrink-0"
        >
          Подробнее
        </a>
      </div>
    </article>
  )
}

export default DoctorCard
