import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClayBlobTitle } from './ClayBlobTitle.jsx'

describe('ClayBlobTitle', () => {
  it('renders children text', () => {
    render(<ClayBlobTitle>Наши услуги</ClayBlobTitle>)
    expect(screen.getByText('Наши услуги')).toBeInTheDocument()
  })

  it('renders an h2 heading', () => {
    render(<ClayBlobTitle>Заголовок</ClayBlobTitle>)
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('renders with React node children', () => {
    render(<ClayBlobTitle><span>Текст</span></ClayBlobTitle>)
    expect(screen.getByText('Текст')).toBeInTheDocument()
  })
})
