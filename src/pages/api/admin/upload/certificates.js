export const prerender = false

import { db, Media, DoctorCertificate } from 'astro:db'
import { isAuthenticated, validateOrigin } from '../../../../lib/auth.js'
import { validateDoctorId, getSafeExtension } from '../../../../lib/upload-utils.js'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB per file

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
    const doctorIdRaw = formData.get('doctorId')
    const doctorId = typeof doctorIdRaw === 'string' ? doctorIdRaw.trim() : null
    const files = formData.getAll('files')

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

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: 'Файлы не переданы' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'certificates')
    await mkdir(uploadDir, { recursive: true })

    const results = []
    const errors = []

    for (const file of files) {
      if (typeof file === 'string') continue

      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push({ name: file.name, error: 'Недопустимый формат (только JPEG, PNG, WebP)' })
        continue
      }

      if (file.size > MAX_SIZE) {
        errors.push({ name: file.name, error: 'Файл слишком большой (макс. 10MB)' })
        continue
      }

      try {
        const ext = getSafeExtension(file.name)
        const filename = `${doctorId}-cert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
        const filePath = join(uploadDir, filename)
        const publicUrl = `/uploads/certificates/${filename}`

        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(filePath, buffer)

        const mediaId = crypto.randomUUID()
        await db.insert(Media).values({
          id: mediaId,
          filename,
          mimeType: file.type,
          url: publicUrl,
          folder: 'certificates',
          createdAt: new Date(),
        })

        const certId = crypto.randomUUID()
        await db.insert(DoctorCertificate).values({
          id: certId,
          doctorId,
          mediaId,
          title: file.name.replace(/\.[^.]+$/, ''), // filename without extension as default title
          sortOrder: 0,
          createdAt: new Date(),
        })

        results.push({ id: certId, mediaId, url: publicUrl, title: file.name.replace(/\.[^.]+$/, '') })
      } catch (fileErr) {
        console.error('[upload/certificates] file error:', fileErr)
        errors.push({ name: file.name, error: 'Ошибка при сохранении файла' })
      }
    }

    return new Response(JSON.stringify({ ok: true, uploaded: results, errors }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[upload/certificates]', err)
    return new Response(JSON.stringify({ error: 'Ошибка загрузки файлов' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
