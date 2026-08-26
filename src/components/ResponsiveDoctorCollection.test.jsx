import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResponsiveDoctorCollection } from './ResponsiveDoctorCollection.jsx'

const DOCTORS = Object.freeze([
  {
    slug: 'nabiullina-elmira',
    name: 'Набиуллина Эльмира Равильевна',
    specialization: 'Гинеколог, врач УЗД',
    photo: '/images/doctors/nabiullina.webp',
    photoFull: '/images/doctors/nabiullina.png',
    photoMobile: '/images/doctors/nabiullina-mobile.webp',
    experienceYears: 12,
    dativeShortName: 'Эльмире Равильевне',
    proDoctorovUrl: 'https://prodoctorov.ru/spb/vrach/nabiullina-elmira/',
    proDoctorovRating: { score: 4.8, reviewCount: 64 },
  },
  {
    slug: 'shah-lev',
    name: 'Шах Лев Давидович',
    specialization: 'Хирург, онколог',
    photo: '/images/doctors/shah.webp',
    photoFull: '/images/doctors/shah.png',
    photoMobile: '/images/doctors/shah-mobile.webp',
    experienceYears: 19,
    dativeShortName: 'Льву Давидовичу',
    proDoctorovUrl: 'https://prodoctorov.ru/spb/vrach/shah-lev/',
    proDoctorovRating: { score: 5, reviewCount: 91 },
  },
])

describe('ResponsiveDoctorCollection', () => {
  it('presents two doctors in the labelled mobile carousel', () => {
    const label = 'Карусель врачей гинекологии'
    render(<ResponsiveDoctorCollection doctors={DOCTORS} label={label} mobileClassName="md:hidden" desktopClassName="hidden md:grid" />)
    expect(screen.getByRole('region', { name: label })).toHaveAttribute('aria-roledescription', 'carousel')
  })

  it('preserves doctor order in the supplied desktop grid', () => {
    const { container } = render(<ResponsiveDoctorCollection doctors={DOCTORS} label="Карусель хирургов" mobileClassName="md:hidden" desktopClassName="hidden md:grid desktop-doctor-grid" />)
    expect(Array.from(container.querySelectorAll('.desktop-doctor-grid .doctor-card h3'), (heading) => heading.textContent)).toEqual(DOCTORS.map((doctor) => doctor.name))
  })

  it('preserves custom mobile and desktop wrapper classes', () => {
    const { container } = render(<ResponsiveDoctorCollection doctors={DOCTORS} label="Карусель врачей" mobileClassName="md:hidden mobile-doctor-contract" desktopClassName="hidden md:grid desktop-doctor-contract" />)
    expect({ mobile: Boolean(container.querySelector('.mobile-doctor-contract')), desktop: Boolean(container.querySelector('.desktop-doctor-contract')) }).toEqual({ mobile: true, desktop: true })
  })

  it('uses one mobile DoctorCard without carousel controls for a single doctor', () => {
    const { container } = render(<ResponsiveDoctorCollection doctors={DOCTORS.slice(0, 1)} label="Карусель врачей" mobileClassName="md:hidden mobile-single-doctor" desktopClassName="hidden md:grid" />)
    expect({ carousel: screen.queryByRole('region'), card: Boolean(container.querySelector('.mobile-single-doctor .doctor-card')), previous: screen.queryByRole('button', { name: 'Предыдущий врач' }), next: screen.queryByRole('button', { name: 'Следующий врач' }) }).toEqual({ carousel: null, card: true, previous: null, next: null })
  })

  it('renders no doctor presentation for an empty collection', () => {
    const { container } = render(<ResponsiveDoctorCollection doctors={[]} label="Пустая карусель" mobileClassName="md:hidden" desktopClassName="hidden md:grid" />)
    expect(container.firstChild).toBeNull()
  })
})
