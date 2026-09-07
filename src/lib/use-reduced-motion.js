import { useEffect, useState } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function matchReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/**
 * Reports whether the visitor asked the system for reduced motion and follows later changes,
 * so every automatic rotation on the site stops from a single preference.
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(matchReducedMotion)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia(REDUCED_MOTION_QUERY)
    const update = (event) => setPrefersReducedMotion(event.matches)
    setPrefersReducedMotion(query.matches)
    if (typeof query.addEventListener === 'function') query.addEventListener('change', update)
    else if (typeof query.addListener === 'function') query.addListener(update)
    return () => {
      if (typeof query.removeEventListener === 'function') query.removeEventListener('change', update)
      else if (typeof query.removeListener === 'function') query.removeListener(update)
    }
  }, [])
  return prefersReducedMotion
}
