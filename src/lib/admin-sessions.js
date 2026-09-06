import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export const SESSION_TTL_MS = 24 * 60 * 60_000
export const SESSION_IDLE_MS = 60 * 60_000
export const AUTH_EVENT_KINDS = Object.freeze(['login_success', 'login_failure', 'login_limited', 'logout', 'logout_all'])
const TOUCH_INTERVAL_MS = 60_000
const TOKEN_PATTERN = /^([0-9a-f-]{36})\.(\d{13})\.([A-Za-z0-9_-]{43})$/
const INVALID = Object.freeze({ valid: false })

function sign(secret, payload) {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('base64url')
}

function constantTimeEqual(left, right) {
  const leftDigest = createHash('sha256').update(left, 'utf8').digest()
  const rightDigest = createHash('sha256').update(right, 'utf8').digest()
  return timingSafeEqual(leftDigest, rightDigest) && left === right
}

function ensureClient(client) {
  if (!client || typeof client.execute !== 'function') throw new TypeError('Admin sessions require a libsql client with execute')
  return client
}

function ensureSecret(secret) {
  if (typeof secret !== 'string' || secret.length < 16) throw new TypeError('Admin sessions require a token secret of at least 16 characters')
  return secret
}

/**
 * Server-side administrator sessions: the cookie carries `sessionId.issuedAt.signature`, the row
 * decides whether it is still valid, so logout and "end all sessions" revoke a stolen cookie
 * instead of merely asking the browser to forget it.
 */
export function createAdminSessions({ client, secret, clock = () => new Date(), uuid = randomUUID }) {
  const storage = ensureClient(client)
  const key = ensureSecret(secret)
  const sessionId = (token) => {
    const match = typeof token === 'string' ? TOKEN_PATTERN.exec(token) : null
    return match ? match[1] : undefined
  }
  async function issue() {
    const now = clock()
    const id = uuid()
    const issuedAt = now.getTime()
    await storage.execute({ sql: 'INSERT INTO AdminSession (id, issuedAt, lastSeenAt, revokedAt) VALUES (?, ?, ?, NULL)', args: [id, now.toISOString(), now.toISOString()] })
    return `${id}.${issuedAt}.${sign(key, `${id}.${issuedAt}`)}`
  }
  async function verify(token) {
    const match = typeof token === 'string' ? TOKEN_PATTERN.exec(token) : null
    if (!match) return INVALID
    const [, id, issuedAt, signature] = match
    if (!constantTimeEqual(sign(key, `${id}.${issuedAt}`), signature)) return INVALID
    const now = clock()
    if (now.getTime() - Number(issuedAt) > SESSION_TTL_MS || Number(issuedAt) > now.getTime() + 5 * 60_000) return INVALID
    const result = await storage.execute({ sql: 'SELECT issuedAt, lastSeenAt, revokedAt FROM AdminSession WHERE id = ? LIMIT 1', args: [id] })
    const row = result.rows[0]
    if (!row || row.revokedAt !== null || Date.parse(row.issuedAt) !== Number(issuedAt)) return INVALID
    const lastSeen = Date.parse(row.lastSeenAt)
    if (now.getTime() - lastSeen > SESSION_IDLE_MS) return INVALID
    if (now.getTime() - lastSeen >= TOUCH_INTERVAL_MS) await storage.execute({ sql: 'UPDATE AdminSession SET lastSeenAt = ? WHERE id = ? AND revokedAt IS NULL', args: [now.toISOString(), id] })
    return Object.freeze({ valid: true, sessionId: id })
  }
  async function revoke(id) {
    if (typeof id !== 'string' || id.length === 0) return
    await storage.execute({ sql: 'UPDATE AdminSession SET revokedAt = ? WHERE id = ? AND revokedAt IS NULL', args: [clock().toISOString(), id] })
  }
  async function revokeAll() {
    const result = await storage.execute({ sql: 'UPDATE AdminSession SET revokedAt = ? WHERE revokedAt IS NULL', args: [clock().toISOString()] })
    return Number(result.rowsAffected ?? 0)
  }
  async function record({ kind, actor, ip, userAgent }) {
    if (!AUTH_EVENT_KINDS.includes(kind)) throw new TypeError('Admin auth event kind is not allowed')
    const userAgentHash = typeof userAgent === 'string' && userAgent.length > 0 ? createHash('sha256').update(userAgent, 'utf8').digest('hex') : null
    await storage.execute({ sql: 'INSERT INTO AdminAuthEvent (id, kind, actor, ip, userAgentHash, createdAt) VALUES (?, ?, ?, ?, ?, ?)', args: [uuid(), kind, typeof actor === 'string' ? actor : null, typeof ip === 'string' ? ip : null, userAgentHash, clock().toISOString()] })
  }
  async function recentFailures({ ip, windowMs }) {
    const since = new Date(clock().getTime() - windowMs).toISOString()
    const result = await storage.execute({ sql: "SELECT COUNT(*) AS total FROM AdminAuthEvent WHERE ip = ? AND kind = 'login_failure' AND createdAt > ?", args: [ip, since] })
    return Number(result.rows[0]?.total ?? 0)
  }
  return Object.freeze({ issue, verify, revoke, revokeAll, record, recentFailures, sessionId })
}
