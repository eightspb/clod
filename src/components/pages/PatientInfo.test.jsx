import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PatientInfo } from './PatientInfo.jsx'

describe('PatientInfo page', () => {
  it('lists the supervising authorities with links to their official sites', () => {
    render(<PatientInfo />)
    expect(screen.getByRole('link', { name: /Росздравнадзор/ })).toHaveAttribute('href', expect.stringMatching(/roszdravnadzor/))
  })
  it('covers patient rights, appointment rules and the regulatory documents', () => {
    render(<PatientInfo />)
    expect(screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent)).toEqual(expect.arrayContaining([expect.stringMatching(/Права/), expect.stringMatching(/Правила/), expect.stringMatching(/Нормативн/)]))
  })
})

describe('PatientInfo authorities', () => {
  it('gives a postal address and a dialable phone for every supervising authority', () => {
    render(<PatientInfo />)
    expect(screen.getAllByRole('link', { name: /^8 \(812\)/ }).map((link) => link.getAttribute('href'))).toEqual(['tel:+78122466986', 'tel:+78126796004', 'tel:+78126796707'])
  })
})
