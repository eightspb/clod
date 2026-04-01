import { useState, useEffect, useCallback } from 'react'
import { ArrowRight, Award } from 'lucide-react'
import { StarRating } from './StarRating.jsx'

const ROTATE_INTERVAL = 5000

function pickRandom(arr, exclude) {
  if (arr.length <= 1) return arr[0]
  const filtered = arr.filter(d => d.slug !== exclude?.slug)
  return filtered[Math.floor(Math.random() * filtered.length)]
}

export function HeroDoctorCard({ doctors, ctaHref = '/second-opinion' }) {
  const [doctor, setDoctor] = useState(() => doctors[Math.floor(Math.random() * doctors.length)])
  const [fading, setFading] = useState(false)
  const shouldRotate = doctors.length > 1
  const rotate = useCallback(() => {
    setFading(true)
    setTimeout(() => {
      setDoctor(prev => pickRandom(doctors, prev))
      setFading(false)
    }, 300)
  }, [doctors])
  useEffect(() => {
    if (!shouldRotate) return
    const id = setInterval(rotate, ROTATE_INTERVAL)
    return () => clearInterval(id)
  }, [shouldRotate, rotate])
  if (!doctor) return null
  return (
    <div className="hero-doctor-card">
      <div className={`clay clay-card hero-doctor-card-inner hero-doctor-fade ${fading ? 'hero-doctor-fade-out' : ''}`}>
        <a href={`/doctors/${doctor.slug}`} className="hero-doctor-photo-link group">
          <img
            src={doctor.photoFull || doctor.photo}
            alt={doctor.name}
            width={280}
            height={380}
            className="hero-doctor-photo"
            loading="lazy"
          />
        </a>
        <div className="hero-doctor-info">
          <a href={`/doctors/${doctor.slug}`} className="hero-doctor-name-link group">
            <h3 className="hero-doctor-name">{doctor.name}</h3>
          </a>
          <p className="hero-doctor-spec">{doctor.specialization}</p>
          <div className="hero-doctor-meta">
            {doctor.experienceYears && (
              <span className="hero-doctor-experience">
                <Award size={14} />
                Стаж {doctor.experienceYears} лет
              </span>
            )}
            {doctor.proDoctorovRating && (
              <StarRating
                score={doctor.proDoctorovRating.score}
                reviewCount={doctor.proDoctorovRating.reviewCount}
                url={doctor.proDoctorovUrl}
                size={14}
                variant="compact"
              />
            )}
          </div>
          <a
            href={ctaHref}
            data-booking-btn="true"
            className="btn-clay-primary hero-doctor-cta"
          >
            Записаться к {doctor.dativeShortName || 'врачу'}
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </div>
  )
}
