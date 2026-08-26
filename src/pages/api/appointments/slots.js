export const prerender = false

import { validateOrigin } from '../../../lib/auth.js'
import { validateScheduleQuery } from '../../../lib/appointment-validation.js'
import { normalizeAppointmentSchedule } from '../../../lib/appointment-schedule.js'
import { getClientIp } from '../../../lib/client-ip.js'
import { createMedflexClient } from '../../../lib/medflex-client.js'
import { resolveMedflexDoctor } from '../../../lib/medflex-doctors.js'
import { checkRateLimit } from '../../../lib/rate-limit.js'

const JSON_HEADERS = Object.freeze({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' })
const RATE_LIMIT_OPTIONS = Object.freeze({ namespace: 'appointments-slots', maxRequests: 30, windowMs: 60_000 })

function json(payload, status, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { ...JSON_HEADERS, ...headers } })
}

function error(status, code, message, fields, headers) {
  const payload = { error: code, message }
  if (fields !== undefined) payload.fields = fields
  return json(payload, status, headers)
}

function scheduleInput(query, doctor) {
  return Object.freeze({ townId: doctor.townId, dateStart: query.from, days: query.days, doctorIds: [doctor.doctorId], lpuIds: [doctor.lpuId], specialityIds: doctor.appointmentTypes.map(({ specialityId }) => specialityId), page: 1 })
}

function productionLog(stage) {
  console.error('[appointments/slots]', stage)
}

function safeLog(log, stage) {
  try {
    log(stage)
  } catch {
    return
  }
}

/**
 * Creates the HTTP adapter for normalized Medflex schedule lookup.
 */
export function createSlotsEndpoint(input = {}) {
  const medflex = input.medflex === undefined ? createMedflexClient : input.medflex
  const clock = input.clock === undefined ? () => new Date() : input.clock
  const log = input.log === undefined ? productionLog : input.log
  if (typeof medflex !== 'function' || typeof clock !== 'function' || typeof log !== 'function') throw new TypeError('Appointment slots adapters must be functions')
  return async function slotsEndpoint({ request, url }) {
    if (request.headers.get('origin') !== null && !validateOrigin(request)) return error(403, 'FORBIDDEN_ORIGIN', 'Недопустимый источник запроса')
    const rate = checkRateLimit(getClientIp(request), RATE_LIMIT_OPTIONS)
    if (!rate.allowed) return error(429, 'RATE_LIMITED', 'Слишком много запросов расписания. Попробуйте позже', undefined, { 'Retry-After': String(rate.retryAfterSec) })
    const requestUrl = url instanceof URL ? url : new URL(request.url)
    const validation = validateScheduleQuery(requestUrl.searchParams)
    if (!validation.valid) return error(400, validation.error.code, 'Проверьте параметры расписания', validation.error.fields)
    const query = validation.value
    const doctor = resolveMedflexDoctor(query.doctor)
    if (!doctor.available) return error(404, 'DOCTOR_UNAVAILABLE', 'Онлайн-запись к этому врачу недоступна')
    try {
      const client = medflex()
      const page = await client.getSchedule(scheduleInput(query, doctor))
      const data = normalizeAppointmentSchedule({ doctorSlug: query.doctor, page, from: query.from, days: query.days, now: clock() })
      return json({ data }, 200)
    } catch {
      safeLog(log, 'SCHEDULE_LOOKUP_FAILED')
      return error(503, 'SCHEDULE_UNAVAILABLE', 'Расписание временно недоступно')
    }
  }
}

export const GET = createSlotsEndpoint()
