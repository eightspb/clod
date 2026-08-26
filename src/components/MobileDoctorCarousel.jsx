import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { StarRating } from './StarRating.jsx'
import { createSelectionFeedback } from '../lib/selection-feedback.js'

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='

function coverflowPosition(index, activeIndex, length) {
  if (index === activeIndex) return 'current'
  const forward = (index - activeIndex + length) % length
  const backward = (activeIndex - index + length) % length
  if (forward === 1) return 'next'
  if (backward === 1) return 'previous'
  if (forward === 2) return 'next-far'
  if (backward === 2) return 'previous-far'
  return 'hidden'
}

function portraitSource(doctor) {
  return doctor.photoMobile || doctor.photoFull || doctor.photo
}

function doctorNameLines(name) {
  const [surname = '', givenName = '', ...patronymic] = name.trim().split(/\s+/)
  return [`${surname} ${givenName}`.trim(), patronymic.join(' ') || '\u00a0']
}

function DoctorPortraitSlide({ doctor, index, count, position, visualClone = false }) {
  const isActive = position === 'current'
  const shouldLoadPortrait = position !== 'hidden'
  const specialty = doctor.specialization.split(',')[0].trim()
  return (
    <article
      className="mobile-doctor-slide"
      role={visualClone ? undefined : 'group'}
      aria-roledescription={visualClone ? undefined : 'slide'}
      aria-label={visualClone ? undefined : `${doctor.name}, ${index + 1} из ${count}`}
      aria-current={!visualClone && isActive ? 'true' : undefined}
      aria-hidden={visualClone || !isActive}
      data-doctor-index={index}
      data-coverflow-position={position}
      data-photo-fit={doctor.photoMobileFit}
      data-visual-clone={visualClone ? 'true' : undefined}
    >
      <div className="mobile-doctor-portrait-wrap">
        {shouldLoadPortrait ? (
          <picture className="mobile-doctor-picture">
            <source media="(max-width: 767px)" srcSet={portraitSource(doctor)} />
            <img
              src={TRANSPARENT_PIXEL}
              alt={`${specialty.toLowerCase()} ${doctor.name}, клиника Одинцова, СПб`}
              className="mobile-doctor-portrait object-contain object-bottom"
              width="900"
              height="1200"
              loading="lazy"
              decoding="async"
            />
          </picture>
        ) : (
          <div className="mobile-doctor-portrait-placeholder" aria-hidden="true" />
        )}
      </div>
    </article>
  )
}

/**
 * Presents doctors as an accessible circular coverflow on mobile viewports.
 */
export function MobileDoctorCarousel({ doctors, label }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const pointerStartRef = useRef(null)
  const selectionFeedbackRef = useRef(null)
  const doctorKey = useMemo(() => doctors.map((doctor) => doctor.slug).join('|'), [doctors])
  useEffect(() => {
    setActiveIndex(0)
    pointerStartRef.current = null
  }, [doctorKey])
  useEffect(() => () => selectionFeedbackRef.current?.close(), [])
  if (!doctors.length) return null
  const currentIndex = activeIndex < doctors.length ? activeIndex : 0
  const activeDoctor = doctors[currentIndex]
  const activeSpecialty = activeDoctor.specialization.split(',')[0].trim()
  const activeNameLines = doctorNameLines(activeDoctor.name)
  function moveTo(index) {
    const nextIndex = (index + doctors.length) % doctors.length
    if (nextIndex === currentIndex) return
    selectionFeedbackRef.current ||= createSelectionFeedback()
    selectionFeedbackRef.current.play()
    setActiveIndex(nextIndex)
  }
  function handleKeyDown(event) {
    const destinations = {
      ArrowLeft: currentIndex - 1,
      ArrowRight: currentIndex + 1,
      Home: 0,
      End: doctors.length - 1,
    }
    if (destinations[event.key] === undefined) return
    event.preventDefault()
    moveTo(destinations[event.key])
  }
  function handlePointerDown(event) {
    if (event.isPrimary === false) return
    pointerStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    if (typeof event.currentTarget.setPointerCapture === 'function') event.currentTarget.setPointerCapture(event.pointerId)
  }
  function handlePointerUp(event) {
    const start = pointerStartRef.current
    pointerStartRef.current = null
    if (!start || start.pointerId !== event.pointerId) return
    const horizontal = event.clientX - start.x
    const vertical = event.clientY - start.y
    if (Math.abs(horizontal) < 48 || Math.abs(horizontal) <= Math.abs(vertical)) return
    moveTo(currentIndex + (horizontal < 0 ? 1 : -1))
  }
  function handlePointerCancel() {
    pointerStartRef.current = null
  }
  return (
    <section
      className="mobile-doctor-carousel md:hidden"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      data-mobile-doctor-carousel
    >
      <div className="mobile-doctor-carousel-controls">
        <button type="button" onClick={() => moveTo(currentIndex - 1)} aria-label="Предыдущий врач">
          <ChevronLeft size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <span className="mobile-doctor-carousel-count" aria-live="polite" aria-atomic="true">
          {currentIndex + 1} из {doctors.length}
        </span>
        <button type="button" onClick={() => moveTo(currentIndex + 1)} aria-label="Следующий врач">
          <ChevronRight size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
      <div
        className="mobile-doctor-carousel-track"
        role="group"
        aria-label="Листать врачей"
        tabIndex="0"
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {doctors.map((doctor, index) => {
          const position = coverflowPosition(index, currentIndex, doctors.length)
          return (
            <DoctorPortraitSlide
              key={doctor.slug}
              doctor={doctor}
              index={index}
              count={doctors.length}
              position={position}
            />
          )
        })}
        {doctors.length === 2 && (
          <DoctorPortraitSlide
            key={`${doctors[(currentIndex + 1) % 2].slug}-previous-clone`}
            doctor={doctors[(currentIndex + 1) % 2]}
            index={(currentIndex + 1) % 2}
            count={doctors.length}
            position="previous"
            visualClone
          />
        )}
      </div>
      <div className="mobile-doctor-plinth">
        <div className="mobile-doctor-info">
          <h3 className="mobile-doctor-name" aria-label={activeDoctor.name}>
            {activeNameLines.map((line, index) => (
              <span key={index} className="mobile-doctor-name-line" aria-hidden="true">{line}</span>
            ))}
          </h3>
          <p className="mobile-doctor-specialty">{activeSpecialty}</p>
          <div className="mobile-doctor-info-actions">
            {activeDoctor.proDoctorovRating && (
              <div className="mobile-doctor-rating">
                <StarRating
                  score={activeDoctor.proDoctorovRating.score}
                  reviewCount={activeDoctor.proDoctorovRating.reviewCount}
                  url={activeDoctor.proDoctorovUrl}
                  size={16}
                  variant="compact"
                />
              </div>
            )}
            <button
              type="button"
              data-booking-btn="true"
              data-booking-doctor={activeDoctor.slug}
              className="mobile-doctor-booking clay btn-clay-primary min-h-11 px-3 py-2 text-sm"
              aria-label={`Записаться к ${activeDoctor.name}`}
            >
              Записаться
            </button>
            <a
              href={`/doctors/${activeDoctor.slug}`}
              className="mobile-doctor-profile"
              aria-label={`Профиль врача ${activeDoctor.name}`}
            >
              Профиль
              <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
