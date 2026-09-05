import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReviewsSection } from './ReviewsSection.jsx'

describe('ReviewsSection', () => {
  it('links every review to the doctor profile on ProDoctorov', () => {
    render(<ReviewsSection />)
    const sources = screen.getAllByRole('link', { name: /ПроДокторов/ }).map((link) => new URL(link.href).hostname)
    expect(sources).toEqual(['prodoctorov.ru', 'prodoctorov.ru', 'prodoctorov.ru', 'prodoctorov.ru'])
  })

  it('does not present reviews as unsourced real stories', () => {
    render(<ReviewsSection />)
    expect(screen.queryByText(/Реальные истории/)).toBeNull()
  })
})
