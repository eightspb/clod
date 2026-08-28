import { describe, expect, it } from 'vitest'
import { CLINIC_IMPORT_STAGE_LIMITS, clinicImportStageArtifactByteLength } from './clinic-import-stage-limits.js'

describe('clinic import stage limits', () => {
  it('keeps at least twenty percent headroom over measured production sizes', () => {
    const measured = Object.freeze({ inputWork: 1_162_788_712, plaintext: 315_351_394, artifact: 420_468_796 })
    expect({ input: CLINIC_IMPORT_STAGE_LIMITS.inputWork / measured.inputWork >= 1.2, plaintext: CLINIC_IMPORT_STAGE_LIMITS.plaintext / measured.plaintext >= 1.2, artifact: CLINIC_IMPORT_STAGE_LIMITS.artifact / measured.artifact >= 1.2 }).toEqual({ input: true, plaintext: true, artifact: true })
  })

  it('predicts the exact encoded artifact size before base64 materialization', () => {
    expect({ measured: clinicImportStageArtifactByteLength(315_351_394), boundary: clinicImportStageArtifactByteLength(402_652_981), rejectedNext: clinicImportStageArtifactByteLength(402_652_982) }).toEqual({ measured: 420_468_796, boundary: 536_870_912, rejectedNext: 536_870_913 })
  })
})
