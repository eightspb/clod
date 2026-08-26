export const prerender = false

const JSON_HEADERS = Object.freeze({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' })

function json(payload, status, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { ...JSON_HEADERS, ...headers } })
}

export function GET() {
  return json({ data: { available: true } }, 200)
}

export function ALL() {
  return json({ error: 'METHOD_NOT_ALLOWED' }, 405, { Allow: 'GET' })
}
