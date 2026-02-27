import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StickyCTA } from './StickyCTA.jsx'

describe('StickyCTA', () => {
  it('renders phone call link', () => {
    render(<StickyCTA />)
    const phoneLink = screen.getByRole('link', { name: /позвонить/i })
    expect(phoneLink.getAttribute('href')).toMatch(/^tel:/)
  })

  it('renders appointment link', () => {
    render(<StickyCTA />)
    const appointLink = screen.getByRole('link', { name: /записаться/i })
    expect(appointLink.getAttribute('href')).toBe('/second-opinion')
  })

  it('phone link has correct aria-label with display number', () => {
    render(<StickyCTA />)
    const phoneLink = screen.getByRole('link', { name: /позвонить/i })
    expect(phoneLink.getAttribute('aria-label')).toContain('Позвонить')
  })
})
