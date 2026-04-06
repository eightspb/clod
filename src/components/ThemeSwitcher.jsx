import { useState, useEffect, useRef, useCallback } from 'react'
import { Palette, X, Check } from 'lucide-react'
import {
  COLOR_THEMES, HEADING_FONTS, BODY_FONTS, NAV_FONTS, STORAGE_KEY,
} from '../lib/theme-config.js'

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: h * 360, s, l }
}

function hslToHex(h, s, l) {
  const hue2rgb = (p, q, t) => {
    const tt = t < 0 ? t + 1 : t > 1 ? t - 1 : t
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const hN = h / 360
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = Math.round(hue2rgb(p, q, hN + 1 / 3) * 255)
  const g = Math.round(hue2rgb(p, q, hN) * 255)
  const b = Math.round(hue2rgb(p, q, hN - 1 / 3) * 255)
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

function deriveColor(baseH, baseS, baseL, hueShift, sFactor, lTarget) {
  return hslToHex((baseH + hueShift) % 360, Math.min(1, baseS * sFactor), lTarget)
}

function rgbStr(hex) {
  return `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`
}

function rgbaStr(hex, a) {
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`
}

function buildFullPalette(hex) {
  const { h, s, l } = hexToHsl(hex)
  const accent = hex
  const accentHover = hslToHex(h, s, Math.max(0, l - 0.08))
  const accentLight = hslToHex(h, s * 0.4, 0.96)
  const surfaceMint = hslToHex(h, s * 0.35, 0.95)
  const surfaceStrong = hslToHex(h, s * 0.4, 0.88)
  const peach = deriveColor(h, s, l, 30, 0.85, Math.min(0.55, l + 0.12))
  const blue = deriveColor(h, s, l, 210, 0.8, Math.min(0.55, l + 0.08))
  const lavender = deriveColor(h, s, l, 270, 0.6, Math.min(0.55, l + 0.10))
  const yellow = deriveColor(h, s, l, 60, 0.7, Math.min(0.50, l + 0.10))
  const surfacePeach = hslToHex((h + 30) % 360, s * 0.3, 0.96)
  const surfaceBlue = hslToHex((h + 210) % 360, s * 0.3, 0.96)
  const surfaceLavender = hslToHex((h + 270) % 360, s * 0.25, 0.96)
  const surfaceYellow = hslToHex((h + 60) % 360, s * 0.25, 0.96)
  const peachHover = hslToHex((h + 30) % 360, s * 0.85, Math.max(0, Math.min(0.55, l + 0.12) - 0.08))
  const blueHover = hslToHex((h + 210) % 360, s * 0.8, Math.max(0, Math.min(0.55, l + 0.08) - 0.08))
  const mintLight = hslToHex(h, s * 0.5, 0.72)
  const peachLight = hslToHex((h + 30) % 360, s * 0.45, 0.75)
  const blueLight = hslToHex((h + 210) % 360, s * 0.4, 0.75)
  return {
    accent, accentHover, accentLight, surfaceMint, surfaceStrong,
    peach, blue, lavender, yellow,
    surfacePeach, surfaceBlue, surfaceLavender, surfaceYellow,
    peachHover, blueHover, mintLight, peachLight, blueLight,
    gradientBadgeMint: `linear-gradient(135deg, ${mintLight} 0%, ${accent} 100%)`,
    gradientBadgePeach: `linear-gradient(135deg, ${peachLight} 0%, ${peach} 100%)`,
    gradientBadgeBlue: `linear-gradient(135deg, ${blueLight} 0%, ${blue} 100%)`,
    gradientCardMint: `linear-gradient(135deg, ${surfaceMint} 0%, rgba(255,255,255,0) 60%)`,
    gradientCardPeach: `linear-gradient(135deg, ${surfacePeach} 0%, rgba(255,255,255,0) 60%)`,
    gradientCardBlue: `linear-gradient(135deg, ${surfaceBlue} 0%, rgba(255,255,255,0) 60%)`,
  }
}

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

function applyFullPalette(p) {
  const root = document.documentElement.style
  root.setProperty('--accent', p.accent)
  root.setProperty('--accent-hover', p.accentHover)
  root.setProperty('--accent-light', p.accentLight)
  root.setProperty('--accent-text', '#FFFFFF')
  root.setProperty('--color-mint', p.accent)
  root.setProperty('--color-mint-rgb', rgbStr(p.accent))
  root.setProperty('--color-peach', p.peach)
  root.setProperty('--color-peach-rgb', rgbStr(p.peach))
  root.setProperty('--color-blue', p.blue)
  root.setProperty('--color-blue-rgb', rgbStr(p.blue))
  root.setProperty('--color-lavender', p.lavender)
  root.setProperty('--color-yellow', p.yellow)
  root.setProperty('--color-peach-hover', p.peachHover)
  root.setProperty('--color-blue-hover', p.blueHover)
  root.setProperty('--surface-mint', p.surfaceMint)
  root.setProperty('--surface-accent', p.surfaceMint)
  root.setProperty('--surface-accent-strong', p.surfaceStrong)
  root.setProperty('--surface-peach', p.surfacePeach)
  root.setProperty('--surface-blue', p.surfaceBlue)
  root.setProperty('--surface-lavender', p.surfaceLavender)
  root.setProperty('--surface-yellow', p.surfaceYellow)
  root.setProperty('--focus-ring', rgbaStr(p.accent, 0.5))
  root.setProperty('--focus-ring-glow', rgbaStr(p.accent, 0.14))
  root.setProperty('--shadow-mint', `0 8px 20px ${rgbaStr(p.accent, 0.18)}, 0 3px 8px ${rgbaStr(p.accent, 0.10)}`)
  root.setProperty('--shadow-peach', `0 8px 20px ${rgbaStr(p.peach, 0.18)}, 0 3px 8px ${rgbaStr(p.peach, 0.10)}`)
  root.setProperty('--shadow-blue', `0 8px 20px ${rgbaStr(p.blue, 0.18)}, 0 3px 8px ${rgbaStr(p.blue, 0.10)}`)
  root.setProperty('--gradient-badge-mint', p.gradientBadgeMint)
  root.setProperty('--gradient-badge-peach', p.gradientBadgePeach)
  root.setProperty('--gradient-badge-blue', p.gradientBadgeBlue)
  root.setProperty('--gradient-card-mint', p.gradientCardMint)
  root.setProperty('--gradient-card-peach', p.gradientCardPeach)
  root.setProperty('--gradient-card-blue', p.gradientCardBlue)
  root.setProperty('--gradient-cta', `linear-gradient(135deg, ${p.surfaceMint} 0%, ${p.surfacePeach} 100%)`)
}

function applyHeadingFont(font) {
  loadGoogleFont(font.google)
  document.documentElement.style.setProperty('--font-serif', font.family)
}

function applyBodyFont(font) {
  loadGoogleFont(font.google)
  document.documentElement.style.setProperty('--font-body', font.family)
}

function applyNavFont(font) {
  loadGoogleFont(font.google)
  document.documentElement.style.setProperty('--font-nav', font.family)
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

function HueStrip({ hex, onColorChange }) {
  const stripRef = useRef(null)
  const dragging = useRef(false)
  const pickFromEvent = useCallback((e) => {
    const rect = stripRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const hue = (x / rect.width) * 360
    onColorChange(hslToHex(hue, 0.65, 0.38))
  }, [onColorChange])
  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    pickFromEvent(e)
  }, [pickFromEvent])
  useEffect(() => {
    const handleMove = (e) => { if (dragging.current) pickFromEvent(e) }
    const handleUp = () => { dragging.current = false }
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    document.addEventListener('touchmove', handleMove, { passive: true })
    document.addEventListener('touchend', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleUp)
    }
  }, [pickFromEvent])
  const { h } = hexToHsl(hex)
  return (
    <div
      ref={stripRef}
      className="theme-switcher-hue-strip"
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      role="slider"
      aria-label="Свой цвет"
      aria-valuenow={Math.round(h)}
      aria-valuemin={0}
      aria-valuemax={360}
      tabIndex={0}
    >
      <div
        className="theme-switcher-hue-thumb"
        style={{ left: `${(h / 360) * 100}%`, background: hex }}
      />
    </div>
  )
}

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'

export function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const [colorId, setColorId] = useState('emerald')
  const [customHex, setCustomHex] = useState('#1B6B5A')
  const [headingId, setHeadingId] = useState('lora')
  const [bodyId, setBodyId] = useState('golos')
  const [navId, setNavId] = useState('inherit')
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
    if (saved.colorId === 'custom' && saved.customHex) {
      setColorId('custom')
      setCustomHex(saved.customHex)
      applyFullPalette(buildFullPalette(saved.customHex))
    } else if (saved.colorId) {
      const theme = COLOR_THEMES.find(t => t.id === saved.colorId)
      if (theme) {
        setColorId(saved.colorId)
        applyFullPalette(buildFullPalette(theme.accent))
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
    if (saved.navId) {
      const font = NAV_FONTS.find(f => f.id === saved.navId)
      if (font) {
        setNavId(saved.navId)
        applyNavFont(font)
      }
    }
  }, [])
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, handleClickOutside])
  useEffect(() => {
    if (!isOpen) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        buttonRef.current?.focus()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(panelRef.current.querySelectorAll(FOCUSABLE))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    window.setTimeout(() => {
      const focusable = panelRef.current?.querySelectorAll(FOCUSABLE)
      focusable?.[0]?.focus()
    }, 0)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen])
  function buildSavePayload(overrides) {
    return { colorId, customHex: colorId === 'custom' ? customHex : undefined, headingId, bodyId, navId, ...overrides }
  }
  function selectColor(id) {
    const theme = COLOR_THEMES.find(t => t.id === id)
    if (!theme) return
    setColorId(id)
    applyFullPalette(buildFullPalette(theme.accent))
    saveSettings(buildSavePayload({ colorId: id, customHex: undefined }))
  }
  function selectCustomColor(hex) {
    setCustomHex(hex)
    setColorId('custom')
    applyFullPalette(buildFullPalette(hex))
    saveSettings(buildSavePayload({ colorId: 'custom', customHex: hex }))
  }
  function selectHeading(id) {
    const font = HEADING_FONTS.find(f => f.id === id)
    if (!font) return
    setHeadingId(id)
    applyHeadingFont(font)
    saveSettings(buildSavePayload({ headingId: id }))
  }
  function selectBody(id) {
    const font = BODY_FONTS.find(f => f.id === id)
    if (!font) return
    setBodyId(id)
    applyBodyFont(font)
    saveSettings(buildSavePayload({ bodyId: id }))
  }
  function selectNav(id) {
    const font = NAV_FONTS.find(f => f.id === id)
    if (!font) return
    setNavId(id)
    applyNavFont(font)
    saveSettings(buildSavePayload({ navId: id }))
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
        <div
          ref={panelRef}
          className="theme-switcher-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Настройки темы"
        >
          <div className="theme-switcher-section">
            <span className="theme-switcher-label">Акцент</span>
            <div className="theme-switcher-accent-row">
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
              <HueStrip hex={customHex} onColorChange={selectCustomColor} />
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
              <span className="theme-switcher-label">Меню</span>
              <div className="theme-switcher-font-list">
                {NAV_FONTS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => selectNav(f.id)}
                    onMouseEnter={() => loadGoogleFont(f.google)}
                    className={`theme-switcher-font-btn ${navId === f.id ? 'active' : ''}`}
                    style={{ fontFamily: f.id === 'inherit' ? undefined : f.family }}
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
