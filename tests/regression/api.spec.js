import { test, expect, request } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage.js';
import { EmployeeListPage } from '../../pages/EmployeeListPage.js';
import { analyzeFailure } from '../../utils/failureAnalyzer.js';

// ─────────────────────────────────────────────────────────
// API Tests — Contract and cross-validation
//
// These tests operate at two levels:
//   1. Pure API — validates response structure, status codes,
//      and data integrity directly against the REST endpoint
//   2. Combined API + UI — cross-references API data against
//      what the UI actually displays, proving the two layers
//      are in sync
//
// This pattern maps directly to RTSM — clinical trial systems
// expose APIs for subject data, kit status, and shipment
// records. Validating API responses alongside UI behavior
// gives confidence that both layers reflect the same truth.
//
// Endpoint: /api/v2/pim/employees
// ─────────────────────────────────────────────────────────

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

test.describe('API — Employee Endpoints', () => {

  // ── Pure API tests ─────────────────────────────────────

  test('employee list endpoint returns 200',
    { tag: ['@regression', '@api', '@critical'] },
    async ({ playwright }) => {
      const context = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: {
          'Accept': 'application/json',
        },
      });

      const response = await context.get(
        '/web/index.php/api/v2/pim/employees?limit=50&offset=0&model=detailed&includeEmployees=onlyCurrent&sortField=employee.firstName&sortOrder=ASC'
      );

      expect(response.status()).toBe(200);
      console.log('✓ Employee list endpoint returned 200');

      await context.dispose();
    }
  );

  test('employee list response has correct structure',
    { tag: ['@regression', '@api', '@critical'] },
    async ({ playwright }) => {
      const context = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: {
          'Accept': 'application/json',
        },
      });

      const response = await context.get(
        '/web/index.php/api/v2/pim/employees?limit=50&offset=0&model=detailed&includeEmployees=onlyCurrent&sortField=employee.firstName&sortOrder=ASC'
      );

      const body = await response.json();

      // Top level structure
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      // First employee structure
      const employee = body.data[0];
      expect(employee).toHaveProperty('empNumber');
      expect(employee).toHaveProperty('employeeId');
      expect(employee).toHaveProperty('firstName');
      expect(employee).toHaveProperty('lastName');
      expect(employee).toHaveProperty('jobTitle');
      expect(employee).toHaveProperty('subunit');
      expect(employee).toHaveProperty('empStatus');
      expect(employee).toHaveProperty('supervisors');

      console.log(`✓ Response structure valid — first employee: ${employee.firstName} ${employee.lastName}`);

      await context.dispose();
    }
  );

  test('employee list returns expected page size',
    { tag: ['@regression', '@api'] },
    async ({ playwright }) => {
      const context = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: {
          'Accept': 'application/json',
        },
      });

      const response = await context.get(
        '/web/index.php/api/v2/pim/employees?limit=50&offset=0&model=detailed&includeEmployees=onlyCurrent&sortField=employee.firstName&sortOrder=ASC'
      );

      const body = await response.json();

      // Should return up to 50 records per page
      expect(body.data.length).toBeLessThanOrEqual(50);

      // Meta should reflect total count
      expect(body.meta).toHaveProperty('total');
      expect(body.meta.total).toBeGreaterThan(0);

      console.log(`✓ Page size valid — ${body.data.length} records returned, ${body.meta.total} total`);

      await context.dispose();
    }
  );

  test('individual employee endpoint returns correct data',
    { tag: ['@regression', '@api'] },
    async ({ playwright }) => {
      const context = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: {
          'Accept': 'application/json',
        },
      });

      // First get the list to find a valid empNumber
      const listResponse = await context.get(
        '/web/index.php/api/v2/pim/employees?limit=50&offset=0&model=detailed&includeEmployees=onlyCurrent&sortField=employee.firstName&sortOrder=ASC'
      );
      const listBody = await listResponse.json();
      const firstEmployee = listBody.data[0];
      const empNumber = firstEmployee.empNumber;

      // Then fetch that specific employee
      const detailResponse = await context.get(
        `/web/index.php/api/v2/pim/employees/${empNumber}/personal-details`
      );

      expect(detailResponse.status()).toBe(200);

      const detailBody = await detailResponse.json();
      expect(detailBody).toHaveProperty('data');
      expect(detailBody.data).toHaveProperty('empNumber');
      expect(detailBody.data.empNumber).toBe(empNumber);

      console.log(`✓ Individual employee endpoint valid — empNumber ${empNumber}`);

      await context.dispose();
    }
  );

  // ── Combined API + UI tests ────────────────────────────

  test('API record count matches UI record count',
    { tag: ['@regression', '@api', '@critical'] },
    async ({ page, playwright }) => {
      // Get count from API
      const context = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: {
          'Accept': 'application/json',
        },
      });

      const response = await context.get(
        '/web/index.php/api/v2/pim/employees?limit=50&offset=0&model=detailed&includeEmployees=onlyCurrent&sortField=employee.firstName&sortOrder=ASC'
      );
      const body = await response.json();
      const apiTotal = body.meta.total;

      // Get count from UI
      const employeeList = new EmployeeListPage(page);
      await employeeList.goto();
      const uiTotal = await employeeList.getRecordCount();

      // They should match
      expect(uiTotal).toBe(apiTotal);

      console.log(`✓ API total (${apiTotal}) matches UI total (${uiTotal})`);

      await context.dispose();
    }
  );

  test('first employee in API response appears in UI table',
    { tag: ['@regression', '@api'] },
    async ({ page, playwright }) => {
      // Get first employee from API
      const context = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: {
          'Accept': 'application/json',
        },
      });

      const response = await context.get(
        '/web/index.php/api/v2/pim/employees?limit=50&offset=0&model=detailed&includeEmployees=onlyCurrent&sortField=employee.firstName&sortOrder=ASC'
      );
      const body = await response.json();
      const firstEmployee = body.data[0];
      const employeeId = firstEmployee.employeeId;

      // Verify that employee appears in the UI
      const employeeList = new EmployeeListPage(page);
      await employeeList.goto();

      const row = employeeList.getRowById(employeeId);
      await expect(row).toBeVisible();

      console.log(`✓ First API employee (ID: ${employeeId}) visible in UI table`);

      await context.dispose();
    }
  );

});