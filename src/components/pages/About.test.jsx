import { render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { About } from './About.jsx'

const originalInnerHeight = window.innerHeight
const originalScrollHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight')

function createOverflowHeader() {
  const header = document.createElement('header')
  Object.defineProperty(header, 'offsetHeight', {
    configurable: true,
    get: () => 120,
  })
  document.body.append(header)
  return header
}

afterEach(() => {
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
  document.querySelector('header')?.remove()
  document.documentElement.style.fontSize = ''
  window.localStorage.clear()
})

describe('About page', () => {
  it('keeps the root font size unchanged when the hero overflows', () => {
    createOverflowHeader()
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

    render(<About />)

    expect(document.documentElement.style.fontSize).toBe('')
  })
})

describe('About page sections', () => {
  it('never repeats a card title across advantages and principles', () => {
    render(<About />)
    const titles = Array.from(document.querySelectorAll('h3')).map((node) => node.textContent)
    expect(titles.filter((title, index) => titles.indexOf(title) !== index)).toEqual([])
  })
})
