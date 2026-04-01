import { useState, useEffect, useRef, useCallback } from 'react'
import { Palette, X, Check } from 'lucide-react'

const COLOR_THEMES = [
  {
    id: 'emerald',
    label: 'Emerald',
    accent: '#1B6B5A',
    accentHover: '#155A4B',
    accentLight: '#E8F5F0',
    surface: '#EDF5F2',
    surfaceStrong: '#D6EDE5',
    focusRing: 'rgba(27, 107, 90, 0.5)',
    focusGlow: 'rgba(27, 107, 90, 0.14)',
    shadow: '0 8px 20px rgba(27,107,90,0.18), 0 3px 8px rgba(27,107,90,0.10)',
    gradientBadge: 'linear-gradient(135deg, #3D9E88 0%, #1B6B5A 100%)',
    gradientCard: 'linear-gradient(135deg, #EDF5F2 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'slate-blue',
    label: 'Slate Blue',
    accent: '#64748B',
    accentHover: '#475569',
    accentLight: '#F1F5F9',
    surface: '#F1F5F9',
    surfaceStrong: '#E2E8F0',
    focusRing: 'rgba(100, 116, 139, 0.5)',
    focusGlow: 'rgba(100, 116, 139, 0.14)',
    shadow: '0 8px 20px rgba(100,116,139,0.18), 0 3px 8px rgba(100,116,139,0.10)',
    gradientBadge: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)',
    gradientCard: 'linear-gradient(135deg, #F1F5F9 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'dusty-rose',
    label: 'Dusty Rose',
    accent: '#9D6B7B',
    accentHover: '#7D5363',
    accentLight: '#FDF2F5',
    surface: '#FBF0F3',
    surfaceStrong: '#F5E1E7',
    focusRing: 'rgba(157, 107, 123, 0.5)',
    focusGlow: 'rgba(157, 107, 123, 0.14)',
    shadow: '0 8px 20px rgba(157,107,123,0.18), 0 3px 8px rgba(157,107,123,0.10)',
    gradientBadge: 'linear-gradient(135deg, #C49AAB 0%, #9D6B7B 100%)',
    gradientCard: 'linear-gradient(135deg, #FBF0F3 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'warm-clay',
    label: 'Warm Clay',
    accent: '#8B6F52',
    accentHover: '#6E5740',
    accentLight: '#FAF5EF',
    surface: '#F8F2EB',
    surfaceStrong: '#EDE3D6',
    focusRing: 'rgba(139, 111, 82, 0.5)',
    focusGlow: 'rgba(139, 111, 82, 0.14)',
    shadow: '0 8px 20px rgba(139,111,82,0.18), 0 3px 8px rgba(139,111,82,0.10)',
    gradientBadge: 'linear-gradient(135deg, #B89A7D 0%, #8B6F52 100%)',
    gradientCard: 'linear-gradient(135deg, #F8F2EB 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'sage',
    label: 'Sage',
    accent: '#6B8F71',
    accentHover: '#567459',
    accentLight: '#F0F5F1',
    surface: '#EFF5F0',
    surfaceStrong: '#DCE8DE',
    focusRing: 'rgba(107, 143, 113, 0.5)',
    focusGlow: 'rgba(107, 143, 113, 0.14)',
    shadow: '0 8px 20px rgba(107,143,113,0.18), 0 3px 8px rgba(107,143,113,0.10)',
    gradientBadge: 'linear-gradient(135deg, #97B89C 0%, #6B8F71 100%)',
    gradientCard: 'linear-gradient(135deg, #EFF5F0 0%, rgba(255,255,255,0) 60%)',
  },
]

const HEADING_FONTS = [
  { id: 'cormorant', label: 'Cormorant Garamond', family: "'Cormorant Garamond', Georgia, 'Times New Roman', serif", google: null },
  { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', Georgia, serif", google: 'Playfair+Display:wght@400;700&display=swap' },
  { id: 'lora', label: 'Lora', family: "'Lora', Georgia, serif", google: 'Lora:ital,wght@0,400;0,700;1,400&display=swap' },
  { id: 'merriweather', label: 'Merriweather', family: "'Merriweather', Georgia, serif", google: 'Merriweather:ital,wght@0,300;0,400;0,700;1,400&display=swap' },
  { id: 'pt-serif', label: 'PT Serif', family: "'PT Serif', Georgia, serif", google: 'PT+Serif:ital,wght@0,400;0,700;1,400&display=swap' },
]

const BODY_FONTS = [
  { id: 'golos', label: 'Golos Text', family: "'Golos Text', 'Segoe UI', system-ui, sans-serif", google: null },
  { id: 'commissioner', label: 'Commissioner', family: "'Commissioner', 'Segoe UI', system-ui, sans-serif", google: 'Commissioner:wght@400;500;600;700&display=swap' },
  { id: 'onest', label: 'Onest', family: "'Onest', 'Segoe UI', system-ui, sans-serif", google: 'Onest:wght@400;500;600;700&display=swap' },
  { id: 'manrope', label: 'Manrope', family: "'Manrope', 'Segoe UI', system-ui, sans-serif", google: 'Manrope:wght@400;500;600;700&display=swap' },
  { id: 'rubik', label: 'Rubik', family: "'Rubik', 'Segoe UI', system-ui, sans-serif", google: 'Rubik:wght@400;500;600;700&display=swap' },
]

const STORAGE_KEY = 'clod-theme-settings'

function loadGoogleFont(fontSpec) {
  if (!fontSpec) return
  const id = `gf-${fontSpec.replace(/[^a-z0-9]/gi, '-')}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${fontSpec}`
  document.head.appendChild(link)
}

function preloadAllFonts() {
  if (document.getElementById('gf-preconnect')) return
  const preconnect = document.createElement('link')
  preconnect.id = 'gf-preconnect'
  preconnect.rel = 'preconnect'
  preconnect.href = 'https://fonts.googleapis.com'
  document.head.appendChild(preconnect)
  const preconnectStatic = document.createElement('link')
  preconnectStatic.rel = 'preconnect'
  preconnectStatic.href = 'https://fonts.gstatic.com'
  preconnectStatic.crossOrigin = 'anonymous'
  document.head.appendChild(preconnectStatic)
  HEADING_FONTS.forEach(f => loadGoogleFont(f.google))
  BODY_FONTS.forEach(f => loadGoogleFont(f.google))
}

function applyColorTheme(theme) {
  const root = document.documentElement.style
  root.setProperty('--accent', theme.accent)
  root.setProperty('--accent-hover', theme.accentHover)
  root.setProperty('--accent-light', theme.accentLight)
  root.setProperty('--accent-text', '#FFFFFF')
  root.setProperty('--color-mint', theme.accent)
  root.setProperty('--surface-mint', theme.surface)
  root.setProperty('--surface-accent', theme.surface)
  root.setProperty('--surface-accent-strong', theme.surfaceStrong)
  root.setProperty('--focus-ring', theme.focusRing)
  root.setProperty('--focus-ring-glow', theme.focusGlow)
  root.setProperty('--shadow-mint', theme.shadow)
  root.setProperty('--gradient-badge-mint', theme.gradientBadge)
  root.setProperty('--gradient-card-mint', theme.gradientCard)
  root.setProperty('--gradient-cta', `linear-gradient(135deg, ${theme.surface} 0%, var(--surface-peach) 100%)`)
}

function applyHeadingFont(font) {
  loadGoogleFont(font.google)
  document.documentElement.style.setProperty('--font-serif', font.family)
  if (font.google) {
    document.fonts.ready.then(() => {
      document.documentElement.style.setProperty('--font-serif', font.family)
    })
  }
}

function applyBodyFont(font) {
  loadGoogleFont(font.google)
  document.documentElement.style.setProperty('--font-body', font.family)
  if (font.google) {
    document.fonts.ready.then(() => {
      document.documentElement.style.setProperty('--font-body', font.family)
    })
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const [colorId, setColorId] = useState('emerald')
  const [headingId, setHeadingId] = useState('cormorant')
  const [bodyId, setBodyId] = useState('golos')
  const panelRef = useRef(null)
  const buttonRef = useRef(null)
  const handleClickOutside = useCallback((e) => {
    if (
      panelRef.current && !panelRef.current.contains(e.target) &&
      buttonRef.current && !buttonRef.current.contains(e.target)
    ) {
      setIsOpen(false)
    }
  }, [])
  useEffect(() => {
    preloadAllFonts()
    const saved = loadSettings()
    if (!saved) return
    if (saved.colorId) {
      const theme = COLOR_THEMES.find(t => t.id === saved.colorId)
      if (theme) {
        setColorId(saved.colorId)
        applyColorTheme(theme)
      }
    }
    if (saved.headingId) {
      const font = HEADING_FONTS.find(f => f.id === saved.headingId)
      if (font) {
        setHeadingId(saved.headingId)
        applyHeadingFont(font)
      }
    }
    if (saved.bodyId) {
      const font = BODY_FONTS.find(f => f.id === saved.bodyId)
      if (font) {
        setBodyId(saved.bodyId)
        applyBodyFont(font)
      }
    }
  }, [])
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, handleClickOutside])
  function selectColor(id) {
    const theme = COLOR_THEMES.find(t => t.id === id)
    if (!theme) return
    setColorId(id)
    applyColorTheme(theme)
    saveSettings({ colorId: id, headingId, bodyId })
  }
  function selectHeading(id) {
    const font = HEADING_FONTS.find(f => f.id === id)
    if (!font) return
    setHeadingId(id)
    applyHeadingFont(font)
    saveSettings({ colorId, headingId: id, bodyId })
  }
  function selectBody(id) {
    const font = BODY_FONTS.find(f => f.id === id)
    if (!font) return
    setBodyId(id)
    applyBodyFont(font)
    saveSettings({ colorId, headingId, bodyId: id })
  }
  return (
    <div className="theme-switcher-root">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(prev => !prev)}
        className="theme-switcher-trigger"
        aria-label="Настройки темы"
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={22} /> : <Palette size={22} />}
      </button>
      {isOpen && (
        <div ref={panelRef} className="theme-switcher-panel">
          <div className="theme-switcher-section">
            <span className="theme-switcher-label">Акцент</span>
            <div className="theme-switcher-colors">
              {COLOR_THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => selectColor(t.id)}
                  className="theme-switcher-swatch"
                  style={{ background: t.accent }}
                  aria-label={t.label}
                  title={t.label}
                >
                  {colorId === t.id && <Check size={14} strokeWidth={3} color="#fff" />}
                </button>
              ))}
            </div>
          </div>
          <div className="theme-switcher-divider" />
          <div className="theme-switcher-section">
            <span className="theme-switcher-label">Заголовки</span>
            <div className="theme-switcher-font-list">
              {HEADING_FONTS.map(f => (
                <button
                  key={f.id}
                  onClick={() => selectHeading(f.id)}
                  onMouseEnter={() => loadGoogleFont(f.google)}
                  className={`theme-switcher-font-btn ${headingId === f.id ? 'active' : ''}`}
                  style={{ fontFamily: f.family }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="theme-switcher-divider" />
          <div className="theme-switcher-section">
            <span className="theme-switcher-label">Текст</span>
            <div className="theme-switcher-font-list">
              {BODY_FONTS.map(f => (
                <button
                  key={f.id}
                  onClick={() => selectBody(f.id)}
                  onMouseEnter={() => loadGoogleFont(f.google)}
                  className={`theme-switcher-font-btn ${bodyId === f.id ? 'active' : ''}`}
                  style={{ fontFamily: f.family }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
