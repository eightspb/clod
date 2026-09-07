import { HeroDoctorCard } from './HeroDoctorCard.jsx'
import { DOCTOR_AUTOPLAY_INTERVAL, MobileDoctorCarousel } from './MobileDoctorCarousel.jsx'

export function ResponsiveDoctorHero({ doctors = [], label = 'Карусель врачей', ctaHref = '/second-opinion', desktopClassName = 'hidden md:block', desktopMedia = '(min-width: 768px)' }) {
  if (!doctors.length) return null
  if (doctors.length === 1) {
    return (
      <div className={desktopClassName}>
        <HeroDoctorCard doctors={doctors} ctaHref={ctaHref} />
      </div>
    )
  }
  return (
    <>
      <MobileDoctorCarousel doctors={doctors} label={label} autoplayMs={DOCTOR_AUTOPLAY_INTERVAL} />
      <div className={desktopClassName}>
        <MobileDoctorCarousel doctors={doctors} label={label} variant="desktop" portraitMedia={desktopMedia} autoplayMs={DOCTOR_AUTOPLAY_INTERVAL} />
      </div>
    </>
  )
}
