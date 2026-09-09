/**
 * Visitor consent for the first-party analytics tracker.
 * The tracker never starts until the visitor grants consent through the banner;
 * the decision lives in localStorage and can be withdrawn on the privacy policy page.
 */
export const ANALYTICS_CONSENT_STORAGE_KEY = 'clod-analytics-consent'
export const ANALYTICS_CONSENT_EVENT = 'clod:analytics-consent'
const DECISIONS = Object.freeze(['granted', 'denied'])

/**
 * Reads a stored decision; anything but the two known values means the visitor has not decided.
 */
export function readAnalyticsConsent(raw) {
  return DECISIONS.includes(raw) ? raw : undefined
}
