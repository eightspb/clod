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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    return () => { if (dropdownTimer.current) clearTimeout(dropdownTimer.current) }
  }, [])

  function handleDropdownLeave() {
    dropdownTimer.current = setTimeout(() => setActiveDropdown(null), DROPDOWN_CLOSE_DELAY)
  }

  function handleDropdownEnter(label) {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current)
    setActiveDropdown(label)
  }

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
          <div className="clay clay-card flex items-center gap-2 px-5 py-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(145deg, #68D8B8, #44C4A0)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="font-bold text-clay-dark text-sm sm:text-base leading-tight">
              Клиника{' '}
              <span className="text-clay-mint">Одинцова</span>
            </span>
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
            Записаться
          </button>
        </div>

        {/* Mobile burger */}
        <button
          className="clay clay-card lg:hidden p-2.5 rounded-2xl"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Меню"
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
                >
                  <button
                    className="flex items-center gap-1 px-3 py-2 rounded-full text-base font-medium text-clay-text hover:text-clay-mint transition-colors duration-200"
                    onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                    onBlur={handleDropdownLeave}
                    onFocus={() => handleDropdownEnter(item.label)}
                    aria-expanded={activeDropdown === item.label}
                    aria-haspopup="true"
                  >
                    {item.label}
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${activeDropdown === item.label ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {activeDropdown === item.label && (
                    <div role="menu" className="absolute top-full left-0 pt-2 min-w-52 z-50">
                      <div className="clay clay-card p-2 w-full">
                        {item.children.map((child) => (
                          <a
                            key={child.to}
                            href={child.to}
                            role="menuitem"
                            className={`block px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors duration-200 ${
                              currentPath === child.to
                                ? 'text-clay-mint bg-clay-mint-pale'
                                : 'text-clay-text hover:text-clay-mint hover:bg-clay-mint-pale'
                            }`}
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
            role="button"
            tabIndex={-1}
            className="lg:hidden fixed inset-0 bg-black/20 z-[60] cursor-default"
            aria-label="Закрыть меню"
            onClick={() => setMobileOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setMobileOpen(false)}
          />
          <div
            id="mobile-menu"
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
                        onClick={() => setMobileOpen(false)}
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
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </a>
                )
              )}
              <div className="pt-3 flex flex-col gap-2">
                <a
                  href={`tel:${PHONE_NUMBER}`}
                  className="clay btn-clay-secondary flex items-center justify-center gap-2 py-3 text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  <Phone size={15} />
                  {PHONE_DISPLAY}
                </a>
                <button
                  type="button"
                  data-booking-btn="true"
                  className="clay btn-clay-primary text-sm py-3 text-center flex justify-center w-full"
                  onClick={() => setMobileOpen(false)}
                >
                  Записаться онлайн
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
