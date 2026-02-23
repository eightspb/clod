import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DoctorCard } from './DoctorCard.jsx'

describe('DoctorCard', () => {
  const baseDoctor = {
    slug: 'test-doctor',
    name: 'Иванов Иван Иванович',
    specialization: 'Онколог-маммолог, врач УЗД',
    experienceYears: 15,
    ringColor: 'mint',
    tagline: 'Специалист по маммологии',
    photo: null,
  }

  it('renders doctor name', () => {
    render(<DoctorCard doctor={baseDoctor} />)
    expect(screen.getByText('Иванов Иван Иванович')).toBeInTheDocument()
  })

  it('renders specialization', () => {
    render(<DoctorCard doctor={baseDoctor} />)
    expect(screen.getByText('Онколог-маммолог')).toBeInTheDocument()
  })

  it('renders experience years', () => {
    render(<DoctorCard doctor={baseDoctor} />)
    expect(screen.getByText('15 лет')).toBeInTheDocument()
  })

  it('renders link to doctor page', () => {
    render(<DoctorCard doctor={baseDoctor} />)
    const link = screen.getByRole('link', { name: /подробнее/i })
    expect(link).toHaveAttribute('href', '/doctors/test-doctor')
  })

  it('returns null when doctor is missing', () => {
    const { container } = render(<DoctorCard doctor={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when doctor has no name', () => {
    const { container } = render(<DoctorCard doctor={{ ...baseDoctor, name: '' }} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders initials when no photo', () => {
    render(<DoctorCard doctor={baseDoctor} />)
    expect(screen.getByText('ИИ')).toBeInTheDocument()
  })

  it('renders photo when provided', () => {
    render(<DoctorCard doctor={{ ...baseDoctor, photo: '/images/doctor.webp' }} />)
    const img = screen.getByRole('img', { name: 'Иванов Иван Иванович' })
    expect(img).toHaveAttribute('src', '/images/doctor.webp')
  })
})
