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

  it('keeps profile navigation and adds a doctor-specific booking action', () => {
    render(<DoctorCard doctor={baseDoctor} />)
    const profile = screen.getByRole('link', { name: /подробнее/i })
    const booking = screen.getByRole('button', { name: /записаться/i })
    expect({ profile: profile.getAttribute('href'), booking: booking.getAttribute('data-booking-btn'), doctor: booking.getAttribute('data-booking-doctor') }).toEqual({ profile: '/doctors/test-doctor', booking: 'true', doctor: 'test-doctor' })
  })

  it('gives each doctor booking action a doctor-specific accessible name', () => {
    const secondDoctor = { ...baseDoctor, slug: 'yolkina-anna', name: 'Ёлкина Анна О’Коннор' }
    render(<><DoctorCard doctor={baseDoctor} /><DoctorCard doctor={secondDoctor} /></>)
    const first = screen.getByRole('button', { name: 'Записаться на приём к врачу Иванов Иван Иванович' })
    const second = screen.getByRole('button', { name: 'Записаться на приём к врачу Ёлкина Анна О’Коннор' })
    expect([first.dataset.bookingDoctor, second.dataset.bookingDoctor]).toEqual(['test-doctor', 'yolkina-anna'])
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

  it('uses scalable avatar fallback classes when photo is missing', () => {
    const { container } = render(<DoctorCard doctor={baseDoctor} />)
    expect(container.querySelector('.doctor-card-photo-fallback')).toBeInTheDocument()
    expect(screen.getByText('ИИ')).toHaveClass('doctor-card-avatar-initials')
  })

  it('renders photo when provided', () => {
    render(<DoctorCard doctor={{ ...baseDoctor, photo: '/images/doctor.webp' }} />)
    const img = screen.getByRole('img', { name: 'онколог-маммолог Иванов Иван Иванович, клиника Одинцова, СПб' })
    expect(img).toHaveAttribute('src', '/images/doctor.webp')
  })

  it('prefers the compact transparent portrait when provided', () => {
    render(<DoctorCard doctor={{ ...baseDoctor, photo: '/images/doctor.webp', photoFull: '/images/doctor-full.webp', photoMobile: '/images/doctor-mobile.webp' }} />)
    const img = screen.getByRole('img', { name: 'онколог-маммолог Иванов Иван Иванович, клиника Одинцова, СПб' })
    expect(img).toHaveAttribute('src', '/images/doctor-mobile.webp')
  })

  it('falls back to the transparent full portrait without a compact one', () => {
    render(<DoctorCard doctor={{ ...baseDoctor, photo: '/images/doctor.webp', photoFull: '/images/doctor-full.webp' }} />)
    const img = screen.getByRole('img', { name: 'онколог-маммолог Иванов Иван Иванович, клиника Одинцова, СПб' })
    expect(img).toHaveAttribute('src', '/images/doctor-full.webp')
  })

  it('wraps photo in embedded media panel when photo is provided', () => {
    render(<DoctorCard doctor={{ ...baseDoctor, photo: '/images/doctor.webp' }} />)
    expect(screen.getByRole('img', { name: 'онколог-маммолог Иванов Иван Иванович, клиника Одинцова, СПб' }).parentElement).toHaveClass('doctor-card-media')
  })

  it('clips visual content inside the doctor card', () => {
    const { container } = render(<DoctorCard doctor={{ ...baseDoctor, photo: '/images/doctor.webp' }} />)
    expect(container.firstChild).toHaveClass('overflow-hidden')
  })

  it('uses embedded photo panel classes when photo is provided', () => {
    render(<DoctorCard doctor={{ ...baseDoctor, photo: '/images/doctor.webp' }} />)
    expect(screen.getByRole('img', { name: 'онколог-маммолог Иванов Иван Иванович, клиника Одинцова, СПб' })).toHaveClass('doctor-card-photo')
  })
})
