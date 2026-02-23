import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageWrapper } from './PageWrapper.jsx'

describe('PageWrapper', () => {
  it('renders children', () => {
    render(
      <PageWrapper>
        <p>Содержимое страницы</p>
      </PageWrapper>
    )
    expect(screen.getByText('Содержимое страницы')).toBeInTheDocument()
  })

  it('renders multiple children', () => {
    render(
      <PageWrapper>
        <h1>Заголовок</h1>
        <p>Параграф</p>
      </PageWrapper>
    )
    expect(screen.getByText('Заголовок')).toBeInTheDocument()
    expect(screen.getByText('Параграф')).toBeInTheDocument()
  })

  it('catches errors via ErrorBoundary and shows fallback', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Boom() { throw new Error('crash') }
    render(
      <PageWrapper>
        <Boom />
      </PageWrapper>
    )
    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })
})
