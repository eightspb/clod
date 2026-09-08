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

function deployment(assetStatus = 200, overrides = {}) {
  const requests = []
  const documents = {
    '/robots.txt': 'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: https://odintsovclinic.ru/sitemap-index.xml',
    '/sitemap-index.xml': '<sitemapindex><sitemap><loc>https://odintsovclinic.ru/sitemap-0.xml</loc></sitemap></sitemapindex>',
    '/sitemap-0.xml': '<urlset><url><loc>https://odintsovclinic.ru/mammology</loc></url><url><loc>https://odintsovclinic.ru/gynecology</loc></url></urlset>',
    '/mammology': `${PAGE}<img src="/images/logo.png"><script type="application/ld+json">{"logo":"https://odintsovclinic.ru/images/logo.png"}</script></main></body></html>`,
    '/gynecology': `${PAGE.replaceAll('Маммолог', 'Гинеколог').replace('Приём в клинике', 'Гинекологический приём').replace('/mammology', '/gynecology')}<script type="application/ld+json">{"logo":"https://odintsovclinic.ru/images/logo.png"}</script></main></body></html>`,
    ...overrides.documents,
  }
  const fetcher = async (url, options) => {
    requests.push({ url: String(url), method: options?.method || 'GET' })
    const pathname = new URL(url).pathname
    return new Response(documents[pathname] || '', { status: overrides.status?.[pathname] || (pathname === '/images/logo.png' ? assetStatus : documents[pathname] ? 200 : 404), headers: overrides.headers })
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

it.each(['noindex, nofollow', 'NoNe', 'googlebot: noindex', 'index, follow, yandex: noindex'])('fails the primary domain audit with the HTTP indexing block %s', async (directive) => {
  const fixture = deployment(200, { headers: { 'X-Robots-Tag': directive } })
  const report = await auditSeo({ live: true, baseUrl: 'https://odintsovclinic.ru', fetcher: fixture.fetcher })
  expect(report.errors).toContain('https://odintsovclinic.ru/mammology: HTTP X-Robots-Tag blocks indexing')
})

it('keeps staging noindex visible without treating its content audit as indexability verification', async () => {
  const fixture = deployment(200, { headers: { 'X-Robots-Tag': 'noindex, nofollow' } })
  const report = await auditSeo({ live: true, baseUrl: 'https://new.odintsovclinic.ru', fetcher: fixture.fetcher })
  expect({ checked: report.indexabilityChecked, errors: report.errors, header: report.pages[0].robotsHeader }).toEqual({ checked: false, errors: [], header: 'noindex, nofollow' })
})

it.each([
  '<meta name="robots" content="index"><meta name="robots" content="noindex">',
  '<meta name="Googlebot" content="NoIndex">',
  '<meta name="yandex" content="none">',
])('detects restrictive robot meta tags across all applicable declarations %s', (markup) => {
  expect(inspect(markup).errors).toContain('Sitemap contains a noindex page')
})

it('does not interpret an image preview setting as an indexing block', () => {
  expect(inspect('<meta name="robots" content="max-image-preview:none, index">').errors).toEqual([])
})

it('confirms primary domain indexability only after checking deployed robots', async () => {
  const fixture = deployment()
  const report = await auditSeo({ live: true, baseUrl: 'https://odintsovclinic.ru', fetcher: fixture.fetcher })
  expect({ checked: report.indexabilityChecked, errors: report.errors }).toEqual({ checked: true, errors: [] })
})

it.each([
  'User-agent: *\nDisallow: /',
  'User-agent: Googlebot\nDisallow: /mammology',
  'User-agent: Yandex\nDisallow: /mam*$',
  'User-agent: *\nAllow: /\nDisallow: /mammology',
])('reports sitemap pages blocked by deployed robots rules %s', async (rules) => {
  const fixture = deployment(200, { documents: { '/robots.txt': `${rules}\nSitemap: https://odintsovclinic.ru/sitemap-index.xml` } })
  const report = await auditSeo({ live: true, baseUrl: 'https://odintsovclinic.ru', fetcher: fixture.fetcher })
  expect(report.errors.some((error) => error.includes('/mammology') && error.includes('robots.txt'))).toBe(true)
})

it('allows public paths when specific crawler rules override the wildcard group', async () => {
  const fixture = deployment(200, { documents: { '/robots.txt': 'User-agent: *\nDisallow: /\nUser-agent: Googlebot\nUser-agent: Yandex\nDisallow: /admin\nSitemap: https://odintsovclinic.ru/sitemap-index.xml' } })
  const report = await auditSeo({ live: true, baseUrl: 'https://odintsovclinic.ru', fetcher: fixture.fetcher })
  expect(report.errors).toEqual([])
})

it('uses the longest matching allow rule in robots instead of blocking an allowed public page', async () => {
  const fixture = deployment(200, { documents: { '/robots.txt': 'User-agent: *\nDisallow: /\nAllow: /mammology$\nAllow: /gynecology$\nSitemap: https://odintsovclinic.ru/sitemap-index.xml' } })
  const report = await auditSeo({ live: true, baseUrl: 'https://odintsovclinic.ru', fetcher: fixture.fetcher })
  expect(report.errors).toEqual([])
})

it.each(['Googlebot*', 'Googlebot/1.2'])('applies crawler rules with the supported user agent suffix %s', async (agent) => {
  const fixture = deployment(200, { documents: { '/robots.txt': `User-agent: ${agent}\nDisallow: /\nSitemap: https://odintsovclinic.ru/sitemap-index.xml` } })
  const report = await auditSeo({ live: true, baseUrl: 'https://odintsovclinic.ru', fetcher: fixture.fetcher })
  expect(report.errors).toContain('https://odintsovclinic.ru/mammology: robots.txt blocks googlebot')
})

it.each([
  ['/', 'Allow: /\nDisallow: /$'],
  ['/page.htm', 'Allow: /page\nDisallow: /*.htm'],
])('uses the full matching rule length when a wildcard or anchor blocks %s', async (pathname, rules) => {
  const fixture = deployment(200, { documents: { '/robots.txt': `User-agent: *\n${rules}\nSitemap: https://odintsovclinic.ru/sitemap-index.xml`, '/sitemap-0.xml': `<urlset><url><loc>https://odintsovclinic.ru${pathname}</loc></url></urlset>`, [pathname]: PAGE.replace('/mammology', pathname) } })
  const report = await auditSeo({ live: true, baseUrl: 'https://odintsovclinic.ru', fetcher: fixture.fetcher })
  expect(report.errors).toContain(`https://odintsovclinic.ru${pathname}: robots.txt blocks googlebot`)
})

it('ignores trailing wildcards when an allow rule ties a disallow rule', async () => {
  const fixture = deployment(200, { documents: { '/robots.txt': 'User-agent: *\nAllow: /mammology\nDisallow: /mammology*\nSitemap: https://odintsovclinic.ru/sitemap-index.xml' } })
  const report = await auditSeo({ live: true, baseUrl: 'https://odintsovclinic.ru', fetcher: fixture.fetcher })
  expect(report.errors).toEqual([])
})

it('rejects an obsolete sitemap declaration in primary domain robots', async () => {
  const fixture = deployment(200, { documents: { '/robots.txt': 'User-agent: *\nAllow: /\nSitemap: https://odintsovclinic.ru/sitemap.xml' } })
  const report = await auditSeo({ live: true, baseUrl: 'https://odintsovclinic.ru', fetcher: fixture.fetcher })
  expect(report.errors).toContain('robots.txt does not declare the canonical sitemap index')
})

it('rejects a bare sitemap URL that is not a robots directive', async () => {
  const fixture = deployment(200, { documents: { '/robots.txt': 'User-agent: *\nAllow: /\nhttps://odintsovclinic.ru/sitemap-index.xml' } })
  const report = await auditSeo({ live: true, baseUrl: 'https://odintsovclinic.ru', fetcher: fixture.fetcher })
  expect(report.errors).toContain('robots.txt does not declare the canonical sitemap index')
})

it('rejects a sitemap page that redirects before its apparent successful response', async () => {
  const fixture = deployment(200, { status: { '/mammology': 301 }, headers: { Location: '/gynecology' } })
  const fetcher = (url, options) => new URL(url).pathname === '/mammology' && options.redirect !== 'manual' ? deployment().fetcher(url, options) : fixture.fetcher(url, options)
  await expect(auditSeo({ live: true, baseUrl: 'https://odintsovclinic.ru', fetcher })).rejects.toThrow(Error)
})
