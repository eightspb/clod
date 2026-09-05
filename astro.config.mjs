import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import node from '@astrojs/node'
import sitemap from '@astrojs/sitemap'
import { unified } from '@astrojs/markdown-remark'

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
    '/usd': '/mammology',
    '/lab': '/prices',
    '/action': '/prices',
    '/opinion2': '/second-opinion',
    '/doc': '/licenses',
    '/patients': '/',
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
    '/cyst': '/blog/kista-molochnoy-zhelezy',
    '/terios': '/blog/gipotireoz-simptomy-lechenie',
    '/news/170328': '/blog',
    '/exams/fnbiopsy': '/blog/tonkoigolnaya-punktsionnaya-biopsiya',
    '/exams/priem-ginekolog-endokrinolog': '/gynecology',
    '/exam/pervichny-priem-gynecolog': '/gynecology',
    '/exams/pervichny-priem-proctolog': '/',
    '/exams/diagnostika-proctolog': '/',
    '/exams/polipectomia': '/',
    '/exams/priem-proctolog': '/',
    '/exams/pervichny-priem-urolog': '/'
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
      changefreq: 'monthly',
      priority: 0.7,
      lastmod: new Date(),
      filter(page) {
        return !page.includes('/admin') && !page.includes('/blog-images')
      },
      serialize(item) {
        const priorities = {
          'https://odintsovclinic.ru/': 1.0,
          'https://odintsovclinic.ru/vab/': 0.9,
          'https://odintsovclinic.ru/mammology/': 0.9,
          'https://odintsovclinic.ru/gynecology/': 0.9,
          'https://odintsovclinic.ru/endocrinology/': 0.9,
          'https://odintsovclinic.ru/nutrition/': 0.9,
          'https://odintsovclinic.ru/fibroadenoma/': 0.8,
          'https://odintsovclinic.ru/mastopatiya/': 0.8,
          'https://odintsovclinic.ru/kista-molochnoy-zhelezy/': 0.8,
          'https://odintsovclinic.ru/eroziya-sheyki-matki/': 0.8,
          'https://odintsovclinic.ru/gipotireoz/': 0.8,
          'https://odintsovclinic.ru/adenomioz/': 0.8,
          'https://odintsovclinic.ru/endometrioz/': 0.8,
          'https://odintsovclinic.ru/tireoidit-khashimoto/': 0.8,
          'https://odintsovclinic.ru/second-opinion/': 0.8,
          'https://odintsovclinic.ru/prices/': 0.8,
          'https://odintsovclinic.ru/doctors/': 0.8,
          'https://odintsovclinic.ru/contacts/': 0.8,
          'https://odintsovclinic.ru/blog/': 0.7,
        }
        const changefreqs = {
          'https://odintsovclinic.ru/': 'weekly',
          'https://odintsovclinic.ru/prices/': 'weekly',
          'https://odintsovclinic.ru/privacy-policy/': 'yearly',
        }
        return {
          ...item,
          priority: priorities[item.url] ?? 0.7,
          changefreq: changefreqs[item.url] ?? 'monthly',
        }
      },
    }),
  ],
})
