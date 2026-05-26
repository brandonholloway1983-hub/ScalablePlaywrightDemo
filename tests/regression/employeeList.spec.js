import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage.js';
import { EmployeeListPage } from '../../pages/EmployeeListPage.js';
import { analyzeFailure } from '../../utils/failureAnalyzer.js';

// ─────────────────────────────────────────────────────────
// Regression — Employee List
//
// Covers the core workflows on the employee list page:
//   - Table structure and column verification
//   - Record count accuracy
//   - Search and filter behavior
//   - Reset functionality
//   - Row-level edit and delete actions
//
// Read-only — no creates or deletes executed.
// Safe to run repeatedly against a shared instance.
// Runs only after smoke gate passes.
// ─────────────────────────────────────────────────────────

// Login before every test
test.beforeEach(async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginWithEnvCredentials();
});

// AI failure analysis on every failure
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

test.describe('Regression — Employee List', () => {

  // ── Table structure ────────────────────────────────────

  test('employee list table renders with correct columns',
    { tag: ['@regression', '@critical'] },
    async ({ page }) => {
      const employeeList = new EmployeeListPage(page);
      await employeeList.goto();

      const expectedColumns = [
        'Id',
        'First (& Middle) Name',
        'Last Name',
        'Job Title',
        'Employment Status',
        'Sub Unit',
        'Supervisor',
        'Actions',
      ];

      for (const column of expectedColumns) {
        await expect(
          page.locator('.oxd-table-th')
            .filter({ has: page.locator(`text="${column}"`) })
            .first()
        ).toBeVisible();
      }

      console.log(`✓ All ${expectedColumns.length} columns present`);
    }
  );

  test('employee list shows records found count',
    { tag: ['@regression', '@critical'] },
    async ({ page }) => {
      const employeeList = new EmployeeListPage(page);
      await employeeList.goto();

      const count = await employeeList.getRecordCount();

      expect(count).not.toBeNull();
      expect(count).toBeGreaterThan(0);

      console.log(`✓ Records found count displayed: ${count}`);
    }
  );

  test('visible row count matches page size',
    { tag: ['@regression'] },
    async ({ page }) => {
      const employeeList = new EmployeeListPage(page);
      await employeeList.goto();

      const recordCount = await employeeList.getRecordCount();
      const visibleRows = await employeeList.getVisibleRowCount();

      // OrangeHRM paginates at 50 — visible rows should be
      // either the full count (if under 50) or 50 (first page)
      const expectedVisible = Math.min(recordCount, 50);
      expect(visibleRows).toBe(expectedVisible);

      console.log(`✓ Visible rows (${visibleRows}) matches expected page size`);
    }
  );

  // ── Search behavior ────────────────────────────────────

  test('search by employee ID returns matching record',
    { tag: ['@regression', '@critical'] },
    async ({ page }) => {
      const employeeList = new EmployeeListPage(page);
      await employeeList.goto();

      // Get the ID from the first visible row to search for
      const firstRow = employeeList.tableRows.first();
      const idCell   = firstRow.locator('.oxd-table-cell').nth(1);
      const targetId = (await idCell.innerText()).trim();

      await employeeList.searchByEmployeeId(targetId);

      const count = await employeeList.getRecordCount();
      expect(count).toBeGreaterThanOrEqual(1);

      const row = employeeList.getRowById(targetId);
      await expect(row).toBeVisible();

      console.log(`✓ Search by ID "${targetId}" returned matching record`);
    }
  );

  test('search with no matching results shows zero records',
    { tag: ['@regression'] },
    async ({ page }) => {
      const employeeList = new EmployeeListPage(page);
      await employeeList.goto();

      await employeeList.searchByEmployeeId('ZZZZ99999');
      await page.waitForTimeout(1000);

      const count = await employeeList.getRecordCount();
      expect(count).toBe(0);

      console.log('✓ No results search correctly shows 0 records');
    }
  );

  test('reset clears search and restores full list',
    { tag: ['@regression', '@critical'] },
    async ({ page }) => {
      const employeeList = new EmployeeListPage(page);
      await employeeList.goto();

      const baselineCount = await employeeList.getRecordCount();

      await employeeList.searchByEmployeeId('ZZZZ99999');
      await page.waitForTimeout(1000);

      const filteredCount = await employeeList.getRecordCount();
      expect(filteredCount).toBe(0);

      await employeeList.resetSearch();

      const restoredCount = await employeeList.getRecordCount();
      expect(restoredCount).toBe(baselineCount);

      console.log(`✓ Reset restored full list — ${restoredCount} records`);
    }
  );

  // ── Row actions ────────────────────────────────────────

  test('edit button navigates to employee detail page',
    { tag: ['@regression'] },
    async ({ page }) => {
      const employeeList = new EmployeeListPage(page);
      await employeeList.goto();

      const firstRow = employeeList.tableRows.first();
      const idCell   = firstRow.locator('.oxd-table-cell').nth(1);
      const targetId = (await idCell.innerText()).trim();

      await employeeList.clickEditForEmployee(targetId);

      await expect(page).toHaveURL(/viewPersonalDetails/);
      console.log(`✓ Edit navigated to employee detail for ID ${targetId}`);
    }
  );

  test('delete modal appears with correct content',
    { tag: ['@regression'] },
    async ({ page }) => {
      const employeeList = new EmployeeListPage(page);
      await employeeList.goto();

      const firstRow = employeeList.tableRows.first();
      const idCell   = firstRow.locator('.oxd-table-cell').nth(1);
      const targetId = (await idCell.innerText()).trim();

      await employeeList.clickDeleteForEmployee(targetId);

      await expect(
        page.locator('.orangehrm-dialog-popup')
      ).toBeVisible();

      await expect(
        page.getByText('Are you Sure?')
      ).toBeVisible();

      await expect(
        page.getByRole('button', { name: 'Yes, Delete' })
      ).toBeVisible();

      await expect(
        page.getByRole('button', { name: 'No, Cancel' })
      ).toBeVisible();

      // Dismiss — we are not here to delete real data
      await employeeList.dismissModal();

      console.log('✓ Delete modal appeared with correct content — dismissed safely');
    }
  );

});