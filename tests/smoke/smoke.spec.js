import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage.js';
import { EmployeeListPage } from '../../pages/EmployeeListPage.js';
import { analyzeFailure } from '../../utils/failureAnalyzer.js';

// ─────────────────────────────────────────────────────────
// Smoke Tests — Critical path only
//
// These are the gate tests. If any of these fail the
// regression suite does not run. They cover the minimum
// viable proof that the application is functional:
//   1. Can we reach the login page?
//   2. Can we authenticate?
//   3. Does invalid auth get blocked?
//   4. Does the core data list load?
//
// Fast, focused, no writes to the system.
// Safe to run against production.
// ─────────────────────────────────────────────────────────

// Attach AI failure analysis to every failing test
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed') {
    const pageContent = await page.locator('body').innerText().catch(() => '');
    const analysis = await analyzeFailure(
      testInfo.error,
      {
        testName:    testInfo.title,
        pageUrl:     page.url(),
        pageContent,
      }
    );
    console.log(analysis);
  }
});

test.describe('Smoke — Critical Path', () => {

  test('login page loads',
    { tag: ['@smoke'] },
    async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await expect(page).toHaveURL(/auth\/login/);
      await expect(loginPage.usernameField).toBeVisible();
      await expect(loginPage.passwordField).toBeVisible();
      await expect(loginPage.loginButton).toBeVisible();

      console.log('✓ Login page loaded and fields visible');
    }
  );

  test('valid credentials authenticate successfully',
    { tag: ['@smoke'] },
    async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginWithEnvCredentials();
      await loginPage.verifyLoginSuccessful();

      await expect(page).toHaveURL(/dashboard/);
      console.log('✓ Login successful — landed on dashboard');
    }
  );

  test('invalid credentials show error message',
    { tag: ['@smoke'] },
    async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginExpectingFailure('invalid_user', 'wrong_password');

      const error = await loginPage.getErrorMessage();
      expect(error).toBeTruthy();

      console.log(`✓ Invalid login correctly blocked — message: "${error}"`);
    }
  );

  test('employee list loads after login',
    { tag: ['@smoke'] },
    async ({ page }) => {
      const loginPage    = new LoginPage(page);
      const employeeList = new EmployeeListPage(page);

      await loginPage.goto();
      await loginPage.loginWithEnvCredentials();
      await employeeList.goto();

      const hasResults = await employeeList.verifyTableHasResults();
      expect(hasResults).toBe(true);

      const count = await employeeList.getRecordCount();
      expect(count).toBeGreaterThan(0);

      console.log(`✓ Employee list loaded — ${count} records found`);
    }
  );

});