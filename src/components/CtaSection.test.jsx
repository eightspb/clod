import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CtaSection } from './CtaSection.jsx'

describe('CtaSection', () => {
  it('renders default title', () => {
    render(<CtaSection />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Записаться на приём')
  })

  it('renders custom title', () => {
    render(<CtaSection title="Оставить заявку" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Оставить заявку')
  })

  it('renders primary CTA button (opens booking modal)', () => {
    render(<CtaSection />)
    const btn = screen.getByRole('button', { name: /записаться онлайн/i })
    expect({ booking: btn.getAttribute('data-booking-btn'), doctor: btn.hasAttribute('data-booking-doctor') }).toEqual({ booking: 'true', doctor: false })
  })

  it('adds public doctor context to a doctor-specific booking button', () => {
    render(<CtaSection doctorSlug="egorova-unicode" />)
    expect(screen.getByRole('button', { name: /записаться онлайн/i })).toHaveAttribute('data-booking-doctor', 'egorova-unicode')
  })

  it('renders custom primary label', () => {
    render(<CtaSection primaryLabel="Бесплатное второе мнение" />)
    const btn = screen.getByRole('button', { name: /бесплатное второе мнение/i })
    expect(btn).toHaveAttribute('data-booking-btn', 'true')
  })

  it('renders primary as link when primaryHref is set', () => {
    render(<CtaSection primaryLabel="Бесплатное второе мнение" primaryHref="/second-opinion" />)
    const link = screen.getByRole('link', { name: /бесплатное второе мнение/i })
    expect(link).toHaveAttribute('href', '/second-opinion')
    expect(screen.queryByRole('button', { name: /бесплатное второе мнение/i })).toBeNull()
  })

  it('renders phone link with tel:', () => {
    render(<CtaSection />)
    const links = screen.getAllByRole('link')
    const phoneLink = links.find((l) => l.getAttribute('href')?.startsWith('tel:'))
    expect(phoneLink).toBeDefined()
  })
})
