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
    expect(screen.getByRole('img', { name: /клиника.*одинцова/i })).toBeInTheDocument()
  })

  it('renders mobile menu toggle button', () => {
    render(<Header />)
    const menuBtn = screen.getByRole('button', { name: /открыть меню/i })
    expect(menuBtn).toBeInTheDocument()
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens mobile menu on burger click', () => {
    render(<Header />)
    const menuBtn = screen.getByRole('button', { name: /открыть меню/i })
    fireEvent.click(menuBtn)
    expect(menuBtn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('button', { name: /записаться на приём/i }).length).toBeGreaterThan(0)
  })

  it('closes mobile menu on second burger click', () => {
    render(<Header />)
    const menuBtn = screen.getByRole('button', { name: /открыть меню/i })
    fireEvent.click(menuBtn)
    fireEvent.click(menuBtn)
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes mobile menu on Escape', () => {
    render(<Header />)
    const menuBtn = screen.getByRole('button', { name: /открыть меню/i })
    fireEvent.click(menuBtn)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders banner role', () => {
    render(<Header />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('renders phone link in mobile menu', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /открыть меню/i }))
    const phoneLinks = screen.getAllByRole('link').filter(
      (l) => l.getAttribute('href')?.startsWith('tel:')
    )
    expect(phoneLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('opens mega-menu on keyboard focus for Направления', () => {
    render(<Header />)
    const dropdownButton = screen.getByRole('button', { name: /направления/i })
    fireEvent.focus(dropdownButton)
    expect(screen.getByRole('menuitem', { name: /маммология/i })).toBeInTheDocument()
  })

  it('closes mega-menu on Escape', () => {
    render(<Header />)
    const dropdownButton = screen.getByRole('button', { name: /направления/i })
    fireEvent.focus(dropdownButton)
    fireEvent.keyDown(dropdownButton, { key: 'Escape' })
    expect(screen.queryByRole('menuitem', { name: /маммология/i })).toBeNull()
  })

  it('renders ВАБ link inside mega-menu when Направления is open', () => {
    render(<Header />)
    const dropdownButton = screen.getByRole('button', { name: /направления/i })
    fireEvent.focus(dropdownButton)
    expect(screen.getByRole('menuitem', { name: /ВАБ/ })).toBeInTheDocument()
  })

  it('renders condition links inside mega-menu for mammology', () => {
    render(<Header />)
    const dropdownButton = screen.getByRole('button', { name: /направления/i })
    fireEvent.focus(dropdownButton)
    expect(screen.getByRole('menuitem', { name: /фиброаденома/i })).toBeInTheDocument()
  })

  it('opens О клинике dropdown showing about link', () => {
    render(<Header />)
    const aboutButton = screen.getByRole('button', { name: /о клинике/i })
    fireEvent.focus(aboutButton)
    expect(screen.getByRole('menuitem', { name: /^о клинике$/i })).toBeInTheDocument()
  })

  it('opens Пациентам dropdown showing second-opinion link', () => {
    render(<Header />)
    const patientsButton = screen.getByRole('button', { name: /пациентам/i })
    fireEvent.focus(patientsButton)
    expect(screen.getByRole('menuitem', { name: /бесплатное второе мнение/i })).toBeInTheDocument()
  })

  it('renders accordion groups in mobile menu', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /открыть меню/i }))
    const accordionButtons = screen.getAllByRole('button', { name: /направления|о клинике|пациентам/i })
    expect(accordionButtons.length).toBeGreaterThanOrEqual(3)
  })

  it('expands mobile accordion to show direction links', () => {
    render(<Header />)
    const menuBtn = screen.getByRole('button', { name: /открыть меню/i })
    fireEvent.click(menuBtn)
    const allDirectionsBtns = screen.getAllByRole('button').filter((btn) => btn.textContent.includes('Направления'))
    const mobileAccordionBtn = allDirectionsBtns.find((btn) => btn.closest('#mobile-menu'))
    fireEvent.click(mobileAccordionBtn)
    expect(screen.getAllByText(/маммология/i).length).toBeGreaterThanOrEqual(1)
  })
})
