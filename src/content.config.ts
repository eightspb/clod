import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.string().optional(), // Рекомендуется: ключевые слова + «СПб, Санкт-Петербург» для GEO
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Редакция клиники'),
    authorSlug: z.string().optional(),
    category: z.string().default('Статьи'),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    readingTime: z.number().optional(),
    ctaType: z.enum(['appointment', 'second-opinion']).default('appointment'),
  }),
})

export const collections = { blog }
