export const prerender = false

import { db, Doctor } from 'astro:db'
import { eq } from 'astro:db'
import { isAuthenticated, validateOrigin } from '../../../../lib/auth.js'

export async function PUT({ request, params }) {
  if (!validateOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!await isAuthenticated(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { id } = params
    const body = await request.json()
    const { name, specialization, experienceYears, bio, slug, photoMediaId } = body

    const updates = {}

    if (name !== undefined) {
      const trimmed = String(name).trim()
      if (trimmed.length === 0 || trimmed.length > 200) {
        return new Response(JSON.stringify({ error: 'name должен быть от 1 до 200 символов' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      updates.name = trimmed
    }

    if (specialization !== undefined) {
      const trimmed = String(specialization).trim()
      if (trimmed.length > 300) {
        return new Response(JSON.stringify({ error: 'specialization не должна превышать 300 символов' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      updates.specialization = trimmed
    }

    if (experienceYears !== undefined) {
      const years = Number(experienceYears)
      if (isNaN(years) || years < 0 || years > 80) {
        return new Response(JSON.stringify({ error: 'experienceYears должен быть числом от 0 до 80' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      updates.experienceYears = years
    }

    if (bio !== undefined) {
      const trimmed = String(bio).trim()
      if (trimmed.length > 5000) {
        return new Response(JSON.stringify({ error: 'bio не должно превышать 5000 символов' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      updates.bio = trimmed
    }

    if (slug !== undefined) {
      const trimmed = String(slug).trim().toLowerCase()
      if (!/^[a-z0-9-]+$/.test(trimmed) || trimmed.length > 100) {
        return new Response(JSON.stringify({ error: 'slug должен содержать только строчные буквы, цифры и дефисы (макс. 100 символов)' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      updates.slug = trimmed
    }

    if (photoMediaId !== undefined) updates.photoMediaId = photoMediaId || null

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await db.update(Doctor).set(updates).where(eq(Doctor.id, id))

    const updated = await db.select().from(Doctor).where(eq(Doctor.id, id))
    return new Response(JSON.stringify({ doctor: updated[0] || null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[admin/doctors/[id]]', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
