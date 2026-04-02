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
  {
    id: 'indigo',
    label: 'Indigo',
    accent: '#4F46E5',
    accentHover: '#3730A3',
    accentLight: '#EEF2FF',
    surface: '#EEF2FF',
    surfaceStrong: '#E0E7FF',
    focusRing: 'rgba(79, 70, 229, 0.5)',
    focusGlow: 'rgba(79, 70, 229, 0.14)',
    shadow: '0 8px 20px rgba(79,70,229,0.18), 0 3px 8px rgba(79,70,229,0.10)',
    gradientBadge: 'linear-gradient(135deg, #818CF8 0%, #4F46E5 100%)',
    gradientCard: 'linear-gradient(135deg, #EEF2FF 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'teal',
    label: 'Teal',
    accent: '#0D9488',
    accentHover: '#0F766E',
    accentLight: '#F0FDFA',
    surface: '#F0FDFA',
    surfaceStrong: '#CCFBF1',
    focusRing: 'rgba(13, 148, 136, 0.5)',
    focusGlow: 'rgba(13, 148, 136, 0.14)',
    shadow: '0 8px 20px rgba(13,148,136,0.18), 0 3px 8px rgba(13,148,136,0.10)',
    gradientBadge: 'linear-gradient(135deg, #2DD4BF 0%, #0D9488 100%)',
    gradientCard: 'linear-gradient(135deg, #F0FDFA 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'amber',
    label: 'Amber',
    accent: '#B45309',
    accentHover: '#92400E',
    accentLight: '#FFFBEB',
    surface: '#FFFBEB',
    surfaceStrong: '#FDE68A',
    focusRing: 'rgba(180, 83, 9, 0.5)',
    focusGlow: 'rgba(180, 83, 9, 0.14)',
    shadow: '0 8px 20px rgba(180,83,9,0.18), 0 3px 8px rgba(180,83,9,0.10)',
    gradientBadge: 'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)',
    gradientCard: 'linear-gradient(135deg, #FFFBEB 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'plum',
    label: 'Plum',
    accent: '#7E22CE',
    accentHover: '#6B21A8',
    accentLight: '#FAF5FF',
    surface: '#FAF5FF',
    surfaceStrong: '#EDE9FE',
    focusRing: 'rgba(126, 34, 206, 0.5)',
    focusGlow: 'rgba(126, 34, 206, 0.14)',
    shadow: '0 8px 20px rgba(126,34,206,0.18), 0 3px 8px rgba(126,34,206,0.10)',
    gradientBadge: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)',
    gradientCard: 'linear-gradient(135deg, #FAF5FF 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'crimson',
    label: 'Crimson',
    accent: '#BE123C',
    accentHover: '#9F1239',
    accentLight: '#FFF1F2',
    surface: '#FFF1F2',
    surfaceStrong: '#FFE4E6',
    focusRing: 'rgba(190, 18, 60, 0.5)',
    focusGlow: 'rgba(190, 18, 60, 0.14)',
    shadow: '0 8px 20px rgba(190,18,60,0.18), 0 3px 8px rgba(190,18,60,0.10)',
    gradientBadge: 'linear-gradient(135deg, #FB7185 0%, #BE123C 100%)',
    gradientCard: 'linear-gradient(135deg, #FFF1F2 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    accent: '#0369A1',
    accentHover: '#075985',
    accentLight: '#F0F9FF',
    surface: '#F0F9FF',
    surfaceStrong: '#BAE6FD',
    focusRing: 'rgba(3, 105, 161, 0.5)',
    focusGlow: 'rgba(3, 105, 161, 0.14)',
    shadow: '0 8px 20px rgba(3,105,161,0.18), 0 3px 8px rgba(3,105,161,0.10)',
    gradientBadge: 'linear-gradient(135deg, #38BDF8 0%, #0369A1 100%)',
    gradientCard: 'linear-gradient(135deg, #F0F9FF 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'forest',
    label: 'Forest',
    accent: '#166534',
    accentHover: '#14532D',
    accentLight: '#F0FDF4',
    surface: '#F0FDF4',
    surfaceStrong: '#BBFBD8',
    focusRing: 'rgba(22, 101, 52, 0.5)',
    focusGlow: 'rgba(22, 101, 52, 0.14)',
    shadow: '0 8px 20px rgba(22,101,52,0.18), 0 3px 8px rgba(22,101,52,0.10)',
    gradientBadge: 'linear-gradient(135deg, #4ADE80 0%, #166534 100%)',
    gradientCard: 'linear-gradient(135deg, #F0FDF4 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'graphite',
    label: 'Graphite',
    accent: '#374151',
    accentHover: '#1F2937',
    accentLight: '#F9FAFB',
    surface: '#F9FAFB',
    surfaceStrong: '#E5E7EB',
    focusRing: 'rgba(55, 65, 81, 0.5)',
    focusGlow: 'rgba(55, 65, 81, 0.14)',
    shadow: '0 8px 20px rgba(55,65,81,0.18), 0 3px 8px rgba(55,65,81,0.10)',
    gradientBadge: 'linear-gradient(135deg, #6B7280 0%, #374151 100%)',
    gradientCard: 'linear-gradient(135deg, #F9FAFB 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'copper',
    label: 'Copper',
    accent: '#B87333',
    accentHover: '#9A5E28',
    accentLight: '#FDF8F0',
    surface: '#FDF8F0',
    surfaceStrong: '#F5E6CC',
    focusRing: 'rgba(184, 115, 51, 0.5)',
    focusGlow: 'rgba(184, 115, 51, 0.14)',
    shadow: '0 8px 20px rgba(184,115,51,0.18), 0 3px 8px rgba(184,115,51,0.10)',
    gradientBadge: 'linear-gradient(135deg, #E0A060 0%, #B87333 100%)',
    gradientCard: 'linear-gradient(135deg, #FDF8F0 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    accent: '#1E3A5F',
    accentHover: '#152A46',
    accentLight: '#EFF4FB',
    surface: '#EFF4FB',
    surfaceStrong: '#D6E4F5',
    focusRing: 'rgba(30, 58, 95, 0.5)',
    focusGlow: 'rgba(30, 58, 95, 0.14)',
    shadow: '0 8px 20px rgba(30,58,95,0.18), 0 3px 8px rgba(30,58,95,0.10)',
    gradientBadge: 'linear-gradient(135deg, #4A7DB5 0%, #1E3A5F 100%)',
    gradientCard: 'linear-gradient(135deg, #EFF4FB 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'mauve',
    label: 'Mauve',
    accent: '#8B5CF6',
    accentHover: '#7C3AED',
    accentLight: '#F5F3FF',
    surface: '#F5F3FF',
    surfaceStrong: '#EDE9FE',
    focusRing: 'rgba(139, 92, 246, 0.5)',
    focusGlow: 'rgba(139, 92, 246, 0.14)',
    shadow: '0 8px 20px rgba(139,92,246,0.18), 0 3px 8px rgba(139,92,246,0.10)',
    gradientBadge: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
    gradientCard: 'linear-gradient(135deg, #F5F3FF 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'moss',
    label: 'Moss',
    accent: '#5C7A3E',
    accentHover: '#4A6230',
    accentLight: '#F4F8F0',
    surface: '#F4F8F0',
    surfaceStrong: '#DDE8D0',
    focusRing: 'rgba(92, 122, 62, 0.5)',
    focusGlow: 'rgba(92, 122, 62, 0.14)',
    shadow: '0 8px 20px rgba(92,122,62,0.18), 0 3px 8px rgba(92,122,62,0.10)',
    gradientBadge: 'linear-gradient(135deg, #8AB06A 0%, #5C7A3E 100%)',
    gradientCard: 'linear-gradient(135deg, #F4F8F0 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'terracotta',
    label: 'Terracotta',
    accent: '#C1440E',
    accentHover: '#A33A0C',
    accentLight: '#FEF3EE',
    surface: '#FEF3EE',
    surfaceStrong: '#FDE0CF',
    focusRing: 'rgba(193, 68, 14, 0.5)',
    focusGlow: 'rgba(193, 68, 14, 0.14)',
    shadow: '0 8px 20px rgba(193,68,14,0.18), 0 3px 8px rgba(193,68,14,0.10)',
    gradientBadge: 'linear-gradient(135deg, #E8764A 0%, #C1440E 100%)',
    gradientCard: 'linear-gradient(135deg, #FEF3EE 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'steel',
    label: 'Steel',
    accent: '#2E6D9E',
    accentHover: '#255B87',
    accentLight: '#EFF6FF',
    surface: '#EFF6FF',
    surfaceStrong: '#DBEAFE',
    focusRing: 'rgba(46, 109, 158, 0.5)',
    focusGlow: 'rgba(46, 109, 158, 0.14)',
    shadow: '0 8px 20px rgba(46,109,158,0.18), 0 3px 8px rgba(46,109,158,0.10)',
    gradientBadge: 'linear-gradient(135deg, #60A5FA 0%, #2E6D9E 100%)',
    gradientCard: 'linear-gradient(135deg, #EFF6FF 0%, rgba(255,255,255,0) 60%)',
  },
  {
    id: 'burgundy',
    label: 'Burgundy',
    accent: '#722F37',
    accentHover: '#5C252C',
    accentLight: '#FDF0F1',
    surface: '#FDF0F1',
    surfaceStrong: '#F5D6D8',
    focusRing: 'rgba(114, 47, 55, 0.5)',
    focusGlow: 'rgba(114, 47, 55, 0.14)',
    shadow: '0 8px 20px rgba(114,47,55,0.18), 0 3px 8px rgba(114,47,55,0.10)',
    gradientBadge: 'linear-gradient(135deg, #C05070 0%, #722F37 100%)',
    gradientCard: 'linear-gradient(135deg, #FDF0F1 0%, rgba(255,255,255,0) 60%)',
  },
]

const HEADING_FONTS = [
  { id: 'cormorant', label: 'Cormorant Garamond', family: "'Cormorant Garamond', Georgia, 'Times New Roman', serif", google: null },
  { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', Georgia, serif", google: 'Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap' },
  { id: 'lora', label: 'Lora', family: "'Lora', Georgia, serif", google: 'Lora:ital,wght@0,400;0,700;1,400&display=swap' },
  { id: 'merriweather', label: 'Merriweather', family: "'Merriweather', Georgia, serif", google: 'Merriweather:ital,wght@0,300;0,400;0,700;1,400&display=swap' },
  { id: 'pt-serif', label: 'PT Serif', family: "'PT Serif', Georgia, serif", google: 'PT+Serif:ital,wght@0,400;0,700;1,400&display=swap' },
  { id: 'eb-garamond', label: 'EB Garamond', family: "'EB Garamond', Georgia, serif", google: 'EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap' },
  { id: 'libre-baskerville', label: 'Libre Baskerville', family: "'Libre Baskerville', Georgia, serif", google: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap' },
  { id: 'spectral', label: 'Spectral', family: "'Spectral', Georgia, serif", google: 'Spectral:ital,wght@0,300;0,400;0,700;1,400&display=swap' },
  { id: 'crimson-pro', label: 'Crimson Pro', family: "'Crimson Pro', Georgia, serif", google: 'Crimson+Pro:ital,wght@0,300;0,400;0,700;1,400&display=swap' },
  { id: 'dm-serif', label: 'DM Serif Display', family: "'DM Serif Display', Georgia, serif", google: 'DM+Serif+Display:ital@0;1&display=swap' },
]

const BODY_FONTS = [
  { id: 'golos', label: 'Golos Text', family: "'Golos Text', 'Segoe UI', system-ui, sans-serif", google: null },
  { id: 'commissioner', label: 'Commissioner', family: "'Commissioner', 'Segoe UI', system-ui, sans-serif", google: 'Commissioner:wght@300;400;500;600;700&display=swap' },
  { id: 'onest', label: 'Onest', family: "'Onest', 'Segoe UI', system-ui, sans-serif", google: 'Onest:wght@300;400;500;600;700&display=swap' },
  { id: 'manrope', label: 'Manrope', family: "'Manrope', 'Segoe UI', system-ui, sans-serif", google: 'Manrope:wght@300;400;500;600;700&display=swap' },
  { id: 'rubik', label: 'Rubik', family: "'Rubik', 'Segoe UI', system-ui, sans-serif", google: 'Rubik:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap' },
  { id: 'nunito', label: 'Nunito', family: "'Nunito', 'Segoe UI', system-ui, sans-serif", google: 'Nunito:wght@300;400;500;600;700&display=swap' },
  { id: 'inter', label: 'Inter', family: "'Inter', 'Segoe UI', system-ui, sans-serif", google: 'Inter:wght@300;400;500;600;700&display=swap' },
  { id: 'pt-sans', label: 'PT Sans', family: "'PT Sans', 'Segoe UI', system-ui, sans-serif", google: 'PT+Sans:ital,wght@0,400;0,700;1,400&display=swap' },
  { id: 'open-sans', label: 'Open Sans', family: "'Open Sans', 'Segoe UI', system-ui, sans-serif", google: 'Open+Sans:ital,wght@0,300;0,400;0,600;1,400&display=swap' },
  { id: 'raleway', label: 'Raleway', family: "'Raleway', 'Segoe UI', system-ui, sans-serif", google: 'Raleway:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap' },
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
}

function applyBodyFont(font) {
  loadGoogleFont(font.google)
  document.documentElement.style.setProperty('--font-body', font.family)
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
          <div className="theme-switcher-fonts-row">
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
            <div className="theme-switcher-fonts-divider" />
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
        </div>
      )}
    </div>
  )
}
