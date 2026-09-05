import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StickyCTA } from './StickyCTA.jsx'

describe('StickyCTA', () => {
  it('renders phone call link', () => {
    render(<StickyCTA />)
    const phoneLink = screen.getByRole('link', { name: /позвонить/i })
    expect(phoneLink.getAttribute('href')).toMatch(/^tel:/)
  })

  it('renders appointment button (opens booking modal)', () => {
    render(<StickyCTA />)
    const appointBtn = screen.getByRole('button', { name: /записаться/i })
    expect(appointBtn).toHaveAttribute('data-booking-btn', 'true')
  })

  it('phone link has correct aria-label with display number', () => {
    render(<StickyCTA />)
    const phoneLink = screen.getByRole('link', { name: /позвонить/i })
    expect(phoneLink.getAttribute('aria-label')).toContain('Позвонить')
  })
  it('keeps the booking label to one word so the panel stays one line tall on narrow screens', () => {
    render(<StickyCTA />)
    expect(screen.getByRole('button', { name: 'Записаться на приём' }).textContent.trim()).toBe('Записаться')
  })
})
