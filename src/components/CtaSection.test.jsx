import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CtaSection } from './CtaSection.jsx'

describe('CtaSection', () => {
  it('renders default title', () => {
    render(<CtaSection />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Записаться на приём')
  })

  it('renders custom title', () => {
    render(<CtaSection title="Оставить заявку" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Оставить заявку')
  })

  it('renders primary CTA link', () => {
    render(<CtaSection />)
    const link = screen.getByRole('link', { name: /записаться онлайн/i })
    expect(link).toHaveAttribute('href', '/second-opinion')
  })

  it('renders custom primary href', () => {
    render(<CtaSection primaryHref="/appointment" primaryLabel="Записаться" />)
    const link = screen.getByRole('link', { name: /записаться/i })
    expect(link).toHaveAttribute('href', '/appointment')
  })

  it('renders phone link with tel:', () => {
    render(<CtaSection />)
    const links = screen.getAllByRole('link')
    const phoneLink = links.find((l) => l.getAttribute('href')?.startsWith('tel:'))
    expect(phoneLink).toBeDefined()
  })
})
