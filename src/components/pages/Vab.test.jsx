import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Vab } from './Vab.jsx'

describe('Vab', () => {
  it('shows the procedure duration stat once instead of repeating it in adjacent sections', () => {
    render(<Vab />)
    expect(screen.getAllByText('30-40 мин')).toHaveLength(1)
  })
})
