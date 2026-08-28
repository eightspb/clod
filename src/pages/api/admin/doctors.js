export const prerender = false

import { db } from 'astro:db'
import { guardAdminRead } from '../../../lib/admin-api.js'
import { createDoctorRecords } from '../../../lib/doctor-records.js'

const HEADERS = Object.freeze({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' })

function json(payload, status) {
  return new Response(JSON.stringify(payload), { status, headers: HEADERS })
}

function options(input) {
  const records = input.records
  const guard = input.guard ?? guardAdminRead
  const log = input.log ?? ((stage) => console.error('[admin/doctors]', stage))
  if (![records, guard, log].every((value) => typeof value === 'function')) throw new TypeError('Doctor endpoint adapters are invalid')
  return Object.freeze({ records, guard, log })
}

/**
 * Creates the authenticated doctor catalog endpoint.
 */
export function createDoctorIndexEndpoint(input) {
  const configuration = options(input)
  return async function doctorIndexEndpoint({ request }) {
    const blocked = await configuration.guard(request)
    if (blocked) return blocked
    try {
      return json({ doctors: await configuration.records().list() }, 200)
    } catch {
      try {
        configuration.log('LIST_FAILED')
      } catch {
        return json({ error: 'DOCTORS_UNAVAILABLE', message: 'Данные врачей временно недоступны' }, 503)
      }
      return json({ error: 'DOCTORS_UNAVAILABLE', message: 'Данные врачей временно недоступны' }, 503)
    }
  }
}

export const GET = createDoctorIndexEndpoint({ records: () => createDoctorRecords({ client: db.$client }) })
