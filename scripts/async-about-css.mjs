/**
 * Пост-обработка: неблокирующая загрузка CSS страницы «О клинике» (Lighthouse).
 * Запускается после astro build.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const aboutPath = join(root, 'dist', 'client', 'about', 'index.html')

if (!existsSync(aboutPath)) process.exit(0)

let html = readFileSync(aboutPath, 'utf-8')
if (!html.includes('/_astro/about.') || !html.includes('.css')) process.exit(0)

const newHtml = html.replace(
  /<link rel="stylesheet" href="(\/_astro\/about\.[A-Za-z0-9_.-]+\.css)"(\s*\/?>)/g,
  (_, href, close) =>
    `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'"${close}<noscript><link rel="stylesheet" href="${href}"></noscript>`
)

if (newHtml !== html) {
  writeFileSync(aboutPath, newHtml)
}
