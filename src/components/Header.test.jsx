import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from './Header.jsx'

describe('Header', () => {
  it('renders clinic logo link', () => {
    render(<Header />)
    const logoLink = screen.getAllByRole('link').find(
      (l) => l.getAttribute('href') === '/'
    )
    expect(logoLink).toBeDefined()
  })

  it('renders clinic name in logo', () => {
    render(<Header />)
    expect(screen.getByText('Клиника')).toBeInTheDocument()
    expect(screen.getByText('Одинцова')).toBeInTheDocument()
  })

  it('renders mobile menu toggle button', () => {
    render(<Header />)
    const menuBtn = screen.getByRole('button', { name: /меню/i })
    expect(menuBtn).toBeInTheDocument()
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens mobile menu on burger click', () => {
    render(<Header />)
    const menuBtn = screen.getByRole('button', { name: /меню/i })
    fireEvent.click(menuBtn)
    expect(menuBtn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: /записаться онлайн/i })).toBeInTheDocument()
  })

  it('closes mobile menu on second burger click', () => {
    render(<Header />)
    const menuBtn = screen.getByRole('button', { name: /меню/i })
    fireEvent.click(menuBtn)
    fireEvent.click(menuBtn)
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders banner role', () => {
    render(<Header />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('renders phone link in mobile menu', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /меню/i }))
    const phoneLinks = screen.getAllByRole('link').filter(
      (l) => l.getAttribute('href')?.startsWith('tel:')
    )
    expect(phoneLinks.length).toBeGreaterThanOrEqual(1)
  })
})
