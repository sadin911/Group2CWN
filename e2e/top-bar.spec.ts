import { test, expect } from '@playwright/test';

test.describe('Top Bar & Account Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/collection');
    await expect(page.locator('[data-testid="app-header-bar"]')).toBeVisible({ timeout: 10000 });
  });

  test('the bar carries the account control and no loose tools', async ({ page }) => {
    const bar = page.locator('[data-testid="app-header-bar"]');
    await expect(bar.locator('[data-testid="account-button"]')).toBeVisible();

    // Backup, install, update and sync all moved into the account menu
    await expect(bar.getByRole('button', { name: /Backup|สำรอง/ })).toHaveCount(0);
    await expect(bar.getByRole('button', { name: /ติดตั้ง/ })).toHaveCount(0);
    await expect(bar.getByRole('button', { name: /อัปเดต|OTA/ })).toHaveCount(0);
    await expect(bar.getByRole('button', { name: /Sync|ซิงค์/ })).toHaveCount(0);
  });

  test('the account menu holds the tools that left the bar', async ({ page }) => {
    await page.locator('[data-testid="account-button"]').click();

    const menu = page.locator('[data-testid="account-menu"]');
    await expect(menu).toBeVisible();
    await expect(menu.locator('[data-testid="menu-update"]')).toBeVisible();
    await expect(menu.locator('[data-testid="menu-theme"]')).toBeVisible();

    // The update row reports the version currently running
    await expect(menu.locator('[data-testid="menu-update"]')).toContainText(/v\d+\.\d+\.\d+/);
  });

  test('the menu closes on Escape', async ({ page }) => {
    await page.locator('[data-testid="account-button"]').click();
    await expect(page.locator('[data-testid="account-menu"]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="account-menu"]')).toBeHidden();
  });

  test('a signed-out visitor can still reach theme and update', async ({ page }) => {
    // No auth in the test environment, so this is the guest menu
    await page.locator('[data-testid="account-button"]').click();

    const menu = page.locator('[data-testid="account-menu"]');
    await expect(menu.locator('[data-testid="menu-signin"]')).toBeVisible();
    await expect(menu.locator('[data-testid="menu-theme"]')).toBeVisible();
    await expect(menu.locator('[data-testid="menu-update"]')).toBeVisible();

    // Account-only rows are omitted rather than shown disabled
    await expect(menu.locator('[data-testid="menu-sync"]')).toHaveCount(0);
    await expect(menu.locator('[data-testid="menu-signout"]')).toHaveCount(0);
  });

  test('the context strip carries the binder switcher and stats', async ({ page }) => {
    const strip = page.locator('[data-testid="header-context-strip"]');
    await expect(strip).toBeVisible();
    await expect(strip.locator('[data-testid="profile-switcher"]')).toBeVisible();
    await expect(strip.locator('[data-testid="header-stats"]')).toBeVisible();
  });

  test('the deck page reuses the same bar with its own context actions', async ({ page }) => {
    await page.goto('/deck');
    await expect(page.locator('[data-testid="app-header-bar"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="account-button"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="header-context-strip"]').getByRole('button', { name: /นำเข้า/ })
    ).toBeVisible();
  });

  test('the header does not overflow horizontally at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/collection');
    await expect(page.locator('[data-testid="app-header-bar"]')).toBeVisible({ timeout: 10000 });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
