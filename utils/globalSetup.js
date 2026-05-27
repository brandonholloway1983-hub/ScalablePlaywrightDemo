import { chromium } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import dotenv from 'dotenv';
dotenv.config();

// ─────────────────────────────────────────────────────────
// Global Setup — runs once before the entire test suite
//
// Performs a single login and saves the browser session
// to auth.json. All tests then load this saved session
// rather than logging in individually.
//
// Benefits:
//   - Eliminates repeated login overhead across tests
//   - Faster suite execution as coverage grows
//   - Single point of auth failure — easy to diagnose
//
// Retry logic handles flaky shared demo environments
// where login can timeout under load
// ─────────────────────────────────────────────────────────

async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: process.env.BASE_URL,
  });
  const page = await context.newPage();

  const loginPage = new LoginPage(page);

  // Retry entire login flow up to 3 times
  // OrangeHRM demo site can be slow or unresponsive under load
  let attempts = 0;
  while (attempts < 3) {
    try {
      await loginPage.goto();
      await loginPage.loginWithEnvCredentials();
      break;
    } catch (error) {
      attempts++;
      if (attempts === 3) throw error;
      console.log(`Setup attempt ${attempts} failed, retrying in 3s...`);
      await page.waitForTimeout(3000);
    }
  }

  await context.storageState({ path: 'auth.json' });
  console.log('✓ Global setup complete — session saved to auth.json');

  await browser.close();
}

export default globalSetup;