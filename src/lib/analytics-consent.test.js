import { describe, expect, it } from 'vitest'
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_STORAGE_KEY,
  readAnalyticsConsent,
} from './analytics-consent.js'

describe('analytics consent', () => {
  it('stores the decision under a dedicated key', () => {
    expect(ANALYTICS_CONSENT_STORAGE_KEY).toBe('clod-analytics-consent')
  })

  it('announces a decision through a namespaced DOM event', () => {
    expect(ANALYTICS_CONSENT_EVENT).toBe('clod:analytics-consent')
  })

  it('treats a stored grant as granted', () => {
    expect(readAnalyticsConsent('granted')).toBe('granted')
  })

  it('treats a stored refusal as denied', () => {
    expect(readAnalyticsConsent('denied')).toBe('denied')
  })

  it('treats a missing value as undecided', () => {
    expect(readAnalyticsConsent(null)).toBe(undefined)
  })

  it('treats garbage as undecided', () => {
    expect(readAnalyticsConsent('да ✓')).toBe(undefined)
  })
})
