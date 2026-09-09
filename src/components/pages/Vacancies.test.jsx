import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Vacancies } from './Vacancies.jsx'

describe('Vacancies page', () => {
  it('offers an e-mail address for unsolicited applications when no vacancy is open', () => {
    render(<Vacancies />)
    expect(screen.getByRole('link', { name: /@odintsovclinic\.ru/ })).toHaveAttribute('href', expect.stringMatching(/^mailto:/))
  })
})
