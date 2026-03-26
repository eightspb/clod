import { useState, useEffect, useRef } from 'react'
import { Menu, X, Phone, ChevronDown } from 'lucide-react'
import { NAV_ITEMS } from '../lib/nav.js'
import { PHONE_NUMBER, PHONE_DISPLAY } from '../lib/contacts.js'

const SCROLL_THRESHOLD = 10
const DROPDOWN_CLOSE_DELAY = 150

export function Header({ currentPath = '/' }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const dropdownTimer = useRef(null)
  const mobileMenuButtonRef = useRef(null)
  const mobileMenuRef = useRef(null)

  function clearDropdownTimer() {
    if (dropdownTimer.current) {
      clearTimeout(dropdownTimer.current)
      dropdownTimer.current = null
    }
  }

  function closeDropdown() {
    clearDropdownTimer()
    setActiveDropdown(null)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    return () => clearDropdownTimer()
  }, [])

  function handleDropdownLeave() {
    clearDropdownTimer()
    dropdownTimer.current = setTimeout(() => setActiveDropdown(null), DROPDOWN_CLOSE_DELAY)
  }

  function handleDropdownEnter(label) {
    clearDropdownTimer()
    setActiveDropdown(label)
  }

  function handleDropdownBlur(event) {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return
    }

    handleDropdownLeave()
  }

  function handleDropdownKeyDown(event, label) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeDropdown()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      handleDropdownEnter(label)
      window.setTimeout(() => {
        const firstLink = event.currentTarget.parentElement?.querySelector('[data-dropdown-panel] a')
        firstLink?.focus()
      }, 0)
    }
  }

  function openMobileMenu() {
    setActiveDropdown(null)
    setMobileOpen(true)
    window.setTimeout(() => {
      const firstInteractive = mobileMenuRef.current?.querySelector('a, button')
      firstInteractive?.focus()
    }, 0)
  }

  function closeMobileMenu() {
    setMobileOpen(false)
    window.setTimeout(() => {
      mobileMenuButtonRef.current?.focus()
    }, 0)
  }

  useEffect(() => {
    if (!mobileOpen) {
      return undefined
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMobileMenu()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'py-1' : 'py-2'}`}
      style={{
        background: scrolled ? 'rgba(247,243,239,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.12)' : 'none',
      }}
      role="banner"
    >
      {/* Top row: Logo + Phone + CTA */}
      <div className="container-clay flex items-center justify-between gap-4 pb-1 relative z-[80]">
        {/* Logo */}
        <a href="/" className="flex-shrink-0">
          <div
            className="flex items-center justify-center px-5 py-3"
            style={{
              borderRadius: '34px',
              background: '#FFFCF8',
              boxShadow: '0px 8px 20px hsl(140,10%,70%), inset -3px -3px 7px hsla(140,20%,55%,0.2), inset 0px 3px 8px hsl(140,20%,97%)',
            }}
          >
            <img
              src="/images/logo.png"
              alt="Клиника Одинцова"
              width="180"
              height="44"
              className="h-10 w-auto"
            />
          </div>
        </a>

        {/* Phone + CTA (desktop) */}
        <div className="hidden lg:flex items-center gap-3">
          <a
            href={`tel:${PHONE_NUMBER}`}
            className="flex items-center gap-2 text-sm font-medium text-clay-text hover:text-clay-mint transition-colors"
          >
            <Phone size={15} />
            {PHONE_DISPLAY}
          </a>
          <button type="button" data-booking-btn="true" className="clay btn-clay-primary text-sm py-2.5 px-5 flex items-center justify-center">
            Записаться на приём
          </button>
        </div>

        {/* Mobile burger */}
        <button
          ref={mobileMenuButtonRef}
          className="clay clay-card lg:hidden p-2.5 rounded-2xl"
          onClick={() => (mobileOpen ? closeMobileMenu() : openMobileMenu())}
          aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          {mobileOpen ? (
            <X size={20} className="text-clay-dark" />
          ) : (
            <Menu size={20} className="text-clay-dark" />
          )}
        </button>
      </div>

      {/* Bottom row: Desktop Nav */}
      <div className="hidden lg:block">
        <div className="container-clay">
          <nav className="flex items-center justify-between gap-0.5 py-1">
            {NAV_ITEMS.map((item) =>
              item.children ? (
                <div 
                  key={item.label} 
                  className="relative"
                  onMouseEnter={() => handleDropdownEnter(item.label)}
                  onMouseLeave={handleDropdownLeave}
                  onBlur={handleDropdownBlur}
                >
                  <button
                    className="flex items-center gap-1 px-3 py-2 rounded-full text-base font-medium text-clay-text hover:text-clay-mint transition-colors duration-200"
                    onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                    onFocus={() => handleDropdownEnter(item.label)}
                    onKeyDown={(event) => handleDropdownKeyDown(event, item.label)}
                    aria-expanded={activeDropdown === item.label}
                    aria-haspopup="true"
                    aria-controls={`nav-dropdown-${item.label}`}
                  >
                    {item.label}
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${activeDropdown === item.label ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {activeDropdown === item.label && (
                    <div id={`nav-dropdown-${item.label}`} data-dropdown-panel className="absolute top-full left-0 pt-2 min-w-52 z-50">
                      <div className="clay clay-card p-2 w-full">
                        {item.children.map((child) => (
                          <a
                            key={child.to}
                            href={child.to}
                            className={`block px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors duration-200 ${
                              currentPath === child.to
                                ? 'text-clay-mint bg-clay-mint-pale'
                                : 'text-clay-text hover:text-clay-mint hover:bg-clay-mint-pale'
                            }`}
                            aria-current={currentPath === child.to ? 'page' : undefined}
                          >
                            {child.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <a
                  key={item.to}
                  href={item.to}
                  className={`px-3 py-2 rounded-full text-base font-medium transition-colors duration-200 ${
                    currentPath === item.to
                      ? 'text-clay-mint'
                      : 'text-clay-text hover:text-clay-mint'
                  }`}
                  aria-current={currentPath === item.to ? 'page' : undefined}
                >
                  {item.label}
                </a>
              )
            )}
          </nav>
        </div>
      </div>

      {/* Mobile Menu: overlay (tap outside to close) + panel */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/20 z-[60] cursor-default"
            onClick={closeMobileMenu}
          />
          <div
            id="mobile-menu"
            ref={mobileMenuRef}
            className="lg:hidden mx-4 mt-3 clay clay-card p-4 relative z-[70]"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) =>
                item.children ? (
                  <div key={item.label}>
                    <p className="text-xs font-semibold text-clay-muted uppercase tracking-wider px-3 py-1.5">
                      {item.label}
                    </p>
                    {item.children.map((child) => (
                      <a
                        key={child.to}
                        href={child.to}
                        className="block px-4 py-2 rounded-2xl text-sm font-medium text-clay-text hover:text-clay-mint hover:bg-clay-mint-pale transition-colors duration-200"
                        onClick={closeMobileMenu}
                        aria-current={currentPath === child.to ? 'page' : undefined}
                      >
                        {child.label}
                      </a>
                    ))}
                    <div className="my-0.5 border-t border-clay-mint-pale" />
                  </div>
                ) : (
                  <a
                    key={item.to}
                    href={item.to}
                    className="px-4 py-2 rounded-2xl text-sm font-medium text-clay-text hover:text-clay-mint hover:bg-clay-mint-pale transition-colors duration-200"
                    onClick={closeMobileMenu}
                    aria-current={currentPath === item.to ? 'page' : undefined}
                  >
                    {item.label}
                  </a>
                )
              )}
              <div className="pt-3 flex flex-col gap-2">
                <a
                  href={`tel:${PHONE_NUMBER}`}
                  className="clay btn-clay-secondary flex items-center justify-center gap-2 py-3 text-sm"
                  onClick={closeMobileMenu}
                >
                  <Phone size={15} />
                  {PHONE_DISPLAY}
                </a>
                <button
                  type="button"
                  data-booking-btn="true"
                  className="clay btn-clay-primary text-sm py-3 text-center flex justify-center w-full"
                  onClick={closeMobileMenu}
                >
                  Записаться на приём
                </button>
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  )
}

export default Header
