export const prerender = false

import { adminSessions, buildClearCookie, getTokenFromCookie, validateOrigin } from '../../../lib/auth.js'
import { getClientIp } from '../../../lib/client-ip.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

/**
 * Revokes the current session server-side before asking the browser to drop the cookie.
 */
export async function POST({ request }) {
  if (!validateOrigin(request)) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: JSON_HEADERS })
  try {
    const sessions = adminSessions()
    const sessionId = sessions.sessionId(getTokenFromCookie(request))
    if (sessionId) {
      await sessions.revoke(sessionId)
      await sessions.record({ kind: 'logout', actor: sessionId, ip: getClientIp(request), userAgent: request.headers.get('user-agent') ?? '' })
    }
  } catch (err) {
    console.error('[auth/logout]', err?.code ?? err?.name ?? 'UNKNOWN')
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: JSON_HEADERS })
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...JSON_HEADERS, 'Set-Cookie': buildClearCookie() } })
}
