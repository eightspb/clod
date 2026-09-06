import { describe, expect, it } from 'vitest'
import { referrerOrigin, safeDetails, truncateIp, userAgentFamily } from './analytics-privacy.js'

describe('truncateIp', () => {
  it('keeps only the /24 network of an IPv4 address', () => {
    expect(truncateIp('203.0.113.71')).toBe('203.0.113.0/24')
  })

  it('keeps only the /48 prefix of an IPv6 address', () => {
    expect(truncateIp('2a02:6b8:c0f:1a2:b3c4:d5e6:f7a8:9b0c')).toBe('2a02:6b8:c0f::/48')
  })

  it('leaves an already truncated value unchanged', () => {
    expect(truncateIp('203.0.113.0/24')).toBe('203.0.113.0/24')
  })

  it('drops anything that is not an address', () => {
    expect(truncateIp('unknown ¯\\_(ツ)_/¯')).toBeUndefined()
  })
})

describe('referrerOrigin', () => {
  it('strips the path and query from a search-engine referrer', () => {
    expect(referrerOrigin('https://yandex.ru/search/?text=гипотиреоз+симптомы+спб')).toBe('https://yandex.ru')
  })

  it('drops referrers that are not absolute URLs', () => {
    expect(referrerOrigin('/gipotireoz')).toBeUndefined()
  })
})

describe('safeDetails', () => {
  it('serialises small payloads verbatim', () => {
    expect(safeDetails({ href: '/vab', tag: 'a' }, 100)).toBe('{"href":"/vab","tag":"a"}')
  })

  it('replaces an overlong payload with a truncation marker instead of cutting JSON mid-token', () => {
    expect(safeDetails({ classes: 'ё'.repeat(300) }, 100)).toBe('{"truncated":true}')
  })

  it('returns undefined for a payload that cannot be serialised', () => {
    expect(safeDetails(undefined, 100)).toBeUndefined()
  })
})

describe('userAgentFamily', () => {
  it('reduces a full user agent to browser and platform families', () => {
    expect(userAgentFamily('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1')).toBe('Safari · iOS')
  })

  it('recognises Chrome on Android', () => {
    expect(userAgentFamily('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36')).toBe('Chrome · Android')
  })

  it('labels unknown agents without leaking their text', () => {
    expect(userAgentFamily('curl/8.7.1 secret-token=abc')).toBe('Другой')
  })
})
