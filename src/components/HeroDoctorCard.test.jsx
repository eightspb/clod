import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HeroDoctorCard } from './HeroDoctorCard.jsx'

const doctors = [
  {
    slug: 'first',
    name: 'Первый врач',
    specialization: 'Маммолог',
    photo: '/first.png',
    dativeShortName: 'первому врачу',
  },
  {
    slug: 'second',
    name: 'Второй врач',
    specialization: 'Гинеколог',
    photo: '/second.png',
    dativeShortName: 'второму врачу',
  },
]

describe('HeroDoctorCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('uses a stable first doctor for the initial render', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)

    render(<HeroDoctorCard doctors={doctors} />)

    expect(screen.getByRole('heading', { level: 3, name: 'Первый врач' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /записаться к первому врачу/i })).toHaveAttribute('href', '/second-opinion')
  })

  it('marks the booking action with the visible public doctor slug', () => {
    render(<HeroDoctorCard doctors={doctors} />)
    expect(screen.getByRole('link', { name: /записаться к первому врачу/i })).toHaveAttribute('data-booking-doctor', 'first')
  })
})
