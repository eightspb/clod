export const prerender = false

import { db, Doctor } from 'astro:db'
import { eq } from 'astro:db'
import { isAuthenticated } from '../../../../lib/auth.js'

export async function PUT({ request, params }) {
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
    if (name !== undefined) updates.name = name
    if (specialization !== undefined) updates.specialization = specialization
    if (experienceYears !== undefined) updates.experienceYears = Number(experienceYears)
    if (bio !== undefined) updates.bio = bio
    if (slug !== undefined) updates.slug = slug
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
