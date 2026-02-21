export function DoctorClayCard({ doctor }) {
  if (!doctor) return null

  return (
    <article className="doctor-clay-card">
      <span className="doctor-clay-pin doctor-clay-pin-peach" aria-hidden="true" />
      <span className="doctor-clay-pin doctor-clay-pin-mint" aria-hidden="true" />
      <span className="doctor-clay-pin doctor-clay-pin-blue" aria-hidden="true" />
      <span className="doctor-clay-pin doctor-clay-pin-cream" aria-hidden="true" />
      {doctor.showOrb && <span className="doctor-clay-orb" aria-hidden="true" />}

      <div className="doctor-clay-top">
        <div className="doctor-avatar-ring">
          <img
            className="doctor-avatar-image"
            src={doctor.image}
            alt={doctor.name}
            loading="lazy"
            width="160"
            height="160"
          />
        </div>

        <div className="doctor-status-pill">
          <span className="doctor-status-toggle" aria-hidden="true" />
          <span>{doctor.status}</span>
        </div>
      </div>

      <div className="doctor-clay-content">
        <h3 className="doctor-clay-name">{doctor.name}</h3>
        <div className="doctor-clay-lines" aria-hidden="true">
          <span className="doctor-line doctor-line-long" />
          <span className="doctor-line doctor-line-short" />
        </div>
      </div>

      <div className="doctor-card-footer">
        <div className="doctor-exp-pill">Стаж {doctor.experience}</div>

        {doctor.showActions && (
          <div className="doctor-card-actions">
            <button type="button" className="doctor-action-btn doctor-action-btn-secondary">
              Подробнее
            </button>
            <button type="button" className="doctor-action-btn doctor-action-btn-primary">
              Записаться
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
