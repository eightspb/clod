export const prerender = false

import { db, sql } from '../../lib/database.js'
import { assessEnvironment } from '../../lib/startup-environment.js'

const HEADERS = Object.freeze({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })

function respond(status, body) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS })
}

/**
 * Readiness probe for the container HEALTHCHECK and the deploy smoke gate: proves the
 * required secrets are present and the migrated schema is reachable, and nothing else.
 */
export async function GET() {
  if (assessEnvironment(process.env).missingRequired.length > 0) return respond(503, { ok: false, reason: 'environment' })
  try {
    const row = await db.get(sql`SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'Patient'`)
    if (!row) return respond(503, { ok: false, reason: 'database' })
  } catch {
    return respond(503, { ok: false, reason: 'database' })
  }
  return respond(200, { ok: true })
}
