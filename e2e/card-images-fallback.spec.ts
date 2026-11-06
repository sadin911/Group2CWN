import { test, expect } from '@playwright/test';

test.describe('Card Images and Fallback Verification', () => {
  test('verifies all cards including MA6 cards load valid images in Playmat V3 Deck Search', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');

    // 1. Wait for container to load
    const container = page.locator('#playmat-v3-container');
    await expect(container).toBeVisible({ timeout: 20000 });

    // 2. Select Dragapult ex meta deck (meta-limitless-284) which uses MA6 cards
    const newGameBtn = page.locator('#btn-v3-new-game');
    await expect(newGameBtn).toBeVisible({ timeout: 10000 });
    await newGameBtn.click();

    const selectorModal = page.locator('#deck-selector-modal');
    await expect(selectorModal).toBeVisible({ timeout: 10000 });

    // Switch to Meta Decks tab
    const metaTab = page.locator('#tab-meta-decks');
    if (await metaTab.isVisible()) {
      await metaTab.click();
    }

    // Select Dragapult ex for player 1
    const assignP1Btn = page.locator('#btn-assign-p1-meta-limitless-284');
    await expect(assignP1Btn).toBeVisible({ timeout: 10000 });
    await assignP1Btn.click();

    // Confirm start match
    const startMatchBtn = page.locator('#btn-confirm-start-match');
    await expect(startMatchBtn).toBeVisible();
    await startMatchBtn.click();

    // 3. Open Search Deck Modal via dock button
    const searchBtn = page.locator('#btn-dock-search');
    await expect(searchBtn).toBeVisible({ timeout: 10000 });
    await searchBtn.click();

    // 4. Modal is visible: "ค้นหาในกองสำรับ (Search Deck)"
    const searchModal = page.locator('#deck-search-modal');
    await expect(searchModal).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('ค้นหาในกองสำรับ (Search Deck)')).toBeVisible();

    // 5. Wait for images in the grid to settle
    await page.waitForTimeout(2000);

    // 6. Assert all rendered card images in modal have naturalWidth > 0 and no broken error icons
    const cardImgs = searchModal.locator('img');
    const count = await cardImgs.count();
    expect(count).toBeGreaterThan(0);

    const imageStatuses = await cardImgs.evaluateAll((imgs: HTMLImageElement[]) => {
      return imgs.map((img) => ({
        src: img.src,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        isBroken: img.complete && img.naturalWidth === 0,
      }));
    });

    const brokenImgs = imageStatuses.filter((s) => s.isBroken);
    expect(brokenImgs).toEqual([]);

    // 7. Verify specific staple cards are present and loaded
    await expect(page.locator('#deck-search-modal').getByText('ไฮเปอร์บอล').first()).toBeVisible();
  });
});
