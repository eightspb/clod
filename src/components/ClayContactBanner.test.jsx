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

  it('renders Telegram link', () => {
    render(<ClayContactBanner />)
    const telegramLink = screen.getByRole('link', { name: /telegram/i })
    expect(telegramLink.getAttribute('href')).toContain('t.me')
  })

  it('Telegram link opens in new tab', () => {
    render(<ClayContactBanner />)
    const telegramLink = screen.getByRole('link', { name: /telegram/i })
    expect(telegramLink).toHaveAttribute('target', '_blank')
    expect(telegramLink).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
