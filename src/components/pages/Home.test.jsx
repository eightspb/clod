import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
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
  let originalInnerHeight
  let originalScrollHeightDescriptor
  let consoleError
  let overflowHeader

  beforeEach(() => {
    vi.useFakeTimers()

    originalMatchMedia = window.matchMedia
    originalResizeObserver = window.ResizeObserver
    originalRequestAnimationFrame = window.requestAnimationFrame
    originalCancelAnimationFrame = window.cancelAnimationFrame
    originalInnerHeight = window.innerHeight
    originalScrollHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight')
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

    overflowHeader = document.createElement('header')
    Object.defineProperty(overflowHeader, 'offsetHeight', {
      configurable: true,
      get: () => 120,
    })
    document.body.append(overflowHeader)

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 720,
    })

    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 2000,
    })

    document.documentElement.style.fontSize = ''
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllTimers()
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

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    })

    if (originalScrollHeightDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeightDescriptor)
    } else {
      delete HTMLElement.prototype.scrollHeight
    }

    overflowHeader?.remove()
    document.documentElement.style.fontSize = ''
    window.localStorage.clear()
  })

  it('starts paused for reduced motion and resumes only after an explicit click', async () => {
    await act(async () => {
      render(<Home doctorsData={[]} />)
    })

    const control = screen.getByRole('button', { name: /возобновить автопрокрутку/i })
    const heading = screen.getByRole('heading', { level: 1 })

    expect(control).toBeInTheDocument()
    expect(control).toHaveAttribute('aria-pressed', 'true')
    expect(heading).toHaveTextContent(/медицинский маршрут/i)

    await act(async () => {
      vi.advanceTimersByTime(12000)
    })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/медицинский маршрут/i)

    await act(async () => {
      fireEvent.click(control)
    })

    expect(screen.getByRole('button', { name: /пауза слайдов/i })).toHaveAttribute('aria-pressed', 'false')

    await act(async () => {
      vi.advanceTimersByTime(12000)
    })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/ваб под уз-контролем/i)
  })

  it('keeps the root font size unchanged when the hero overflows', async () => {
    await act(async () => {
      render(<Home doctorsData={[]} />)
    })

    expect(document.documentElement.style.fontSize).toBe('')
  })

  it('shows all clinic directions in the quick intro navigation', async () => {
    await act(async () => {
      render(<Home doctorsData={[]} />)
    })

    const quickNav = screen.getByRole('navigation', { name: /быстрый выбор направления/i })

    expect(quickNav).toBeInTheDocument()
    expect(within(quickNav).getByRole('link', { name: /маммология/i })).toBeInTheDocument()
    expect(within(quickNav).getByRole('link', { name: /гинекология/i })).toBeInTheDocument()
    expect(within(quickNav).getByRole('link', { name: /эндокринология/i })).toBeInTheDocument()
    expect(within(quickNav).getByRole('link', { name: /нутрициология/i })).toBeInTheDocument()
  })

  it('keeps direction navigation outside the hero carousel', async () => {
    await act(async () => {
      render(<Home doctorsData={[]} />)
    })

    const carousel = screen.getByRole('region', { name: /главный слайдер/i })

    expect(within(carousel).queryByRole('navigation', { name: /быстрый выбор направления/i })).not.toBeInTheDocument()
  })

  it('does not duplicate booking actions inside doctor preview cards', async () => {
    await act(async () => {
      render(<Home doctorsData={[]} />)
    })

    expect(document.querySelector('.hero-doctor-cta[data-booking-btn="true"]')).not.toBeInTheDocument()
  })

  it('uses a general booking CTA instead of the simulated contact form', async () => {
    await act(async () => {
      render(<Home doctorsData={[]} />)
    })
    const section = document.getElementById('appointment-form')
    const heading = within(section).getByRole('heading', { level: 2 })
    const trigger = within(section).getByRole('button', { name: /записаться/i })
    expect({ heading: heading.textContent.trim(), type: trigger.getAttribute('type'), booking: trigger.getAttribute('data-booking-btn'), doctor: trigger.hasAttribute('data-booking-doctor'), forms: section.querySelectorAll('form').length, inputs: section.querySelectorAll('input').length }).toEqual({ heading: 'Запишитесь на приём', type: 'button', booking: 'true', doctor: false, forms: 0, inputs: 0 })
  })
})
