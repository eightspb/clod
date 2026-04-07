import { useEffect, useLayoutEffect, useRef } from 'react'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
const FONT_STORAGE_KEY = 'clod-font-size'
const FONT_DEFAULT = 105
const FONT_MIN = 85

/**
 * Auto-fits root font size so the hero section fits within viewport height.
 * Runs on every page mount. If the hero overflows at the current font size,
 * shrinks it down proportionally (minimum 85%). Respects user manual
 * adjustments via A+/A- buttons — only shrinks, never grows beyond current.
 * Returns a ref to attach to the hero `<section>` element.
 */
export function useHeroFit() {
  const ref = useRef(null)
  useIsomorphicLayoutEffect(() => {
    const section = ref.current
    if (!section) return
    const header = document.querySelector('header')
    const headerHeight = header?.offsetHeight || 80
    const available = window.innerHeight - headerHeight
    const heroHeight = section.scrollHeight
    if (heroHeight <= available) return
    const currentSize = parseInt(localStorage.getItem(FONT_STORAGE_KEY), 10) || FONT_DEFAULT
    const ratio = available / heroHeight
    const fitted = Math.max(FONT_MIN, Math.round(currentSize * ratio))
    if (fitted >= currentSize) return
    document.documentElement.style.fontSize = fitted + '%'
    localStorage.setItem(FONT_STORAGE_KEY, String(fitted))
  }, [])
  return ref
}
