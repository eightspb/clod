import { describe, it, expect } from 'vitest'
import { isSafeDoctorId, getSafeExtension } from './upload-validation.js'

describe('upload-utils', () => {
  describe('isSafeDoctorId', () => {
    it('accepts alphanumeric ids', () => {
      expect(isSafeDoctorId('abc123')).toBe(true)
      expect(isSafeDoctorId('Doctor-1')).toBe(true)
      expect(isSafeDoctorId('a1b2c3')).toBe(true)
    })

    it('accepts UUID-style ids', () => {
      expect(isSafeDoctorId('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    })

    it('accepts slug-style ids', () => {
      expect(isSafeDoctorId('odintsov')).toBe(true)
      expect(isSafeDoctorId('doctor_id')).toBe(true)
    })

    it('rejects path traversal attempts', () => {
      expect(isSafeDoctorId('../etc/passwd')).toBe(false)
      expect(isSafeDoctorId('..\\windows')).toBe(false)
      expect(isSafeDoctorId('a/../b')).toBe(false)
    })

    it('rejects empty or invalid', () => {
      expect(isSafeDoctorId('')).toBe(false)
      expect(isSafeDoctorId(null)).toBe(false)
      expect(isSafeDoctorId(123)).toBe(false)
    })
  })

  describe('getSafeExtension', () => {
    it('returns whitelisted extensions', () => {
      expect(getSafeExtension('photo.jpg')).toBe('jpg')
      expect(getSafeExtension('photo.jpeg')).toBe('jpeg')
      expect(getSafeExtension('photo.png')).toBe('png')
      expect(getSafeExtension('photo.webp')).toBe('webp')
    })

    it('defaults to jpg for unknown extensions', () => {
      expect(getSafeExtension('file.php')).toBe('jpg')
      expect(getSafeExtension('file.svg')).toBe('jpg')
    })

    it('handles missing filename', () => {
      expect(getSafeExtension('')).toBe('jpg')
      expect(getSafeExtension(null)).toBe('jpg')
    })
  })
})
