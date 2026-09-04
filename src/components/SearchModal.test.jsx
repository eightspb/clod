import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SearchModal } from './SearchModal.jsx'

function delayedPagefind() {
  const result = { url: 'https://odintsovclinic.ru/blog/chto-takoe-fibroadenoma/', meta: { title: 'Фиброаденома: причины и лечение' }, excerpt: '…' }
  const pagefind = { search: async () => ({ results: [{ data: async () => result }] }) }
  return () => new Promise((resolve) => setTimeout(() => resolve(pagefind), 50))
}

describe('SearchModal', () => {
  it('runs the query typed before the search index finished loading', async () => {
    render(<SearchModal isOpen onClose={() => {}} loadPagefind={delayedPagefind()} />)
    fireEvent.change(screen.getByPlaceholderText('Поиск по сайту...'), { target: { value: 'фиброаденома' } })
    expect(await screen.findByRole('link', { name: /Фиброаденома: причины и лечение/ }, { timeout: 2000 })).toBeInTheDocument()
  })
})
