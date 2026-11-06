import { test, expect } from '@playwright/test';

/**
 * The Mapping Studio already listed the unpaired cards. What it lacked was a
 * view of where the gap actually is, so the count could be acted on rather than
 * just read.
 */

async function openSummary(page: import('@playwright/test').Page) {
  await page.goto('/collection');
  await page.locator('[data-testid="card-mapping-button"]').click();
  await expect(page.locator('[data-testid="pairing-summary-tab"]')).toBeVisible({ timeout: 10000 });
  await page.locator('[data-testid="pairing-summary-tab"]').click();
  await expect(page.locator('[data-testid="pairing-summary-panel"]')).toBeVisible();
}

test.describe('TH-EN pairing summary', () => {
  test('reports real coverage numbers, not placeholders', async ({ page }) => {
    await openSummary(page);

    const unmatched = await page.locator('[data-testid="pairing-unmatched-total"]').innerText();
    const count = parseInt(unmatched.replace(/[^0-9]/g, ''), 10);
    expect(count).toBeGreaterThan(0);
    // 9,241 Thai cards; a figure at or above that would mean nothing matched.
    expect(count).toBeLessThan(2000);

    await expect(page.locator('[data-testid="pairing-summary-panel"]')).toContainText('%');
    await expect(page.locator('text=จับคู่ไทย–อังกฤษแล้ว')).toBeVisible();
  });

  test('splits the remainder into alt art and cards worth chasing', async ({ page }) => {
    await openSummary(page);

    const total = parseInt(
      (await page.locator('[data-testid="pairing-unmatched-total"]').innerText()).replace(/[^0-9]/g, ''),
      10
    );
    const actionable = parseInt(
      (await page.locator('[data-testid="pairing-actionable-total"]').innerText()).replace(/[^0-9]/g, ''),
      10
    );

    // The split has to be a real subset, otherwise it is telling the reader
    // nothing about what is worth working on.
    expect(actionable).toBeGreaterThan(0);
    expect(actionable).toBeLessThan(total);
    await expect(page.locator('text=มักไม่มีภาพเดียวกันในฝั่ง EN')).toBeVisible();
  });

  test('ranks sets by gap and drills into the unmatched list for one', async ({ page }) => {
    await openSummary(page);

    const rows = page.locator('[data-testid="pairing-set-row"]');
    expect(await rows.count()).toBeGreaterThan(1);

    // Worst-first ordering: the first row's count must be at least the second's.
    const countOf = async (i: number) => {
      const text = await rows.nth(i).innerText();
      const m = text.match(/(\d+)\s*\/\s*(\d+)/);
      return m ? parseInt(m[1], 10) : -1;
    };
    expect(await countOf(0)).toBeGreaterThanOrEqual(await countOf(1));

    // Clicking a set jumps to that set's unpaired cards, with the set applied.
    const firstRowText = await rows.first().innerText();
    const setId = firstRowText.split('·')[0].replace(/^\d+\s*/, '').trim();

    await rows.first().click();
    await expect(page.locator('[data-testid="pairing-summary-panel"]')).toHaveCount(0);

    // The unmatched tab is now the selected one.
    await expect(page.getByRole('button', { name: /ยังไม่พบคู่ \(\d+\)/ })).toBeVisible();
    // And the set filter carried the set through, so the list is scoped to it.
    await expect(page.locator('select').first()).toHaveValue(setId);
  });

  test('hides paging and the set filter, which do not apply to a summary', async ({ page }) => {
    await openSummary(page);
    await expect(page.locator('text=ย้อนกลับ')).toBeHidden();
    await expect(page.locator('select >> nth=0')).toBeHidden();
  });
});
