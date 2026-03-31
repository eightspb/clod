import { useState, useEffect, useRef } from 'react'
import { Menu, X, Phone, ChevronDown, ArrowRight, Search } from 'lucide-react'
import { NAV_ITEMS } from '../lib/nav.js'
import { PHONE_NUMBER, PHONE_DISPLAY } from '../lib/contacts.js'
import { SearchModal } from './SearchModal.jsx'

const SCROLL_THRESHOLD = 10
const DROPDOWN_CLOSE_DELAY = 150

function DesktopDropdown({ item, currentPath, activeDropdown, onEnter, onLeave, onBlur, onToggle, onKeyDown }) {
  return (
    <div
      className="relative"
      onMouseEnter={() => onEnter(item.label)}
      onMouseLeave={onLeave}
      onBlur={onBlur}
    >
      <button
        className="flex items-center gap-1 px-3 py-2 rounded-full text-base font-medium text-clay-text hover:text-clay-mint transition-colors duration-200"
        onClick={() => onToggle(item.label)}
        onFocus={() => onEnter(item.label)}
        onKeyDown={(event) => onKeyDown(event, item.label)}
        aria-expanded={activeDropdown === item.label}
        aria-haspopup="menu"
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
          <div className="clay clay-card p-2 w-full" role="menu" aria-label={item.label}>
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
                aria-current={currentPath === child.to ? 'page' : undefined}
              >
                {child.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MegaMenuPanel({ item, currentPath }) {
  const panelRef = useRef(null)
  const [leftOffset, setLeftOffset] = useState(0)
  useEffect(() => {
    if (panelRef.current) {
      const rect = panelRef.current.offsetParent?.getBoundingClientRect()
      if (rect) setLeftOffset(-rect.left)
    }
  }, [])
  return (
    <div ref={panelRef} data-dropdown-panel className="absolute top-full z-50 pt-2" style={{ left: `${leftOffset}px`, width: '100vw' }}>
      <div className="container-clay">
        <div className="clay clay-card p-6 rounded-3xl" role="menu" aria-label={item.label}>
          <div className="grid grid-cols-4 gap-6">
            {item.children.map((direction) => (
              <div key={direction.to} role="group" aria-label={direction.label}>
                <a
                  href={direction.to}
                  role="menuitem"
                  className={`block text-base font-bold mb-3 transition-colors duration-200 ${
                    currentPath === direction.to ? 'text-clay-mint' : 'text-clay-dark hover:text-clay-mint'
                  }`}
                  aria-current={currentPath === direction.to ? 'page' : undefined}
                >
                  {direction.label}
                </a>
                {direction.conditions.length > 0 && (
                  <ul className="flex flex-col gap-1" role="group" aria-label={`Заболевания: ${direction.label}`}>
                    {direction.conditions.map((condition) => (
                      <li key={condition.to} role="none">
                        <a
                          href={condition.to}
                          role="menuitem"
                          className={`block px-3 py-1.5 rounded-xl text-sm transition-colors duration-200 ${
                            currentPath === condition.to
                              ? 'text-clay-mint bg-clay-mint-pale font-medium'
                              : 'text-clay-text hover:text-clay-mint hover:bg-clay-mint-pale'
                          }`}
                          aria-current={currentPath === condition.to ? 'page' : undefined}
                        >
                          {condition.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          {item.vab && (
            <div className="mt-5 pt-5 border-t border-clay-bg">
              <a
                href={item.vab.to}
                role="menuitem"
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-colors duration-200 ${
                  currentPath === item.vab.to
                    ? 'text-white bg-clay-mint'
                    : 'text-clay-mint bg-clay-mint/10 hover:bg-clay-mint hover:text-white'
                }`}
                aria-current={currentPath === item.vab.to ? 'page' : undefined}
              >
                <ArrowRight size={16} />
                {item.vab.label}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MobileAccordion({ item, currentPath, expandedGroup, onToggleGroup, onCloseMenu }) {
  const isExpanded = expandedGroup === item.label
  const isMega = item.mega
  return (
    <div>
      <button
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-clay-muted uppercase tracking-wider"
        onClick={() => onToggleGroup(item.label)}
        aria-expanded={isExpanded}
      >
        {item.label}
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
      {isExpanded && (
        <div className="pb-1">
          {isMega ? (
            <>
              {item.children.map((direction) => (
                <MobileDirectionGroup
                  key={direction.to}
                  direction={direction}
                  currentPath={currentPath}
                  onCloseMenu={onCloseMenu}
                />
              ))}
              {item.vab && (
                <a
                  href={item.vab.to}
                  className="flex items-center gap-2 mx-3 mt-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-clay-mint bg-clay-mint/10 transition-colors duration-200 hover:bg-clay-mint hover:text-white"
                  onClick={onCloseMenu}
                  aria-current={currentPath === item.vab.to ? 'page' : undefined}
                >
                  <ArrowRight size={14} />
                  {item.vab.label}
                </a>
              )}
            </>
          ) : (
            item.children.map((child) => (
              <a
                key={child.to}
                href={child.to}
                className="block px-4 py-2 rounded-2xl text-sm font-medium text-clay-text hover:text-clay-mint hover:bg-clay-mint-pale transition-colors duration-200"
                onClick={onCloseMenu}
                aria-current={currentPath === child.to ? 'page' : undefined}
              >
                {child.label}
              </a>
            ))
          )}
        </div>
      )}
      <div className="my-0.5 border-t border-clay-mint-pale" />
    </div>
  )
}

function MobileDirectionGroup({ direction, currentPath, onCloseMenu }) {
  const [expanded, setExpanded] = useState(false)
  const hasConditions = direction.conditions.length > 0
  return (
    <div className="ml-2">
      <div className="flex items-center">
        <a
          href={direction.to}
          className={`flex-1 block px-4 py-2 rounded-2xl text-sm font-medium transition-colors duration-200 ${
            currentPath === direction.to
              ? 'text-clay-mint bg-clay-mint-pale'
              : 'text-clay-text hover:text-clay-mint hover:bg-clay-mint-pale'
          }`}
          onClick={onCloseMenu}
          aria-current={currentPath === direction.to ? 'page' : undefined}
        >
          {direction.label}
        </a>
        {hasConditions && (
          <button
            className="p-2 text-clay-muted"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Скрыть' : 'Показать'} заболевания: ${direction.label}`}
          >
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
      {expanded && hasConditions && (
        <div className="ml-4 pb-1">
          {direction.conditions.map((condition) => (
            <a
              key={condition.to}
              href={condition.to}
              className={`block px-3 py-1.5 rounded-xl text-xs transition-colors duration-200 ${
                currentPath === condition.to
                  ? 'text-clay-mint font-medium'
                  : 'text-clay-muted hover:text-clay-mint'
              }`}
              onClick={onCloseMenu}
              aria-current={currentPath === condition.to ? 'page' : undefined}
            >
              {condition.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export function Header({ currentPath = '/' }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [expandedMobileGroup, setExpandedMobileGroup] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
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
    setExpandedMobileGroup(null)
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

  function toggleMobileGroup(label) {
    setExpandedMobileGroup(expandedMobileGroup === label ? null : label)
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
      <div className="container-clay flex items-center justify-between gap-4 pb-1 relative z-[80]">
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
        <div className="hidden lg:flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-full hover:bg-clay-bg transition-colors"
            aria-label="Поиск по сайту"
          >
            <Search size={20} className="text-clay-muted" />
          </button>
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

      <div className="hidden lg:block">
        <div className="container-clay">
          <nav className="flex items-center justify-between gap-0.5 py-1">
            {NAV_ITEMS.map((item) =>
              item.children ? (
                item.mega ? (
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
                      aria-haspopup="menu"
                      aria-controls={`nav-dropdown-${item.label}`}
                    >
                      {item.label}
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${activeDropdown === item.label ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {activeDropdown === item.label && (
                      <MegaMenuPanel item={item} currentPath={currentPath} />
                    )}
                  </div>
                ) : (
                  <DesktopDropdown
                    key={item.label}
                    item={item}
                    currentPath={currentPath}
                    activeDropdown={activeDropdown}
                    onEnter={handleDropdownEnter}
                    onLeave={handleDropdownLeave}
                    onBlur={handleDropdownBlur}
                    onToggle={(label) => setActiveDropdown(activeDropdown === label ? null : label)}
                    onKeyDown={handleDropdownKeyDown}
                  />
                )
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

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/20 z-[60] cursor-default"
            onClick={closeMobileMenu}
          />
          <div
            id="mobile-menu"
            ref={mobileMenuRef}
            className="lg:hidden mx-4 mt-3 clay clay-card p-4 relative z-[70] max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => { setSearchOpen(true); closeMobileMenu() }}
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-2xl text-sm font-medium text-clay-muted hover:text-clay-mint hover:bg-clay-mint-pale transition-colors duration-200 mb-1"
                aria-label="Поиск по сайту"
              >
                <Search size={16} />
                Поиск по сайту
              </button>
              {NAV_ITEMS.map((item) =>
                item.children ? (
                  <MobileAccordion
                    key={item.label}
                    item={item}
                    currentPath={currentPath}
                    expandedGroup={expandedMobileGroup}
                    onToggleGroup={toggleMobileGroup}
                    onCloseMenu={closeMobileMenu}
                  />
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
