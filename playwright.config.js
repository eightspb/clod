import { defineConfig, devices } from '@playwright/test'

process.env.ADMIN_PASSWORD ||= 'playwright-admin-password'
process.env.TOKEN_SECRET ||= 'playwright-token-secret-for-admin-authentication'
const port = process.env.PLAYWRIGHT_PORT || '4322'
const baseURL = `http://localhost:${port}`

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
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: process.env.CI ? `bun run build && bun run preview -- --port ${port}` : 'bun run dev',
    env: {
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      PORT: port,
      TOKEN_SECRET: process.env.TOKEN_SECRET,
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
