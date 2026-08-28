const MEBIBYTE = 1024 * 1024
const ARTIFACT_JSON_BYTES = 270

export const CLINIC_IMPORT_STAGE_LIMITS = Object.freeze({ inputWork: 1_536 * MEBIBYTE, plaintext: 384 * MEBIBYTE, artifact: 512 * MEBIBYTE })

export function clinicImportStageArtifactByteLength(ciphertextBytes) {
  if (!Number.isSafeInteger(ciphertextBytes) || ciphertextBytes < 0) throw new RangeError('Invalid clinic import stage ciphertext size')
  const padding = ciphertextBytes % 3 === 0 ? 0 : 3 - ciphertextBytes % 3
  return 4 * Math.ceil(ciphertextBytes / 3) - padding + ARTIFACT_JSON_BYTES
}
