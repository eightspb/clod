import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DOCTORS } from '../src/lib/doctors-data.js'
import { webpDimensions } from '../src/lib/webp-dimensions.js'

/**
 * Derives responsive WebP files from normalized transparent mobile portraits.
 * Run after normalize-portraits.swift with the same existing cwebp executable.
 * Usage: bun scripts/resize-doctor-portraits.mjs
 */
function resizePortraits(doctor) {
  const source = fileURLToPath(new URL(`../public${doctor.photoMobile}`, import.meta.url))
  const { width, height } = webpDimensions(readFileSync(source))
  if (width !== 600 || height !== 800) throw new Error(`Expected a normalized 600x800 portrait for ${doctor.slug}`)
  for (const candidate of doctor.photoMobileSrcSet.split(', ')) {
    const [file, descriptor] = candidate.split(' ')
    if (file === doctor.photoMobile) continue
    const targetWidth = Number.parseInt(descriptor, 10)
    if (!Number.isInteger(targetWidth) || targetWidth <= 0 || targetWidth >= width) throw new Error(`Invalid portrait width for ${doctor.slug}: ${descriptor}`)
    const target = fileURLToPath(new URL(`../public${file}`, import.meta.url))
    const result = spawnSync('cwebp', ['-quiet', '-q', '82', '-m', '6', '-sharp_yuv', '-resize', String(targetWidth), String(targetWidth * height / width), source, '-o', target], { stdio: 'inherit' })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`cwebp failed for ${file} with status ${result.status}`)
    console.log(`${file}: ${readFileSync(target).length} bytes`)
  }
}

for (const doctor of DOCTORS) resizePortraits(doctor)
