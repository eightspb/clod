export const prerender = false

import { db, Media, Doctor } from 'astro:db'
import { eq } from 'astro:db'
import { isAuthenticated, validateOrigin } from '../../../../lib/auth.js'
import { validateDoctorId, getSafeExtension } from '../../../../lib/upload-utils.js'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST({ request }) {
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
    const formData = await request.formData()
    const file = formData.get('file')
    const doctorIdRaw = formData.get('doctorId')
    const doctorId = typeof doctorIdRaw === 'string' ? doctorIdRaw.trim() : null

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'Файл не передан' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!doctorId) {
      return new Response(JSON.stringify({ error: 'doctorId не передан' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const doctorCheck = await validateDoctorId(doctorId)
    if (!doctorCheck.valid) {
      return new Response(JSON.stringify({ error: doctorCheck.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Допустимые форматы: JPEG, PNG, WebP' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'Файл слишком большой (макс. 5MB)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const ext = getSafeExtension(file.name)
    const filename = `${doctorId}-${Date.now()}.${ext}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'doctors')
    const filePath = join(uploadDir, filename)
    const publicUrl = `/uploads/doctors/${filename}`

    await mkdir(uploadDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // Save to Media table
    const mediaId = crypto.randomUUID()
    await db.insert(Media).values({
      id: mediaId,
      filename,
      mimeType: file.type,
      url: publicUrl,
      folder: 'doctors',
      createdAt: new Date(),
    })

    // Update doctor's photoMediaId
    await db.update(Doctor).set({ photoMediaId: mediaId }).where(eq(Doctor.id, doctorId))

    return new Response(JSON.stringify({ ok: true, mediaId, url: publicUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[upload/photo]', err)
    return new Response(JSON.stringify({ error: 'Ошибка загрузки файла' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
