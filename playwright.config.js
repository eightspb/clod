import { defineConfig, devices } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.ADMIN_PASSWORD ||= 'playwright-admin-password'
process.env.TOKEN_SECRET ||= 'playwright-token-secret-for-admin-authentication'
const port = process.env.PLAYWRIGHT_PORT || '4322'
const baseURL = `http://localhost:${port}`
const databaseUrl = process.env.ASTRO_DB_REMOTE_URL || `file:${join(tmpdir(), 'clod-e2e.sqlite')}`
/** Astro 7 daemonizes dev/preview when it detects an AI agent (CLAUDECODE); Playwright needs a foreground server */
const serverCommand = (steps) => `env -u CLAUDECODE sh -c '${steps.join(' && ')}'`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    /** Layout specs assert a settled page; the doctor carousels rotate on their own unless motion is reduced */
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: process.env.CI ? serverCommand(['node scripts/init-db.mjs', 'bun run build', `bun run preview -- --port ${port}`]) : serverCommand(['node scripts/init-db.mjs', 'bun run dev']),
    env: {
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      ASTRO_DB_APP_TOKEN: '',
      ASTRO_DB_REMOTE_URL: databaseUrl,
      PORT: port,
      TOKEN_SECRET: process.env.TOKEN_SECRET,
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
