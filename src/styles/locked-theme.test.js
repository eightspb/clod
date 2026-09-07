import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = (...parts) => join(process.cwd(), ...parts)
const GLOBAL_CSS = readFileSync(root('src', 'styles', 'global.css'), 'utf8')
const LAYOUT = readFileSync(root('src', 'layouts', 'Layout.astro'), 'utf8')
const MIDDLEWARE = readFileSync(root('src', 'middleware.js'), 'utf8')

describe('locked theme', () => {
  it('pins the heading font to the Georgia stack', () => {
    expect(GLOBAL_CSS).toMatch(/--font-serif:\s*Georgia, 'Times New Roman', serif;/)
  })

  it('pins the body font to self-hosted Golos Text', () => {
    expect(GLOBAL_CSS).toMatch(/--font-body:\s*'Golos Text', 'Segoe UI', system-ui, sans-serif;/)
  })

  it('drops the Lora web font that no longer has a consumer', () => {
    expect(GLOBAL_CSS.includes('Lora')).toBe(false)
  })

  it('ships no font file that global.css leaves undeclared', () => {
    const undeclared = readdirSync(root('public', 'fonts')).filter((file) => !GLOBAL_CSS.includes(`/fonts/${file}`))
    expect(undeclared).toEqual([])
  })

  it('preloads no font file that was removed from the repository', () => {
    const shipped = readdirSync(root('public', 'fonts'))
    const sources = ['src/layouts/Layout.astro', 'src/layouts/AdminLayout.astro', 'src/pages/admin/login.astro']
    const missing = sources.flatMap((file) => [...readFileSync(root(file), 'utf8').matchAll(/\/fonts\/([\w.-]+\.woff2)/g)].map((match) => match[1])).filter((name) => !shipped.includes(name))
    expect(missing).toEqual([])
  })

  it('removes the theme switcher component', () => {
    expect(existsSync(root('src', 'components', 'ThemeSwitcher.jsx'))).toBe(false)
  })

  it('leaves no style rule for the removed theme switcher', () => {
    expect(GLOBAL_CSS.includes('theme-switcher')).toBe(false)
  })

  it('leaves no end-to-end spec driving the removed theme switcher', () => {
    const dir = root('e2e')
    const referring = readdirSync(dir).filter((file) => readFileSync(join(dir, file), 'utf8').includes('theme-switcher'))
    expect(referring).toEqual([])
  })

  it('removes the theme preset module', () => {
    expect(existsSync(root('src', 'lib', 'theme-config.js'))).toBe(false)
  })

  it('stops restoring a stored theme before paint', () => {
    expect(LAYOUT.includes('clod-theme-settings')).toBe(false)
  })

  it('stops mounting the theme switcher in the layout', () => {
    expect(LAYOUT.includes('ThemeSwitcher')).toBe(false)
  })

  it('keeps the reader font-size controls that are unrelated to theming', () => {
    expect(LAYOUT).toContain('font-size-controls')
  })

  it('drops the Google Fonts stylesheet host from the served policy', () => {
    expect(MIDDLEWARE.includes('fonts.googleapis.com')).toBe(false)
  })

  it('drops the Google Fonts file host from the served policy', () => {
    expect(MIDDLEWARE.includes('fonts.gstatic.com')).toBe(false)
  })

  it('drops the Google Fonts hosts from every nginx template', () => {
    const leaking = ['nginx.https.conf', 'nginx.http.conf'].filter((file) => readFileSync(root(file), 'utf8').includes('fonts.g'))
    expect(leaking).toEqual([])
  })
})
