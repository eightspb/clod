export const prerender = false

import { db, DoctorCertificate, Media } from 'astro:db'
import { and, eq } from 'astro:db'
import { guardAdminRead, guardAdminWrite, readAdminJson } from '../../../../../lib/admin-api.js'
import { deleteFileIfExists, mediaUrlToFilePath } from '../../../../../lib/upload-utils.js'

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function GET({ request, params }) {
  const blocked = await guardAdminRead(request)
  if (blocked) return blocked

  try {
    const { id: doctorId } = params
    const certs = await db.select().from(DoctorCertificate).where(eq(DoctorCertificate.doctorId, doctorId))
    const mediaRows = await db.select().from(Media)
    const mediaMap = Object.fromEntries(mediaRows.map((media) => [media.id, media]))

    const certificates = certs
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((cert) => ({
        id: cert.id,
        mediaId: cert.mediaId,
        title: cert.title,
        sortOrder: cert.sortOrder,
        url: mediaMap[cert.mediaId]?.url || null,
        createdAt: cert.createdAt,
      }))

    return jsonResponse({ certificates }, 200)
  } catch (err) {
    console.error('[doctors/[id]/certificates GET]', err)
    return jsonResponse({ error: 'Internal error' }, 500)
  }
}

export async function DELETE({ request, params }) {
  const blocked = await guardAdminWrite(request)
  if (blocked) return blocked

  try {
    const { id: doctorId } = params
    const parsed = await readAdminJson(request)
    if (!parsed.valid) {
      return jsonResponse({ error: parsed.tooLarge ? 'Тело запроса превышает допустимый размер' : 'Передайте корректный JSON' }, parsed.tooLarge ? 413 : 400)
    }
    const { certId } = parsed.value ?? {}

    if (!certId) {
      return jsonResponse({ error: 'certId не передан' }, 400)
    }

    const certs = await db
      .select()
      .from(DoctorCertificate)
      .where(and(eq(DoctorCertificate.id, certId), eq(DoctorCertificate.doctorId, doctorId)))

    if (certs.length === 0) {
      return jsonResponse({ error: 'Сертификат не найден' }, 404)
    }

    const cert = certs[0]
    const mediaRows = await db.select().from(Media).where(eq(Media.id, cert.mediaId))
    const media = mediaRows[0]

    await db.delete(DoctorCertificate).where(eq(DoctorCertificate.id, certId))

    if (media) {
      try {
        await db.delete(Media).where(eq(Media.id, media.id))
      } catch (cleanupError) {
        console.error('[doctors/[id]/certificates DELETE] media delete failed', cleanupError)
      }

      if (media.url) {
        try {
          await deleteFileIfExists(mediaUrlToFilePath(media.url))
        } catch (cleanupError) {
          console.error('[doctors/[id]/certificates DELETE] file delete failed', cleanupError)
        }
      }
    }

    return jsonResponse({ ok: true }, 200)
  } catch (err) {
    console.error('[doctors/[id]/certificates DELETE]', err)
    return jsonResponse({ error: 'Internal error' }, 500)
  }
}
