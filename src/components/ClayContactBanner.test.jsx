import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClayContactBanner } from './ClayContactBanner.jsx'

describe('ClayContactBanner', () => {
  it('renders heading', () => {
    render(<ClayContactBanner />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Не знаете к кому обратиться?')
  })

  it('renders phone call link', () => {
    render(<ClayContactBanner />)
    const phoneLink = screen.getByRole('link', { name: /позвонить/i })
    expect(phoneLink.getAttribute('href')).toMatch(/^tel:/)
  })

  it('renders Max link', () => {
    render(<ClayContactBanner />)
    const maxLink = screen.getByRole('link', { name: /max/i })
    expect(maxLink.getAttribute('href')).toContain('max.ru')
  })

  it('Max link opens in new tab', () => {
    render(<ClayContactBanner />)
    const maxLink = screen.getByRole('link', { name: /max/i })
    expect(maxLink).toHaveAttribute('target', '_blank')
    expect(maxLink).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
