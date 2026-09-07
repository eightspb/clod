import { DoctorCard } from './DoctorCard.jsx'
import { DOCTOR_AUTOPLAY_INTERVAL, MobileDoctorCarousel } from './MobileDoctorCarousel.jsx'

export function ResponsiveDoctorCollection({ doctors = [], label = 'Карусель врачей', mobileClassName = 'md:hidden', desktopClassName = 'hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6' }) {
  if (!doctors.length) return null
  if (doctors.length === 1) {
    return (
      <>
        <div className={mobileClassName}>
          <DoctorCard doctor={doctors[0]} />
        </div>
        <div className={desktopClassName}>
          <DoctorCard doctor={doctors[0]} />
        </div>
      </>
    )
  }
  return (
    <>
      <div className={mobileClassName}>
        <MobileDoctorCarousel doctors={doctors} label={label} autoplayMs={DOCTOR_AUTOPLAY_INTERVAL} />
      </div>
      <div className={desktopClassName}>
        {doctors.map((doctor) => <DoctorCard key={doctor.slug} doctor={doctor} />)}
      </div>
    </>
  )
}
