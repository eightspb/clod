import { describe, expect, it } from 'vitest'
import { getClientIp } from './client-ip.js'

describe('client IP', () => {
  it('prefers the proxy-overwritten real IP over a forwarded chain', () => {
    const request = new Request('https://odintsovclinic.ru/api/appointments/book', {
      headers: {
        'x-real-ip': '203.0.113.47',
        'x-forwarded-for': '198.51.100.250, 10.0.0.8',
      },
    })
    expect(getClientIp(request)).toBe('203.0.113.47')
  })

  it('uses the nearest valid forwarded address instead of the spoofable first value', () => {
    const headers = new Headers({
      'x-forwarded-for': '198.51.100.199, 192.0.2.61, 10.42.0.7',
    })
    expect(getClientIp(headers)).toBe('10.42.0.7')
  })

  it('skips malformed forwarded entries while walking toward the client', () => {
    const headers = new Headers({
      'x-forwarded-for': '198.51.100.88, definitely-not-an-ip, 2001:db8::19, invalid',
    })
    expect(getClientIp(headers)).toBe('2001:db8::19')
  })

  it('canonicalizes a valid IPv6 real IP into one stable key', () => {
    const headers = new Headers({ 'x-real-ip': '2001:0DB8:0:0:0:0:0:2A' })
    expect(getClientIp(headers)).toBe('2001:db8::2a')
  })

  it('returns unknown for a scoped IPv6 address without throwing', () => {
    const headers = new Headers({ 'x-real-ip': 'fe80::1%eth0' })
    let result = 'not-called'
    try {
      result = getClientIp(headers)
    } catch (error) {
      result = error
    }
    expect(result).toBe('unknown')
  })

  it('rejects a non-single real IP without trusting the forwarded chain', () => {
    const headers = new Headers({
      'x-real-ip': '203.0.113.7, 203.0.113.8',
      'x-forwarded-for': '198.51.100.44, 10.0.0.9',
    })
    expect(getClientIp(headers)).toBe('unknown')
  })

  it('rejects an invalid present real IP without trusting the forwarded chain', () => {
    const headers = new Headers({
      'x-real-ip': 'not-an-address',
      'x-forwarded-for': '198.51.100.31, 10.0.0.10',
    })
    expect(getClientIp(headers)).toBe('unknown')
  })

  it('rejects an empty present real IP without trusting the forwarded chain', () => {
    const headers = new Headers({
      'x-real-ip': '   ',
      'x-forwarded-for': '198.51.100.20, 10.0.0.11',
    })
    expect(getClientIp(headers)).toBe('unknown')
  })

  it('does not hide an unexpected Headers failure', () => {
    const headers = new Headers()
    headers.get = () => { throw new RangeError('Headers storage failed') }
    expect(() => getClientIp(headers)).toThrow(RangeError)
  })

  it.each([
    ['absent headers', new Headers()],
    ['invalid container', {}],
    ['missing input', undefined],
  ])('returns the stable unknown key for %s', (_label, source) => {
    expect(getClientIp(source)).toBe('unknown')
  })
})
