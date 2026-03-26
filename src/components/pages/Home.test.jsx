import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { Home } from './Home.jsx'

function mockMatchMedia(matches) {
  const listeners = new Set()

  return vi.fn().mockImplementation((query) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    onchange: null,
    addEventListener: (_event, callback) => listeners.add(callback),
    removeEventListener: (_event, callback) => listeners.delete(callback),
    addListener: (callback) => listeners.add(callback),
    removeListener: (callback) => listeners.delete(callback),
    dispatchEvent: (event) => {
      listeners.forEach((callback) => callback(event))
      return true
    },
  }))
}

describe('Home hero slider', () => {
  let originalMatchMedia
  let originalResizeObserver
  let originalRequestAnimationFrame
  let originalCancelAnimationFrame
  let consoleError

  beforeEach(() => {
    vi.useFakeTimers()

    originalMatchMedia = window.matchMedia
    originalResizeObserver = window.ResizeObserver
    originalRequestAnimationFrame = window.requestAnimationFrame
    originalCancelAnimationFrame = window.cancelAnimationFrame
    consoleError = console.error

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia(true),
    })

    vi.spyOn(console, 'error').mockImplementation((...args) => {
      const [firstArg] = args
      if (typeof firstArg === 'string' && firstArg.includes('act(')) {
        return
      }

      consoleError(...args)
    })

    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    Object.defineProperty(window, 'ResizeObserver', {
      writable: true,
      value: ResizeObserverMock,
    })

    Object.defineProperty(window, 'requestAnimationFrame', {
      writable: true,
      value: (callback) => {
        callback(0)
        return 0
      },
    })

    Object.defineProperty(window, 'cancelAnimationFrame', {
      writable: true,
      value: () => {},
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    })
    Object.defineProperty(window, 'ResizeObserver', {
      writable: true,
      value: originalResizeObserver,
    })
    Object.defineProperty(window, 'requestAnimationFrame', {
      writable: true,
      value: originalRequestAnimationFrame,
    })
    Object.defineProperty(window, 'cancelAnimationFrame', {
      writable: true,
      value: originalCancelAnimationFrame,
    })
  })

  it('starts paused for reduced motion and resumes only after an explicit click', async () => {
    await act(async () => {
      render(<Home doctorsData={[]} />)
    })

    const control = screen.getByRole('button', { name: /возобновить автопрокрутку/i })
    const heading = screen.getByRole('heading', { level: 1 })

    expect(control).toBeInTheDocument()
    expect(control).toHaveAttribute('aria-pressed', 'true')
    expect(heading).toHaveTextContent(/вакуумная аспирационная биопсия/i)

    await act(async () => {
      vi.advanceTimersByTime(12000)
    })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/вакуумная аспирационная биопсия/i)

    await act(async () => {
      fireEvent.click(control)
    })

    expect(screen.getByRole('button', { name: /пауза автопрокрутки/i })).toHaveAttribute('aria-pressed', 'false')

    await act(async () => {
      vi.advanceTimersByTime(12000)
    })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/второе мнение по маммологии/i)
  })
})
