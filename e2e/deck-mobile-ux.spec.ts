import { test, expect } from '@playwright/test';

/**
 * The missing-cards screen was unusable on a phone: on 390x844 the fixed header
 * and the settings/stats/progress block took 563 of the modal's 760px, leaving
 * the card list 128px — about two rows — with no way to collapse any of it.
 */

async function openMissingCards(page: import('@playwright/test').Page) {
  await page.goto('/deck');
  await expect(page.getByText('Deck Manager', { exact: false })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /สร้างเด็คใหม่/i }).first().click();
  await page.locator('input[placeholder*="Charizard"]').fill('Mobile UX Deck');
  await page.locator('button:has-text("สร้างเด็ค")').last().click();
  await page.waitForTimeout(1200);
  await page.locator('[data-testid="missing-cards-trigger"]').first().click();
  await expect(page.locator('[data-testid="missing-cards-modal"]')).toBeVisible({ timeout: 8000 });
}

const measure = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const q = (s: string) => document.querySelector(s) as HTMLElement | null;
    const h = (el: HTMLElement | null) => (el ? Math.round(el.getBoundingClientRect().height) : 0);
    return {
      modal: h(q('[data-testid="missing-cards-modal"]')),
      controls: h(q('[data-testid="missing-cards-controls"]')),
      list: h(q('[data-testid="missing-cards-list"]')),
    };
  });

test.describe('Missing cards on mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('gives the card list most of the screen, not the controls', async ({ page }) => {
    await openMissingCards(page);
    const m = await measure(page);

    // Was 128px of 760. The list must now dominate rather than be a sliver.
    expect(m.list).toBeGreaterThan(400);
    expect(m.list / m.modal).toBeGreaterThan(0.55);
    // And the controls must not be taller than the list.
    expect(m.controls).toBeLessThan(m.list);
  });

  test('lets the details be folded away and brought back', async ({ page }) => {
    await openMissingCards(page);
    const toggle = page.locator('[data-testid="missing-cards-details-toggle"]');
    await expect(toggle).toBeVisible();

    // Starts folded: the stats and calculation settings are out of the way.
    await expect(page.locator('text=เงื่อนไขการคำนวณ')).toBeHidden();
    const collapsed = await measure(page);

    await toggle.click();
    await expect(page.locator('text=เงื่อนไขการคำนวณ')).toBeVisible();
    const expanded = await measure(page);
    expect(expanded.list).toBeLessThan(collapsed.list);

    await toggle.click();
    await expect(page.locator('text=เงื่อนไขการคำนวณ')).toBeHidden();
    const recollapsed = await measure(page);
    expect(recollapsed.list).toBe(collapsed.list);
  });

  test('keeps the filter tabs reachable while the details are folded', async ({ page }) => {
    await openMissingCards(page);
    // These drive the list, so they must never be behind the fold.
    await expect(page.locator('button:has-text("ขาด (")')).toBeVisible();
    await expect(page.locator('button:has-text("ครบแล้ว (")')).toBeVisible();
  });

  test('scrolls the deck list with the page instead of nesting a scroller', async ({ page }) => {
    await page.goto('/deck');
    await expect(page.getByText('Deck Manager', { exact: false })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /สร้างเด็คใหม่/i }).first().click();
    await page.locator('input[placeholder*="Charizard"]').fill('Scroll Deck');
    await page.locator('button:has-text("สร้างเด็ค")').last().click();
    await page.waitForTimeout(1200);

    // The deck list had max-h-[calc(100vh-390px)] with its own overflow, which
    // below xl meant a small inner scroller inside an already-scrolling page.
    const inner = await page.evaluate(
      () =>
        ([...document.querySelectorAll('*')] as HTMLElement[]).filter((el) => {
          const s = getComputedStyle(el);
          return (
            (s.overflowY === 'auto' || s.overflowY === 'scroll') &&
            el.getBoundingClientRect().height > 40
          );
        }).length
    );
    expect(inner).toBe(0);
  });
});

test.describe('Missing cards on desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('still shows the settings, stats and progress with no fold', async ({ page }) => {
    await openMissingCards(page);
    await expect(page.locator('[data-testid="missing-cards-details-toggle"]')).toBeHidden();
    await expect(page.locator('text=เงื่อนไขการคำนวณ')).toBeVisible();
    await expect(page.locator('text=ต้องใช้ทั้งหมด')).toBeVisible();
    await expect(page.locator('text=ความพร้อมของเด็ค')).toBeVisible();
  });
});
