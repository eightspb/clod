import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from './Footer.jsx'

describe('Footer', () => {
  it('renders clinic name', () => {
    render(<Footer />)
    expect(screen.getByRole('img', { name: /клиника одинцова/i })).toBeInTheDocument()
  })

  it('renders phone links', () => {
    render(<Footer />)
    const phoneLinks = screen.getAllByRole('link').filter(
      (l) => l.getAttribute('href')?.startsWith('tel:')
    )
    expect(phoneLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('renders Telegram link', () => {
    render(<Footer />)
    const tg = screen.getByRole('link', { name: /telegram/i })
    expect(tg.getAttribute('href')).toContain('t.me')
  })

  it('renders privacy policy link', () => {
    render(<Footer />)
    const link = screen.getByRole('link', { name: /политика конфиденциальности/i })
    expect(link).toHaveAttribute('href', '/privacy-policy')
  })

  it('renders licenses link', () => {
    render(<Footer />)
    const link = screen.getByRole('link', { name: /лицензии/i })
    expect(link).toHaveAttribute('href', '/licenses')
  })

  it('renders appointment CTA button (opens booking modal)', () => {
    render(<Footer />)
    const cta = screen.getByRole('button', { name: /записаться на приём/i })
    expect(cta).toHaveAttribute('data-booking-btn', 'true')
  })

  it('renders address', () => {
    render(<Footer />)
    const addressElements = screen.getAllByText(/Богатырский/i)
    expect(addressElements.length).toBeGreaterThanOrEqual(1)
  })

  it('mentions the Primorsky district in the contact block', () => {
    render(<Footer />)
    expect(screen.getAllByText(/приморский район/i).length).toBeGreaterThan(0)
  })

  it('renders working hours', () => {
    render(<Footer />)
    expect(screen.getByText(/Пн–Пт/)).toBeInTheDocument()
    expect(screen.getByText(/Сб–Вс/)).toBeInTheDocument()
  })

  it('renders navigation section', () => {
    render(<Footer />)
    expect(screen.getByRole('navigation', { name: /навигация по сайту/i })).toBeInTheDocument()
  })
})
