import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { StarRating } from './StarRating.jsx'
import { createSelectionFeedback } from '../lib/selection-feedback.js'
import { createSwipeGesture } from '../lib/swipe-gesture.js'

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
const MOBILE_PORTRAIT_MEDIA = '(max-width: 767px)'

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

function primarySpecialty(doctor) {
  return doctor.specialization.split(',')[0].trim()
}

function doctorNameLines(name) {
  const [surname = '', givenName = '', ...patronymic] = name.trim().split(/\s+/)
  return [`${surname} ${givenName}`.trim(), patronymic.join(' ') || ' ']
}

function touchPoint(event) {
  return { x: event.touches[0].clientX, y: event.touches[0].clientY }
}

/**
 * Binds native touch listeners because React registers touchmove passively;
 * a horizontal swipe must call preventDefault or iOS Safari cancels it as a scroll.
 */
function useFingerSwipe(trackRef, gesture, onStep) {
  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    const stop = () => gesture.end()
    const begin = (event) => (event.touches.length === 1 ? gesture.begin(touchPoint(event)) : gesture.end())
    const move = (event) => {
      if (event.touches.length !== 1) return
      const { horizontal, step } = gesture.track(touchPoint(event))
      if (!horizontal) return
      if (event.cancelable) event.preventDefault()
      if (step !== 0) onStep(step)
    }
    track.addEventListener('touchstart', begin, { passive: true })
    track.addEventListener('touchmove', move, { passive: false })
    track.addEventListener('touchend', stop)
    track.addEventListener('touchcancel', stop)
    return () => {
      track.removeEventListener('touchstart', begin)
      track.removeEventListener('touchmove', move)
      track.removeEventListener('touchend', stop)
      track.removeEventListener('touchcancel', stop)
    }
  })
}

function DoctorPortraitSlide({ doctor, index, count, position, portraitMedia }) {
  const isActive = position === 'current'
  const shouldLoadPortrait = position !== 'hidden'
  const specialty = primarySpecialty(doctor)
  return (
    <article
      className="mobile-doctor-slide"
      role="group"
      aria-roledescription="slide"
      aria-label={`${doctor.name}, ${index + 1} из ${count}`}
      aria-current={isActive ? 'true' : undefined}
      aria-hidden={!isActive}
      data-doctor-index={index}
      data-coverflow-position={position}
    >
      <div className="mobile-doctor-portrait-wrap">
        {shouldLoadPortrait ? (
          <picture className="mobile-doctor-picture">
            <source media={portraitMedia} srcSet={portraitSource(doctor)} />
            <img
              src={TRANSPARENT_PIXEL}
              alt={`${specialty.toLowerCase()} ${doctor.name}, клиника Одинцова, СПб`}
              className="mobile-doctor-portrait object-contain object-bottom"
              width="900"
              height="1200"
              loading={isActive ? 'eager' : 'lazy'}
              fetchpriority={isActive ? 'high' : undefined}
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
 * Presents doctors as an accessible circular coverflow above a flat information
 * card; the mobile variant is hidden on desktop, the desktop variant fits a hero column.
 */
export function MobileDoctorCarousel({ doctors, label, variant = 'mobile', portraitMedia = MOBILE_PORTRAIT_MEDIA }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const trackRef = useRef(null)
  const pointerIdRef = useRef(undefined)
  const gestureRef = useRef(undefined)
  const selectionFeedbackRef = useRef(null)
  const doctorKey = useMemo(() => doctors.map((doctor) => doctor.slug).join('|'), [doctors])
  gestureRef.current ||= createSwipeGesture()
  const gesture = gestureRef.current
  useEffect(() => {
    setActiveIndex(0)
    gesture.end()
  }, [doctorKey, gesture])
  useEffect(() => () => selectionFeedbackRef.current?.close(), [])
  const currentIndex = activeIndex < doctors.length ? activeIndex : 0
  function moveTo(index) {
    const nextIndex = (index + doctors.length) % doctors.length
    if (nextIndex === currentIndex) return
    selectionFeedbackRef.current ||= createSelectionFeedback()
    selectionFeedbackRef.current.play()
    setActiveIndex(nextIndex)
  }
  useFingerSwipe(trackRef, gesture, (step) => moveTo(currentIndex + step))
  if (!doctors.length) return null
  const activeDoctor = doctors[currentIndex]
  const activeNameLines = doctorNameLines(activeDoctor.name)
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
    if (event.isPrimary === false || event.pointerType === 'touch') return
    pointerIdRef.current = event.pointerId
    gesture.begin({ x: event.clientX, y: event.clientY })
    if (typeof event.currentTarget.setPointerCapture === 'function') event.currentTarget.setPointerCapture(event.pointerId)
  }
  function handlePointerUp(event) {
    if (pointerIdRef.current !== event.pointerId) return
    pointerIdRef.current = undefined
    const { step } = gesture.track({ x: event.clientX, y: event.clientY })
    gesture.end()
    if (step !== 0) moveTo(currentIndex + step)
  }
  function handlePointerCancel() {
    pointerIdRef.current = undefined
    gesture.end()
  }
  return (
    <section
      className={variant === 'mobile' ? 'mobile-doctor-carousel md:hidden' : 'mobile-doctor-carousel'}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      data-mobile-doctor-carousel
      data-variant={variant}
    >
      <div
        ref={trackRef}
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
              portraitMedia={portraitMedia}
            />
          )
        })}
      </div>
      <div className="mobile-doctor-plinth">
        <div className="mobile-doctor-info">
          <div className="mobile-doctor-heading">
            <h3 className="mobile-doctor-name" aria-label={activeDoctor.name}>
              {activeNameLines.map((line, index) => (
                <span key={index} className="mobile-doctor-name-line" aria-hidden="true">{line}</span>
              ))}
            </h3>
            <div className="mobile-doctor-carousel-controls">
              <button type="button" onClick={() => moveTo(currentIndex - 1)} aria-label="Предыдущий врач">
                <ChevronLeft size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
              <span className="mobile-doctor-carousel-count" aria-live="polite" aria-atomic="true">
                {currentIndex + 1} / {doctors.length}
              </span>
              <button type="button" onClick={() => moveTo(currentIndex + 1)} aria-label="Следующий врач">
                <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
          </div>
          <p className="mobile-doctor-specialty">{activeDoctor.specialization}</p>
          <div className="mobile-doctor-meta">
            {activeDoctor.experienceYears && <span>Стаж {activeDoctor.experienceYears} лет</span>}
            {activeDoctor.experienceYears && activeDoctor.proDoctorovRating && <span className="mobile-doctor-meta-dot" aria-hidden="true" />}
            {activeDoctor.proDoctorovRating && (
              <div className="mobile-doctor-rating">
                <StarRating
                  score={activeDoctor.proDoctorovRating.score}
                  reviewCount={activeDoctor.proDoctorovRating.reviewCount}
                  url={activeDoctor.proDoctorovUrl}
                  size={14}
                  variant="compact"
                />
              </div>
            )}
          </div>
        </div>
        <div className="mobile-doctor-info-actions">
          <button
            type="button"
            data-booking-btn="true"
            data-booking-doctor={activeDoctor.slug}
            className="mobile-doctor-booking clay btn-clay-primary"
            aria-label={`Записаться к ${activeDoctor.name}`}
          >
            Записаться
          </button>
          <a
            href={`/doctors/${activeDoctor.slug}`}
            className="mobile-doctor-profile clay btn-clay-secondary"
            aria-label={`Профиль врача ${activeDoctor.name}`}
          >
            Профиль
            <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}
