// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { load } from 'cheerio'
import { expect, it } from 'vitest'
import ServiceArticles from './ServiceArticles.astro'

it('renders crawlable article links without a client island', async () => {
  const container = await AstroContainer.create()
  const html = await container.renderToString(ServiceArticles, { props: { articles: [{ slug: 'kak-podgotovitsya-k-vab', title: 'Как подготовиться к ВАБ' }] } })
  const $ = load(html)
  expect({ href: $('a').attr('href'), label: $('a').text().trim(), islands: $('astro-island').length }).toEqual({ href: '/blog/kak-podgotovitsya-k-vab', label: 'Как подготовиться к ВАБ', islands: 0 })
})
