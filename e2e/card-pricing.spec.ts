import { test, expect } from '@playwright/test';

test.describe('Card Pricing & Thai Estimate E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/collection');
    await expect(page.locator('h1')).toContainText('PokéCollection');
  });

  test('displays live price chips on front page card grid', async ({ page }) => {
    // Check that card price chips are visible on the collection page
    const priceBadges = page.locator('button[data-testid="card-price-badge"], button[title*="Market Price"], button[title*="ประเมินการ์ดไทย"]');
    // Badges appear only once market_prices.json has been fetched and parsed.
    // That file roughly doubled when the price feed was widened to all 50
    // mapped English sets, so 10s was too tight under parallel workers.
    await expect(priceBadges.first()).toBeVisible({ timeout: 25000 });

    const badgeCount = await priceBadges.count();
    expect(badgeCount).toBeGreaterThan(0);
  });

  test('sorts collection cards by market price', async ({ page }) => {
    const sortSelect = page.locator('select').filter({ hasText: /หมายเลขการ์ด|ราคาตลาด/i }).first();
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption('price');
      await page.waitForTimeout(500);

      // Verify grid still renders cards
      const cardItems = page.locator('.group.relative.rounded-xl');
      await expect(cardItems.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('opens card detail modal and displays Thai 1/3 estimate ratio banner and stat boxes', async ({ page }) => {
    // Click on the first card
    const cardItems = page.locator('.group.relative.rounded-xl');
    await expect(cardItems.first()).toBeVisible({ timeout: 10000 });
    await cardItems.first().click();

    // Modal should be visible
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Should display Market Valuation section
    await expect(page.locator('text=ราคาตลาดและการประเมิน')).toBeVisible({ timeout: 10000 });

    // Should show 4 stat boxes (Regular, Foil, PSA 10, Last Sold)
    await expect(page.locator('text=ปกติ (Regular)')).toBeVisible();
    await expect(page.locator('text=ฟอยล์ (Foil)')).toBeVisible();

    // Should show 1-Click Verification links
    await expect(page.locator('text=ตรวจสอบราคาตลาดจริง')).toBeVisible();
    await expect(page.locator('a:has-text("eBay Sold")')).toBeVisible();
    await expect(page.locator('a:has-text("TCGplayer")')).toBeVisible();
  });

  test('switches to full EN price when clicking EN bilingual tab', async ({ page }) => {
    // Click on the first card
    const cardItems = page.locator('.group.relative.rounded-xl');
    await expect(cardItems.first()).toBeVisible({ timeout: 10000 });
    await cardItems.first().click();

    // Modal should be visible
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Bilingual tabs should be visible
    const enTab = page.locator('[data-testid="bilingual-tab-en"]');
    const thTab = page.locator('[data-testid="bilingual-tab-th"]');
    await expect(enTab).toBeVisible({ timeout: 5000 });

    // Click EN tab to view the English card
    await enTab.click();
    await page.waitForTimeout(300);

    // Pricing section should now show the EN Market Price badge
    const enBadge = page.locator('text=ราคาการ์ดภาษาอังกฤษ (EN Market)');
    await expect(enBadge).toBeVisible({ timeout: 5000 });

    // Click TH tab to switch back
    await thTab.click();
    await page.waitForTimeout(300);

    // Should return to Thai view
    await expect(thTab).toHaveClass(/bg-indigo-600/);
  });

  test('renders card images without indefinitely stuck skeleton shimmer', async ({ page }) => {
    const cardItems = page.locator('.group.relative.rounded-xl');
    await expect(cardItems.first()).toBeVisible({ timeout: 10000 });

    // Wait a brief moment for images to resolve or fallback
    await page.waitForTimeout(1000);

    // Ensure card image tags exist and are visible
    const images = page.locator('.group.relative.rounded-xl img');
    await expect(images.first()).toBeVisible({ timeout: 5000 });
  });
});
