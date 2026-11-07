import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests (SMS-38).
 *
 * Locally: start PostgreSQL (docker compose up -d db) and the backend (cd backend && npm run start:dev),
 * then run `npm run e2e`. The config starts the frontend dev server itself.
 *
 * Against staging (CI): set E2E_BASE_URL (frontend) and E2E_API_URL (API). No local server is started.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  // The journey tests share one account, so files run one at a time.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // 360 px wide phone, to cover the narrow end of SVY-NF-004 / TC-UX-01
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 740 } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: 'npm run dev', url: baseURL, reuseExistingServer: true, timeout: 60_000 },
})
