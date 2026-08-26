import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ResponsiveDoctorCollection } from './ResponsiveDoctorCollection.jsx'

function createDoctors() {
  return [
    { slug: 'nabiullina-elmira', name: 'Набиуллина Эльмира Равильевна', specialization: 'Гинеколог, врач УЗД', photo: '/images/doctors/nabiullina.webp', photoFull: '/images/doctors/nabiullina.png', photoMobile: '/images/doctors/nabiullina-mobile.webp', experienceYears: 12, dativeShortName: 'Эльмире Равильевне', proDoctorovUrl: 'https://prodoctorov.ru/spb/vrach/nabiullina-elmira/', proDoctorovRating: { score: 4.8, reviewCount: 64 } },
    { slug: 'shah-lev', name: 'Шах Лев Давидович', specialization: 'Хирург, онколог', photo: '/images/doctors/shah.webp', photoFull: '/images/doctors/shah.png', photoMobile: '/images/doctors/shah-mobile.webp', experienceYears: 19, dativeShortName: 'Льву Давидовичу', proDoctorovUrl: 'https://prodoctorov.ru/spb/vrach/shah-lev/', proDoctorovRating: { score: 5, reviewCount: 91 } },
  ]
}

describe('ResponsiveDoctorCollection', () => {
  it('presents two doctors in the labelled mobile carousel', () => {
    const doctors = createDoctors()
    const label = 'Карусель врачей гинекологии'
    render(<ResponsiveDoctorCollection doctors={doctors} label={label} mobileClassName="md:hidden" desktopClassName="hidden md:grid" />)
    expect(screen.getByRole('region', { name: label })).toHaveAttribute('aria-roledescription', 'carousel')
  })

  it('keeps custom wrappers around the mobile carousel and ordered desktop doctor cards', () => {
    const doctors = createDoctors()
    const label = 'Карусель врачей'
    const { container } = render(<ResponsiveDoctorCollection doctors={doctors} label={label} mobileClassName="md:hidden mobile-doctor-contract" desktopClassName="hidden md:grid desktop-doctor-contract" />)
    const mobileWrapper = container.querySelector('.mobile-doctor-contract')
    const desktopWrapper = container.querySelector('.desktop-doctor-contract')
    expect({ carousel: within(mobileWrapper).getByRole('region', { name: label }).getAttribute('aria-roledescription'), cards: within(desktopWrapper).getAllByRole('article').map((card) => within(card).getByRole('heading', { level: 3 }).textContent) }).toEqual({ carousel: 'carousel', cards: doctors.map((doctor) => doctor.name) })
  })

  it('keeps one doctor in both responsive fallbacks without carousel controls', () => {
    const doctor = createDoctors()[0]
    const { container } = render(<ResponsiveDoctorCollection doctors={[doctor]} label="Карусель врачей" mobileClassName="md:hidden mobile-single-doctor" desktopClassName="hidden md:grid desktop-single-doctor" />)
    const mobileWrapper = container.querySelector('.mobile-single-doctor')
    const desktopWrapper = container.querySelector('.desktop-single-doctor')
    expect({ carousel: screen.queryByRole('region'), mobile: within(mobileWrapper).getByRole('heading', { level: 3, name: doctor.name }).textContent, desktop: within(desktopWrapper).getAllByRole('article').map((card) => within(card).getByRole('heading', { level: 3 }).textContent), previous: screen.queryByRole('button', { name: 'Предыдущий врач' }), next: screen.queryByRole('button', { name: 'Следующий врач' }) }).toEqual({ carousel: null, mobile: doctor.name, desktop: [doctor.name], previous: null, next: null })
  })

  it('renders no doctor presentation for an empty collection', () => {
    const { container } = render(<ResponsiveDoctorCollection doctors={[]} label="Пустая карусель" mobileClassName="md:hidden" desktopClassName="hidden md:grid" />)
    expect(container.firstChild).toBeNull()
  })
})
