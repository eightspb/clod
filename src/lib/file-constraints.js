/**
 * Shared file upload constraints for Second Opinion form.
 * Used by both client-side validation (SecondOpinionForm.jsx) and
 * server-side validation (api/second-opinion.js) to keep limits in sync.
 */

export const MAX_FILES = 5
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
export const MAX_TOTAL_FILE_SIZE_BYTES = 25 * 1024 * 1024
export const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png'])
export const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])
