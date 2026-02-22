export const prerender = false

import { db, DoctorCertificate, Media } from 'astro:db'
import { eq, and } from 'astro:db'
import { isAuthenticated, validateOrigin } from '../../../../../lib/auth.js'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'

export async function GET({ request, params }) {
  if (!await isAuthenticated(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { id: doctorId } = params
    const certs = await db.select().from(DoctorCertificate).where(eq(DoctorCertificate.doctorId, doctorId))
    const allMedia = await db.select().from(Media)
    const mediaMap = Object.fromEntries(allMedia.map(m => [m.id, m]))

    const result = certs
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(c => ({
        id: c.id,
        mediaId: c.mediaId,
        title: c.title,
        sortOrder: c.sortOrder,
        url: mediaMap[c.mediaId]?.url || null,
        createdAt: c.createdAt,
      }))

    return new Response(JSON.stringify({ certificates: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[doctors/[id]/certificates GET]', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function DELETE({ request, params }) {
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
    const { id: doctorId } = params
    const body = await request.json()
    const { certId } = body

    if (!certId) {
      return new Response(JSON.stringify({ error: 'certId не передан' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Find the cert to get mediaId
    const certs = await db
      .select()
      .from(DoctorCertificate)
      .where(and(eq(DoctorCertificate.id, certId), eq(DoctorCertificate.doctorId, doctorId)))

    if (certs.length === 0) {
      return new Response(JSON.stringify({ error: 'Сертификат не найден' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const cert = certs[0]

    // Get media record to find file path
    const mediaRecords = await db.select().from(Media).where(eq(Media.id, cert.mediaId))
    const media = mediaRecords[0]

    // Delete cert record
    await db.delete(DoctorCertificate).where(eq(DoctorCertificate.id, certId))

    // Delete media record and physical file
    if (media) {
      await db.delete(Media).where(eq(Media.id, media.id))
      try {
        const filePath = join(process.cwd(), 'public', media.url)
        await unlink(filePath)
      } catch {
        // File may not exist on disk - ignore
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[doctors/[id]/certificates DELETE]', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
