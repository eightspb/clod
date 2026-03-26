/**
 * Чистые функции валидации для загрузки файлов (без зависимости от astro:db).
 * Защита от path traversal и невалидных doctorId.
 */

import { join } from 'node:path'

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,100}$/
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

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

export function validateImageFile(file, { maxSizeBytes }) {
  if (!file || typeof file !== 'object') {
    return { valid: false, error: 'Файл не передан' }
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Допустимые форматы: JPEG, PNG, WebP' }
  }

  if (typeof file.size !== 'number' || file.size <= 0) {
    return { valid: false, error: 'Файл пустой или повреждён' }
  }

  if (file.size > maxSizeBytes) {
    return { valid: false, error: 'Файл слишком большой' }
  }

  return { valid: true }
}

export function buildStorageFilename({ doctorId, category, originalName, uniqueSuffix }) {
  const extension = getSafeExtension(originalName)
  const safeSuffix = (uniqueSuffix || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'file'
  return `${doctorId}-${category}-${safeSuffix}.${extension}`
}

export function mediaUrlToFilePath(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) {
    throw new Error('Unsupported media URL')
  }

  return join(process.cwd(), 'public', url.slice(1))
}
