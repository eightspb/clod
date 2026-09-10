import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BookingFlow } from './BookingFlow.jsx'

const DOCTORS = Object.freeze([{ slug: 'egorova', name: 'Егорова Ааа Ббб', photo: '/images/doctors/egorova.webp', specialization: 'Маммолог' }])

afterEach(() => {
  delete globalThis.ym
})

describe('BookingFlow metrika goals', () => {
  it('reports the dialog opening as a booking_open goal', () => {
    globalThis.ym = vi.fn()
    render(<><button type="button" data-booking-btn="">Записаться</button><BookingFlow doctors={DOCTORS} fetcher={() => new Promise(() => {})} /></>)
    fireEvent.click(screen.getByRole('button', { name: 'Записаться' }))
    expect(globalThis.ym).toHaveBeenCalledWith(26618208, 'reachGoal', 'booking_open')
  })

  it('opens without a loaded counter', () => {
    render(<><button type="button" data-booking-btn="">Записаться</button><BookingFlow doctors={DOCTORS} fetcher={() => new Promise(() => {})} /></>)
    fireEvent.click(screen.getByRole('button', { name: 'Записаться' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})
