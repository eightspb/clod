import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ServicesSection } from './ServicesSection.jsx'

describe('ServicesSection accessible names', () => {
  it.each(['Маммология', 'Гинекология', 'Эндокринология', 'Нутрициология'])('includes all visible service copy in the %s link name', (title) => {
    render(<ServicesSection />)
    const navigation = screen.getByRole('navigation', { name: 'Быстрый выбор направления' })
    const link = within(navigation).getByRole('link', { name: new RegExp(title) })
    const visibleCopy = [link.querySelector('h3').textContent, ...Array.from(link.querySelectorAll('p'), (paragraph) => paragraph.textContent), 'Перейти'].join(' ')
    expect(link).toHaveAccessibleName(visibleCopy)
  })
})
