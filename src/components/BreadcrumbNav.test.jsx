import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BreadcrumbNav } from './BreadcrumbNav.jsx'

describe('BreadcrumbNav', () => {
  it('always renders Главная as first item', () => {
    render(<BreadcrumbNav items={[]} />)
    expect(screen.getByText('Главная')).toBeInTheDocument()
  })

  it('renders passed items', () => {
    render(<BreadcrumbNav items={[{ label: 'Маммология', href: '/mammology' }, { label: 'О враче' }]} />)
    expect(screen.getByText('Маммология')).toBeInTheDocument()
    expect(screen.getByText('О враче')).toBeInTheDocument()
  })

  it('renders nav with aria-label', () => {
    render(<BreadcrumbNav items={[{ label: 'Услуги' }]} />)
    expect(screen.getByRole('navigation', { name: /хлебные крошки/i })).toBeInTheDocument()
  })

  it('last item has aria-current=page', () => {
    render(<BreadcrumbNav items={[{ label: 'Маммология' }]} />)
    const current = screen.getByText('Маммология')
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('intermediate items render as links', () => {
    render(<BreadcrumbNav items={[{ label: 'Врачи', href: '/doctors' }, { label: 'Одинцов' }]} />)
    const link = screen.getByRole('link', { name: 'Врачи' })
    expect(link).toHaveAttribute('href', '/doctors')
  })

  it('renders with empty items (only Главная)', () => {
    render(<BreadcrumbNav items={[]} />)
    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
  })

  it('injects JSON-LD script tag', () => {
    const { container } = render(<BreadcrumbNav items={[{ label: 'Услуги' }]} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const data = JSON.parse(script.textContent)
    expect(data['@type']).toBe('BreadcrumbList')
    expect(data.itemListElement.length).toBe(2)
  })
})
