/**
 * Shared font size controls configuration for the public layout.
 */
export const FONT_SIZE_STORAGE_KEY = 'clod-font-size'
export const FONT_SIZE_STEP = 5
export const FONT_SIZE_DEFAULT = 95
export const FONT_SIZE_MIN = FONT_SIZE_DEFAULT - FONT_SIZE_STEP * 7
export const FONT_SIZE_MAX = FONT_SIZE_DEFAULT + FONT_SIZE_STEP * 7

function clampFontSize(size) {
  return Math.min(Math.max(size, FONT_SIZE_MIN), FONT_SIZE_MAX)
}

/**
 * Restores a stored font size and falls back to the project baseline.
 */
export function readFontSize(raw) {
  const parsed = Number.parseInt(raw ?? '', 10)
  return Number.isNaN(parsed) ? FONT_SIZE_DEFAULT : clampFontSize(parsed)
}

/**
 * Moves the current font size one step up within the allowed range.
 */
export function increaseFontSize(size) {
  return clampFontSize(size + FONT_SIZE_STEP)
}

/**
 * Moves the current font size one step down within the allowed range.
 */
export function decreaseFontSize(size) {
  return clampFontSize(size - FONT_SIZE_STEP)
}
