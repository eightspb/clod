import { useMemo, useState } from 'react'
import { DoctorsClayTitle } from '../doctors-demo/DoctorsClayTitle'
import { DoctorDirectionFilters } from '../doctors-demo/DoctorDirectionFilters'
import { DoctorClayCard } from '../doctors-demo/DoctorClayCard'

const DIRECTION_FILTERS = [
  { slug: 'all', label: 'Все' },
  { slug: 'mammology', label: 'Маммологи' },
  { slug: 'gynecology', label: 'Гинекологи' },
  { slug: 'ultrasound', label: 'УЗИ' },
  { slug: 'oncology', label: 'Онкологи' },
]

const DOCTORS = [
  {
    id: 'doc-1',
    name: 'Каший Врипли',
    direction: 'mammology',
    experience: '7 лет',
    status: 'Сейчас онлайн',
    image: '/images/doctors-demo/female-ring-1.png',
    showActions: false,
    showOrb: true,
  },
  {
    id: 'doc-2',
    name: 'Каший Брарли',
    direction: 'oncology',
    experience: '9 лет',
    status: 'Сейчас онлайн',
    image: '/images/doctors-demo/male-ring-1.png',
    showActions: false,
    showOrb: true,
  },
  {
    id: 'doc-3',
    name: 'Каший Бради',
    direction: 'gynecology',
    experience: '11 лет',
    status: 'Сейчас онлайн',
    image: '/images/doctors-demo/female-ring-2.png',
    showActions: true,
    showOrb: false,
  },
  {
    id: 'doc-4',
    name: 'Каший Вралии',
    direction: 'ultrasound',
    experience: '10 лет',
    status: 'Сейчас онлайн',
    image: '/images/doctors-demo/male-ring-2.png',
    showActions: true,
    showOrb: false,
  },
]

export function DoctorsDemo() {
  const [activeDirection, setActiveDirection] = useState('all')

  const visibleDoctors = useMemo(() => {
    if (activeDirection === 'all') return DOCTORS
    return DOCTORS.filter((doctor) => doctor.direction === activeDirection)
  }, [activeDirection])

  return (
    <section className="doctors-demo-section">
      <div className="doctors-demo-corner doctors-demo-corner-top-left" aria-hidden="true" />
      <div className="doctors-demo-corner doctors-demo-corner-top-right" aria-hidden="true" />
      <div className="doctors-demo-corner doctors-demo-corner-bottom-left" aria-hidden="true" />
      <div className="doctors-demo-corner doctors-demo-corner-bottom-right" aria-hidden="true" />
      <div className="doctors-demo-capsule" aria-hidden="true" />

      <div className="container-clay doctors-demo-container">
        <DoctorsClayTitle />
        <DoctorDirectionFilters
          categories={DIRECTION_FILTERS}
          activeSlug={activeDirection}
          onChange={setActiveDirection}
        />

        <div className="doctors-demo-grid">
          {visibleDoctors.map((doctor) => (
            <DoctorClayCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      </div>
    </section>
  )
}
