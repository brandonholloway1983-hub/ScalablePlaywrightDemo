import { BasePage } from './BasePage.js';

// ─────────────────────────────────────────────────────────
// LoginPage — Authentication
//
// Handles login and session setup.
// Selectors derived from live DOM inspection:
//   - username: placeholder="Username"
//   - password: placeholder="Password"
//   - button:   role="button" name="Login"
//
// All stable attributes — won't break if CSS classes change
// ─────────────────────────────────────────────────────────

export class LoginPage extends BasePage {
  constructor(page) {
    super(page);

    this.usernameField = page.getByPlaceholder('Username');
    this.passwordField = page.getByPlaceholder('Password');
    this.loginButton   = page.getByRole('button', { name: 'Login' });
    this.errorMessage  = page.locator('.oxd-alert-content-text');
  }

  async goto() {
    await super.goto('/web/index.php/auth/login');
  }

  // Login with explicit credentials
  async login(username, password) {
    await this.usernameField.fill(username);
    await this.passwordField.fill(password);
    await this.loginButton.click();
    await this.page.waitForURL('**/dashboard/**', { timeout: 30000 });
  }

  // Login using environment credentials — standard for test runs
  async loginWithEnvCredentials() {
    await this.login(
      process.env.OHR_USERNAME,
      process.env.OHR_PASSWORD
    );
  }

  // Attempt login and expect it to fail — for negative tests
  async loginExpectingFailure(username, password) {
    await this.usernameField.fill(username);
    await this.passwordField.fill(password);
    await this.loginButton.click();
  }

  async getErrorMessage() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
    return await this.errorMessage.innerText();
  }

  async verifyLoginSuccessful() {
    await this.page.waitForURL('**/dashboard/**', { timeout: 30000 });
  }
}