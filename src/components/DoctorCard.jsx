export function DoctorCard({
  name,
  specialty,
  experience,
  description,
  ringColor = 'avatar-ring-peach',
  badgeColor = 'clay-spec-badge-peach',
  initials = '',
  image = null,
}) {
  if (!name) return null

  return (
    <div className="clay clay-card p-6 sm:p-7 flex flex-col relative">
      {/* Avatar with floating specialty badge */}
      <div className="flex justify-center mb-5">
        <div className="relative">
          <div className={ringColor} style={{ padding: '8px' }}>
            <div className="w-24 h-24 rounded-full bg-clay-bg flex items-center justify-center overflow-hidden">
              {image
                ? <img src={image} alt={name} className="w-full h-full object-cover rounded-full" loading="lazy" width={96} height={96} />
                : <span className="text-2xl font-bold text-clay-muted">{initials}</span>
              }
            </div>
          </div>
          <div className="absolute -top-1 -right-4">
            <span className={`clay-spec-badge ${badgeColor}`}>{specialty}</span>
          </div>
        </div>
      </div>

      {/* Name */}
      <h4 className="font-bold text-clay-dark text-lg leading-tight mb-2">{name}</h4>

      {/* Description */}
      <p className="text-clay-muted text-sm leading-relaxed mb-4 flex-1">{description}</p>

      {/* Experience pill */}
      <div className="mb-5">
        <span className="clay-exp-pill">Стаж {experience}</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button className="btn-clay-secondary-sm flex-1">Подробнее</button>
        <button className="btn-clay-primary-sm flex-1">Записаться</button>
      </div>
    </div>
  )
}

export default DoctorCard
