import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StarRating } from './StarRating.jsx'

describe('StarRating', () => {
  it('renders only the stars without score or count for the stars variant', () => {
    render(<StarRating score={4.5} reviewCount={17} variant="stars" />)
    expect(screen.queryByText(/4\.5|17/)).toBeNull()
  })
})
