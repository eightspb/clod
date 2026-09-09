import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Accessibility } from './Accessibility.jsx'

describe('Accessibility page', () => {
  it('tells visitors with limited mobility how to arrange help before the visit', () => {
    render(<Accessibility />)
    expect(screen.getAllByRole('link', { name: /748-22-10/ }).length).toBeGreaterThan(0)
  })
})

describe('Accessibility entrance', () => {
  it('states that there is a call button instead of a ramp', () => {
    render(<Accessibility />)
    expect(document.body.textContent).toMatch(/Пандуса на лестнице нет.*кнопка вызова/)
  })
})
