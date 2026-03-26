import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Prices } from './Prices.jsx'

describe('Prices page', () => {
  it('renders the short price list and links to the full price list page', () => {
    render(<Prices />)

    expect(screen.getByRole('heading', { level: 2, name: /короткий прайс-лист/i })).toBeInTheDocument()
    expect(screen.getByText(/2 февраля 2026/i)).toBeInTheDocument()
    expect(screen.getByText(/87 000 ₽/i)).toBeInTheDocument()

    const fullPriceLinks = screen.getAllByRole('link', { name: /открыть полный прайс-лист/i })
    expect(fullPriceLinks.length).toBeGreaterThan(0)
    expect(fullPriceLinks[0]).toHaveAttribute('href', '/prices/full')
  })
})
