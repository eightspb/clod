import { useState, useEffect } from 'react'
import { Menu, X, Phone, ChevronDown } from 'lucide-react'

const navItems = [
  {
    label: 'Направления',
    children: [
      { label: 'Маммология и ВАБ', to: '/mammology' },
      { label: 'Гинекология', to: '/gynecology' },
      { label: 'Эндокринология', to: '/endocrinology' },
      { label: 'Неврология', to: '/neurology' },
    ],
  },
  { label: 'Доктора', to: '/doctors' },
  { label: 'Второе мнение', to: '/second-opinion' },
  { label: 'Цены', to: '/prices' },
]

export function Header({ currentPath = '/' }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-4'}`}
      style={{
        background: scrolled ? 'rgba(247,243,239,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
      }}
    >
      <div className="container-clay flex items-center justify-between gap-4">
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

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) =>
            item.children ? (
              <div key={item.label} className="relative">
                <button
                  className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium text-clay-text hover:text-clay-mint transition-colors duration-200"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                >
                  {item.label}
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {dropdownOpen && (
                  <div className="clay clay-card absolute top-full mt-2 left-0 p-2 min-w-52 z-50">
                    {item.children.map((child) => (
                      <a
                        key={child.to}
                        href={child.to}
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
                )}
              </div>
            ) : (
              <a
                key={item.to}
                href={item.to}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
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

        {/* CTA + phone */}
        <div className="hidden lg:flex items-center gap-3">
          <a
            href="tel:+78127482210"
            className="flex items-center gap-2 text-sm font-medium text-clay-text hover:text-clay-mint transition-colors"
          >
            <Phone size={15} />
            +7 (812) 748-22-10
          </a>
          <a href="/second-opinion" className="clay btn-clay-primary text-sm py-2.5 px-5">
            Записаться
          </a>
        </div>

        {/* Mobile burger */}
        <button
          className="clay clay-card lg:hidden p-2.5 rounded-2xl"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Меню"
        >
          {mobileOpen ? (
            <X size={20} className="text-clay-dark" />
          ) : (
            <Menu size={20} className="text-clay-dark" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden mx-4 mt-3 clay clay-card p-4">
          <nav className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-clay-muted uppercase tracking-wider px-3 py-2">
              Направления
            </p>
            {navItems[0].children.map((child) => (
              <a
                key={child.to}
                href={child.to}
                className="px-4 py-3 rounded-2xl text-sm font-medium text-clay-text hover:text-clay-mint hover:bg-clay-mint-pale transition-colors duration-200"
              >
                {child.label}
              </a>
            ))}
            <div className="my-1 border-t border-clay-mint-pale" />
            {navItems.slice(1).map((item) => (
              <a
                key={item.to}
                href={item.to}
                className="px-4 py-3 rounded-2xl text-sm font-medium text-clay-text hover:text-clay-mint hover:bg-clay-mint-pale transition-colors duration-200"
              >
                {item.label}
              </a>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              <a
                href="tel:+78127482210"
                className="clay btn-clay-secondary flex items-center justify-center gap-2 py-3 text-sm"
              >
                <Phone size={15} />
                +7 (812) 748-22-10
              </a>
              <a href="/second-opinion" className="clay btn-clay-primary text-sm py-3 text-center">
                Записаться онлайн
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

export default Header
