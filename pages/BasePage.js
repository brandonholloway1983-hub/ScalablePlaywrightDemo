// ─────────────────────────────────────────────────────────
// BasePage — Foundation for all page objects
//
// Design principles:
//   - Every page object inherits from here
//   - Common patterns live here once — not repeated per page
//   - Helpers are enterprise-app aware: tables, modals,
//     custom dropdowns, loading states
//   - Error context is captured at the base level so all
//     page objects benefit automatically
// ─────────────────────────────────────────────────────────

export class BasePage {
  constructor(page) {
    this.page = page;

    // OrangeHRM design system — stable class conventions
    // used as building blocks in helper methods below
    this.loadingSpinner = page.locator('.oxd-loading-spinner');
    this.toastMessage   = page.locator('.oxd-toast');
    this.tableRows      = page.locator('.oxd-table-body .oxd-table-row');
  }

  // ── Navigation ──────────────────────────────────────────

  async goto(path = '/') {
    await this.page.goto(path, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  }

  async getTitle() {
    return await this.page.title();
  }

  getUrl() {
    return this.page.url();
  }

  // ── Wait strategies ─────────────────────────────────────

  // Wait for any loading spinner to disappear
  // Enterprise apps often show a spinner while table data loads
  async waitForPageReady() {
    try {
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      // Spinner may not appear at all — that's fine, continue
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Wait for a table to have at least one data row
  // Prevents acting on an empty table before data arrives
  async waitForTableData(timeout = 15000) {
    await this.tableRows.first().waitFor({ state: 'visible', timeout });
  }

  // ── Table helpers ────────────────────────────────────────

  // Get total number of visible table rows
  async getRowCount() {
    await this.waitForTableData();
    return await this.tableRows.count();
  }

  // Find a row by any text it contains
  getRowByText(text) {
    return this.tableRows.filter({ hasText: text });
  }

  // Click the edit (pencil) button in a specific row
  async clickEditInRow(rowLocator) {
    await rowLocator.locator('[class*="bi-pencil"]').click();
  }

  // Click the delete (trash) button in a specific row
  async clickDeleteInRow(rowLocator) {
    await rowLocator.locator('[class*="bi-trash"]').click();
  }

  // ── Form helpers ─────────────────────────────────────────

  // Fill a scoped input field by its label
  async fillByLabel(labelText, value) {
    await this.page
      .locator('.oxd-input-group')
      .filter({ hasText: labelText })
      .locator('.oxd-input')
      .fill(value);
  }

  // Fill an autocomplete field (the "Type for hints..." fields)
  async fillAutocomplete(labelText, value) {
    const input = this.page
      .locator('.oxd-input-group')
      .filter({ hasText: labelText })
      .getByPlaceholder('Type for hints...');

    await input.fill(value);

    await this.page
      .locator('.oxd-autocomplete-dropdown')
      .waitFor({ state: 'visible', timeout: 5000 });

    await this.page
      .locator('.oxd-autocomplete-option')
      .first()
      .click();
  }

  // Select from a custom OrangeHRM dropdown (not native <select>)
  async selectDropdown(labelText, optionText) {
    await this.page
      .locator('.oxd-input-group')
      .filter({ hasText: labelText })
      .locator('.oxd-select-text-input')
      .click();

    await this.page
      .getByRole('option', { name: optionText })
      .click();
  }

  // ── Modal helpers ────────────────────────────────────────

  async waitForModal() {
    await this.page
      .locator('.orangehrm-dialog-popup')
      .waitFor({ state: 'visible', timeout: 10000 });
  }

  async confirmModal() {
    await this.waitForModal();
    await this.page
      .getByRole('button', { name: 'Yes, Delete' })
      .click();
  }

  async dismissModal() {
    await this.waitForModal();
    await this.page
      .getByRole('button', { name: 'No, Cancel' })
      .click();
  }

  // ── Toast / notification helpers ─────────────────────────

  async waitForSuccessToast() {
    await this.toastMessage.waitFor({ state: 'visible', timeout: 10000 });
    return await this.toastMessage.innerText();
  }
}