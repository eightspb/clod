import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PromotionsSection } from './PromotionsSection.jsx'

describe('PromotionsSection', () => {
  it('announces the laboratory discount days on the home page', () => {
    render(<PromotionsSection />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/анализы/i)
  })
  it('links every promotion card to its anchor on the promotions page', () => {
    render(<PromotionsSection />)
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(expect.arrayContaining(['/promotions#lab-discount', '/promotions#health-day']))
  })
})
