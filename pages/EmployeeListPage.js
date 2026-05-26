import { BasePage } from './BasePage.js';

// ─────────────────────────────────────────────────────────
// EmployeeListPage — PIM > Employee List
//
// Covers:
//   - Search/filter form
//   - Results table — row count, finding rows, reading cells
//   - Row-level actions — edit, delete
//
// Selector strategy:
//   - Buttons → getByRole (resilient to style changes)
//   - Form fields → scoped by label via .oxd-input-group
//   - Table rows → .oxd-table-body .oxd-table-row
//   - Row actions → scoped within the matched row
//   - Row by ID → exact regex match on ID cell only
//     so '1' doesn't match every row containing the digit 1
// ─────────────────────────────────────────────────────────

export class EmployeeListPage extends BasePage {
  constructor(page) {
    super(page);

    // ── Page-level actions ─────────────────────────────
    this.addButton    = page.getByRole('button', { name: 'Add' });
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton  = page.getByRole('button', { name: 'Reset' });

    // ── Search form fields ─────────────────────────────
    // Scoped by label — handles multiple "Type for hints..."
    // fields without ambiguity
    this.employeeNameField = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Employee Name' })
      .getByPlaceholder('Type for hints...');

    this.employeeIdField = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Employee Id' })
      .locator('.oxd-input');

    this.supervisorNameField = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Supervisor Name' })
      .getByPlaceholder('Type for hints...');
  }

  async goto() {
    await super.goto('/web/index.php/pim/viewEmployeeList');
    await this.waitForPageReady();
    await this.waitForTableData();
  }

  // ── Search actions ───────────────────────────────────

  async searchByEmployeeId(id) {
    await this.employeeIdField.fill(id);
    await this.searchButton.click();
    await this.waitForPageReady();
  }

  async searchByEmploymentStatus(status) {
    await this.selectDropdown('Employment Status', status);
    await this.searchButton.click();
    await this.waitForPageReady();
  }

  async resetSearch() {
    await this.resetButton.click();
    await this.waitForPageReady();
    await this.waitForTableData();
  }

  // ── Record count ─────────────────────────────────────

  // Reads the "(117) Records Found" text above the table
  // Scoped to span only — excludes toast notifications
  // that also say "No Records Found" and cause strict
  // mode violations
  async getRecordCount() {
    const countSpan = this.page
      .locator('span.oxd-text')
      .filter({ hasText: 'Records Found' });

    await countSpan.waitFor({ state: 'visible', timeout: 10000 });
    const text = await countSpan.innerText();

    if (text.includes('No Records')) return 0;
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1]) : null;
  }

  // ── Table reads ──────────────────────────────────────

  async getVisibleRowCount() {
    return await this.tableRows.count();
  }

  // Find a row by employee ID
  // Uses exact regex match on the ID cell specifically —
  // prevents partial matches like '1' matching '10', '21', etc.
  getRowById(employeeId) {
    return this.tableRows.filter({
      has: this.page
        .locator('.oxd-table-cell')
        .nth(1)
        .filter({ hasText: new RegExp(`^\\s*${employeeId}\\s*$`) })
    });
  }

  // ── Row actions ──────────────────────────────────────

  async clickEditForEmployee(employeeId) {
    const row = this.getRowById(employeeId);
    await row.locator('[class*="bi-pencil"]').click();
    await this.page.waitForURL('**/viewPersonalDetails/**', {
      timeout: 10000
    });
  }

  async clickDeleteForEmployee(employeeId) {
    const row = this.getRowById(employeeId);
    await row.locator('[class*="bi-trash"]').click();
    await this.waitForModal();
  }

  async deleteEmployee(employeeId) {
    await this.clickDeleteForEmployee(employeeId);
    await this.confirmModal();
    await this.waitForSuccessToast();
    await this.waitForPageReady();
  }

  // ── Navigation ───────────────────────────────────────

  async clickAddEmployee() {
    await this.addButton.click();
    await this.page.waitForURL('**/addEmployee**', { timeout: 10000 });
  }

  // ── Verification helpers ─────────────────────────────

  async verifyEmployeeInList(employeeId) {
    const row = this.getRowById(employeeId);
    await row.waitFor({ state: 'visible', timeout: 10000 });
    return true;
  }

  async verifyTableHasResults() {
    const count = await this.getRecordCount();
    return count !== null && count > 0;
  }
}