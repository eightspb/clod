// @vitest-environment node
import { expect, it } from 'vitest'
import { auditSeo, inspectSeoPage } from '../../scripts/audit-seo.mjs'

const PAGE = '<html lang="ru"><head><title>Маммолог в СПб</title><meta name="description" content="Приём в клинике"><link rel="canonical" href="https://odintsovclinic.ru/mammology"></head><body><main><h1>Маммолог</h1>'

function inspect(content, options = {}) {
  return inspectSeoPage({ html: `${PAGE}${content}</main></body></html>`, url: 'https://odintsovclinic.ru/mammology', knownUrls: new Set(['/mammology', '/gynecology']), hasAsset: () => false, ...options })
}

it('reports a broken article link in generated HTML', () => {
  expect(inspect('<a href="/blog/undefined">Читайте также</a>').errors).toContain('Broken internal link: /blog/undefined')
})

it('accepts a known server rendered route without a generated HTML file', () => {
  expect(inspect('<a href="/gynecology">Гинеколог</a>').errors).toEqual([])
})

it('reports a missing publisher logo nested in structured data', () => {
  expect(inspect('<script type="application/ld+json">{"@type":"BlogPosting","publisher":{"logo":{"@type":"ImageObject","url":"https://odintsovclinic.ru/images/logo.svg"}}}</script>').errors).toContain('Missing structured image: /images/logo.svg')
})

it('reports a canonical that differs from its sitemap URL', () => {
  expect(inspect('', { url: 'https://odintsovclinic.ru/gynecology' }).errors).toContain('Canonical differs from sitemap URL')
})

it('reports invalid structured data without discarding the page', () => {
  expect(inspect('<script type="application/ld+json">{invalid}</script>').errors).toContain('Invalid JSON-LD')
})

it('reports an indexed page with duplicate primary headings', () => {
  expect(inspect('<h1>Второй заголовок</h1>').errors).toContain('Expected one H1, found 2')
})

it('resolves same origin absolute links before checking their target', () => {
  expect(inspect('<a href="https://odintsovclinic.ru/blog/undefined">Материал</a>').errors).toContain('Broken internal link: /blog/undefined')
})

function deployment(assetStatus = 200) {
  const requests = []
  const documents = {
    '/sitemap-index.xml': '<sitemapindex><sitemap><loc>https://odintsovclinic.ru/sitemap-0.xml</loc></sitemap></sitemapindex>',
    '/sitemap-0.xml': '<urlset><url><loc>https://odintsovclinic.ru/mammology</loc></url><url><loc>https://odintsovclinic.ru/gynecology</loc></url></urlset>',
    '/mammology': `${PAGE}<img src="/images/logo.png"><script type="application/ld+json">{"logo":"https://odintsovclinic.ru/images/logo.png"}</script></main></body></html>`,
    '/gynecology': `${PAGE.replaceAll('Маммолог', 'Гинеколог').replace('Приём в клинике', 'Гинекологический приём').replace('/mammology', '/gynecology')}<script type="application/ld+json">{"logo":"https://odintsovclinic.ru/images/logo.png"}</script></main></body></html>`,
  }
  const fetcher = async (url, options) => {
    requests.push({ url: String(url), method: options?.method || 'GET' })
    const pathname = new URL(url).pathname
    return new Response(documents[pathname] || '', { status: pathname === '/images/logo.png' ? assetStatus : documents[pathname] ? 200 : 404 })
  }
  return { requests, fetcher }
}

it('reports a deployed missing logo even when that logo exists in the local build', async () => {
  const fixture = deployment(404)
  const report = await auditSeo({ live: true, baseUrl: 'https://new.odintsovclinic.ru', fetcher: fixture.fetcher })
  expect(report.errors).toContain('https://odintsovclinic.ru/mammology: Missing structured image: /images/logo.png')
})

it('audits the remote sitemap and available assets without a local build', async () => {
  const fixture = deployment()
  const report = await auditSeo({ live: true, root: '/missing-seo-build', baseUrl: 'https://new.odintsovclinic.ru', fetcher: fixture.fetcher })
  expect({ pages: report.pagesChecked, errors: report.errors }).toEqual({ pages: 2, errors: [] })
})

it('maps canonical assets and sitemaps to staging and caches repeated asset checks', async () => {
  const fixture = deployment()
  await auditSeo({ live: true, baseUrl: 'https://new.odintsovclinic.ru', fetcher: fixture.fetcher })
  expect(fixture.requests).toEqual([
    { url: 'https://new.odintsovclinic.ru/sitemap-index.xml', method: 'GET' },
    { url: 'https://new.odintsovclinic.ru/sitemap-0.xml', method: 'GET' },
    { url: 'https://new.odintsovclinic.ru/mammology', method: 'GET' },
    { url: 'https://new.odintsovclinic.ru/images/logo.png', method: 'HEAD' },
    { url: 'https://new.odintsovclinic.ru/gynecology', method: 'GET' },
  ])
})
