/**
 * Утилиты для безопасной загрузки файлов.
 * Защита от path traversal и невалидных doctorId.
 */

import { db, Doctor } from './database.js'
import { eq } from './database.js'
import { unlink } from 'node:fs/promises'
import { isSafeDoctorId } from './upload-validation.js'

export {
  buildStorageFilename,
  getSafeExtension,
  isSafeDoctorId,
  mediaUrlToFilePath,
  validateImageFile,
} from './upload-validation.js'

export async function validateDoctorId(doctorId) {
  if (!isSafeDoctorId(doctorId)) return { valid: false, error: 'Некорректный идентификатор доктора' }

  const rows = await db.select().from(Doctor).where(eq(Doctor.id, doctorId.trim()))
  if (!rows.length) return { valid: false, error: 'Доктор не найден' }

  return { valid: true, doctor: rows[0] }
}

export async function deleteFileIfExists(filePath) {
  try {
    await unlink(filePath)
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error
    }
  }
}
