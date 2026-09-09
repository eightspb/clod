import { db } from './database.js'
import { guardAdminRead, guardAdminRole } from './admin-api.js'
import { MAX_PAGE_NUMBER } from './admin-clinic-query.js'

const JSON_HEADERS = Object.freeze({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200
const UUID_PATTERN = /^[0-9a-f-]{36}$/
const LEGACY_ACTOR = Object.freeze({ login: undefined, displayName: 'Сессия до именованных учётных записей' })
const RETENTION_ACTOR = Object.freeze({ login: undefined, displayName: 'Автоматический ретеншен' })
const ENTRY_SQL = `SELECT id, 'patient' AS subject, patientId AS subjectId, action, actor, reason, createdAt FROM PatientAccess
  UNION ALL
  SELECT id, 'call' AS subject, entryId AS subjectId, action, actor, NULL AS reason, createdAt FROM MangoCallAccess`

function json(payload, status) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}

function pageNumber(raw, fallback, max) {
  const parsed = Number.parseInt(raw ?? '', 10)
  if (Number.isNaN(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

function actorLabel(actor, users) {
  if (typeof actor !== 'string') return LEGACY_ACTOR
  if (actor === 'retention') return RETENTION_ACTOR
  if (!actor.startsWith('u:')) return LEGACY_ACTOR
  return users.get(actor.slice(2)) ?? Object.freeze({ login: undefined, displayName: 'Удалённый пользователь' })
}

/**
 * Reads PatientAccess and MangoCallAccess as one paginated journal with resolved user names.
 */
export async function readAccessLog({ client, page, pageSize, patientId }) {
  const conditions = patientId ? "WHERE subject = 'patient' AND subjectId = ?" : ''
  const args = patientId ? [patientId] : []
  const total = await client.execute({ sql: `SELECT COUNT(*) AS total FROM (${ENTRY_SQL}) ${conditions}`, args })
  const rows = await client.execute({ sql: `SELECT * FROM (${ENTRY_SQL}) ${conditions} ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?`, args: [...args, pageSize, (page - 1) * pageSize] })
  const userRows = await client.execute('SELECT id, login, displayName FROM AdminUser')
  const users = new Map(userRows.rows.map((row) => [row.id, Object.freeze({ login: row.login, displayName: row.displayName })]))
  const data = rows.rows.map((row) => Object.freeze({ id: row.id, subject: row.subject, subjectId: row.subjectId, action: row.action, reason: row.reason ?? undefined, createdAt: row.createdAt, user: actorLabel(row.actor, users) }))
  const count = Number(total.rows[0]?.total ?? 0)
  return Object.freeze({ data, page: Object.freeze({ number: page, size: pageSize, total: count, pages: Math.ceil(count / pageSize) }) })
}

/**
 * GET /api/admin/access?page&pageSize&patientId — the personal-data access journal, admin only.
 */
export function createAccessLogEndpoint(input = {}) {
  const guard = input.guard ?? ((request) => guardAdminRole(request, { guard: guardAdminRead }))
  const client = input.client ?? (() => db.$client)
  const log = input.log ?? ((stage) => console.error('[admin/access]', stage))
  return async function accessLogEndpoint({ request }) {
    const blocked = await guard(request)
    if (blocked) return blocked
    try {
      const url = new URL(request.url)
      const patientId = url.searchParams.get('patientId') ?? undefined
      if (patientId !== undefined && !UUID_PATTERN.test(patientId)) return json({ error: 'Некорректный идентификатор пациента', code: 'INVALID_PATIENT_ID' }, 400)
      const page = pageNumber(url.searchParams.get('page'), 1, MAX_PAGE_NUMBER)
      const pageSize = pageNumber(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
      return json(await readAccessLog({ client: client(), page, pageSize, patientId }), 200)
    } catch (error) {
      log(`READ_FAILED:${error?.code ?? error?.name ?? 'UNKNOWN'}`)
      return json({ error: 'Internal error' }, 500)
    }
  }
}
