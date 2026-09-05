import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WhyUsSection } from './WhyUsSection.jsx'

describe('WhyUsSection', () => {
  it('renders feature descriptions at the body text size instead of a reduced step', () => {
    render(<WhyUsSection />)
    const description = screen.getByText(/спокойная коммуникация/i)
    expect({ xs: description.classList.contains('text-xs'), sm: description.classList.contains('text-sm') }).toEqual({ xs: false, sm: false })
  })
})
