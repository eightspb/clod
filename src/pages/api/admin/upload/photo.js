export const prerender = false

import { db, Doctor, Media } from 'astro:db'
import { eq } from 'astro:db'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isAuthenticated, validateOrigin } from '../../../../lib/auth.js'
import {
  buildStorageFilename,
  deleteFileIfExists,
  mediaUrlToFilePath,
  validateDoctorId,
  validateImageFile,
} from '../../../../lib/upload-utils.js'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

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

  const ctx = { filePath: null, mediaId: null }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const doctorIdRaw = formData.get('doctorId')
    const doctorId = typeof doctorIdRaw === 'string' ? doctorIdRaw.trim() : ''

    if (!file || typeof file === 'string') {
      return jsonResponse({ error: 'Файл не передан' }, 400)
    }

    if (!doctorId) {
      return jsonResponse({ error: 'doctorId не передан' }, 400)
    }

    const doctorCheck = await validateDoctorId(doctorId)
    if (!doctorCheck.valid) {
      return jsonResponse({ error: doctorCheck.error }, 400)
    }

    const fileCheck = validateImageFile(file, { maxSizeBytes: MAX_SIZE })
    if (!fileCheck.valid) {
      const errorMessage = fileCheck.error === 'Файл слишком большой'
        ? 'Файл слишком большой (макс. 5MB)'
        : fileCheck.error
      return jsonResponse({ error: errorMessage }, 400)
    }

    const filename = buildStorageFilename({
      doctorId,
      category: 'photo',
      originalName: file.name,
      uniqueSuffix: crypto.randomUUID(),
    })
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'doctors')
    ctx.filePath = join(uploadDir, filename)
    const publicUrl = `/uploads/doctors/${filename}`

    await mkdir(uploadDir, { recursive: true })
    await writeFile(ctx.filePath, Buffer.from(await file.arrayBuffer()))

    ctx.mediaId = crypto.randomUUID()
    await db.insert(Media).values({
      id: ctx.mediaId,
      filename,
      mimeType: file.type,
      url: publicUrl,
      folder: 'doctors',
      createdAt: new Date(),
    })

    await db
      .update(Doctor)
      .set({ photoMediaId: ctx.mediaId })
      .where(eq(Doctor.id, doctorId))

    const previousPhotoMediaId = doctorCheck.doctor?.photoMediaId

    if (previousPhotoMediaId && previousPhotoMediaId !== ctx.mediaId) {
      try {
        const previousMediaRows = await db.select().from(Media).where(eq(Media.id, previousPhotoMediaId))
        const previousMedia = previousMediaRows[0]

        await db.delete(Media).where(eq(Media.id, previousPhotoMediaId))

        if (previousMedia?.url) {
          await deleteFileIfExists(mediaUrlToFilePath(previousMedia.url))
        }
      } catch (cleanupError) {
        console.error('[upload/photo] previous photo cleanup failed', cleanupError)
      }
    }

    return jsonResponse({ ok: true, mediaId: ctx.mediaId, url: publicUrl }, 200)
  } catch (err) {
    if (ctx.mediaId) {
      try {
        await db.delete(Media).where(eq(Media.id, ctx.mediaId))
      } catch (cleanupError) {
        console.error('[upload/photo] media rollback failed', cleanupError)
      }
    }

    if (ctx.filePath) {
      try {
        await deleteFileIfExists(ctx.filePath)
      } catch (cleanupError) {
        console.error('[upload/photo] file rollback failed', cleanupError)
      }
    }

    console.error('[upload/photo]', err)
    return jsonResponse({ error: 'Ошибка загрузки файла' }, 500)
  }
}
