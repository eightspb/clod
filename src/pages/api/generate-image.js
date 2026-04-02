export const prerender = false

import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { buildPrompt, AVAILABLE_MODELS } from '../../lib/blog-prompts.js'

const API_KEY = import.meta.env.IMAGE_API_KEY
const POLZA_URL = 'https://polza.ai/api/v1/media'
const BLOG_DIR = join(process.cwd(), 'public', 'images', 'blog')
const CONTENT_DIR = join(process.cwd(), 'src', 'content', 'blog')
const JOBS_FILE = join(BLOG_DIR, '.jobs.json')

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function ensureDir() {
  if (!existsSync(BLOG_DIR)) await mkdir(BLOG_DIR, { recursive: true })
}

async function readJobs() {
  try {
    if (!existsSync(JOBS_FILE)) return {}
    const raw = await readFile(JOBS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function writeJobs(jobs) {
  await ensureDir()
  await writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2))
}

function existingImages() {
  if (!existsSync(BLOG_DIR)) return {}
  const out = {}
  for (const f of readdirSync(BLOG_DIR)) {
    if (f.endsWith('.webp')) out[f.replace('.webp', '')] = `/images/blog/${f}`
  }
  return out
}

const MODEL_PARAMS = {
  'black-forest-labs/flux.2-pro': {
    aspect_ratio: '16:9',
    image_resolution: '2K',
  },
  'google/gemini-3-pro-image-preview': {
    aspect_ratio: '16:9',
    image_resolution: '2K',
  },
  'google/gemini-3.1-flash-image-preview': {
    aspect_ratio: '16:9',
    image_resolution: '2K',
  },
  'google/gemini-2.5-flash-image': {
    aspect_ratio: '16:9',
  },
  'bytedance/seedream-4.5': {
    aspect_ratio: '16:9',
  },
  'bytedance/seedream-5-lite': {
    aspect_ratio: '16:9',
  },
  'openai/gpt-image-1.5': {
    aspect_ratio: '3:2',
    quality: 'high',
    output_format: 'webp',
  },
}

function inputForModel(prompt, model) {
  return { prompt, ...MODEL_PARAMS[model] }
}

async function submitToPolza(prompt, model) {
  const body = { model, input: inputForModel(prompt, model) }
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
    console.error('[gen] polza submit error:', res.status, text)
    let parsed
    try { parsed = JSON.parse(text) } catch { parsed = null }
    const msg = parsed?.error?.message || `Polza API ${res.status}`
    throw new Error(msg)
  }
  return res.json()
}

async function checkPolzaStatus(mediaId) {
  const res = await fetch(`${POLZA_URL}/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  })
  if (!res.ok) return null
  return res.json()
}

async function downloadAndSave(url, slug) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await ensureDir()
  await writeFile(join(BLOG_DIR, `${slug}.webp`), buf)
  return buf.length
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

export async function POST({ request }) {
  if (!API_KEY) return json({ error: 'IMAGE_API_KEY not configured' }, 500)
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const { slug, prompt, model = 'black-forest-labs/flux.2-pro' } = body
  if (!slug) return json({ error: 'slug required' }, 400)
  const finalPrompt = prompt || buildPrompt(slug)
  if (!finalPrompt) return json({ error: `No prompt for: ${slug}` }, 400)
  if (!AVAILABLE_MODELS.find(m => m.id === model)) return json({ error: `Unknown model: ${model}` }, 400)
  const jobs = await readJobs()
  if (jobs[slug]?.status === 'pending') {
    return json({ message: 'Already generating', job: jobs[slug] })
  }
  try {
    const result = await submitToPolza(finalPrompt, model)
    const mediaId = result.id
    if (!mediaId) return json({ error: 'No media ID from API' }, 502)
    if (result.status === 'completed') {
      const imgUrl = extractImageUrl(result.data)
      if (imgUrl) {
        const size = await downloadAndSave(imgUrl, slug)
        jobs[slug] = {
          status: 'completed',
          model,
          prompt: finalPrompt,
          mediaId,
          imageUrl: `/images/blog/${slug}.webp`,
          size,
          createdAt: new Date().toISOString(),
        }
        await writeJobs(jobs)
        return json({ job: jobs[slug] })
      }
    }
    jobs[slug] = {
      status: 'pending',
      model,
      prompt: finalPrompt,
      mediaId,
      createdAt: new Date().toISOString(),
    }
    await writeJobs(jobs)
    return json({ job: jobs[slug] })
  } catch (err) {
    console.error('[gen] submit error:', slug, err.message)
    jobs[slug] = {
      status: 'failed',
      model,
      prompt: finalPrompt,
      error: err.message,
      createdAt: new Date().toISOString(),
    }
    await writeJobs(jobs)
    return json({ job: jobs[slug] })
  }
}

async function applyImageToArticle(slug) {
  const mdPath = join(CONTENT_DIR, `${slug}.md`)
  if (!existsSync(mdPath)) throw new Error(`Article not found: ${slug}.md`)
  const imgPath = join(BLOG_DIR, `${slug}.webp`)
  if (!existsSync(imgPath)) throw new Error(`Image not found: ${slug}.webp`)
  const content = await readFile(mdPath, 'utf-8')
  const fmEnd = content.indexOf('---', 3)
  if (fmEnd === -1) throw new Error('Invalid frontmatter')
  const frontmatter = content.slice(0, fmEnd)
  const body = content.slice(fmEnd)
  const newImage = `/images/blog/${slug}.webp`
  const updated = frontmatter.replace(
    /^image:\s*["']?.*["']?\s*$/m,
    `image: "${newImage}"`
  )
  if (updated === frontmatter) throw new Error('Could not find image field in frontmatter')
  await writeFile(mdPath, updated + body)
  return newImage
}

export async function PATCH({ request }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const { slugs } = body
  if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
    return json({ error: 'slugs array required' }, 400)
  }
  const results = {}
  for (const slug of slugs) {
    try {
      const newImage = await applyImageToArticle(slug)
      results[slug] = { applied: true, image: newImage }
    } catch (err) {
      results[slug] = { applied: false, error: err.message }
    }
  }
  return json({ results })
}

let polling = false

export async function GET() {
  const jobs = await readJobs()
  const images = existingImages()
  const pendingSlugs = Object.entries(jobs)
    .filter(([, j]) => j.status === 'pending' && j.mediaId)
    .map(([slug]) => slug)
  if (pendingSlugs.length > 0 && !polling) {
    polling = true
    try {
      let changed = false
      for (const slug of pendingSlugs) {
        const job = jobs[slug]
        try {
          const result = await checkPolzaStatus(job.mediaId)
          if (!result) continue
          if (result.status === 'completed') {
            const imgUrl = extractImageUrl(result.data)
            if (imgUrl) {
              const size = await downloadAndSave(imgUrl, slug)
              jobs[slug] = { ...job, status: 'completed', imageUrl: `/images/blog/${slug}.webp`, size }
              images[slug] = `/images/blog/${slug}.webp`
              changed = true
            }
          } else if (result.status === 'failed') {
            jobs[slug] = { ...job, status: 'failed', error: result.error?.message || 'Generation failed' }
            changed = true
          } else if (result.status === 'cancelled') {
            jobs[slug] = { ...job, status: 'failed', error: 'Cancelled by API' }
            changed = true
          }
        } catch (err) {
          console.error('[gen] poll error:', slug, err.message)
        }
      }
      if (changed) await writeJobs(jobs)
    } finally {
      polling = false
    }
  }
  return json({ jobs, images })
}
