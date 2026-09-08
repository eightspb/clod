import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Gynecology } from './Gynecology.jsx'

describe('Gynecology', () => {
  it('links our gynecologists to the specialty doctor collection on this page', () => {
    render(<Gynecology />)
    const link = screen.getByRole('link', { name: /Наши гинекологи/ })
    const section = screen.getByRole('heading', { name: 'Гинекологи клиники' }).closest('section')
    expect({ href: link.getAttribute('href'), target: section.id }).toEqual({ href: '#gynecologists', target: 'gynecologists' })
  })

  it('styles every booking call to action with the shared accent button only', () => {
    render(<Gynecology />)
    const buttons = screen.getAllByRole('button', { name: /^Записаться на приём$/ })
    expect(buttons.map((button) => button.className.includes('btn-specialty'))).toEqual([false, false])
  })

  it('lays out the route stats in two columns so long labels stay whole', () => {
    render(<Gynecology />)
    const stats = screen.getByText('первичный визит для оценки жалоб и анамнеза').closest('[data-route-stats]')
    expect(stats.className.split(' ').filter((token) => token.includes('grid-cols'))).toEqual(['grid-cols-2'])
  })
})
