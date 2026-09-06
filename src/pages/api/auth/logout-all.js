export const prerender = false

import { adminSessions, buildClearCookie, getTokenFromCookie } from '../../../lib/auth.js'
import { guardAdminWrite } from '../../../lib/admin-api.js'
import { getClientIp } from '../../../lib/client-ip.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

/**
 * Ends every administrator session at once, the response for a suspected stolen cookie.
 */
export async function POST({ request }) {
  const blocked = await guardAdminWrite(request)
  if (blocked) return blocked
  try {
    const sessions = adminSessions()
    const revoked = await sessions.revokeAll()
    await sessions.record({ kind: 'logout_all', actor: sessions.sessionId(getTokenFromCookie(request)), ip: getClientIp(request), userAgent: request.headers.get('user-agent') ?? '' })
    return new Response(JSON.stringify({ ok: true, revoked }), { status: 200, headers: { ...JSON_HEADERS, 'Set-Cookie': buildClearCookie() } })
  } catch (err) {
    console.error('[auth/logout-all]', err?.code ?? err?.name ?? 'UNKNOWN')
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: JSON_HEADERS })
  }
}
