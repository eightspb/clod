import { useState, useEffect, useCallback } from 'react'
import { ArrowRight, Award } from 'lucide-react'
import { StarRating } from './StarRating.jsx'

const ROTATE_INTERVAL = 5000
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='

function pickRandom(arr, exclude) {
  if (arr.length <= 1) return arr[0]
  const filtered = arr.filter(d => d.slug !== exclude?.slug)
  return filtered[Math.floor(Math.random() * filtered.length)]
}

export function HeroDoctorCard({ doctors, ctaHref = '/second-opinion', portraitMedia }) {
  const [doctor, setDoctor] = useState(() => doctors[0])
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
  const portraitSource = doctor.photoMobile || doctor.photoFull || doctor.photo
  return (
    <div className="hero-doctor-card">
      <div className={`clay clay-card hero-doctor-card-inner hero-doctor-fade ${fading ? 'hero-doctor-fade-out' : ''}`}>
        <a href={`/doctors/${doctor.slug}`} className="hero-doctor-photo-link group">
          {portraitMedia ? (
            <picture className="hero-doctor-picture flex h-full w-full items-end">
              <source media={portraitMedia} srcSet={portraitSource} />
              <img
                src={TRANSPARENT_PIXEL}
                alt={doctor.name}
                width={280}
                height={380}
                className="hero-doctor-photo"
              />
            </picture>
          ) : (
            <img
              src={portraitSource}
              alt={doctor.name}
              width={280}
              height={380}
              className="hero-doctor-photo"
            />
          )}
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
            data-booking-doctor={doctor.slug}
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
