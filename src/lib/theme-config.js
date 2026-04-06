/**
 * Theme configuration: color presets and font options for ThemeSwitcher.
 * Extracted from ThemeSwitcher.jsx to reduce component size and allow
 * reuse (e.g., in Layout.astro FOUC prevention script).
 */

export const COLOR_THEMES = [
  { id: 'emerald', label: 'Emerald', accent: '#1B6B5A' },
  { id: 'slate-blue', label: 'Slate Blue', accent: '#64748B' },
  { id: 'dusty-rose', label: 'Dusty Rose', accent: '#9D6B7B' },
  { id: 'warm-clay', label: 'Warm Clay', accent: '#8B6F52' },
  { id: 'sage', label: 'Sage', accent: '#6B8F71' },
  { id: 'indigo', label: 'Indigo', accent: '#4F46E5' },
  { id: 'teal', label: 'Teal', accent: '#0D9488' },
  { id: 'amber', label: 'Amber', accent: '#B45309' },
  { id: 'plum', label: 'Plum', accent: '#7E22CE' },
  { id: 'crimson', label: 'Crimson', accent: '#BE123C' },
  { id: 'ocean', label: 'Ocean', accent: '#0369A1' },
  { id: 'forest', label: 'Forest', accent: '#166534' },
  { id: 'graphite', label: 'Graphite', accent: '#374151' },
  { id: 'copper', label: 'Copper', accent: '#B87333' },
  { id: 'midnight', label: 'Midnight', accent: '#1E3A5F' },
  { id: 'mauve', label: 'Mauve', accent: '#8B5CF6' },
  { id: 'moss', label: 'Moss', accent: '#5C7A3E' },
  { id: 'terracotta', label: 'Terracotta', accent: '#C1440E' },
  { id: 'steel', label: 'Steel', accent: '#2E6D9E' },
  { id: 'burgundy', label: 'Burgundy', accent: '#722F37' },
]

export const HEADING_FONTS = [
  { id: 'lora', label: 'Lora', family: "'Lora', Georgia, 'Times New Roman', serif", google: null },
  { id: 'cormorant', label: 'Cormorant Garamond', family: "'Cormorant Garamond', Georgia, 'Times New Roman', serif", google: 'Cormorant+Garamond:ital,wght@0,300;0,400;0,700;1,400&display=swap' },
  { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', Georgia, serif", google: 'Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap' },
  { id: 'merriweather', label: 'Merriweather', family: "'Merriweather', Georgia, serif", google: 'Merriweather:ital,wght@0,300;0,400;0,700;1,400&display=swap' },
  { id: 'pt-serif', label: 'PT Serif', family: "'PT Serif', Georgia, serif", google: 'PT+Serif:ital,wght@0,400;0,700;1,400&display=swap' },
  { id: 'eb-garamond', label: 'EB Garamond', family: "'EB Garamond', Georgia, serif", google: 'EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap' },
  { id: 'libre-baskerville', label: 'Libre Baskerville', family: "'Libre Baskerville', Georgia, serif", google: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap' },
  { id: 'spectral', label: 'Spectral', family: "'Spectral', Georgia, serif", google: 'Spectral:ital,wght@0,300;0,400;0,700;1,400&display=swap' },
  { id: 'crimson-pro', label: 'Crimson Pro', family: "'Crimson Pro', Georgia, serif", google: 'Crimson+Pro:ital,wght@0,300;0,400;0,700;1,400&display=swap' },
  { id: 'dm-serif', label: 'DM Serif Display', family: "'DM Serif Display', Georgia, serif", google: 'DM+Serif+Display:ital@0;1&display=swap' },
]

export const BODY_FONTS = [
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

export const NAV_FONTS = [
  { id: 'inherit', label: 'Как текст', family: 'var(--font-body)', google: null },
  ...HEADING_FONTS,
]

export const STORAGE_KEY = 'clod-theme-settings'

export function hexToHsl(hex) {
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

export function hslToHex(h, s, l) {
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

export function rgbStr(hex) {
  return `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`
}

export function rgbaStr(hex, a) {
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`
}

/**
 * Generate a full design token palette from a single accent hex color.
 * Used by ThemeSwitcher at runtime and available for SSR/testing.
 */
export function buildFullPalette(hex) {
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
