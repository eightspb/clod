import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Doctors } from './Doctors.jsx'

describe('Doctors', () => {
  it('marks the active filter button', () => {
    render(<Doctors />)

    expect(screen.getByRole('button', { name: /все доктора/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('filters doctors by specialty', () => {
    render(<Doctors />)

    const gynecologyFilter = screen.getByRole('button', { name: /гинекология/i })
    fireEvent.click(gynecologyFilter)

    expect(gynecologyFilter).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Захарова Татьяна Николаевна')).toBeInTheDocument()
    expect(screen.queryByText('Приходько Кирилл Андреевич')).not.toBeInTheDocument()
  })
})
