/**
 * Чистые функции валидации для загрузки файлов (без зависимости от astro:db).
 * Защита от path traversal и невалидных doctorId.
 */

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,100}$/
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

export function isSafeDoctorId(str) {
  if (typeof str !== 'string' || str.length === 0) return false
  const trimmed = str.trim()
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) return false
  return SAFE_ID_REGEX.test(trimmed)
}

export function getSafeExtension(filename) {
  const ext = (filename || '').split('.').pop()?.toLowerCase()
  return ext && ALLOWED_EXTENSIONS.includes(ext) ? ext : 'jpg'
}
