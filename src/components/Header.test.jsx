import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { Header } from './Header.jsx'
import { BookingFlow } from './booking/BookingFlow.jsx'

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

  it('links the desktop Доктора label to the doctors index', () => {
    render(<Header />)
    const doctorsLink = screen.getByRole('link', { name: /^доктора$/i })
    expect(doctorsLink).toHaveAttribute('href', '/doctors')
  })

  it('opens the desktop doctors menu with a separate accessible control', () => {
    render(<Header />)
    const doctorsMenuButton = screen.getByRole('button', { name: /показать подразделы: доктора/i })
    fireEvent.focus(doctorsMenuButton)
    fireEvent.click(doctorsMenuButton)
    expect(screen.getByRole('menu', { name: /^доктора$/i })).toBeInTheDocument()
  })

  it('renders desktop doctors menu portraits at 45 pixels', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /показать подразделы: доктора/i }))
    const portrait = within(screen.getByRole('menu', { name: /^доктора$/i })).getAllByRole('img')[0]
    expect({ width: portrait.getAttribute('width'), height: portrait.getAttribute('height'), sized: portrait.classList.contains('h-[45px]') && portrait.classList.contains('w-[45px]') }).toEqual({ width: '45', height: '45', sized: true })
  })

  it('moves focus into the doctors menu when its separate control receives ArrowDown', async () => {
    render(<Header />)
    const doctorsMenuButton = screen.getByRole('button', { name: /показать подразделы: доктора/i })
    fireEvent.keyDown(doctorsMenuButton, { key: 'ArrowDown' })
    const doctorsMenu = screen.getByRole('menu', { name: /^доктора$/i })
    const firstMenuLink = within(doctorsMenu).getAllByRole('menuitem')[0]
    await waitFor(() => expect(firstMenuLink).toHaveFocus())
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

  it('links the mobile Доктора label to the doctors index', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /открыть меню/i }))
    const mobileMenu = document.getElementById('mobile-menu')
    const doctorsLink = within(mobileMenu).getByRole('link', { name: /^доктора$/i })
    expect(doctorsLink).toHaveAttribute('href', '/doctors')
  })

  it('expands mobile doctors with a separate accessible control', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /открыть меню/i }))
    const mobileMenu = document.getElementById('mobile-menu')
    const doctorsMenuButton = within(mobileMenu).getByRole('button', { name: /показать подразделы: доктора/i })
    fireEvent.click(doctorsMenuButton)
    expect(doctorsMenuButton).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('Header with BookingFlow', () => {
  it.each(['close', 'backdrop', 'escape'])('keeps the mobile booking trigger connected and restores its focus after %s dismissal', async (dismissal) => {
    render(<><Header /><BookingFlow doctors={[]} pageDoctorSlug="" fetcher={() => Promise.reject(new Error('Unexpected booking request'))} uuid={() => '3335ac38-8090-42f1-8e05-f6c29bc73a9c'} clock={() => new Date('2026-08-25T08:00:00.000Z')} /></>)
    fireEvent.click(screen.getByRole('button', { name: 'Открыть меню' }))
    const trigger = within(document.getElementById('mobile-menu')).getByRole('button', { name: 'Записаться на приём' })
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Онлайн-запись' })
    await waitFor(() => expect(dialog).toHaveFocus())
    const connectedWhileOpen = trigger.isConnected
    if (dismissal === 'close') fireEvent.click(screen.getByRole('button', { name: 'Закрыть запись' }))
    if (dismissal === 'backdrop') fireEvent.click(document.querySelector('.booking-overlay'))
    if (dismissal === 'escape') fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(trigger).toHaveFocus())
    expect({ connectedWhileOpen, menuOpen: screen.getByRole('button', { name: 'Закрыть меню' }).getAttribute('aria-expanded') }).toEqual({ connectedWhileOpen: true, menuOpen: 'true' })
  })
})
