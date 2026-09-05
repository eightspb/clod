import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { SecondOpinion } from './SecondOpinion.jsx'

describe('SecondOpinion', () => {
  it('keeps the consultation duration out of the steps right below the stat cards', () => {
    render(<SecondOpinion />)
    const steps = screen.getByRole('heading', { name: 'Как это работает' }).closest('section')
    expect(within(steps).queryAllByText(/30-40/)).toHaveLength(0)
  })
})
