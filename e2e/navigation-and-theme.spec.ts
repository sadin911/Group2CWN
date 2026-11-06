import { test, expect } from '@playwright/test';

test.describe('Navigation and Theme Routing', () => {
  test('default root route loads Collection Tracker', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('PokéCollection');
    await expect(page).toHaveURL(/.*\/collection/);
  });

  test('navigates between Collection and Deck Builder via Desktop Nav / URL', async ({ page }) => {
    await page.goto('/collection');
    await expect(page.locator('h1')).toContainText('PokéCollection');

    // Navigate to Deck Manager
    await page.goto('/deck');
    await expect(page.getByText('Deck Manager', { exact: false })).toBeVisible();
    await expect(page).toHaveURL(/.*\/deck/);
  });

  test('Battle Tracker and Playmat simulator menu items are hidden and direct URLs redirect to Collection', async ({ page }) => {
    await page.goto('/collection');
    await expect(page.locator('h1')).toContainText('PokéCollection');

    // Desktop top bar and mobile bottom nav should NOT have โต๊ะจำลอง or นับแต้ม / นับแต้มแข่ง
    await expect(page.getByRole('button', { name: /โต๊ะจำลอง/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /นับแต้ม/ })).toHaveCount(0);

    // Account menu should NOT have Playmat (Sandbox โต๊ะจริง)
    await page.locator('[data-testid="account-button"]').click();
    await expect(page.locator('[data-testid="account-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="menu-playmat-v3"]')).toHaveCount(0);
    await page.keyboard.press('Escape');

    // Direct navigation to /battle or /playmat-v3 should redirect to /collection
    await page.goto('/battle');
    await expect(page).toHaveURL(/.*\/collection/);
    await expect(page.locator('h1')).toContainText('PokéCollection');

    await page.goto('/playmat-v3');
    await expect(page).toHaveURL(/.*\/collection/);
    await expect(page.locator('h1')).toContainText('PokéCollection');
  });

  test('theme switcher toggles between Light, Dark, and System modes', async ({ page }) => {
    await page.goto('/collection');

    // The theme control lives in the account menu now, not loose in the top bar
    await page.locator('[data-testid="account-button"]').click();
    const segmented = page.locator('[data-testid="theme-segmented"]');
    await expect(segmented).toBeVisible();

    await segmented.getByRole('button', { name: /สว่าง/ }).click();
    await expect(page.locator('html')).toHaveClass(/light/);

    await segmented.getByRole('button', { name: /มืด/ }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await segmented.getByRole('button', { name: /อัตโนมัติ/ }).click();
    await expect(segmented.getByRole('button', { name: /อัตโนมัติ/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
