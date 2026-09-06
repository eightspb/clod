import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RevealCountdown } from './RevealCountdown.jsx'

afterEach(() => vi.useRealTimers())

describe('RevealCountdown', () => {
  it('counts down the remaining seconds', () => {
    vi.useFakeTimers({ now: 1_000_000 })
    render(<RevealCountdown expiresAt={1_030_000} onExtend={() => undefined} />)
    act(() => vi.advanceTimersByTime(5_000))
    expect(screen.getByRole('status')).toHaveTextContent('Скроется через 25 с')
  })

  it('offers an extension only during the last ten seconds', () => {
    vi.useFakeTimers({ now: 1_000_000 })
    render(<RevealCountdown expiresAt={1_030_000} onExtend={() => undefined} />)
    const early = screen.queryByRole('button', { name: 'Продлить' })
    act(() => vi.advanceTimersByTime(21_000))
    expect({ early, late: Boolean(screen.getByRole('button', { name: 'Продлить' })) }).toEqual({ early: null, late: true })
  })

  it('calls the extension handler', () => {
    vi.useFakeTimers({ now: 1_000_000 })
    const onExtend = vi.fn()
    render(<RevealCountdown expiresAt={1_005_000} onExtend={onExtend} />)
    fireEvent.click(screen.getByRole('button', { name: 'Продлить' }))
    expect(onExtend).toHaveBeenCalledTimes(1)
  })
})
