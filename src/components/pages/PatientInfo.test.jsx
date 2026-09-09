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
