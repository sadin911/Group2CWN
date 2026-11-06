import { test, expect } from '@playwright/test';

test.describe('Mobile Viewport & PWA Navigation Suite', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 dimensions

  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('pokecount_playmat_tester_key', 'pwa-tester');
      localStorage.setItem(
        'pokecount_playmat_allowed_users',
        JSON.stringify([
          {
            id: 'pwa_1',
            identifier: 'pwa-tester',
            note: 'PWA Tester',
            addedAt: Date.now(),
          },
        ])
      );
    });
  });

  test('displays mobile BottomNav and switches pages seamlessly', async ({ page }) => {
    await page.goto('/collection');
    await expect(page.locator('h1')).toContainText('PokéCollection');

    // BottomNav should be visible on mobile
    const bottomNav = page.locator('nav.md\\:hidden');
    await expect(bottomNav).toBeVisible();

    // Tap "จัดเด็ค" in BottomNav
    const deckNavTab = page.locator('nav.md\\:hidden button:has-text("จัดเด็ค")');
    await expect(deckNavTab).toBeVisible();
    await deckNavTab.click();
    await expect(page).toHaveURL(/.*\/deck/);
    await expect(page.getByText('Deck Manager', { exact: false })).toBeVisible({ timeout: 10000 });

    // Tap back to "สมุดสะสม"
    const collectionNavTab = page.locator('nav.md\\:hidden button:has-text("สมุดสะสม")');
    await expect(collectionNavTab).toBeVisible();
    await collectionNavTab.click();
    await expect(page).toHaveURL(/.*\/collection/);
  });

  test('mobile search bar works in mobile viewport', async ({ page }) => {
    await page.goto('/collection');
    const searchInput = page.getByPlaceholder(/ค้นหาชื่อการ์ด/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('มิว');
    await page.waitForTimeout(300);

    const cardItems = page.locator('.group.relative.rounded-xl');
    await expect(cardItems.first()).toBeVisible({ timeout: 10000 });
  });
});
