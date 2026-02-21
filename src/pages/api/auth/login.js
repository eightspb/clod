export const prerender = false

import { createToken, buildSetCookie } from '../../../lib/auth.js'

export async function POST({ request }) {
  try {
    const body = await request.json()
    const { password } = body

    const adminPassword = import.meta.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
    if (!adminPassword || password !== adminPassword) {
      return new Response(JSON.stringify({ error: 'Неверный пароль' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const token = await createToken()
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildSetCookie(token),
      },
    })
  } catch (err) {
    console.error('[auth/login]', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
