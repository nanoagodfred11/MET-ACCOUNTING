import { test, expect } from '@playwright/test';

// ─── Auth ───────────────────────────────────────────────────────

test.describe('Authentication', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toHaveText('Met Accounting');
    await expect(page.locator('h2')).toHaveText('Sign In');
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Sign In');
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid username or password')).toBeVisible();
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });

  test('login with shared password (met2024) also works', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'met2024');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('logout returns to login page', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Logout
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Helper: login before each test ─────────────────────────────

test.describe('Authenticated pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  // ─── Sidebar Navigation ────────────────────────────────────────

  test.describe('Sidebar', () => {
    test('sidebar shows all navigation links', async ({ page }) => {
      await expect(page.locator('aside:visible h1:has-text("Met Accounting")')).toBeVisible();
      await expect(page.locator('a:has-text("Dashboard")')).toBeVisible();
      await expect(page.locator('a:has-text("Data Entry")')).toBeVisible();
      await expect(page.locator('a:has-text("Mass Balance")')).toBeVisible();
      await expect(page.locator('a:has-text("Recovery")')).toBeVisible();
      await expect(page.locator('a:has-text("Monthly Report")')).toBeVisible();
    });

    test('sidebar shows logged-in username', async ({ page }) => {
      await expect(page.locator('aside p.text-gold-400')).toHaveText('admin');
    });

    test('clicking Data Entry navigates correctly', async ({ page }) => {
      await page.click('a:has-text("Data Entry")');
      await expect(page).toHaveURL(/\/data-entry/);
      await expect(page.locator('h1:has-text("Data Entry")')).toBeVisible();
    });

    test('clicking Mass Balance navigates correctly', async ({ page }) => {
      await page.click('a:has-text("Mass Balance")');
      await expect(page).toHaveURL(/\/mass-balance/);
      await expect(page.locator('h1:has-text("Mass Balance")')).toBeVisible();
    });

    test('clicking Recovery navigates correctly', async ({ page }) => {
      await page.click('a:has-text("Recovery")');
      await expect(page).toHaveURL(/\/recovery/);
      await expect(page.locator('h1:has-text("Recovery")')).toBeVisible();
    });

    test('clicking Monthly Report navigates correctly', async ({ page }) => {
      await page.click('a:has-text("Monthly Report")');
      await expect(page).toHaveURL(/\/monthly/);
      await expect(page.locator('h1:has-text("Monthly Report")')).toBeVisible();
    });
  });

  // ─── Dashboard ─────────────────────────────────────────────────

  test.describe('Dashboard', () => {
    test('shows stat cards', async ({ page }) => {
      await expect(page.locator('text=FEED').first()).toBeVisible();
      await expect(page.locator('text=PRODUCT METAL').first()).toBeVisible();
      await expect(page.locator('text=TAILINGS GRADE').first()).toBeVisible();
      await expect(page.locator('text=UNACCOUNTED').first()).toBeVisible();
      await expect(page.locator('text=STATUS').first()).toBeVisible();
    });

    test('shows recovery trend section', async ({ page }) => {
      await expect(page.locator('text=Recovery Trend')).toBeVisible();
    });

    test('date navigation works', async ({ page }) => {
      await page.goto('/?date=2026-02-25');
      // Should load data for Feb 25
      await expect(page.locator('input[type="date"]')).toHaveValue('2026-02-25');
    });

    test('shows seeded mass balance data for Feb 27', async ({ page }) => {
      await page.goto('/?date=2026-02-27');
      // Product metal for Feb 27 is 66.456 kg — displayed in stat card
      await expect(page.getByText('66.456 kg')).toBeVisible();
    });
  });

  // ─── Data Entry ────────────────────────────────────────────────

  test.describe('Data Entry', () => {
    test('shows tonnage and assay tabs', async ({ page }) => {
      await page.click('a:has-text("Data Entry")');
      await expect(page.locator('button:has-text("Tonnage Data")')).toBeVisible();
      await expect(page.locator('button:has-text("Assay Results")')).toBeVisible();
    });

    test('tonnage tab shows add form and data table', async ({ page }) => {
      await page.goto('/data-entry?date=2026-02-27&periodType=daily');
      await expect(page.locator('text=Add Tonnage Record')).toBeVisible();
      await expect(page.locator('select[name="samplingPointId"]')).toBeVisible();
      await expect(page.locator('input[name="wetTonnes"]')).toBeVisible();
      await expect(page.locator('input[name="moisturePercent"]')).toBeVisible();
    });

    test('tonnage table shows seeded data for Feb 27', async ({ page }) => {
      await page.goto('/data-entry?date=2026-02-27&periodType=daily');
      // Should show 8 sampling point rows
      const rows = page.locator('tbody tr');
      await expect(rows).toHaveCount(8);
      // Mill Feed should be visible
      await expect(page.locator('td:has-text("Mill Feed")')).toBeVisible();
      // ROM Feed should be visible
      await expect(page.locator('td:has-text("ROM Feed")')).toBeVisible();
    });

    test('assay tab shows pending and verified sections', async ({ page }) => {
      await page.goto('/data-entry?date=2026-02-27&periodType=daily');
      await page.click('button:has-text("Assay Results")');
      await expect(page.locator('text=Verified Assays')).toBeVisible();
    });

    test('period selector changes period type', async ({ page }) => {
      await page.goto('/data-entry');
      // The first select in PeriodSelector is the period type dropdown
      const periodSelect = page.locator('select.bg-navy-700\\/60').first();
      await periodSelect.selectOption('shift');
      await expect(page).toHaveURL(/periodType=shift/);
    });
  });

  // ─── Mass Balance ──────────────────────────────────────────────

  test.describe('Mass Balance', () => {
    test('shows calculate button', async ({ page }) => {
      await page.goto('/mass-balance?date=2026-02-27&periodType=daily');
      await expect(page.locator('button:has-text("Calculate")')).toBeVisible();
    });

    test('shows mass balance table with seeded data', async ({ page }) => {
      await page.goto('/mass-balance?date=2026-02-27&periodType=daily');
      // The stream table should show Feed, Product, Tailings, Unaccounted
      await expect(page.locator('td:has-text("Feed (In)")')).toBeVisible();
      await expect(page.locator('td:has-text("Product (Gold)")')).toBeVisible();
      await expect(page.locator('td:has-text("Tailings")')).toBeVisible();
      await expect(page.locator('td:has-text("Unaccounted")')).toBeVisible();
    });

    test('shows correct status for seeded data', async ({ page }) => {
      await page.goto('/mass-balance?date=2026-02-27&periodType=daily');
      await expect(page.locator('text=final').first()).toBeVisible();
    });

    test('shows empty state when no data', async ({ page }) => {
      await page.goto('/mass-balance?date=2025-01-01&periodType=daily');
      await expect(page.locator('text=No mass balance data')).toBeVisible();
    });
  });

  // ─── Recovery ──────────────────────────────────────────────────

  test.describe('Recovery', () => {
    test('shows recovery stat cards', async ({ page }) => {
      await page.goto('/recovery?date=2026-02-27');
      await expect(page.locator('text=AVG RECOVERY').first()).toBeVisible();
      await expect(page.locator('text=BEST DAY').first()).toBeVisible();
      await expect(page.locator('text=WORST DAY').first()).toBeVisible();
      await expect(page.locator('text=TODAY').first()).toBeVisible();
    });

    test('shows recovery trend chart section', async ({ page }) => {
      await page.goto('/recovery?date=2026-02-27');
      await expect(page.locator('text=Recovery Trend')).toBeVisible();
    });

    test('shows calculate button', async ({ page }) => {
      await page.goto('/recovery?date=2026-02-27');
      await expect(page.locator('button:has-text("Calculate")')).toBeVisible();
    });

    test('shows seeded recovery values', async ({ page }) => {
      await page.goto('/recovery?date=2026-02-27');
      // Average recovery is 87.06% for seeded data
      await expect(page.getByText('87.06%')).toBeVisible();
    });
  });

  // ─── Monthly Report ────────────────────────────────────────────

  test.describe('Monthly Report', () => {
    test('shows month and year selectors', async ({ page }) => {
      await page.goto('/monthly?year=2026&month=2');
      await expect(page.locator('select:has(option:has-text("January"))')).toBeVisible();
      await expect(page.locator('select:has(option:has-text("2026"))')).toBeVisible();
    });

    test('shows generate report button', async ({ page }) => {
      await page.goto('/monthly?year=2026&month=2');
      await expect(page.locator('button:has-text("Generate")')).toBeVisible();
    });

    test('shows export CSV button', async ({ page }) => {
      await page.goto('/monthly?year=2026&month=2');
      await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
    });

    test('shows monthly summary table with seeded data', async ({ page }) => {
      await page.goto('/monthly?year=2026&month=2');
      // Monthly summary should show Feed, Product, Tailings
      await expect(page.locator('td:has-text("Feed")')).toBeVisible();
      await expect(page.locator('td:has-text("Product")')).toBeVisible();
      await expect(page.locator('td:has-text("Tailings")')).toBeVisible();
    });

    test('shows daily breakdown table', async ({ page }) => {
      await page.goto('/monthly?year=2026&month=2');
      await expect(page.locator('text=Daily Breakdown')).toBeVisible();
      // Should have 7 rows for 7 seeded days
      const dailyRows = page.locator('table').last().locator('tbody tr');
      await expect(dailyRows).toHaveCount(7);
    });

    test('shows recovery summary cards', async ({ page }) => {
      await page.goto('/monthly?year=2026&month=2');
      await expect(page.locator('text=Avg Recovery')).toBeVisible();
      await expect(page.locator('text=Max Recovery')).toBeVisible();
      await expect(page.locator('text=Min Recovery')).toBeVisible();
      await expect(page.locator('text=Days Reported')).toBeVisible();
    });

    test('shows empty state for month with no data', async ({ page }) => {
      await page.goto('/monthly?year=2025&month=1');
      await expect(page.locator('text=No data for')).toBeVisible();
    });
  });
});
