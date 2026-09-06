import { StarRating } from './StarRating.jsx'

const COLOR_MAP = {
  mint: { line: 'card-interactive-mint', tone: 'doctor-card-tone-mint' },
  peach: { line: 'card-interactive-peach', tone: 'doctor-card-tone-peach' },
  blue: { line: 'card-interactive-blue', tone: 'doctor-card-tone-blue' },
  lavender: { line: 'card-interactive-lavender', tone: 'doctor-card-tone-lavender' },
}

export function DoctorCard({ doctor }) {
  if (!doctor || !doctor.name) return null
  const initials = doctor.name.split(' ').slice(0, 2).map((w) => w[0]).join('')
  const colors = COLOR_MAP[doctor.ringColor] || COLOR_MAP.mint
  const specializationParts = doctor.specialization.split(',').map((part) => part.trim()).filter(Boolean)
  const primarySpecialty = specializationParts[0]
  const secondarySpecialty = specializationParts.slice(1).join(', ')
  const photoSource = doctor.photoMobile || doctor.photoFull || doctor.photo
  return (
    <article className={`doctor-card ${colors.tone} clay clay-card card-interactive ${colors.line} flex flex-col relative overflow-hidden h-full`}>
      <div className="doctor-card-media">
        <div className="doctor-card-experience">
          <p>Стаж</p>
          <strong>{doctor.experienceYears} лет</strong>
        </div>
        {photoSource
          ? (
            <img
              src={photoSource}
              alt={`${doctor.specialization ? doctor.specialization.split(',')[0].toLowerCase() + ' ' : ''}${doctor.name}, клиника Одинцова, СПб`}
              className="doctor-card-photo"
              loading="lazy"
              width="360"
              height="320"
            />
          )
          : (
            <div className="doctor-card-photo-fallback">
              <span className="doctor-card-avatar-initials font-bold text-clay-muted">{initials}</span>
            </div>
          )
        }
      </div>
      <div className="doctor-card-body flex flex-col flex-1">
        <h3 className="heading-serif text-xl font-normal text-clay-dark leading-snug mb-2">{doctor.name}</h3>
        {doctor.tagline && (
          <p className="text-clay-muted text-sm leading-relaxed mb-4 flex-1 line-clamp-4">{doctor.tagline}</p>
        )}
        {doctor.proDoctorovRating && (
          <div className="doctor-card-rating text-sm">
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
        <div className="doctor-card-footer">
          <div className="doctor-card-specialty clay">
            <p className="font-semibold text-clay-dark leading-tight truncate">
              {primarySpecialty}
            </p>
            {secondarySpecialty && (
              <p className="text-clay-muted leading-tight truncate mt-1">
                {secondarySpecialty}
              </p>
            )}
          </div>
          <div className="doctor-card-actions grid gap-2">
            <button
              type="button"
              data-booking-btn="true"
              data-booking-doctor={doctor.slug}
              aria-label={`Записаться на приём к врачу ${doctor.name}`}
              className="clay btn-clay-primary min-h-11 min-w-0 justify-center px-3 py-2.5"
            >
              Записаться
            </button>
            <a
              href={doctor.slug ? `/doctors/${doctor.slug}` : '/doctors'}
              className="clay btn-clay-secondary min-h-11 min-w-0 justify-center px-3 py-2.5 text-center"
            >
              Подробнее
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}
