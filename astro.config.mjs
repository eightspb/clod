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
          'https://odintsovclinic.ru/neurology': 0.9,
          'https://odintsovclinic.ru/vab': 0.95,
          'https://odintsovclinic.ru/second-opinion': 0.85,
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