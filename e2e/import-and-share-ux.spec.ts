import { test, expect } from '@playwright/test';

/**
 * Covers three UX changes:
 *  1. the set picker in voice import is searchable
 *  2. entering import adopts the set filter chosen on the collection page
 *  3. the shared showcase offers the collection page's filters, minus the two
 *     that would expose more than the owner published
 */

test.describe('Import set picker', () => {
  test('is searchable by set code instead of a plain dropdown', async ({ page }) => {
    await page.goto('/collection');

    await page.locator('[data-testid="voice-import-button"]').click();
    const modal = page.locator('[data-testid="collection-import-modal"]');
    await expect(modal).toBeVisible();

    // The old control was a native <select>, which cannot be typed into.
    const picker = modal.locator('[data-testid="searchable-set-select-btn"]');
    await expect(picker).toBeVisible();
    await picker.click();

    const search = modal.locator('[data-testid="searchable-set-search-input"]');
    await expect(search).toBeVisible();

    // Typing narrows the list, and picking a result applies it.
    await search.fill('SC1a');
    await search.press('Enter');
    await expect(picker).toContainText(/SC1a/i);

    // A different term reaches a different set, proving the search drives it.
    await picker.click();
    await search.fill('SV8a');
    await search.press('Enter');
    await expect(picker).toContainText(/SV8a/i);

    // 'ALL' is not a target to import into, so clearing is not offered here.
    await expect(modal.locator('text=ทุกชุดการ์ด')).toHaveCount(0);
  });

  test('adopts the set filter chosen on the collection page', async ({ page }) => {
    await page.goto('/collection');

    // Pick a specific set on the collection page.
    const pagePicker = page.locator('[data-testid="searchable-set-select-btn"]').first();
    await pagePicker.click();
    const pageSearch = page.locator('[data-testid="searchable-set-search-input"]');
    await pageSearch.fill('SC1a');
    await pageSearch.press('Enter');
    await expect(pagePicker).toContainText(/SC1a/i);

    // Import should open already targeting it, not the remembered default.
    await page.locator('[data-testid="voice-import-button"]').click();
    const modal = page.locator('[data-testid="collection-import-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('[data-testid="searchable-set-select-btn"]')).toContainText(/SC1a/i);
  });
});

test.describe('Shared showcase filters', () => {
  test.beforeEach(async () => {
    test.setTimeout(60000);
  });

  async function publishAndOpenShare(page: import('@playwright/test').Page) {
    await page.goto('/collection');
    await page.locator('button[data-testid="share-collection-button"]').click();
    const modal = page.locator('[data-testid="share-collection-modal"]');
    await expect(modal).toBeVisible();
    await modal.locator('button[data-testid="publish-share-btn"]').click();
    await expect(modal.locator('button[data-testid="copy-share-link-btn"]')).toBeVisible({
      timeout: 8000,
    });
    const url = await modal.locator('input[readonly]').inputValue();
    await page.goto(url);
    await expect(page.locator('[data-testid="shared-collection-page"]')).toBeVisible({
      timeout: 10000,
    });
  }

  test('offers the same searching, sorting and narrowing as the collection page', async ({
    page,
  }) => {
    await publishAndOpenShare(page);

    // Searchable set picker, not the old name-only dropdown.
    await expect(page.locator('[data-testid="searchable-set-select-btn"]')).toBeVisible();

    // Search, rarity, sort and the advanced filters all present.
    await expect(page.locator('input[placeholder*="ค้นหาชื่อการ์ด"]')).toBeVisible();
    await expect(page.locator('select[aria-label="เลือกระดับความหายาก"]')).toBeVisible();
    await expect(page.locator('select[aria-label="เรียงตาม"]')).toBeVisible();

    // Status tabs the showcase does keep.
    await expect(page.locator('text=ทั้งหมด').first()).toBeVisible();
    await expect(page.locator('text=มีแล้ว').first()).toBeVisible();
  });


  test('follows the light/dark theme, including the filter bar', async ({ page }) => {
    await publishAndOpenShare(page);

    const read = () =>
      page.evaluate(() => {
        const bar = [...document.querySelectorAll('div')].find(
          (d) => typeof d.className === 'string' && d.className.includes('bg-white/95')
        );
        const pg = document.querySelector('[data-testid="shared-collection-page"]')!;
        return {
          theme: document.documentElement.getAttribute('data-theme'),
          page: getComputedStyle(pg).backgroundColor,
          bar: bar ? getComputedStyle(bar).backgroundColor : 'NOT FOUND',
        };
      });

    const setTheme = async (label: string) => {
      await page.locator('button[title^="ธีม:"]').click();
      await page.locator(`button:has-text("${label}")`).last().click();
      await page.waitForTimeout(500);
    };

    // A visitor arrives without having opened the app, so the theme control has
    // to be reachable from this page.
    await expect(page.locator('button[title^="ธีม:"]')).toBeVisible();

    await setTheme('สว่าง (Light)');
    const light = await read();
    expect(light.theme).toBe('light');

    await setTheme('มืด (Dark)');
    const dark = await read();
    expect(dark.theme).toBe('dark');

    // The page was previously hardcoded dark with no light variants, so it stayed
    // dark while the filter bar rendered light on top of it. Both must move.
    expect(dark.page).not.toBe(light.page);
    expect(dark.bar).not.toBe(light.bar);
  });

  test('withholds the missing-cards tab, which would expose the owner\'s want-list', async ({
    page,
  }) => {
    await publishAndOpenShare(page);

    // Guard against a false pass from the bar failing to render at all.
    await expect(page.locator('select[aria-label="เรียงตาม"]')).toBeVisible();
    await expect(page.locator('text=มีแล้ว').first()).toBeVisible();

    // The collection page has a "ยังไม่มี" tab. Offering it here would let a
    // visitor read off every card the owner lacks.
    await expect(page.locator('text=ยังไม่มี')).toHaveCount(0);
  });

  test('drops price sorting when the owner did not share prices', async ({ page }) => {
    await page.goto('/collection');
    await page.locator('button[data-testid="share-collection-button"]').click();
    const modal = page.locator('[data-testid="share-collection-modal"]');
    await expect(modal).toBeVisible();

    // Turn the market-valuation option off before publishing.
    const priceToggle = modal.locator('input[type="checkbox"]').first();
    await priceToggle.uncheck();

    await modal.locator('button[data-testid="publish-share-btn"]').click();
    await expect(modal.locator('button[data-testid="copy-share-link-btn"]')).toBeVisible({
      timeout: 8000,
    });
    const url = await modal.locator('input[readonly]').inputValue();
    await page.goto(url);
    await expect(page.locator('[data-testid="shared-collection-page"]')).toBeVisible({
      timeout: 10000,
    });

    // Sorting by price would reveal the ranking of value that hiding the
    // numbers was meant to keep private.
    const sortSelect = page.locator('select[aria-label="เรียงตาม"]');
    await expect(sortSelect).toBeVisible();
    await expect(sortSelect.locator('option[value="price"]')).toHaveCount(0);
    await expect(sortSelect.locator('option[value="number"]')).toHaveCount(1);
  });
});
