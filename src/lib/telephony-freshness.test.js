import { describe, expect, it } from 'vitest'
import { telephonySilence } from './telephony-freshness.js'

describe('telephony silence detector', () => {
  it('flags silence after four business hours without a MANGO event', () => {
    const result = telephonySilence({ lastEventAt: '2026-09-07T06:30:00.000Z', now: new Date('2026-09-07T11:00:00.000Z') })
    expect(result.stale).toBe(true)
  })

  it('stays quiet while the clinic is closed', () => {
    const result = telephonySilence({ lastEventAt: '2026-09-04T16:00:00.000Z', now: new Date('2026-09-07T03:00:00.000Z') })
    expect(result.stale).toBe(false)
  })

  it('counts silence from the opening hour, not from the last night call', () => {
    const result = telephonySilence({ lastEventAt: '2026-09-06T14:55:00.000Z', now: new Date('2026-09-07T08:30:00.000Z') })
    expect(result.stale).toBe(false)
  })

  it('uses the later weekend opening hour', () => {
    const result = telephonySilence({ lastEventAt: null, now: new Date('2026-09-05T10:30:00.000Z') })
    expect(result.stale).toBe(false)
  })

  it('treats a journal without events as silence inside business hours', () => {
    const result = telephonySilence({ lastEventAt: null, now: new Date('2026-09-05T12:00:00.000Z') })
    expect(result.stale).toBe(true)
  })

  it('reports the moment the silence started', () => {
    const result = telephonySilence({ lastEventAt: '2026-09-07T07:10:00.000Z', now: new Date('2026-09-07T12:00:00.000Z') })
    expect(result.sinceAt).toBe('2026-09-07T07:10:00.000Z')
  })

  it('rejects a threshold that is not a positive number', () => {
    expect(() => telephonySilence({ lastEventAt: null, now: new Date(), thresholdHours: 0 })).toThrow(TypeError)
  })
})
