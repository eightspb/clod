import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary.jsx'

function ThrowingComponent() {
  throw new Error('Test error')
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <p>Всё хорошо</p>
      </ErrorBoundary>
    )
    expect(screen.getByText('Всё хорошо')).toBeInTheDocument()
  })

  it('renders fallback UI on error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )
    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument()
    expect(screen.getByText('Попробуйте обновить страницу')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('renders retry button in error state', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /попробовать снова/i })).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('resets error state when retry button is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let shouldThrow = true

    function MaybeThrow() {
      if (shouldThrow) throw new Error('Test')
      return <p>Восстановлено</p>
    }

    const { rerender } = render(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    )

    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument()

    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: /попробовать снова/i }))

    rerender(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    )

    expect(screen.queryByText('Что-то пошло не так')).toBeNull()
    consoleSpy.mockRestore()
  })
})
