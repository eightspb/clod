import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HeroSlider } from './HeroSlider.jsx'

function activeSlideLabel() {
  return screen.getAllByRole('group', { hidden: true }).find((slide) => slide.getAttribute('aria-hidden') === 'false')?.getAttribute('aria-label')
}

afterEach(() => vi.useRealTimers())

describe('HeroSlider autoplay control', () => {
  it('advances to the next slide after the autoplay interval', () => {
    vi.useFakeTimers()
    render(<HeroSlider />)
    act(() => vi.advanceTimersByTime(12_000))
    expect(activeSlideLabel()).toBe('Слайд 2 из 3')
  })

  it('stops advancing after the pause control is pressed', () => {
    vi.useFakeTimers()
    render(<HeroSlider />)
    fireEvent.click(screen.getByRole('button', { name: 'Приостановить автопрокрутку слайдов' }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(activeSlideLabel()).toBe('Слайд 1 из 3')
  })

  it('exposes the pause state through aria-pressed and offers to resume', () => {
    render(<HeroSlider />)
    fireEvent.click(screen.getByRole('button', { name: 'Приостановить автопрокрутку слайдов' }))
    expect(screen.getByRole('button', { name: 'Возобновить автопрокрутку слайдов' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('pauses while the pointer rests on the slider', () => {
    vi.useFakeTimers()
    render(<HeroSlider />)
    fireEvent.mouseEnter(screen.getByRole('region', { name: 'Главный слайдер' }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(activeSlideLabel()).toBe('Слайд 1 из 3')
  })
})
