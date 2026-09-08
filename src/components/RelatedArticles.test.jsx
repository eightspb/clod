import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RelatedArticles } from './RelatedArticles.jsx'

it('renders the publication date without a trailing year abbreviation', () => {
  render(<RelatedArticles articles={[{ slug: 'podgotovka-k-mammografii', title: 'Как подготовиться к маммографии', category: 'Диагностика', publishDate: '2026-04-01T00:00:00.000Z' }]} />)
  expect(screen.getByText(/^1 апреля 2026/)).toHaveTextContent(/^1 апреля 2026$/)
})
