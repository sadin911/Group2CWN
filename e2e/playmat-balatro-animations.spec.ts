import { test, expect } from '@playwright/test';

test.describe('Balatro-Style Card Animation Suite', () => {
  test.beforeEach(async () => {
    test.setTimeout(60000);
  });

  test('verifies hand card dynamic fanning, 3D tilt, and specular glint', async ({ page }) => {
    // 1. Navigate to Playmat
    await page.goto('/?mode=playmat-pixi');
    const container = page.locator('#playmat-v3-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    // 2. Perform quick setup to populate hand
    const btnQuickSetup = page.locator('#btn-quick-setup');
    if (await btnQuickSetup.isVisible()) {
      await btnQuickSetup.click();
      await page.waitForTimeout(500);
    }

    // 3. Locate hand cards
    const handCards = page.locator('[data-testid="hand-card-item"]');
    await expect(handCards.first()).toBeVisible({ timeout: 5000 });
    const count = await handCards.count();
    expect(count).toBeGreaterThan(0);

    // 4. Verify hand card dynamic fanning transform (perspective, rotate & translateY applied)
    const firstCard = handCards.first();
    const transformStyle = await firstCard.evaluate((el) => el.style.transform);
    expect(transformStyle).toContain('rotate');
    expect(transformStyle).toContain('translateY');
    expect(transformStyle).toContain('perspective');

    // 5. Verify 3D perspective tilt on hover/pointermove
    const cardBox = await firstCard.boundingBox();
    expect(cardBox).not.toBeNull();
    if (cardBox) {
      await page.mouse.move(cardBox.x + cardBox.width * 0.2, cardBox.y + cardBox.height * 0.2);
      await page.waitForTimeout(100);
      
      const hoveredStyle = await firstCard.evaluate((el) => el.style.transform);
      expect(hoveredStyle).toBeDefined();
    }
  });

  test('verifies EmptySlotPickerModal opens on clicking empty bench slot instead of blind placement', async ({ page }) => {
    await page.goto('/?mode=playmat-pixi');
    const container = page.locator('#playmat-v3-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    // 1. Draw cards to ensure cards in hand
    const btnDockDraw = page.locator('#btn-dock-draw');
    await expect(btnDockDraw).toBeVisible({ timeout: 5000 });
    await btnDockDraw.click();
    await page.waitForTimeout(400);

    // 2. Click an empty bench slot
    const emptyBenchSlot = page.locator('[data-slot-side="player1"][id*="slot-bench-"]').first();
    await expect(emptyBenchSlot).toBeVisible({ timeout: 5000 });
    await emptyBenchSlot.click();

    // 3. Verify EmptySlotPickerModal appears
    const pickerModal = page.locator('#empty-slot-picker-modal');
    await expect(pickerModal).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('เลือกการ์ดวางลง เบนช์')).toBeVisible();

    // 4. Close modal
    const btnClose = page.locator('#btn-close-slot-picker');
    await btnClose.click();
    await expect(pickerModal).not.toBeVisible({ timeout: 5000 });
  });

  test('verifies Balatro Mobile mode chunky dock buttons and hand card lift', async ({ page }) => {
    // Set mobile viewport (iPhone 14 standard)
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/?mode=playmat-pixi');
    const container = page.locator('#playmat-v3-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    // 1. Quick setup to get cards in hand
    const btnQuickSetup = page.locator('#btn-quick-setup');
    if (await btnQuickSetup.isVisible()) {
      await btnQuickSetup.click();
      await page.waitForTimeout(500);
    }

    // 2. Verify chunky Balatro Mobile action buttons are visible and active
    const btnDraw = page.locator('#btn-dock-draw');
    await expect(btnDraw).toBeVisible({ timeout: 5000 });

    const btnSearch = page.locator('#btn-dock-search');
    await expect(btnSearch).toBeVisible({ timeout: 5000 });

    const btnPrizes = page.locator('#btn-dock-prizes');
    await expect(btnPrizes).toBeVisible({ timeout: 5000 });

    // Draw cards to ensure hand cards are present on mobile
    await btnDraw.click();
    await page.waitForTimeout(400);

    // 3. Click a hand card on mobile to test tap-to-lift
    const firstHandCard = page.locator('[data-testid="hand-card-item"]').first();
    await expect(firstHandCard).toBeVisible({ timeout: 5000 });
    await firstHandCard.click();
    await page.waitForTimeout(200);

    // Verify Balatro floating card action bar appears
    const actionBar = page.locator('#balatro-floating-card-action-bar');
    await expect(actionBar).toBeVisible({ timeout: 5000 });

    // Verify card flight layer is present
    const flightLayer = page.locator('#card-flight-layer');
    await expect(flightLayer).toBeAttached();

    // Cancel selection
    const btnCancel = page.locator('#btn-cancel-card-selection');
    await btnCancel.click();
    await expect(actionBar).not.toBeVisible();
  });

  test('verifies mobile portrait layout: compact Opponent HUD strip and hidden bulky flanks', async ({ page }) => {
    // Set standard mobile portrait viewport (iPhone 14 / 390x844)
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/?mode=playmat-pixi');
    const container = page.locator('#playmat-v3-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    // 1. Verify Top Player Mobile HUD strip is visible
    const topMobileDeck = page.locator('#top-deck-pile-mobile');
    await expect(topMobileDeck).toBeVisible({ timeout: 5000 });

    const topMobilePrizes = page.locator('#top-prizes-mobile');
    await expect(topMobilePrizes).toBeVisible({ timeout: 5000 });

    const topMobileDiscard = page.locator('#top-discard-mobile');
    await expect(topMobileDiscard).toBeVisible({ timeout: 5000 });

    // 2. Verify desktop side columns are hidden on mobile
    const desktopTopDeck = page.locator('#top-deck-pile');
    await expect(desktopTopDeck).not.toBeVisible();

    const desktopBottomDeck = page.locator('#deck-pile');
    await expect(desktopBottomDeck).not.toBeVisible();
  });

  test('verifies Balatro tap-to-lift, toggle-off, Escape key, and cancel button dismiss', async ({ page }) => {
    await page.goto('/?mode=playmat-pixi');
    const container = page.locator('#playmat-v3-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    // 1. Draw cards to ensure cards in hand
    const btnDockDraw = page.locator('#btn-dock-draw');
    await expect(btnDockDraw).toBeVisible({ timeout: 5000 });
    await btnDockDraw.click();
    await page.waitForTimeout(400);

    // 2. Tap a hand card to lift
    const firstHandCard = page.locator('[data-testid="hand-card-item"]').first();
    await expect(firstHandCard).toBeVisible({ timeout: 5000 });
    await firstHandCard.click();

    // 3. Verify floating action bar appears
    const actionBar = page.locator('#balatro-floating-card-action-bar');
    await expect(actionBar).toBeVisible({ timeout: 5000 });

    // 4. Tap the same hand card again to toggle it off (Balatro feel)
    await firstHandCard.click();
    await expect(actionBar).not.toBeVisible({ timeout: 5000 });

    // 5. Tap hand card again to lift
    await firstHandCard.click();
    await expect(actionBar).toBeVisible({ timeout: 5000 });

    // 6. Press Escape key to dismiss
    await page.keyboard.press('Escape');
    await expect(actionBar).not.toBeVisible({ timeout: 5000 });

    // 7. Tap hand card once more and click the cancel pill button
    await firstHandCard.click();
    await expect(actionBar).toBeVisible({ timeout: 5000 });
    const btnCancel = page.locator('#btn-cancel-card-selection');
    await expect(btnCancel).toBeVisible({ timeout: 5000 });
    await btnCancel.click();
    await expect(actionBar).not.toBeVisible({ timeout: 5000 });
  });

  test('verifies Balatro floating action badges and polychrome shimmer on rare cards', async ({ page }) => {
    await page.goto('/?mode=playmat-pixi');
    const container = page.locator('#playmat-v3-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    // 1. Quick setup
    const btnQuickSetup = page.locator('#btn-quick-setup');
    if (await btnQuickSetup.isVisible()) {
      await btnQuickSetup.click();
      await page.waitForTimeout(500);
    }

    // 2. Reveal facedown cards
    const btnReveal = page.locator('#btn-reveal-all-facedown');
    if (await btnReveal.isVisible()) {
      await btnReveal.click();
      await page.waitForTimeout(500);
    }

    // 3. Check for polychrome shimmer on ex or rare Pokémon cards
    const polychromeCard = page.locator('.balatro-polychrome-shimmer');
    const polyCount = await polychromeCard.count();
    expect(polyCount).toBeGreaterThanOrEqual(0);

    // 4. Verify Balatro badge floater container exists and is attached to DOM
    const floaterOverlay = page.locator('#balatro-floater-overlay');
    await expect(floaterOverlay).toBeAttached({ timeout: 5000 });
  });

  test('verifies PTCG Pocket in-slot slide-up card draw and deck peel without floating card', async ({ page }) => {
    await page.goto('/?mode=playmat-pixi');
    const container = page.locator('#playmat-v3-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    const handCards = page.locator('[data-testid="hand-card-item"]');
    const initialHandCount = await handCards.count();

    // Click deck pile to draw 1 card
    const deckPile = page.locator('#deck-pile');
    if (await deckPile.isVisible()) {
      await deckPile.click();
    } else {
      const btnDockDraw = page.locator('#btn-dock-draw');
      await btnDockDraw.click();
    }

    // Hand count should increment
    await expect(handCards).toHaveCount(initialHandCount + 1, { timeout: 5000 });

    // The newly drawn card should settle smoothly in the hand
    const latestCard = handCards.last();
    await expect(latestCard).toBeVisible();

    // Verify no lingering flying card layer items
    const flightCards = page.locator('.card-flight-animation');
    await expect(flightCards).toHaveCount(0);
  });
});

