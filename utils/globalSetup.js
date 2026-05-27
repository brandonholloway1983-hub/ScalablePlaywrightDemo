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
// ─────────────────────────────────────────────────────────

async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: process.env.BASE_URL,
  });
  const page = await context.newPage();

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginWithEnvCredentials();

  // Save session to auth.json
  await context.storageState({ path: 'auth.json' });

  console.log('✓ Global setup complete — session saved to auth.json');

  await browser.close();
}

export default globalSetup;