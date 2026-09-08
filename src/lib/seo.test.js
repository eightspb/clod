import { describe, expect, it } from 'vitest'
import { canonicalUrl, sitemapPage, serializeJsonLd, CLINIC_SCHEMA, WEBSITE_SCHEMA } from './seo.js'

describe('Public search URLs', () => {
  it('removes query strings and trailing slashes from a canonical page', () => {
    expect(canonicalUrl('/mammology/?utm_source=карты#prices')).toBe('https://odintsovclinic.ru/mammology')
  })

  it('keeps the homepage root slash', () => {
    expect(canonicalUrl('/?from=поиск')).toBe('https://odintsovclinic.ru/')
  })

  it('rejects a canonical on an unrelated origin', () => {
    expect(() => canonicalUrl('https://example.org/врач')).toThrow(TypeError)
  })

  it.each(['/404', '/admin', '/admin/login', '/api/health', '/blog-images'])('excludes nonpublic search route %s', (route) => {
    expect(sitemapPage(`https://odintsovclinic.ru${route}`)).toBe(false)
  })

  it.each(['/gynecology', '/blog/kak-podgotovitsya-k-vab', '/licenses'])('keeps useful public route %s', (route) => {
    expect(sitemapPage(`https://odintsovclinic.ru${route}`)).toBe(true)
  })
})

describe('Search entity identity', () => {
  it('identifies the clinic consistently as the website publisher', () => {
    expect(WEBSITE_SCHEMA.publisher['@id']).toBe(CLINIC_SCHEMA['@id'])
  })

  it('serializes medical text without allowing a JSON-LD script to close', () => {
    const value = { name: 'Образование < 2 см </script><script>alert(1)</script>' }
    const serialized = serializeJsonLd(value)
    expect({ roundTrip: JSON.parse(serialized), containsTag: serialized.includes('<') }).toEqual({ roundTrip: value, containsTag: false })
  })
})
