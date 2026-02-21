import { useState } from 'react'
import { DoctorCard } from '../DoctorCard'
import { SpecialtyFilter } from '../SpecialtyFilter'
import { ClayBlobTitle } from '../ClayBlobTitle'

const DOCTORS = [
  {
    name: 'Одинцова Елена Петровна',
    specialty: 'Маммолог',
    category: 'mammologist',
    experience: '18 лет',
    description: 'Специалист по диагностике и лечению заболеваний молочной железы. Эксперт по технологии вакуумной аспирационной биопсии.',
    ringColor: 'avatar-ring-peach',
    badgeColor: 'clay-spec-badge-peach',
    initials: 'ОЕ',
  },
  {
    name: 'Смирнова Ирина Вадимовна',
    specialty: 'Гинеколог',
    category: 'gynecologist',
    experience: '14 лет',
    description: 'Бережный подход к женскому здоровью. Ведение беременности, диагностика и лечение гинекологических заболеваний.',
    ringColor: 'avatar-ring-blue',
    badgeColor: 'clay-spec-badge-blue',
    initials: 'СИ',
  },
  {
    name: 'Козлов Андрей Михайлович',
    specialty: 'УЗИ-диагност',
    category: 'uzi',
    experience: '16 лет',
    description: 'Высокоточная ультразвуковая диагностика на оборудовании последнего поколения. Опыт свыше 50 000 исследований.',
    ringColor: 'avatar-ring-mint',
    badgeColor: 'clay-spec-badge-mint',
    initials: 'КА',
  },
  {
    name: 'Волкова Наталья Сергеевна',
    specialty: 'Онколог',
    category: 'oncologist',
    experience: '12 лет',
    description: 'Диагностика и лечение онкологических заболеваний. Доказательный подход к терапии и реабилитации.',
    ringColor: 'avatar-ring-lavender',
    badgeColor: 'clay-spec-badge-lavender',
    initials: 'ВН',
  },
]

export function DoctorsTest() {
  const [activeFilter, setActiveFilter] = useState('all')

  const filteredDoctors = activeFilter === 'all'
    ? DOCTORS
    : DOCTORS.filter(d => d.category === activeFilter)

  return (
    <section className="section relative overflow-hidden">
      {/* Background decorative blobs */}
      <div className="blob-peach absolute -top-20 -right-20 w-72 h-72 opacity-35 pointer-events-none" />
      <div className="blob-blue absolute -bottom-16 -left-16 w-56 h-56 opacity-25 pointer-events-none" />
      <div className="blob-mint absolute top-1/3 -right-28 w-52 h-52 opacity-20 pointer-events-none" />

      {/* Floating clay orbs */}
      <div
        className="orb w-10 h-5 top-16 left-[12%] opacity-50 -rotate-12"
        style={{ background: 'linear-gradient(90deg, #A8D8F4 50%, #FAC8B0 50%)', borderRadius: '999px' }}
      />
      <div
        className="orb w-4 h-4 top-44 right-[18%] opacity-40"
        style={{ background: 'linear-gradient(145deg, #FAC8B0, #F0A888)' }}
      />
      <div
        className="orb w-3 h-3 bottom-48 left-[22%] opacity-50"
        style={{ background: 'linear-gradient(145deg, #D0C4EC, #B8A8DC)' }}
      />
      <div
        className="orb w-5 h-5 top-[55%] right-[8%] opacity-30"
        style={{ background: 'linear-gradient(145deg, #A0E4D4, #70D0B8)' }}
      />
      <div
        className="orb w-2.5 h-2.5 top-[42%] left-[8%] opacity-40"
        style={{ background: 'linear-gradient(145deg, #FAE0A0, #F0C870)' }}
      />
      <div
        className="orb w-3.5 h-3.5 bottom-32 right-[25%] opacity-35"
        style={{ background: 'linear-gradient(145deg, #A8D8F4, #78BCE8)' }}
      />

      <div className="container-clay relative z-10">
        {/* Blob title */}
        <ClayBlobTitle>Наши врачи</ClayBlobTitle>

        {/* Filter pills */}
        <div className="mb-12">
          <SpecialtyFilter active={activeFilter} onChange={setActiveFilter} />
        </div>

        {/* Doctor cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
          {filteredDoctors.map(doc => (
            <DoctorCard key={doc.name} {...doc} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default DoctorsTest
