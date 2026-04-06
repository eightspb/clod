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
