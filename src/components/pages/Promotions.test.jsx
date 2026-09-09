import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Promotions } from './Promotions.jsx'

describe('Promotions page', () => {
  it('renders an anchored article per promotion', () => {
    render(<Promotions />)
    expect(document.querySelectorAll('article#lab-discount, article#health-day')).toHaveLength(2)
  })
  it('names Захарова as the doctor of the health day package', () => {
    render(<Promotions />)
    expect(screen.getByRole('link', { name: /Захарова/ })).toHaveAttribute('href', '/doctors/zaharova')
  })
})
