import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { fingerprintClinicImportIdentity, fingerprintClinicImportVisit } from './clinic-import-fingerprints.js'

const KEY = 'clinic-import-fingerprint-test-key-2026'

describe('clinic import fingerprint derivation', () => {
  it('preserves the exact v1 producer encodings for identity and visit values', () => {
    const identityValue = ['00000000-0000-8000-8000-000000000001', 'medesk_ehr', '0000000000000001']
    const identityPayload = JSON.stringify(['clod.clinic-import-identity', 'v1', 'external-identity', identityValue])
    const visitValue = 'appointment-synthetic'
    const visitPayload = ['clod.clinic-import-visit', 'v1', 'appointment-id', visitValue].map((part) => `${Buffer.byteLength(String(part), 'utf8')}:${String(part)}`).join('|')
    expect({ identity: fingerprintClinicImportIdentity({ key: KEY, domain: 'external-identity', value: identityValue }), visit: fingerprintClinicImportVisit({ key: KEY, domain: 'appointment-id', value: visitValue }) }).toEqual({ identity: `v1:${createHmac('sha256', KEY).update(identityPayload, 'utf8').digest('hex')}`, visit: `v1:${createHmac('sha256', KEY).update(visitPayload, 'utf8').digest('hex')}` })
  })
})
