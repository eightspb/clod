export const prerender = false

import { buildClearCookie, validateOrigin } from '../../../lib/auth.js'

export async function POST({ request }) {
  if (!validateOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildClearCookie(),
    },
  })
}
