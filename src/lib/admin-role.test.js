import { describe, expect, it } from 'vitest'
import { isStaffViewer } from './admin-role.js'

describe('admin role viewer', () => {
  it('treats the staff stamp as staff', () => {
    expect(isStaffViewer({ body: { dataset: { adminRole: 'staff' } } })).toBe(true)
  })

  it('keeps the full interface without a stamp', () => {
    expect(isStaffViewer({ body: { dataset: {} } })).toBe(false)
  })

  it('keeps the full interface without a document', () => {
    expect(isStaffViewer(undefined)).toBe(false)
  })
})
