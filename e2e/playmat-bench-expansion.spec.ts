import { test, expect } from '@playwright/test';

test.describe('Playmat V3: Stadium Bench Expansion (5 ⇄ 8 ช่อง)', () => {
  test('expands bench to 8 slots and collapses back to 5 when empty', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    const bottomZone = page.locator('#bottom-player-zone');
    const toggle = page.locator('#btn-toggle-bench-limit-bottom');

    // 1. Default state: 5 bench slots
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText('5 ช่อง');
    await expect(bottomZone.locator('#slot-bench-4-empty')).toBeVisible();
    await expect(bottomZone.locator('#slot-bench-5-empty')).toHaveCount(0);

    // 2. Expand to 8 slots
    await toggle.click();
    await expect(toggle).toContainText('8 ช่อง');
    await expect(bottomZone.locator('#slot-bench-7-empty')).toBeVisible();
    await expect(bottomZone.getByText('Bench (0/8)')).toBeVisible();

    // 3. Collapse back to 5 while empty
    await toggle.click();
    await expect(toggle).toContainText('5 ช่อง');
    await expect(bottomZone.locator('#slot-bench-5-empty')).toHaveCount(0);
    await expect(bottomZone.locator('#slot-bench-4-empty')).toBeVisible();
  });

  test('blocks collapsing to 5 while slots 6-8 are occupied, then allows it once cleared', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    const bottomZone = page.locator('#bottom-player-zone');
    const toggle = page.locator('#btn-toggle-bench-limit-bottom');

    // Expand to 8 slots
    await toggle.click();
    await expect(toggle).toContainText('8 ช่อง');

    // Draw a hand and place a card onto bench slot 8 (index 7)
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    let placed = false;
    for (let i = 0; i < 7; i++) {
      const cardEl = page.locator(`#hand-card-${i}`);
      if (!(await cardEl.count())) break;
      await cardEl.click();
      const benchBtn = page.locator('#btn-hand-place-bench-7');
      if (await benchBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await benchBtn.click();
        placed = true;
        break;
      }
      const closeBtn = page.locator('#btn-close-hand-menu');
      if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await closeBtn.click();
      } else {
        const previewClose = page.getByRole('button', { name: /ปิดหน้าต่าง/i });
        if (await previewClose.isVisible({ timeout: 1500 }).catch(() => false)) {
          await previewClose.click();
        }
      }
    }
    expect(placed).toBe(true);
    await expect(bottomZone.locator('#slot-bench-7-card')).toBeVisible();

    // Attempt to collapse: blocked with Thai warning toast, still 8 slots
    await toggle.click();
    await expect(page.getByText('กรุณานำโปเกมอนในเบนช์ช่องที่ 6–8 ออกก่อนลดเหลือ 5 ช่อง')).toBeVisible();
    await expect(toggle).toContainText('8 ช่อง');
    await expect(bottomZone.locator('#slot-bench-7-card')).toBeVisible();

    // Collapse hand tray if open so board slots are completely unobstructed on mobile
    const handTray = page.locator('#hand-cards-tray');
    if (await handTray.isVisible().catch(() => false)) {
      await page.locator('#btn-toggle-hand-tray').click();
      await expect(handTray).not.toBeVisible();
    }

    // Clear slot 8 by scooping that Pokemon back into hand
    const slot7Card = bottomZone.locator('#slot-bench-7-surface, #slot-bench-7-card').first();
    await slot7Card.click().catch(() => {});
    if (!(await page.locator('#pokemon-action-modal').isVisible({ timeout: 2000 }).catch(() => false))) {
      await page.locator('#slot-bench-7-surface, #slot-bench-7-card').first().dispatchEvent('click');
    }
    const clearBtn = page.locator('#btn-scoop-pokemon-to-hand, #btn-shuffle-pokemon-to-deck').first();
    await expect(clearBtn).toBeVisible({ timeout: 10000 });
    await clearBtn.click();
    await expect(bottomZone.locator('#slot-bench-7-empty')).toBeVisible();

    // Now collapsing succeeds
    await toggle.click();
    await expect(toggle).toContainText('5 ช่อง');
    await expect(bottomZone.locator('#slot-bench-5-empty')).toHaveCount(0);
  });

  test('preserves UI Bible flanks and active centerline when bench is expanded to 8', async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    const toggle = page.locator('#btn-toggle-bench-limit-bottom');
    await toggle.click();
    await expect(toggle).toContainText('8 ช่อง');

    const bottomZone = page.locator('#bottom-player-zone');
    const active = bottomZone.locator('#slot-active-empty, #slot-active-card').first();
    const bench0 = bottomZone.locator('#slot-bench-0-empty, #slot-bench-0-card').first();
    const bench7 = bottomZone.locator('#slot-bench-7-empty, #slot-bench-7-card').first();

    const activeBox = await active.boundingBox();
    const b0 = await bench0.boundingBox();
    const b7 = await bench7.boundingBox();
    expect(activeBox).not.toBeNull();
    expect(b0).not.toBeNull();
    expect(b7).not.toBeNull();

    // Active stays centered (0px offset) on the bench row centerline
    const benchCenter = (b0!.x + b7!.x + b7!.width) / 2;
    const activeCenter = activeBox!.x + activeBox!.width / 2;
    expect(Math.abs(activeCenter - benchCenter)).toBeLessThanOrEqual(2);

    // No horizontal overflow introduced by 8 slots
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
