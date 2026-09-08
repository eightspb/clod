import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StarRating } from './StarRating.jsx'

describe('StarRating', () => {
  it('renders only the stars without score or count for the stars variant', () => {
    render(<StarRating score={4.5} reviewCount={17} variant="stars" />)
    expect(screen.queryByText(/4\.5|17/)).toBeNull()
  })

  it.each(['compact', 'full'])('derives the %s link name from its visible rating and source context', (variant) => {
    render(<StarRating score={4.7} reviewCount={29} url="https://prodoctorov.ru/spb/vrach/70120-odincov/" variant={variant} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAccessibleName(link.textContent.replace(/\s+/g, ' ').trim())
  })

  it('names a linked stars-only rating with its score and source', () => {
    render(<StarRating score={3.5} reviewCount={41} url="https://prodoctorov.ru/spb/vrach/225946-zaharova/" variant="stars" />)
    expect(screen.getByRole('link')).toHaveAccessibleName('Оценка 3.5 из 5 — рейтинг на ПроДокторов')
  })

  it('keeps the compact score and count voice-searchable with source context', () => {
    render(<StarRating score={4.9} reviewCount={83} url="https://prodoctorov.ru/spb/vrach/349008-kalinina/" variant="compact" />)
    expect(screen.getByRole('link')).toHaveAccessibleName('4.9 (83) — рейтинг на ПроДокторов')
  })
})
