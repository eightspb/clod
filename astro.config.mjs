import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import db from '@astrojs/db'
import node from '@astrojs/node'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://odintsovclinic.ru',
  output: 'hybrid',
  adapter: node({ mode: 'standalone' }),
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
    '/fibroadenoma': '/blog/chto-takoe-fibroadenoma',
    '/bc': '/blog/rannyaya-diagnostika-raka-grudi',
    '/ozonecyst': '/blog/kista-molochnoy-zhelezy',
    '/esm': '/blog/eroziya-sheyki-matki',
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
  },
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    db({ seedLocal: false }),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      customPages: [
        'https://odintsovclinic.ru/vab',
        'https://odintsovclinic.ru/contacts',
        'https://odintsovclinic.ru/blog',
      ],
      serialize(item) {
        const priorities = {
          'https://odintsovclinic.ru/': 1.0,
          'https://odintsovclinic.ru/mammology': 0.9,
          'https://odintsovclinic.ru/gynecology': 0.9,
          'https://odintsovclinic.ru/endocrinology': 0.9,
          'https://odintsovclinic.ru/nutrition': 0.9,
          'https://odintsovclinic.ru/vab': 0.95,
          'https://odintsovclinic.ru/second-opinion': 0.85,
          'https://odintsovclinic.ru/tax-form': 0.75,
          'https://odintsovclinic.ru/prices': 0.8,
          'https://odintsovclinic.ru/doctors': 0.8,
          'https://odintsovclinic.ru/contacts': 0.8,
          'https://odintsovclinic.ru/blog': 0.75,
        }
        const changefreqs = {
          'https://odintsovclinic.ru/': 'weekly',
          'https://odintsovclinic.ru/vab': 'monthly',
          'https://odintsovclinic.ru/prices': 'weekly',
          'https://odintsovclinic.ru/privacy-policy': 'yearly',
        }
        let priority = priorities[item.url]
        if (priority === undefined) {
          if (item.url.includes('/blog/')) priority = 0.7
          else if (item.url.includes('/doctors/')) priority = 0.7
          else priority = 0.7
        }
        return {
          ...item,
          priority,
          changefreq: changefreqs[item.url] ?? 'monthly',
        }
      },
    }),
  ],
})
