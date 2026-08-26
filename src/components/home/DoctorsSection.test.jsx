import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DoctorsSection } from './DoctorsSection.jsx'

const DOCTORS = Object.freeze([
  {
    slug: 'romanova',
    name: 'Романова Диана Альбертовна',
    specialization: 'Онколог-маммолог, врач УЗД',
    experienceYears: 12,
    ringColor: 'mint',
    photoFull: '/images/doctors/romanova.png',
    proDoctorovUrl: 'https://prodoctorov.ru/spb/vrach/711/',
    proDoctorovRating: { score: 5, reviewCount: 43 },
  },
  {
    slug: 'minasyan',
    name: 'Минасян Лилит Артуровна',
    specialization: 'Гинеколог, врач УЗД',
    experienceYears: 9,
    ringColor: 'peach',
    photoFull: '/images/doctors/minasyan.png',
    proDoctorovUrl: 'https://prodoctorov.ru/spb/vrach/822/',
    proDoctorovRating: { score: 4.9, reviewCount: 28 },
  },
])

describe('DoctorsSection doctor collections', () => {
  it('renders the immersive mobile doctor carousel', () => {
    render(<DoctorsSection doctorsData={DOCTORS} />)
    expect(screen.getByRole('region', { name: 'Карусель врачей клиники' })).toBeInTheDocument()
  })

  it('passes the filtered doctors to the mobile carousel', () => {
    const { container } = render(<DoctorsSection doctorsData={DOCTORS} />)
    const filter = screen.getByRole('button', { name: 'Гинекологи' })
    fireEvent.click(filter)
    expect(filter).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelectorAll('.mobile-doctor-slide')).toHaveLength(1)
  })
})
