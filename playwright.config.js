import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

// ─────────────────────────────────────────────────────────
// ScalablePlaywrightDemo — Playwright Configuration
//
// Design decisions:
//   - baseURL and credentials from environment variables only
//     → point at any environment by changing .env, nothing else
//   - Single browser (chromium) to start — fast, stable, low noise
//     → adding webkit/mobile is one commented line in projects array
//   - Retries in CI only — fail fast locally, forgive flakiness in pipeline
//   - workers: 1 — OrangeHRM is a shared demo instance, parallel
//     execution would cause data collisions and flaky results
//     → increase workers when running against a dedicated test instance
// ─────────────────────────────────────────────────────────

export default defineConfig({
  testDir: './tests',

  timeout: 30000,

  retries: process.env.CI ? 1 : 0,

  workers: 1,

  fullyParallel: false,
  forbidOnly: !!process.env.CI,

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['allure-playwright', {
      detail: true,
      outputFolder: 'allure-results',
      suiteTitle: true,
    }],
  ],

  use: {
    baseURL: process.env.BASE_URL,

    waitUntil: 'domcontentloaded',

    actionTimeout: 10000,
    navigationTimeout: 30000,

    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    trace: 'on-first-retry',
  },

  projects: [
    // ── Active ───────────────────────────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Add when coverage needs to expand ────────────────
    // { name: 'webkit',        use: { ...devices['Desktop Safari'] } },
    // { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    // { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
});