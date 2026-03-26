export const prerender = false

import { db, DoctorCertificate, Media } from 'astro:db'
import { eq } from 'astro:db'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isAuthenticated, validateOrigin } from '../../../../lib/auth.js'
import {
  buildStorageFilename,
  deleteFileIfExists,
  validateDoctorId,
  validateImageFile,
} from '../../../../lib/upload-utils.js'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB per file

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST({ request }) {
  if (!validateOrigin(request)) {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  if (!await isAuthenticated(request)) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  try {
    const formData = await request.formData()
    const doctorIdRaw = formData.get('doctorId')
    const doctorId = typeof doctorIdRaw === 'string' ? doctorIdRaw.trim() : ''
    const files = formData.getAll('files')

    if (!doctorId) {
      return jsonResponse({ error: 'doctorId не передан' }, 400)
    }

    const doctorCheck = await validateDoctorId(doctorId)
    if (!doctorCheck.valid) {
      return jsonResponse({ error: doctorCheck.error }, 400)
    }

    if (!files.length) {
      return jsonResponse({ error: 'Файлы не переданы' }, 400)
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'certificates')
    await mkdir(uploadDir, { recursive: true })

    const uploaded = []
    const errors = []

    for (const file of files) {
      if (typeof file === 'string') {
        errors.push({ name: 'unknown', error: 'Некорректный формат файла' })
        continue
      }

      const fileCheck = validateImageFile(file, { maxSizeBytes: MAX_SIZE })
      if (!fileCheck.valid) {
        errors.push({ name: file.name, error: fileCheck.error })
        continue
      }

      let filePath = null
      let mediaId = null

      try {
        const filename = buildStorageFilename({
          doctorId,
          category: 'cert',
          originalName: file.name,
          uniqueSuffix: crypto.randomUUID(),
        })
        const publicUrl = `/uploads/certificates/${filename}`
        filePath = join(uploadDir, filename)

        await writeFile(filePath, Buffer.from(await file.arrayBuffer()))

        mediaId = crypto.randomUUID()
        await db.insert(Media).values({
          id: mediaId,
          filename,
          mimeType: file.type,
          url: publicUrl,
          folder: 'certificates',
          createdAt: new Date(),
        })

        const certId = crypto.randomUUID()
        const title = file.name.replace(/\.[^.]+$/, '') || 'Сертификат'

        await db.insert(DoctorCertificate).values({
          id: certId,
          doctorId,
          mediaId,
          title,
          sortOrder: 0,
          createdAt: new Date(),
        })

        uploaded.push({ id: certId, mediaId, url: publicUrl, title })
      } catch (fileErr) {
        if (mediaId) {
          try {
            await db.delete(Media).where(eq(Media.id, mediaId))
          } catch (cleanupError) {
            console.error('[upload/certificates] media rollback failed', cleanupError)
          }
        }

        if (filePath) {
          try {
            await deleteFileIfExists(filePath)
          } catch (cleanupError) {
            console.error('[upload/certificates] file rollback failed', cleanupError)
          }
        }

        console.error('[upload/certificates] file error', fileErr)
        errors.push({ name: file.name, error: 'Ошибка при сохранении файла' })
      }
    }

    return jsonResponse({ ok: true, uploaded, errors }, 200)
  } catch (err) {
    console.error('[upload/certificates]', err)
    return jsonResponse({ error: 'Ошибка загрузки файлов' }, 500)
  }
}
