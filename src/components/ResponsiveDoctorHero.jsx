import { HeroDoctorCard } from './HeroDoctorCard.jsx'
import { MobileDoctorCarousel } from './MobileDoctorCarousel.jsx'

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
      <MobileDoctorCarousel doctors={doctors} label={label} />
      <div className={desktopClassName}>
        <MobileDoctorCarousel doctors={doctors} label={label} variant="desktop" portraitMedia={desktopMedia} />
      </div>
    </>
  )
}
