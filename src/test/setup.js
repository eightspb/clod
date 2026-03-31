import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

class IntersectionObserverMock {
  constructor(callback) {
    this._callback = callback
  }
  observe(el) {
    this._callback([{ isIntersecting: false, target: el }], this)
  }
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserverMock,
  })
}

afterEach(() => {
  cleanup()
})
