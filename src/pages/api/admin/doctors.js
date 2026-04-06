export const prerender = false

import { db, Doctor, Media, DoctorCertificate } from 'astro:db'
import { guardAdminRead } from '../../../lib/admin-api.js'

export async function GET({ request }) {
  const blocked = await guardAdminRead(request)
  if (blocked) return blocked

  try {
    const doctors = await db.select().from(Doctor)
    const allMedia = await db.select().from(Media)
    const allCerts = await db.select().from(DoctorCertificate)

    const mediaMap = Object.fromEntries(allMedia.map(m => [m.id, m]))

    const enriched = doctors.map(doc => {
      const photoMedia = doc.photoMediaId ? mediaMap[doc.photoMediaId] : null
      const certs = allCerts
        .filter(c => c.doctorId === doc.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(c => ({
          id: c.id,
          mediaId: c.mediaId,
          title: c.title,
          sortOrder: c.sortOrder,
          url: mediaMap[c.mediaId]?.url || null,
        }))
      return {
        ...doc,
        photoUrl: photoMedia?.url || null,
        certificates: certs,
      }
    })

    return new Response(JSON.stringify({ doctors: enriched }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[admin/doctors]', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
