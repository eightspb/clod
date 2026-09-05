export const prerender = false

import { db, DoctorCertificate, Media } from '../../../../lib/database.js'
import { eq } from '../../../../lib/database.js'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { guardAdminWrite } from '../../../../lib/admin-api.js'
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
  const blocked = await guardAdminWrite(request)
  if (blocked) return blocked

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

      const ctx = { filePath: null, mediaId: null }

      try {
        const filename = buildStorageFilename({
          doctorId,
          category: 'cert',
          originalName: file.name,
          uniqueSuffix: crypto.randomUUID(),
        })
        const publicUrl = `/uploads/certificates/${filename}`
        ctx.filePath = join(uploadDir, filename)

        await writeFile(ctx.filePath, Buffer.from(await file.arrayBuffer()))

        ctx.mediaId = crypto.randomUUID()
        await db.insert(Media).values({
          id: ctx.mediaId,
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
          mediaId: ctx.mediaId,
          title,
          sortOrder: 0,
          createdAt: new Date(),
        })

        uploaded.push({ id: certId, mediaId: ctx.mediaId, url: publicUrl, title })
      } catch (fileErr) {
        if (ctx.mediaId) {
          try {
            await db.delete(Media).where(eq(Media.id, ctx.mediaId))
          } catch (cleanupError) {
            console.error('[upload/certificates] media rollback failed', cleanupError?.code ?? cleanupError?.name ?? 'UNKNOWN')
          }
        }

        if (ctx.filePath) {
          try {
            await deleteFileIfExists(ctx.filePath)
          } catch (cleanupError) {
            console.error('[upload/certificates] file rollback failed', cleanupError?.code ?? cleanupError?.name ?? 'UNKNOWN')
          }
        }

        console.error('[upload/certificates] file error', fileErr?.code ?? fileErr?.name ?? 'UNKNOWN')
        errors.push({ name: file.name, error: 'Ошибка при сохранении файла' })
      }
    }

    return jsonResponse({ ok: true, uploaded, errors }, 200)
  } catch (err) {
    console.error('[upload/certificates]', err?.code ?? err?.name ?? 'UNKNOWN')
    return jsonResponse({ error: 'Ошибка загрузки файлов' }, 500)
  }
}
