import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import node from '@astrojs/node'
import sitemap from '@astrojs/sitemap'
import { unified } from '@astrojs/markdown-remark'
import { canonicalUrl, sitemapPage } from './src/lib/seo.js'

export default defineConfig({
  site: 'https://odintsovclinic.ru',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  compressHTML: true,
  security: { checkOrigin: false },
  markdown: { processor: unified() },
  redirects: {
    '/napravleniya': '/',
    '/procedures': '/prices',
    '/usd': '/prices/full#ultrasound',
    '/lab': '/prices',
    '/action': '/prices',
    '/opinion2': '/second-opinion',
    '/doc': '/licenses',
    '/patients': '/blog',
    '/patients/taxform': '/tax-form',
    '/otzyv': '/about',
    '/mission': '/about',
    '/rukovodsktvo': '/about',
    '/job': '/about',
    '/doctors/yakhontova': '/doctors',
    '/doctors/strebkov': '/doctors',
    '/doctors/ovchinnicova': '/doctors',
    '/bc': '/blog/rannyaya-diagnostika-raka-grudi',
    '/breastfeeding-rules': '/blog/15-pravil-grudnogo-vskarmlivaniya',
    '/cyst': '/blog/mylnaya-opera-o-kistoznoy-mastopatii',
    '/ozonecyst': '/kista-molochnoy-zhelezy',
    '/esm': '/blog/eroziya-sheyki-matki',
    '/terios': '/blog/gipotireoz-simptomy-lechenie',
    '/news/170328': '/contacts',
    '/exams/programma-pitaniya': '/nutrition',
    '/exam/pervichny-priem-endocrinolog': '/endocrinology',
    '/exams/fnbiopsy': '/blog/tonkoigolnaya-punktsionnaya-biopsiya',
    '/exams/priem-ginekolog-endokrinolog': '/gynecology',
    '/exam/pervichny-priem-gynecolog': '/gynecology',
  },
  vite: {
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    build: {
      rollupOptions: {
        external: ['/pagefind/pagefind.js'],
      },
    },
  },
  integrations: [
    react(),
    sitemap({
      filter: sitemapPage,
      serialize(item) {
        return { ...item, url: canonicalUrl(item.url) }
      },
    }),
  ],
})
