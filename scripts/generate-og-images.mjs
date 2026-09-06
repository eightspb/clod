#!/usr/bin/env bun
/**
 * Batch-generate OG images for all public pages via Polza.ai API.
 *
 * Usage:
 *   bun run scripts/generate-og-images.mjs            # generate all missing
 *   bun run scripts/generate-og-images.mjs --force     # regenerate all
 *   bun run scripts/generate-og-images.mjs index vab   # generate specific slugs
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { OG_PROMPTS, buildOgPrompt } from '../src/lib/og-prompts.js'

const POLZA_URL = 'https://polza.ai/api/v1/media'
const MODEL = 'black-forest-labs/flux.2-pro'
const OG_DIR = join(process.cwd(), 'public', 'images', 'og')
const ENV_PATH = join(process.cwd(), '.env')

function loadEnvKey(key) {
  if (!existsSync(ENV_PATH)) return undefined
  const raw = Bun.file(ENV_PATH).text()
  return raw.then(text => {
    const match = text.match(new RegExp(`^${key}=(.+)$`, 'm'))
    return match ? match[1].trim() : undefined
  })
}

const API_KEY = await loadEnvKey('IMAGE_API_KEY')
if (!API_KEY) {
  console.error('IMAGE_API_KEY not set in .env')
  process.exit(1)
}

async function ensureDir() {
  if (!existsSync(OG_DIR)) await mkdir(OG_DIR, { recursive: true })
}

async function submitToPolza(prompt) {
  const body = {
    model: MODEL,
    input: {
      prompt,
      aspect_ratio: '16:9',
      image_resolution: '2K',
    },
  }
  const res = await fetch(POLZA_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Polza API ${res.status}: ${text}`)
  }
  return res.json()
}

async function checkStatus(mediaId) {
  const res = await fetch(`${POLZA_URL}/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  })
  if (!res.ok) return null
  return res.json()
}

function extractImageUrl(data) {
  if (!data) return null
  if (Array.isArray(data)) {
    const first = data[0]
    if (typeof first === 'string') return first
    if (first?.url) return first.url
  }
  if (data.url) return data.url
  return null
}

async function downloadAndSave(url, slug) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await ensureDir()
  const path = join(OG_DIR, `${slug}.webp`)
  await writeFile(path, buf)
  return buf.length
}

async function pollUntilDone(mediaId, slug, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const result = await checkStatus(mediaId)
    if (!result) continue
    if (result.status === 'completed') {
      const imgUrl = extractImageUrl(result.data)
      if (imgUrl) {
        const size = await downloadAndSave(imgUrl, slug)
        return { status: 'completed', size }
      }
    }
    if (result.status === 'failed' || result.status === 'cancelled') {
      return { status: 'failed', error: result.error?.message || 'Generation failed' }
    }
    process.stdout.write('.')
  }
  return { status: 'timeout' }
}

async function generateOne(slug, force) {
  const prompt = buildOgPrompt(slug)
  if (!prompt) {
    console.log(`  [skip] No prompt for: ${slug}`)
    return false
  }
  const outPath = join(OG_DIR, `${slug}.webp`)
  if (existsSync(outPath) && !force) {
    console.log(`  [skip] Already exists: ${slug}.webp`)
    return false
  }
  console.log(`  [gen]  ${slug}...`)
  const result = await submitToPolza(prompt)
  const mediaId = result.id
  if (!mediaId) {
    console.log(`  [fail] No media ID for: ${slug}`)
    return false
  }
  if (result.status === 'completed') {
    const imgUrl = extractImageUrl(result.data)
    if (imgUrl) {
      const size = await downloadAndSave(imgUrl, slug)
      console.log(`  [done] ${slug}.webp (${(size / 1024).toFixed(0)} KB)`)
      return true
    }
  }
  process.stdout.write(`  [poll] ${slug}`)
  const poll = await pollUntilDone(mediaId, slug)
  if (poll.status === 'completed') {
    console.log(` done (${(poll.size / 1024).toFixed(0)} KB)`)
    return true
  }
  console.log(` ${poll.status}: ${poll.error || ''}`)
  return false
}

const args = process.argv.slice(2)
const force = args.includes('--force')
const specificSlugs = args.filter(a => !a.startsWith('--'))
const allSlugs = Object.keys(OG_PROMPTS)
const slugs = specificSlugs.length > 0 ? specificSlugs : allSlugs

console.log(`\nOG Image Generator — ${slugs.length} pages, model: ${MODEL}`)
console.log(`Output: ${OG_DIR}\n`)

await ensureDir()

let generated = 0
let skipped = 0
let failed = 0

for (const slug of slugs) {
  try {
    const ok = await generateOne(slug, force)
    if (ok) generated++
    else skipped++
  } catch (err) {
    console.log(`  [err]  ${slug}: ${err.message}`)
    failed++
  }
}

console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${failed} failed`)
console.log('Next step: update ogImage props in .astro files')
