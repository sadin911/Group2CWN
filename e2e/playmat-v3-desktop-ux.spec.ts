import { test, expect } from '@playwright/test';

test.describe('Playmat V3: PC Mode Desktop Interactions (โหมด PC)', () => {
  test.use({ viewport: { width: 1440, height: 900 } }); // Standard Desktop PC viewport

  test.beforeEach(async ({ isMobile }) => {
    test.skip(isMobile, 'Desktop PC mode only');
  });

  test('desktop hand card click does NOT open click-to-place modal', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    // 1. Draw 7 cards to hand
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    const handCard0 = page.locator('#hand-card-0');
    await expect(handCard0).toBeVisible();

    // 2. Left click hand card 0
    await handCard0.click();

    // 3. HandCardMenuModal ("เลือกลงที่สนาม") MUST NOT open!
    const handModal = page.locator('#hand-card-menu-modal');
    await expect(handModal).not.toBeVisible();

    // 4. Balatro floating click-to-place bar MUST NOT open!
    const floatingBar = page.locator('#balatro-floating-card-action-bar');
    await expect(floatingBar).not.toBeVisible();
  });

  test('desktop clicking empty slot does NOT open EmptySlotPickerModal', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    // Draw 7 cards
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // Click empty active slot of player 1 (bottom player)
    const emptyActive = page.locator('#slot-active-empty[data-slot-side="player1"]');
    if (await emptyActive.isVisible()) {
      await emptyActive.click();
      // EmptySlotPickerModal MUST NOT open on PC mode!
      await expect(page.locator('#empty-slot-picker-modal')).not.toBeVisible();
    }

    // Click empty bench slot 0 of player 1 (bottom player)
    const emptyBench0 = page.locator('#slot-bench-0-empty[data-slot-side="player1"]');
    if (await emptyBench0.isVisible()) {
      await emptyBench0.click();
      await expect(page.locator('#empty-slot-picker-modal')).not.toBeVisible();
    }
  });

  test('desktop magnifying glass on hand card is clickable on hover and opens preview modal', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    // Draw 7 cards
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    const handCard0 = page.locator('#hand-card-0');
    await expect(handCard0).toBeVisible();

    // Hover over hand card 0
    await handCard0.hover();
    await page.waitForTimeout(400);

    // The zoom button #btn-zoom-hand-0 is visible and clickable
    const zoomBtn = page.locator('#btn-zoom-hand-0');
    await expect(zoomBtn).toBeVisible();

    // Click zoom button directly
    await zoomBtn.dispatchEvent('click');

    // Card preview modal opens
    const previewModal = page.locator('#card-image-preview-modal');
    await expect(previewModal).toBeVisible({ timeout: 15000 });

    // Close preview modal via ESC
    await page.keyboard.press('Escape');
    await expect(previewModal).not.toBeVisible();
  });

  test('desktop double-click on hand card opens preview modal', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    // Draw 7 cards
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    const handCard0 = page.locator('#hand-card-0');
    await expect(handCard0).toBeVisible();

    // Double click hand card 0
    await handCard0.dblclick();

    // Card preview modal opens
    const previewModal = page.locator('#card-image-preview-modal');
    await expect(previewModal).toBeVisible({ timeout: 15000 });

    // Close via close button or Escape
    const closeBtn = page.locator('#btn-close-card-preview');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(previewModal).not.toBeVisible();
    } else {
      await page.keyboard.press('Escape');
      await expect(previewModal).not.toBeVisible();
    }
  });

  test('desktop drag-and-drop places card on Active slot', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    // 1. Search deck for a Basic Pokemon and take it to hand
    await page.locator('#btn-dock-search').click();
    const modal = page.locator('#deck-search-modal');
    await expect(modal).toBeVisible();
    await page.locator('#btn-deck-category-basic').click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-take-hand').click();
    await expect(modal).not.toBeVisible();
    await page.waitForTimeout(300);

    const handCard0 = page.locator('#hand-card-0');
    const emptyActive = page.locator('#slot-active-empty[data-slot-side="player1"]');
    await expect(handCard0).toBeVisible();
    await expect(emptyActive).toBeVisible();

    const handBox = await handCard0.boundingBox();
    const activeBox = await emptyActive.boundingBox();
    expect(handBox).not.toBeNull();
    expect(activeBox).not.toBeNull();

    // 2. Drag Basic Pokémon from hand to empty Active slot using mouse pointer events
    await page.mouse.move(handBox!.x + handBox!.width / 2, handBox!.y + handBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(activeBox!.x + activeBox!.width / 2, activeBox!.y + activeBox!.height / 2, { steps: 10 });
    await page.mouse.up();

    // 3. Card is now successfully placed in Active slot
    const activeCard = page.locator('#slot-active-card[data-slot-side="player1"]');
    await expect(activeCard).toBeVisible({ timeout: 10000 });
  });
});
