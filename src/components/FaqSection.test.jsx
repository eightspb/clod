import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FaqSection } from './FaqSection.jsx'

const FAQ_ITEMS = [
  { question: 'Что такое ВАБ?', answer: 'Вакуумная аспирационная биопсия.' },
  { question: 'Больно ли это?', answer: 'Нет, под местной анестезией.' },
]

describe('FaqSection', () => {
  it('returns null when items array is empty', () => {
    const { container } = render(<FaqSection items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders default title', () => {
    render(<FaqSection items={FAQ_ITEMS} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Частые вопросы')
  })

  it('renders custom title', () => {
    render(<FaqSection items={FAQ_ITEMS} title="FAQ" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('FAQ')
  })

  it('renders all questions', () => {
    render(<FaqSection items={FAQ_ITEMS} />)
    expect(screen.getByText('Что такое ВАБ?')).toBeInTheDocument()
    expect(screen.getByText('Больно ли это?')).toBeInTheDocument()
  })

  it('renders all answers', () => {
    render(<FaqSection items={FAQ_ITEMS} />)
    expect(screen.getByText('Вакуумная аспирационная биопсия.')).toBeInTheDocument()
    expect(screen.getByText('Нет, под местной анестезией.')).toBeInTheDocument()
  })

  it('injects FAQPage JSON-LD schema', () => {
    const { container } = render(<FaqSection items={FAQ_ITEMS} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const data = JSON.parse(script.textContent)
    expect(data['@type']).toBe('FAQPage')
    expect(data.mainEntity).toHaveLength(2)
    expect(data.mainEntity[0].name).toBe('Что такое ВАБ?')
  })
})
