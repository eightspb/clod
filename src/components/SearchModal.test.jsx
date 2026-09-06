import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { SearchModal } from './SearchModal.jsx'

function delayedPagefind() {
  const result = { url: 'https://odintsovclinic.ru/blog/chto-takoe-fibroadenoma/', meta: { title: 'Фиброаденома: причины и лечение' }, excerpt: '…' }
  const pagefind = { search: async () => ({ results: [{ data: async () => result }] }) }
  return () => new Promise((resolve) => setTimeout(() => resolve(pagefind), 50))
}

describe('SearchModal', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs the query typed before the search index finished loading', async () => {
    vi.useFakeTimers()
    render(<SearchModal isOpen onClose={() => {}} loadPagefind={delayedPagefind()} />)
    fireEvent.change(screen.getByPlaceholderText('Поиск по сайту...'), { target: { value: 'фиброаденома' } })
    await act(() => vi.advanceTimersByTimeAsync(50))
    expect(screen.getByRole('link', { name: /Фиброаденома: причины и лечение/ })).toBeInTheDocument()
  })

  it('keeps results found after the index loaded when the typing debounce fires later', async () => {
    vi.useFakeTimers()
    render(<SearchModal isOpen onClose={() => {}} loadPagefind={delayedPagefind()} />)
    fireEvent.change(screen.getByPlaceholderText('Поиск по сайту...'), { target: { value: 'фиброаденома' } })
    await act(() => vi.advanceTimersByTimeAsync(50))
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(screen.getByRole('link', { name: /Фиброаденома: причины и лечение/ })).toBeInTheDocument()
  })
})
