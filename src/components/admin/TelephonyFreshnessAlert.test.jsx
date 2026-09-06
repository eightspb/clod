import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TelephonyFreshnessAlert } from './TelephonyFreshnessAlert.jsx'

afterEach(() => vi.useRealTimers())

describe('telephony freshness alert', () => {
  it('warns when MANGO events stopped during business hours', () => {
    vi.useFakeTimers({ now: new Date('2026-09-07T12:00:00.000Z') })
    render(<TelephonyFreshnessAlert lastEventAt="2026-09-07T06:10:00.000Z" />)
    expect(screen.getByRole('alert')).toHaveTextContent('09:10')
  })

  it('renders nothing while the stream is fresh', () => {
    vi.useFakeTimers({ now: new Date('2026-09-07T12:00:00.000Z') })
    const { container } = render(<TelephonyFreshnessAlert lastEventAt="2026-09-07T11:40:00.000Z" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the metric is not provided', () => {
    const { container } = render(<TelephonyFreshnessAlert />)
    expect(container).toBeEmptyDOMElement()
  })
})
