import { load } from 'cheerio'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { canonicalUrl } from '../src/lib/seo.js'
import { SITE_URL } from '../src/lib/constants.js'

function structuredImages(value, images = []) {
  if (!value || typeof value !== 'object') return images
  for (const [key, entry] of Object.entries(value)) {
    if (['image', 'logo'].includes(key) && typeof entry === 'string') images.push(entry)
    if (value['@type'] === 'ImageObject' && key === 'url') images.push(entry)
    if (typeof entry === 'object') structuredImages(entry, images)
  }
  return images
}

export function inspectSeoPage({ html, url, knownUrls, hasAsset }) {
  const $ = load(html)
  const errors = []
  const warnings = []
  const title = $('title').text().trim()
  const description = $('meta[name="description"]').attr('content') || ''
  const canonical = $('link[rel="canonical"]').attr('href')
  const h1 = $('h1').map((_index, node) => $(node).text().trim()).get()
  const schemas = []
  const links = new Set()
  if (!title) errors.push('Missing title')
  if (!description) errors.push('Missing description')
  if (h1.length !== 1) errors.push(`Expected one H1, found ${h1.length}`)
  if (canonical !== url || $('link[rel="canonical"]').length !== 1) errors.push('Canonical differs from sitemap URL')
  if ($('html').attr('lang') !== 'ru') errors.push('Missing Russian document language')
  if (/noindex/i.test($('meta[name="robots"]').attr('content') || '')) errors.push('Sitemap contains a noindex page')
  if (title.length > 80) warnings.push(`Long title: ${title.length} characters`)
  if (description.length > 190) warnings.push(`Long description: ${description.length} characters`)
  $('script[type="application/ld+json"]').each((_index, node) => {
    try { schemas.push(JSON.parse($(node).text())) } catch { errors.push('Invalid JSON-LD') }
  })
  $('a[href]').each((_index, node) => {
    const target = new URL($(node).attr('href'), url)
    if (target.origin !== SITE_URL) return
    const pathname = decodeURIComponent(target.pathname.replace(/\/+$/, '') || '/')
    links.add(pathname)
    if (!knownUrls.has(pathname) && !hasAsset(pathname) && !pathname.startsWith('/api/')) errors.push(`Broken internal link: ${pathname}`)
  })
  const images = [...schemas.flatMap((schema) => structuredImages(schema)), $('meta[property="og:image"]').attr('content')].filter(Boolean)
  for (const image of images) {
    const target = new URL(image, url)
    if (target.origin === SITE_URL && !hasAsset(decodeURIComponent(target.pathname))) errors.push(`Missing structured image: ${target.pathname}`)
  }
  return { url, title, description, keywords: $('meta[name="keywords"]').attr('content') || '', canonical, h1, links: [...links], schemaTypes: schemas.map((schema) => schema?.['@type']), errors: [...new Set(errors)], warnings }
}

function argument(name) {
  const index = process.argv.indexOf(name)
  return index < 0 ? '' : process.argv[index + 1] || ''
}

async function fetchPage(baseUrl, pathname, fetcher) {
  const response = await fetcher(new URL(pathname, baseUrl), { signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new Error(`Page ${pathname} returned HTTP ${response.status}`)
  return { html: await response.text(), status: response.status, robotsHeader: response.headers.get('x-robots-tag') || '' }
}

async function assetAvailable(baseUrl, pathname, fetcher) {
  const url = new URL(pathname, baseUrl)
  const response = await fetcher(url, { method: 'HEAD', signal: AbortSignal.timeout(20000) })
  if (![405, 501].includes(response.status)) return response.ok
  const fallback = await fetcher(url, { signal: AbortSignal.timeout(20000) })
  await fallback.body?.cancel()
  return fallback.ok
}

async function inspectLivePage(options, baseUrl, fetcher, assets) {
  const required = new Set()
  inspectSeoPage({ ...options, hasAsset: (pathname) => { required.add(pathname); return true } })
  for (const pathname of required) {
    if (!assets.has(pathname)) assets.set(pathname, await assetAvailable(baseUrl, pathname, fetcher))
  }
  return inspectSeoPage({ ...options, hasAsset: (pathname) => assets.get(pathname) === true })
}

export async function auditSeo({ root = resolve('dist/client'), baseUrl = '', live = false, fetcher = fetch } = {}) {
  if (live && !baseUrl) throw new Error('Live audit requires --base-url')
  const readSitemap = async (pathname) => live ? (await fetchPage(baseUrl, pathname, fetcher)).html : readFileSync(join(root, pathname), 'utf8')
  const index = load(await readSitemap('/sitemap-index.xml'), { xmlMode: true })
  const maps = index('loc').map((_i, node) => new URL(index(node).text()).pathname).get()
  const urls = (await Promise.all(maps.map(async (map) => {
    const $ = load(await readSitemap(map), { xmlMode: true })
    return $('url > loc').map((_i, node) => $(node).text()).get()
  }))).flat()
  if (!urls.length) throw new Error('Sitemap contains no public URLs')
  const knownUrls = new Set(urls.map((url) => new URL(url).pathname))
  const hasAsset = (pathname) => existsSync(join(root, pathname))
  const assets = new Map()
  const pages = []
  const errors = []
  for (const url of urls) {
    if (canonicalUrl(url) !== url) errors.push(`Noncanonical sitemap URL: ${url}`)
    const pathname = new URL(url).pathname
    const filename = join(root, pathname, 'index.html')
    if (!live && !existsSync(filename) && !baseUrl) throw new Error(`SSR page ${pathname} requires --base-url`)
    const response = live || !existsSync(filename) ? await fetchPage(baseUrl, pathname, fetcher) : { html: readFileSync(filename, 'utf8') }
    const options = { html: response.html, url, knownUrls, hasAsset }
    const page = live ? await inspectLivePage(options, baseUrl, fetcher, assets) : inspectSeoPage(options)
    pages.push({ ...page, ...(response.status ? { status: response.status, robotsHeader: response.robotsHeader } : {}) })
  }
  for (const field of ['title', 'description']) {
    const groups = new Map()
    for (const page of pages) groups.set(page[field], [...(groups.get(page[field]) || []), page.url])
    for (const duplicates of groups.values()) if (duplicates.length > 1) errors.push(`Duplicate ${field}: ${duplicates.join(', ')}`)
  }
  return { checkedAt: new Date().toISOString(), mode: live ? 'live' : 'build-and-ssr', baseUrl, pagesChecked: pages.length, errors: [...errors, ...pages.flatMap((page) => page.errors.map((error) => `${page.url}: ${error}`))], warnings: pages.flatMap((page) => page.warnings.map((warning) => `${page.url}: ${warning}`)), pages }
}

async function audit() {
  const report = await auditSeo({ baseUrl: argument('--base-url'), live: process.argv.includes('--live') })
  if (argument('--output')) writeFileSync(argument('--output'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify({ pages: report.pagesChecked, errors: report.errors, warnings: report.warnings }, null, 2))
  if (report.errors.length) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await audit()
