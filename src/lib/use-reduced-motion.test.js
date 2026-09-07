import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReducedMotion } from './use-reduced-motion.js'

function stubMatchMedia(matches) {
  const listeners = new Set()
  const query = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_event, listener) => listeners.add(listener),
    removeEventListener: (_event, listener) => listeners.delete(listener),
  }
  vi.spyOn(window, 'matchMedia').mockReturnValue(query)
  return (next) => listeners.forEach((listener) => listener({ matches: next }))
}

afterEach(() => vi.restoreAllMocks())

describe('useReducedMotion', () => {
  it('reports the reduced motion preference of the visitor', () => {
    stubMatchMedia(true)
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true)
  })

  it('reports no preference when the visitor accepts motion', () => {
    stubMatchMedia(false)
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false)
  })

  it('follows the preference when it changes during the visit', () => {
    const emit = stubMatchMedia(false)
    const { result } = renderHook(() => useReducedMotion())
    act(() => emit(true))
    expect(result.current).toBe(true)
  })
})
