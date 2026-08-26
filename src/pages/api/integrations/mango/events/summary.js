export const prerender = false

import { normalizeMangoSummaryEvent } from '../../../../../lib/mango-call-event.js'
import { createMangoWebhookEndpoint } from './call.js'

/**
 * Creates the authenticated final-summary MANGO endpoint.
 */
export function createMangoSummaryEndpoint(input = {}) {
  return createMangoWebhookEndpoint({ ...input, normalize: normalizeMangoSummaryEvent })
}

export const POST = createMangoSummaryEndpoint()

export function ALL() {
  return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' } })
}
