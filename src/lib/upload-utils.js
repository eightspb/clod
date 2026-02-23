/**
 * Утилиты для безопасной загрузки файлов.
 * Защита от path traversal и невалидных doctorId.
 */

import { db, Doctor } from 'astro:db'
import { eq } from 'astro:db'
import { isSafeDoctorId } from './upload-validation.js'

export { isSafeDoctorId, getSafeExtension } from './upload-validation.js'

export async function validateDoctorId(doctorId) {
  if (!isSafeDoctorId(doctorId)) return { valid: false, error: 'Некорректный идентификатор доктора' }
  const rows = await db.select().from(Doctor).where(eq(Doctor.id, doctorId.trim()))
  if (!rows.length) return { valid: false, error: 'Доктор не найден' }
  return { valid: true }
}
