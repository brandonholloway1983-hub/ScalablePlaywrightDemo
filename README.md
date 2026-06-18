# ScalablePlaywrightDemo

![CI](https://github.com/brandonholloway1983-hub/ScalablePlaywrightDemo/actions/workflows/playwright.yml/badge.svg)

A scalable Playwright test automation framework built against OrangeHRM — an enterprise HR management system used here as an analog for complex, data-heavy enterprise applications like clinical trial management systems.

Built to demonstrate: scalable framework architecture, AI-assisted failure analysis, storageState authentication, API-level testing, and the kind of foundational thinking that makes a test suite grow cleanly rather than become a maintenance burden.

---

## Framework Architecture
ScalablePlaywrightDemo/
pages/
BasePage.js             # Foundation — all page objects inherit from here
LoginPage.js            # Authentication flows
EmployeeListPage.js     # Search, filter, table, row actions
tests/
smoke/
smoke.spec.js         # Gate tests — critical path, fast, run first
regression/
employeeList.spec.js  # Full workflow coverage, runs after smoke
api.spec.js           # API contract and API/UI cross-validation
utils/
failureAnalyzer.js      # AI-powered failure categorization
globalSetup.js          # Runs once — saves auth session to auth.json
.github/workflows/
playwright.yml          # Two-stage CI — smoke gates regression
playwright.config.js
.env.example

---

## Design Decisions

**Single browser (Chromium)** — Fast, stable, low noise. Adding webkit or mobile viewports is one commented line in `playwright.config.js`. Start focused, expand when coverage needs to grow.

**workers: 1** — OrangeHRM is a shared demo instance. Parallel execution causes data collisions and flaky results. Increase workers when running against a dedicated test environment.

**Environment-agnostic config** — `baseURL` and credentials come from environment variables only. Point the framework at any environment by changing `.env`. Nothing is hardcoded.

**URL-based navigation** — Tests navigate directly to page URLs rather than clicking through menus. Faster, more reliable, and resilient to navigation restructures.

**Label-scoped selectors** — Form fields are located by their visible label text, not by CSS class or position. Labels are stable business-defined text that almost never changes, making selectors resilient to UI redesigns.

**storageState auth** — `globalSetup.js` performs a single login before the regression suite runs and saves the session to `auth.json`. Regression tests load the saved session instead of logging in individually. Smoke tests opt out via `test.use({ storageState: undefined })` since they test the login flow directly.

---

## The AI Failure Analyzer

When a test fails, the framework automatically sends failure context to Claude and returns a structured analysis:

      AI FAILURE ANALYSIS
    ────────────────────────────────────────────────────────────
      Test:      search by employee ID returns matching record
      Category:  Timeout
      Severity:  High
      Confidence:High
    ────────────────────────────────────────────────────────────
      Cause:     Table did not populate within timeout — API response was slow
      Action:    Check network tab for pending requests on /viewEmployeeList
    ────────────────────────────────────────────────────────────

This is the "rules engine / failure categorization" pattern — implemented with AI rather than hardcoded rules, so it handles failure patterns that weren't anticipated when the framework was written. A rule-based fallback runs automatically when the API key is not configured.

**Failure categories:** Auth Failure, Navigation Failure, Element Not Found, Timeout, Data Assertion, Network Error, Application Error, Test Data Issue

---

## API Testing

The framework tests the REST API directly alongside UI tests — not as a separate concern.

**Pure API tests** validate the `/api/v2/pim/employees` endpoint:
- Returns 200 status
- Response has correct structure — `data` array, `meta`, required employee fields
- Page size and total count are valid
- Individual employee endpoint returns correct data for a given `empNumber`

**Combined API + UI tests** cross-reference both layers:
- API total record count matches what the UI displays
- First employee returned by the API is visible in the UI table

This pattern maps directly to RTSM — clinical trial systems expose APIs for subject data, kit status, and shipment records. Validating API responses alongside UI behavior gives confidence that both layers reflect the same truth.

---

## Tag Strategy

Tests are tagged to support a risk-based execution hierarchy:

| Tag | Purpose | When it runs |
|-----|---------|-------------|
| `@smoke` | Critical path gate | Every push — before regression |
| `@critical` | Core workflows | Every regression run |
| `@regression` | Full suite | After smoke passes |
| `@api` | API contract and cross-validation | Part of regression suite |

```bash
# Run smoke only
npm run test:smoke

# Run regression only (includes API tests)
npm run test:regression

# Run everything
npm run test:all
```

---

## CI Pipeline

Two-stage pipeline — smoke gates regression:
Push → Smoke Tests → [pass] → Regression Tests → Reports
→ [fail] → Pipeline stops

Smoke runs on every push and pull request. If smoke fails, regression does not run. A nightly scheduled run catches environment drift between deployments.

---

## Setup

```bash
# Install dependencies
npm install
npx playwright install chromium

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run smoke tests
npm run test:smoke

# Run full suite
npm run test:all
```

### GitHub Secrets required for CI
- `BASE_URL` — target environment URL
- `OHR_USERNAME` — login username
- `OHR_PASSWORD` — login password
- `ANTHROPIC_API_KEY` — required for AI failure analysis

---

## What Would Be Built Next

Given more time, the next layer of coverage would include:

- **Add Employee workflow** — form validation, required fields, successful creation
- **Edit Employee** — field updates, save confirmation, data persistence
- **Additional modules** — Leave, Recruitment follow the same table/form/modal pattern and would extend naturally from this foundation
- **Expanded API coverage** — additional endpoints, error response validation, authentication boundary testing
- **Performance baselines** — response time assertions on key API endpoints
