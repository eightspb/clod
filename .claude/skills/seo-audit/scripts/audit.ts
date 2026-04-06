/**
 * SEO Audit Script — Deep HTML parsing and JSON-LD validation
 *
 * Builds the Astro project to dist/, then parses generated HTML with cheerio.
 * Validates meta tags, JSON-LD structured data, heading hierarchy, images,
 * internal links, and Yandex-specific requirements.
 *
 * Usage:
 *   bun .claude/skills/seo-audit/scripts/audit.ts [--skip-build] [--page /path] [--json]
 *
 * Flags:
 *   --skip-build  Skip `bun run build`, use existing dist/
 *   --page /path  Audit a single page (e.g., --page /mammology)
 *   --json        Output as JSON instead of markdown
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { execSync } from 'node:child_process'

// Ensure cheerio is available — resolve from project root
const projectRoot = process.cwd()
const cheerioPath = join(projectRoot, 'node_modules', 'cheerio')

try {
  await import(cheerioPath)
} catch {
  console.log('Installing cheerio...')
  execSync('bun add -d cheerio', { cwd: projectRoot, stdio: 'inherit' })
}

const { load } = await import(cheerioPath)

// --- Types ---

interface Finding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  message: string
  file: string
  fix?: string
}

interface PageAudit {
  url: string
  file: string
  title: string
  description: string
  h1Count: number
  h1Text: string
  headingOrder: string[]
  jsonLdTypes: string[]
  imageIssues: string[]
  metaIssues: string[]
  linkTargets: string[]
}

// --- Config ---

const ROOT = process.cwd()
// Astro hybrid mode puts prerendered pages in dist/client/
const DIST_RAW = join(ROOT, 'dist')
const DIST = join(DIST_RAW, 'client')
const args = process.argv.slice(2)
const skipBuild = args.includes('--skip-build')
const jsonOutput = args.includes('--json')
const pageFilter = args.includes('--page')
  ? args[args.indexOf('--page') + 1]
  : undefined

// --- Build ---

if (!skipBuild) {
  console.log('Building project...')
  try {
    execSync('bun run build', { cwd: ROOT, stdio: 'pipe', timeout: 120_000 })
    console.log('Build complete.')
  } catch (error) {
    console.error('Build failed. Use --skip-build to audit existing dist/')
    process.exit(1)
  }
}

// --- Helpers ---

async function findHtmlFiles(dir: string): Promise<string[]> {
  const results: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      // Skip admin and api directories
      if (entry.name === 'admin' || entry.name === 'api') continue
      results.push(...await findHtmlFiles(fullPath))
    } else if (entry.name.endsWith('.html')) {
      results.push(fullPath)
    }
  }
  return results
}

function fileToUrl(filePath: string): string {
  const rel = relative(DIST, filePath)
    .replace(/index\.html$/, '')
    .replace(/\.html$/, '')
  return '/' + rel.replace(/\/$/, '') || '/'
}

function severityWeight(s: Finding['severity']): number {
  const map = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
  return map[s]
}

function calculateScore(findings: Finding[]): number {
  // Deduplicate by unique (severity + category + message-pattern) to avoid
  // inflated scores from repetitive per-page issues (e.g., same heading gap in footer)
  const uniquePatterns = new Set<string>()
  for (const f of findings) {
    // Normalize message to a pattern: strip file-specific details
    const pattern = `${f.severity}:${f.category}:${f.message.replace(/".+?"/, '""').replace(/\d+/g, 'N')}`
    uniquePatterns.add(pattern)
  }
  const criticalCount = [...uniquePatterns].filter(p => p.startsWith('CRITICAL:')).length
  const highCount = [...uniquePatterns].filter(p => p.startsWith('HIGH:')).length
  const mediumCount = [...uniquePatterns].filter(p => p.startsWith('MEDIUM:')).length
  const lowCount = [...uniquePatterns].filter(p => p.startsWith('LOW:')).length
  const raw = 10 - (criticalCount * 1.5) - (highCount * 0.5) - (mediumCount * 0.15) - (lowCount * 0.05)
  return Math.max(1, Math.min(10, Math.round(raw * 10) / 10))
}

// --- Audit Functions ---

function auditMeta(
  $: ReturnType<typeof load>,
  url: string,
  file: string,
  findings: Finding[]
): { title: string; description: string } {
  const title = $('title').text().trim()
  const description = $('meta[name="description"]').attr('content')?.trim() || ''
  const keywords = $('meta[name="keywords"]').attr('content')?.trim() || ''
  const canonical = $('link[rel="canonical"]').attr('href') || ''
  const ogTitle = $('meta[property="og:title"]').attr('content') || ''
  const ogDesc = $('meta[property="og:description"]').attr('content') || ''
  const ogImage = $('meta[property="og:image"]').attr('content') || ''
  const ogUrl = $('meta[property="og:url"]').attr('content') || ''
  const lang = $('html').attr('lang') || ''
  const viewport = $('meta[name="viewport"]').attr('content') || ''
  const charset = $('meta[charset]').length > 0 || $('meta[http-equiv="Content-Type"]').length > 0
  const noindex = $('meta[name="robots"]').attr('content')?.includes('noindex')
  if (!title) {
    findings.push({ severity: 'CRITICAL', category: 'Meta', message: 'Missing <title>', file, fix: 'Add title prop to page' })
  } else if (title.length < 30) {
    findings.push({ severity: 'HIGH', category: 'Meta', message: `Title too short (${title.length} chars): "${title}"`, file, fix: 'Expand to 30-60 chars' })
  } else if (title.length > 60) {
    findings.push({ severity: 'MEDIUM', category: 'Meta', message: `Title may be truncated (${title.length} chars): "${title.slice(0, 50)}..."`, file })
  }
  if (!description) {
    findings.push({ severity: 'CRITICAL', category: 'Meta', message: 'Missing meta description', file, fix: 'Add description prop to page' })
  } else if (description.length < 120) {
    findings.push({ severity: 'MEDIUM', category: 'Meta', message: `Description short (${description.length} chars)`, file, fix: 'Expand to 120-160 chars' })
  } else if (description.length > 160) {
    findings.push({ severity: 'LOW', category: 'Meta', message: `Description may be truncated (${description.length} chars)`, file })
  }
  if (!keywords) {
    findings.push({ severity: 'MEDIUM', category: 'Meta', message: 'Missing meta keywords', file })
  } else if (!keywords.includes('СПб') && !keywords.includes('Санкт-Петербург')) {
    findings.push({ severity: 'HIGH', category: 'GEO', message: 'Keywords missing geo markers (СПб/Санкт-Петербург)', file, fix: 'Add geo keywords' })
  }
  if (!canonical) {
    findings.push({ severity: 'HIGH', category: 'Meta', message: 'Missing canonical link', file })
  } else if (!canonical.startsWith('https://')) {
    findings.push({ severity: 'HIGH', category: 'Meta', message: `Canonical not HTTPS: ${canonical}`, file })
  }
  if (!ogTitle) {
    findings.push({ severity: 'MEDIUM', category: 'OG', message: 'Missing og:title', file })
  }
  if (!ogImage) {
    findings.push({ severity: 'MEDIUM', category: 'OG', message: 'Missing og:image', file })
  }
  if (!ogUrl) {
    findings.push({ severity: 'LOW', category: 'OG', message: 'Missing og:url', file })
  }
  if (noindex) {
    findings.push({ severity: 'CRITICAL', category: 'Meta', message: 'Page has noindex — will not be indexed', file })
  }
  if (!lang || lang !== 'ru') {
    findings.push({ severity: 'HIGH', category: 'Meta', message: `html lang="${lang}" (expected "ru")`, file })
  }
  return { title, description }
}

function auditHeadings(
  $: ReturnType<typeof load>,
  url: string,
  file: string,
  findings: Finding[]
): { h1Count: number; h1Text: string; headingOrder: string[] } {
  const headings: { level: number; text: string }[] = []
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = $(el).prop('tagName')?.toLowerCase() || ''
    const level = parseInt(tag.replace('h', ''), 10)
    headings.push({ level, text: $(el).text().trim().slice(0, 80) })
  })
  const h1s = headings.filter(h => h.level === 1)
  const h1Count = h1s.length
  const h1Text = h1s[0]?.text || ''
  if (h1Count === 0) {
    findings.push({ severity: 'CRITICAL', category: 'Headings', message: 'No <h1> found', file, fix: 'Add exactly one H1 per page' })
  } else if (h1Count > 1) {
    findings.push({ severity: 'HIGH', category: 'Headings', message: `Multiple H1 tags (${h1Count})`, file, fix: 'Keep exactly one H1' })
  }
  // Check heading order (no skipped levels)
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1].level
    const curr = headings[i].level
    if (curr > prev + 1) {
      findings.push({
        severity: 'HIGH',
        category: 'Headings',
        message: `Skipped heading level: H${prev} -> H${curr} ("${headings[i].text.slice(0, 40)}")`,
        file
      })
      break // Report once per page
    }
  }
  return { h1Count, h1Text, headingOrder: headings.map(h => `H${h.level}`) }
}

function auditImages(
  $: ReturnType<typeof load>,
  url: string,
  file: string,
  findings: Finding[]
): string[] {
  const issues: string[] = []
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || 'unknown'
    const alt = $(el).attr('alt')
    const width = $(el).attr('width')
    const height = $(el).attr('height')
    const loading = $(el).attr('loading')
    const shortSrc = src.slice(0, 60)
    if (alt === undefined) {
      findings.push({ severity: 'CRITICAL', category: 'Images', message: `<img> missing alt: ${shortSrc}`, file, fix: 'Add alt attribute' })
      issues.push(`no-alt: ${shortSrc}`)
    }
    if (!width || !height) {
      findings.push({ severity: 'HIGH', category: 'Images', message: `<img> missing width/height: ${shortSrc}`, file, fix: 'Add explicit dimensions' })
      issues.push(`no-dimensions: ${shortSrc}`)
    }
  })
  return issues
}

function auditJsonLd(
  $: ReturnType<typeof load>,
  url: string,
  file: string,
  findings: Finding[]
): string[] {
  const types: string[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html()
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      const processItem = (item: Record<string, unknown>) => {
        const type = item['@type'] as string
        if (type) types.push(type)
        // Validate required fields per type
        if (type === 'MedicalBusiness' || type === 'MedicalClinic') {
          if (!item.name) findings.push({ severity: 'HIGH', category: 'JSON-LD', message: `${type} missing "name"`, file })
          if (!item.telephone) findings.push({ severity: 'HIGH', category: 'JSON-LD', message: `${type} missing "telephone"`, file })
          if (!item.address) findings.push({ severity: 'HIGH', category: 'JSON-LD', message: `${type} missing "address"`, file })
          if (!item.geo) findings.push({ severity: 'MEDIUM', category: 'JSON-LD', message: `${type} missing "geo"`, file })
          if (!item.openingHours) findings.push({ severity: 'MEDIUM', category: 'JSON-LD', message: `${type} missing "openingHours"`, file })
          if (!item.aggregateRating) findings.push({ severity: 'LOW', category: 'JSON-LD', message: `${type} missing "aggregateRating"`, file })
          if (!item.sameAs) findings.push({ severity: 'MEDIUM', category: 'JSON-LD', message: `${type} missing "sameAs" (social links)`, file })
        }
        if (type === 'Physician') {
          if (!item.name) findings.push({ severity: 'HIGH', category: 'JSON-LD', message: 'Physician missing "name"', file })
          if (!item.medicalSpecialty) findings.push({ severity: 'HIGH', category: 'JSON-LD', message: 'Physician missing "medicalSpecialty"', file })
          if (!item.sameAs) findings.push({ severity: 'MEDIUM', category: 'JSON-LD', message: 'Physician missing "sameAs" (proDoctorovUrl)', file })
        }
        if (type === 'FAQPage') {
          const mainEntity = item.mainEntity as unknown[]
          if (!mainEntity || !Array.isArray(mainEntity) || mainEntity.length === 0) {
            findings.push({ severity: 'HIGH', category: 'JSON-LD', message: 'FAQPage has empty mainEntity', file })
          }
        }
        if (type === 'BreadcrumbList') {
          const items = item.itemListElement as unknown[]
          if (!items || !Array.isArray(items) || items.length === 0) {
            findings.push({ severity: 'HIGH', category: 'JSON-LD', message: 'BreadcrumbList has empty itemListElement', file })
          }
        }
        if (type === 'MedicalCondition') {
          if (!item.name) findings.push({ severity: 'HIGH', category: 'JSON-LD', message: 'MedicalCondition missing "name"', file })
        }
        if (type === 'Article' || type === 'MedicalWebPage') {
          if (!item.headline) findings.push({ severity: 'HIGH', category: 'JSON-LD', message: `${type} missing "headline"`, file })
          if (!item.datePublished) findings.push({ severity: 'HIGH', category: 'JSON-LD', message: `${type} missing "datePublished"`, file })
          if (!item.author) findings.push({ severity: 'HIGH', category: 'JSON-LD', message: `${type} missing "author"`, file })
        }
      }
      if (Array.isArray(data)) {
        data.forEach(processItem)
      } else if (data['@graph']) {
        (data['@graph'] as Record<string, unknown>[]).forEach(processItem)
      } else {
        processItem(data)
      }
    } catch {
      findings.push({ severity: 'CRITICAL', category: 'JSON-LD', message: 'Invalid JSON-LD — parse error', file })
    }
  })
  return types
}

function auditLinks(
  $: ReturnType<typeof load>,
  url: string,
  file: string,
  allUrls: Set<string>,
  findings: Finding[]
): string[] {
  const targets: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (href.startsWith('/') && !href.startsWith('//')) {
      const clean = href.split('#')[0].split('?')[0].replace(/\/$/, '') || '/'
      targets.push(clean)
    }
  })
  return targets
}

function auditAccessibility(
  $: ReturnType<typeof load>,
  url: string,
  file: string,
  findings: Finding[]
): void {
  // Check for buttons without accessible text
  $('button').each((_, el) => {
    const text = $(el).text().trim()
    const ariaLabel = $(el).attr('aria-label') || ''
    const ariaLabelledby = $(el).attr('aria-labelledby') || ''
    const title = $(el).attr('title') || ''
    if (!text && !ariaLabel && !ariaLabelledby && !title) {
      findings.push({ severity: 'HIGH', category: 'A11y', message: 'Button without accessible text', file })
    }
  })
  // Check for inputs without labels
  $('input:not([type="hidden"]):not([type="submit"]):not([type="button"])').each((_, el) => {
    const id = $(el).attr('id') || ''
    const ariaLabel = $(el).attr('aria-label') || ''
    const ariaLabelledby = $(el).attr('aria-labelledby') || ''
    const hasLabel = id ? $(`label[for="${id}"]`).length > 0 : false
    const wrappedInLabel = $(el).closest('label').length > 0
    if (!ariaLabel && !ariaLabelledby && !hasLabel && !wrappedInLabel) {
      findings.push({ severity: 'MEDIUM', category: 'A11y', message: `Input without label/aria-label (id="${id}")`, file })
    }
  })
}

function auditYandex(
  $: ReturnType<typeof load>,
  url: string,
  file: string,
  findings: Finding[]
): void {
  // Only check on main pages
  if (url !== '/') return
  const yandexVerification = $('meta[name="yandex-verification"]').attr('content')
  if (!yandexVerification) {
    findings.push({ severity: 'HIGH', category: 'Yandex', message: 'Missing yandex-verification meta tag', file, fix: 'Register in Yandex Webmaster and add verification tag' })
  }
  const geoRegion = $('meta[name="geo.region"]').attr('content')
  if (geoRegion !== 'RU-SPE') {
    findings.push({ severity: 'HIGH', category: 'Yandex', message: `geo.region="${geoRegion}" (expected "RU-SPE")`, file })
  }
}

// --- Main ---

async function main() {
  console.log(`\n=== SEO Audit (HTML Analysis) — ${new Date().toISOString().slice(0, 10)} ===\n`)
  // Check dist/client exists (Astro hybrid mode)
  try {
    await stat(DIST)
  } catch {
    // Fallback to dist/ for non-hybrid Astro projects
    try {
      await stat(DIST_RAW)
      console.log('Note: dist/client/ not found, falling back to dist/')
    } catch {
      console.error(`dist/ not found. Run 'bun run build' first or remove --skip-build flag.`)
      process.exit(1)
    }
  }
  const htmlFiles = await findHtmlFiles(DIST)
  console.log(`Found ${htmlFiles.length} HTML pages to audit.\n`)
  const findings: Finding[] = []
  const allUrls = new Set(htmlFiles.map(fileToUrl))
  const titleMap = new Map<string, string>()
  const descMap = new Map<string, string>()
  const allLinkTargets = new Map<string, string[]>()
  // Per-page audit
  for (const filePath of htmlFiles) {
    const url = fileToUrl(filePath)
    if (pageFilter && url !== pageFilter) continue
    const html = await readFile(filePath, 'utf-8')
    const $ = load(html)
    const shortFile = relative(DIST, filePath)
    // Meta tags
    const { title, description } = auditMeta($, url, shortFile, findings)
    if (title) {
      if (titleMap.has(title)) {
        findings.push({
          severity: 'CRITICAL',
          category: 'Meta',
          message: `Duplicate title "${title.slice(0, 50)}..." — also on ${titleMap.get(title)}`,
          file: shortFile
        })
      }
      titleMap.set(title, shortFile)
    }
    if (description) {
      if (descMap.has(description)) {
        findings.push({
          severity: 'HIGH',
          category: 'Meta',
          message: `Duplicate description — also on ${descMap.get(description)}`,
          file: shortFile
        })
      }
      descMap.set(description, shortFile)
    }
    // Headings
    auditHeadings($, url, shortFile, findings)
    // Images
    auditImages($, url, shortFile, findings)
    // JSON-LD
    auditJsonLd($, url, shortFile, findings)
    // Links
    const links = auditLinks($, url, shortFile, allUrls, findings)
    allLinkTargets.set(url, links)
    // Accessibility
    auditAccessibility($, url, shortFile, findings)
    // Yandex-specific
    auditYandex($, url, shortFile, findings)
  }
  // Cross-page checks: broken internal links
  for (const [sourceUrl, targets] of allLinkTargets) {
    for (const target of targets) {
      if (!allUrls.has(target) && target !== '/' && !target.startsWith('/admin') && !target.startsWith('/api')) {
        // Check if it matches with trailing content
        const withIndex = target + '/index'
        if (!allUrls.has(target + '/') && !allUrls.has(withIndex)) {
          findings.push({
            severity: 'HIGH',
            category: 'Links',
            message: `Broken internal link: ${target}`,
            file: `from ${sourceUrl}`
          })
        }
      }
    }
  }
  // Cross-page checks: orphan pages
  const linkedPages = new Set<string>()
  for (const targets of allLinkTargets.values()) {
    for (const t of targets) linkedPages.add(t)
  }
  for (const url of allUrls) {
    if (url === '/' || url === '/404') continue
    if (!linkedPages.has(url) && !linkedPages.has(url + '/')) {
      findings.push({
        severity: 'MEDIUM',
        category: 'Links',
        message: `Possible orphan page: ${url} (no internal links found)`,
        file: url
      })
    }
  }
  // Sort findings by severity
  findings.sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
  // Output
  if (jsonOutput) {
    console.log(JSON.stringify({ score: calculateScore(findings), findings }, null, 2))
    return
  }
  const score = calculateScore(findings)
  const counts = {
    CRITICAL: findings.filter(f => f.severity === 'CRITICAL').length,
    HIGH: findings.filter(f => f.severity === 'HIGH').length,
    MEDIUM: findings.filter(f => f.severity === 'MEDIUM').length,
    LOW: findings.filter(f => f.severity === 'LOW').length,
    PASS: htmlFiles.length * 10 - findings.length // approximate
  }
  console.log(`# SEO Audit Report\n`)
  console.log(`## Score: ${score}/10\n`)
  console.log(`| Severity | Count |`)
  console.log(`|----------|-------|`)
  console.log(`| CRITICAL | ${counts.CRITICAL} |`)
  console.log(`| HIGH     | ${counts.HIGH} |`)
  console.log(`| MEDIUM   | ${counts.MEDIUM} |`)
  console.log(`| LOW      | ${counts.LOW} |`)
  console.log(`| Pages    | ${htmlFiles.length} |`)
  console.log()
  for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const) {
    const items = findings.filter(f => f.severity === sev)
    if (items.length === 0) continue
    console.log(`## ${sev} (${items.length})\n`)
    // Group by category + message pattern to reduce noise
    const grouped = new Map<string, { message: string; category: string; files: string[]; fix?: string }>()
    for (const f of items) {
      const key = `${f.category}:${f.message.replace(/"[^"]*"/g, '""').replace(/:\s*[^\s]+$/, '')}`
      const existing = grouped.get(key)
      if (existing) {
        existing.files.push(f.file)
      } else {
        grouped.set(key, { message: f.message, category: f.category, files: [f.file], fix: f.fix })
      }
    }
    for (const [, g] of grouped) {
      const fix = g.fix ? ` — Fix: ${g.fix}` : ''
      if (g.files.length <= 3) {
        console.log(`- [${g.category}] ${g.message} — \`${g.files.join('`, `')}\`${fix}`)
      } else {
        console.log(`- [${g.category}] ${g.message} — ${g.files.length} pages (e.g., \`${g.files[0]}\`)${fix}`)
      }
    }
    console.log()
  }
  console.log(`---\nAudited ${htmlFiles.length} pages, found ${findings.length} issues.`)
}

main().catch(err => {
  console.error('Audit failed:', err)
  process.exit(1)
})
