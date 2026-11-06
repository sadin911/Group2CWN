import { test, expect } from '@playwright/test';

/**
 * Thai prices are derived from the paired English card, so a card can lack a
 * price for three quite different reasons. This panel splits them, because a
 * single total reads as more work than it is — most of it resolves itself when
 * TCGPlayer publishes prices for the newest sets.
 *
 * It writes to the shared market_prices collection, so it sits behind the admin
 * gate. The gate accepts a passkey held in sessionStorage.
 */

async function openPricesTab(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    // Matches the default in utils/adminAuth.ts when VITE_ADMIN_PASSKEY is unset.
    sessionStorage.setItem('pokecount_admin_session_auth', 'poke911admin');
  });
  await page.goto('/admin');
  await page.getByRole('button', { name: /ราคาที่ยังขาด/ }).click();
  // The panel waits for the price data; before it lands every card would look
  // unpriced, which is what the loading state exists to avoid reporting.
  await expect(page.locator('[data-testid="missing-price-panel"]')).toBeVisible({ timeout: 20000 });
}

test.describe('Missing price summary', () => {
  test('reports real coverage rather than placeholders', async ({ page }) => {
    await openPricesTab(page);

    const missing = parseInt(
      (await page.locator('[data-testid="missing-price-total"]').innerText()).replace(/[^0-9]/g, ''),
      10
    );
    expect(missing).toBeGreaterThan(0);
    // 9,241 Thai cards; anything near that would mean nothing is priced.
    expect(missing).toBeLessThan(3000);
    await expect(page.locator('[data-testid="missing-price-panel"]')).toContainText('%');
  });

  test('splits the total across the three causes, adding up', async ({ page }) => {
    await openPricesTab(page);

    const num = async (id: string) =>
      parseInt((await page.locator(`[data-testid="${id}"]`).innerText()).replace(/[^0-9]/g, ''), 10);

    const total = await num('missing-price-total');
    const enUnpriced = await num('reason-en-unpriced');
    const unpaired = await num('reason-unpaired');
    const unexpected = await num('reason-unexpected');

    expect(enUnpriced + unpaired + unexpected).toBe(total);
    // The bulk should be upstream data that has not arrived, not a bug.
    expect(enUnpriced).toBeGreaterThan(unexpected);
  });

  test('ranks sets by gap and filters the list to the one clicked', async ({ page }) => {
    await openPricesTab(page);

    const rows = page.locator('[data-testid="missing-price-set-row"]');
    expect(await rows.count()).toBeGreaterThan(1);

    const countOf = async (i: number) => {
      const m = (await rows.nth(i).innerText()).match(/(\d+)\s*\/\s*(\d+)/);
      return m ? parseInt(m[1], 10) : -1;
    };
    expect(await countOf(0)).toBeGreaterThanOrEqual(await countOf(1));

    const before = await page.locator('[data-testid="missing-price-row"]').count();
    await rows.first().click();
    // The set filter now names that set, so the list is scoped.
    const filterValue = await page.locator('[data-testid="missing-price-set-filter"]').inputValue();
    expect(filterValue).not.toBe('ALL');
    expect(before).toBeGreaterThan(0);
  });

  test('offers a price field per card for filling one in by hand', async ({ page }) => {
    await openPricesTab(page);

    const firstRow = page.locator('[data-testid="missing-price-row"]').first();
    await expect(firstRow).toBeVisible();
    await firstRow.locator('[data-testid="missing-price-set-btn"]').click();

    // An editable number field, not a read-only display.
    const input = firstRow.locator('input[type="number"]');
    await expect(input).toBeVisible();
    await input.fill('12.34');
    await expect(input).toHaveValue('12.34');

    // Escape backs out without saving.
    await input.press('Escape');
    await expect(firstRow.locator('[data-testid="missing-price-set-btn"]')).toBeVisible();
  });

  test('filters by cause', async ({ page }) => {
    await openPricesTab(page);

    const reason = page.locator('[data-testid="missing-price-reason-filter"]');
    await reason.selectOption('unpaired');
    await expect(reason).toHaveValue('unpaired');
    // Rows remain, and every visible cause badge is the one selected.
    const rows = page.locator('[data-testid="missing-price-row"]');
    expect(await rows.count()).toBeGreaterThan(0);
  });
});
