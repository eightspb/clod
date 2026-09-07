import { describe, it, expect } from 'vitest'
import {
  FONT_SIZE_DEFAULT,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_STEP,
  decreaseFontSize,
  increaseFontSize,
  readFontSize,
} from './font-size.js'

describe('font size settings', () => {
  it('keeps one step below the browser default as the baseline', () => {
    expect(FONT_SIZE_DEFAULT).toBe(95)
  })

  it('keeps five percent as the font size step', () => {
    expect(FONT_SIZE_STEP).toBe(5)
  })

  it('allows seven smaller steps from the default size', () => {
    expect(FONT_SIZE_MIN).toBe(FONT_SIZE_DEFAULT - FONT_SIZE_STEP * 7)
  })

  it('allows seven larger steps from the default size', () => {
    expect(FONT_SIZE_MAX).toBe(FONT_SIZE_DEFAULT + FONT_SIZE_STEP * 7)
  })

  it('increases the size by one step', () => {
    expect(increaseFontSize(FONT_SIZE_DEFAULT)).toBe(100)
  })

  it('decreases the size by one step', () => {
    expect(decreaseFontSize(FONT_SIZE_DEFAULT)).toBe(90)
  })

  it('falls back to the default size for invalid storage values', () => {
    expect(readFontSize('ne-ponyatno')).toBe(FONT_SIZE_DEFAULT)
  })
})
