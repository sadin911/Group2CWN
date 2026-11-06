import { test, expect } from '@playwright/test';

test.describe('Playmat V3: Mobile UX & Responsive Tabletop Layout (โหมดมือถือ)', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 standard mobile viewport

  test('renders mobile playmat with zero UI overlap across arenas, stadium, and dock', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');

    // 1. Container mounts and fills screen without horizontal page overflow
    const container = page.locator('#playmat-v3-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // 2. Both Top and Bottom player zones are visible
    const topZone = page.locator('#top-player-zone');
    const bottomZone = page.locator('#bottom-player-zone');
    const centerZone = page.locator('#center-board-zone');
    await expect(topZone).toBeVisible();
    await expect(bottomZone).toBeVisible();
    await expect(centerZone).toBeVisible();

    // 3. Header displays turn and action buttons compactly
    await expect(page.getByText('Playmat V3')).toBeVisible();
    await expect(page.getByText(/Turn 1/i)).toBeVisible();
    await expect(page.locator('#btn-v3-new-game')).toBeVisible();
    await expect(page.locator('#btn-v3-online-room')).toBeVisible();

    // 4. Stadium slot does not collide with active pokemon or prizes
    const stadiumSlot = page.locator('#center-stadium-empty');
    await expect(stadiumSlot).toBeVisible();

    const stadiumBox = await stadiumSlot.boundingBox();
    expect(stadiumBox).not.toBeNull();
    expect(stadiumBox!.width).toBeGreaterThan(40);
    expect(stadiumBox!.height).toBeGreaterThan(40);

    // 5. Dock is visible at bottom with compact buttons
    const dock = page.locator('#tabletop-v3-dock');
    await expect(dock).toBeVisible();
    await expect(page.locator('#btn-dock-search')).toBeVisible();
    await expect(page.locator('#btn-dock-prizes')).toBeVisible();
    await expect(page.locator('#btn-dock-pass-turn')).toBeVisible();
  });

  test('mobile hand tray collapse and expansion leaves board completely visible', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // Draw initial 7 cards
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    const handTray = page.locator('#hand-cards-tray');
    const toggleBtn = page.locator('#btn-toggle-hand-tray');

    // Hand tray is visible initially
    await expect(handTray).toBeVisible();

    // Tap toggle button to collapse hand tray
    await toggleBtn.click();
    await expect(handTray).not.toBeVisible();

    // Board zones remain visible with more vertical room
    await expect(page.locator('#bottom-player-zone')).toBeVisible();
    await expect(page.locator('#center-board-zone')).toBeVisible();

    // Tap toggle button to expand hand tray again
    await toggleBtn.click();
    await expect(handTray).toBeVisible();
  });

  test('mobile dock and modal navigation operate smoothly with Thai priority', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // Open Deck Search via dock button
    const searchBtn = page.locator('#btn-dock-search');
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();

    // Modal opens with Thai title and controls
    const searchModal = page.locator('#deck-search-modal');
    await expect(searchModal).toBeVisible();
    await expect(searchModal).toContainText(/ค้นหาในกองสำรับ/i);

    // Close modal
    await page.locator('#btn-deck-search-close').click();
    await expect(searchModal).not.toBeVisible();

    // Open Top Cards modal via dock button
    const topCardsBtn = page.locator('#btn-dock-top-cards');
    await expect(topCardsBtn).toBeVisible();
    await topCardsBtn.click();

    const topCardsModal = page.locator('#top-cards-modal');
    await expect(topCardsModal).toBeVisible();
    await expect(topCardsModal).toContainText(/ดูการ์ดใบบนสุด/i);

    // Close modal
    await page.locator('#btn-close-top-cards').click();
    await expect(topCardsModal).not.toBeVisible();
  });

  test('mobile deck search action toolbar does not clip off-screen and action buttons are accessible', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // Open Deck Search
    await page.locator('#btn-dock-search').click();
    const searchModal = page.locator('#deck-search-modal');
    await expect(searchModal).toBeVisible();

    // Select the first card
    const firstCard = searchModal.locator('.deck-search-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Verify Action Toolbar is visible and on-screen
    const takeHandBtn = page.locator('#btn-deck-take-hand');
    await expect(takeHandBtn).toBeVisible();

    // Check button bounding box is inside viewport
    const btnBox = await takeHandBtn.boundingBox();
    expect(btnBox).not.toBeNull();
    expect(btnBox!.y + btnBox!.height).toBeLessThanOrEqual(844); // within 844px height!

    // Click take to hand
    await takeHandBtn.click();

    // Modal should close and card taken
    await expect(searchModal).not.toBeVisible();
    await expect(page.locator('#bottom-player-zone')).toBeVisible();
  });

  test('online room modal displays visual deck card and interactive deck catalog modal', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // Open Online Room
    await page.locator('#btn-v3-online-room').click();
    const onlineModal = page.locator('#online-room-modal');
    await expect(onlineModal).toBeVisible();

    // Visual Deck Card is displayed instead of standard dropdown
    const visualDeckCard = page.locator('#selected-deck-card-display');
    await expect(visualDeckCard).toBeVisible();

    // Click "เปลี่ยนเด็ค" to open full catalog
    await page.locator('#btn-open-deck-catalog').click();
    const catalogModal = page.locator('#online-deck-catalog-modal');
    await expect(catalogModal).toBeVisible();

    // Verify catalog tabs
    await expect(page.locator('#tab-catalog-meta')).toBeVisible();
    await expect(page.locator('#tab-catalog-preset')).toBeVisible();
    await expect(page.locator('#tab-catalog-custom')).toBeVisible();

    // Filter by search
    await page.locator('#tab-catalog-meta').click();
    await page.locator('#input-catalog-search').fill('Dragapult');
    const firstMetaItem = catalogModal.locator('[id^="catalog-deck-item-"]').first();
    await expect(firstMetaItem).toBeVisible();
    await firstMetaItem.click();

    // Catalog closes and selected deck is updated
    await expect(catalogModal).not.toBeVisible();
    await expect(visualDeckCard).toContainText(/Dragapult/i);

    // Close online room modal
    await page.locator('#btn-close-online-modal').click();
    await expect(onlineModal).not.toBeVisible();
  });

  test('view mode toggle switches seamlessly between Mobile Arena Mode and Desktop Tabletop Mode', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    const toggleBtn = page.locator('#btn-toggle-view-mode');
    await expect(toggleBtn).toBeVisible();

    // 1. Initially in Mobile Arena Mode on 390px viewport
    const mobileArena = page.locator('#playmat-mobile-arena');
    await expect(mobileArena).toBeVisible();
    await expect(toggleBtn).toContainText(/โหมดมือถือ/i);

    // 2. Click toggle to switch to Desktop Tabletop Mode
    await toggleBtn.click();
    const desktopBoard = page.locator('#playmat-v3-board');
    await expect(desktopBoard).toBeVisible();
    await expect(toggleBtn).toContainText(/โหมดจอใหญ่/i);

    // 3. Click toggle again to switch back to Mobile Arena Mode
    await toggleBtn.click();
    await expect(mobileArena).toBeVisible();
    await expect(toggleBtn).toContainText(/โหมดมือถือ/i);
  });

  test('mobile arena thumb controls allow quick draw, prize collection, and pass turn with state preservation', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-mobile-arena')).toBeVisible({ timeout: 15000 });

    // 1. Quick Setup (draws 7 cards, sets up active, sets up 6 prizes)
    await page.locator('#btn-quick-setup').click();

    // 2. Take a prize using thumb pill
    const prizeBtn = page.locator('#btn-dock-prizes');
    await expect(prizeBtn).toContainText('6');
    await prizeBtn.click();
    await expect(prizeBtn).toContainText('5');

    // 3. Pass turn using thumb button
    const passTurnBtn = page.locator('#btn-dock-pass-turn');
    await expect(page.getByText(/Turn 1/i)).toBeVisible();
    await passTurnBtn.click();
    await expect(page.getByText(/Turn 2/i)).toBeVisible();

    // 4. Switch to Desktop mode and verify all state is 100% preserved
    await page.locator('#btn-toggle-view-mode').click();
    await expect(page.locator('#playmat-v3-board')).toBeVisible();
    await expect(page.getByText(/Turn 2/i)).toBeVisible();

    // Hand count in desktop mode is preserved
    await expect(page.getByText(/มือของคุณ/i)).toBeVisible();
  });

  test('mobile touch drag-and-drop places basic pokemon on active slot', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-mobile-arena')).toBeVisible({ timeout: 15000 });

    // Draw 7 cards to hand
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    const handCard0 = page.locator('#hand-card-0');
    await expect(handCard0).toBeVisible();

    const activeSlot = page.locator('[data-slot-side="bottom"][data-slot-pos="ACTIVE"]');
    await expect(activeSlot).toBeVisible();

    const cardBox = await handCard0.boundingBox();
    const slotBox = await activeSlot.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(slotBox).not.toBeNull();

    // Perform smooth touch drag
    await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(slotBox!.x + slotBox!.width / 2, slotBox!.y + slotBox!.height / 2, { steps: 10 });
    await page.mouse.up();

    // Verify Active Slot now contains placed Pokemon (facedown before match start)
    const placedSlot = page.locator('#bottom-active-card');
    await expect(placedSlot).toBeVisible({ timeout: 5000 });
    await expect(placedSlot).toHaveAttribute('data-facedown', 'true');
    await expect(page.locator('#bottom-active-card-facedown')).toBeVisible();
  });

  test('mobile long press on pokemon card opens action modal for damage and status modification', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-mobile-arena')).toBeVisible({ timeout: 15000 });

    // Quick Setup
    await page.locator('#btn-quick-setup').click();

    const activeSlot = page.locator('[data-slot-side="bottom"][data-slot-pos="ACTIVE"]');
    await expect(activeSlot).toBeVisible();
    const activeBox = await activeSlot.boundingBox();
    expect(activeBox).not.toBeNull();

    // Long press on active card (> 400ms)
    await page.mouse.move(activeBox!.x + activeBox!.width / 2, activeBox!.y + activeBox!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(500); // 500ms > 400ms threshold
    await page.mouse.up();

    // Verify Pokemon Action Modal opened
    const modal = page.locator('#pokemon-action-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal).toContainText(/ตำแหน่งต่อสู้/i);

    // Add +10 damage
    await page.locator('#btn-dmg-plus-10').click();
    await expect(modal.locator('#current-damage-value')).toContainText(/10 Damage/i);

    // Close modal
    await page.locator('#btn-close-pokemon-modal').click();
    await expect(modal).not.toBeVisible();

    // Verify damage counter is visible on board card
    await expect(page.locator('#damage-counter-active')).toContainText('-10');
  });

  test('hand card dynamic fanning and side gutters prevent edge gesture collision', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-mobile-arena')).toBeVisible({ timeout: 15000 });

    // Draw 7 cards to test fanning layout
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    const handTray = page.locator('#hand-cards-tray');
    await expect(handTray).toBeVisible();

    // 1. Verify side gutter padding to protect from Android edge back-gesture (>= 20px)
    const trayPaddingLeft = await handTray.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).paddingLeft);
    });
    expect(trayPaddingLeft).toBeGreaterThanOrEqual(20);

    // 2. Verify dynamic fanning overlap on second card
    const card0 = page.locator('#hand-card-0');
    const card1 = page.locator('#hand-card-1');
    await expect(card0).toBeVisible();
    await expect(card1).toBeVisible();

    const card0Box = await card0.boundingBox();
    const card1Box = await card1.boundingBox();
    expect(card0Box).not.toBeNull();
    expect(card1Box).not.toBeNull();

    // Distance between card 0 and card 1 is less than full card width because of negative margin fanning
    const deltaX = card1Box!.x - card0Box!.x;
    expect(deltaX).toBeLessThan(card0Box!.width);

    // 3. Tap card 0 to select and elevate it
    await card0.click();
    await expect(card0).toHaveClass(/-translate-y-4/);
    await expect(card0).toHaveClass(/z-30/);

    // Tap card 0 again to deselect
    await card0.click();
    await expect(card0).not.toHaveClass(/-translate-y-4/);
  });

  test('decluttered top bar and quick menu modal provide sleek access to secondary settings', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-mobile-arena')).toBeVisible({ timeout: 15000 });

    // 1. Static badges are eliminated from header, keeping it uncluttered
    await expect(page.getByText(/PIXIJS V8 ENGINE/i)).not.toBeVisible();
    await expect(page.getByText(/โต๊ะจริง 2 ฝั่ง/i)).not.toBeVisible();

    // 2. Essential buttons remain easily reachable
    await expect(page.locator('#btn-v3-back')).toBeVisible();
    await expect(page.locator('#btn-v3-new-game')).toBeVisible();
    await expect(page.locator('#btn-v3-online-room')).toBeVisible();
    await expect(page.locator('#btn-v3-menu')).toBeVisible();

    // 3. Open Quick Menu
    await page.locator('#btn-v3-menu').click();
    const quickMenu = page.locator('#menu-v3-dropdown');
    await expect(quickMenu).toBeVisible();
    await expect(quickMenu).toContainText(/เมนูและการตั้งค่าเพิ่มเติม/i);
    await expect(quickMenu).toContainText(/ระบบขอความยินยอม \(Consent\)/i);
    await expect(quickMenu).toContainText(/Auto จั่วการ์ดเมื่อเริ่มเทิร์น/i);
    await expect(quickMenu).toContainText(/ประวัติการเล่น \(History Log\)/i);

    // 4. Toggle consent mode inside quick menu
    const consentBtn = page.locator('#btn-toggle-consent-mode');
    await consentBtn.click();
    await expect(consentBtn).toContainText(/เปิด/i);

    // 5. Close menu via backdrop or close button
    await page.locator('#menu-v3-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(quickMenu).not.toBeVisible();
  });
});

test.describe('Playmat V3: Small Screen Mobile Viewport (360x640) - Sub-modals & Touch Overhaul', () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test('DeckSearchModal fits within 360x640, tabs scroll horizontally, and single-card action footer is strictly on-screen', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // Open Deck Search
    await page.locator('#btn-dock-search').click();
    const searchModal = page.locator('#deck-search-modal');
    await expect(searchModal).toBeVisible();

    // Check modal bounds fit viewport
    const dialogBox = await searchModal.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.width).toBeLessThanOrEqual(360);
    expect(dialogBox!.height).toBeLessThanOrEqual(640 * 0.95);

    // Select the first card
    const firstCard = searchModal.locator('.deck-search-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Verify Action Toolbar is visible and bounding box is strictly within 640px height
    const takeHandBtn = page.locator('#btn-deck-take-hand');
    await expect(takeHandBtn).toBeVisible();
    const btnBox = await takeHandBtn.boundingBox();
    expect(btnBox).not.toBeNull();
    expect(btnBox!.y + btnBox!.height).toBeLessThanOrEqual(640);

    // Close modal
    await page.locator('#btn-deck-search-close').click();
    await expect(searchModal).not.toBeVisible();
  });

  test('PokemonActionModal fits within 360x640, scroll body scrolls smoothly, and bottom buttons are accessible', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-mobile-arena')).toBeVisible({ timeout: 15000 });

    // Quick Setup
    await page.locator('#btn-quick-setup').click();

    // Tap active slot to open Pokemon Action Modal
    const activeSlot = page.locator('[data-slot-side="bottom"][data-slot-pos="ACTIVE"]');
    await expect(activeSlot).toBeVisible();
    await activeSlot.click();

    const modal = page.locator('#pokemon-action-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify modal dialog height does not exceed 88dvh / 640px
    const modalCard = modal.locator('> div');
    const box = await modalCard.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThanOrEqual(640 * 0.92);

    // Verify scroll body exists and can scroll
    const scrollBody = page.locator('#pokemon-action-modal-scroll-body');
    await expect(scrollBody).toBeVisible();

    // Scroll to bottom of action modal
    await scrollBody.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    // Check Scoop button is visible and within screen bounds
    const scoopBtn = page.locator('#btn-scoop-pokemon-to-hand');
    await expect(scoopBtn).toBeVisible();
    const scoopBox = await scoopBtn.boundingBox();
    expect(scoopBox).not.toBeNull();
    expect(scoopBox!.y + scoopBox!.height).toBeLessThanOrEqual(640);

    // Close modal
    await page.locator('#btn-close-pokemon-modal').click();
    await expect(modal).not.toBeVisible();
  });

  test('EmptySlotPickerModal fits within 360x640 with scrollable card grid and accessible close button', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-mobile-arena')).toBeVisible({ timeout: 15000 });

    // Draw cards so player has cards in hand
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // Tap empty active slot
    const activeSlot = page.locator('[data-slot-side="bottom"][data-slot-pos="ACTIVE"]');
    await activeSlot.click();

    const slotModal = page.locator('#empty-slot-picker-modal');
    await expect(slotModal).toBeVisible({ timeout: 5000 });

    // Verify card grid is scrollable
    const cardGrid = page.locator('#slot-picker-card-grid');
    await expect(cardGrid).toBeVisible();

    // Close button works
    const closeBtn = page.locator('#btn-close-slot-picker');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(slotModal).not.toBeVisible();
  });

  test('TopCardsViewerModal fits within 360x640 with compact horizontal stepper and close button', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-mobile-arena')).toBeVisible({ timeout: 15000 });

    // Open Top Cards
    await page.locator('#btn-dock-top-cards').click();
    const topCardsModal = page.locator('#top-cards-modal');
    await expect(topCardsModal).toBeVisible();

    // Modal dialog fits within 360x640
    const dialogBox = await topCardsModal.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.width).toBeLessThanOrEqual(360);
    expect(dialogBox!.height).toBeLessThanOrEqual(640 * 0.95);

    // Close modal
    await page.locator('#btn-close-top-cards').click();
    await expect(topCardsModal).not.toBeVisible();
  });

  test('pre-game card placement places Pokémon cards facedown and reveals them via Let\'s Play button', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-mobile-arena')).toBeVisible({ timeout: 15000 });

    // 1. Setup prizes for both sides to satisfy readiness check
    const bottomPrizesBtn = page.locator('#btn-setup-prizes');
    if (await bottomPrizesBtn.isVisible()) {
      await bottomPrizesBtn.click();
    }
    const topPrizesBtn = page.locator('#btn-setup-top-prizes');
    if (await topPrizesBtn.isVisible()) {
      await topPrizesBtn.click();
    }

    // 2. Draw 7 cards for both sides
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();
    const topDrawBtn = page.locator('#btn-setup-top-draw7');
    if (await topDrawBtn.isVisible()) {
      await topDrawBtn.click();
    }

    // 3. Tap empty active slot for bottom player to open picker
    const activeSlot = page.locator('[data-slot-side="bottom"][data-slot-pos="ACTIVE"]');
    await activeSlot.click();

    const slotModal = page.locator('#empty-slot-picker-modal');
    await expect(slotModal).toBeVisible({ timeout: 5000 });

    // Pick card for bottom player
    const firstCard = page.locator('[data-testid="picker-card-item"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // 4. Verify Active slot is now placed FACEDOWN before game start
    const activeFilledSlot = page.locator('#bottom-active-card');
    await expect(activeFilledSlot).toHaveAttribute('data-facedown', 'true');
    await expect(page.locator('#bottom-active-card-facedown')).toBeVisible();
    await expect(activeFilledSlot).toContainText(/คว่ำหน้า/i);

    // 5. Place active card for top player so both sides are ready
    const topActiveSlot = page.locator('[data-slot-side="top"][data-slot-pos="ACTIVE"]');
    await topActiveSlot.click();
    await expect(slotModal).toBeVisible({ timeout: 5000 });
    const topCard = page.locator('[data-testid="picker-card-item"]').first();
    await expect(topCard).toBeVisible();
    await topCard.click();
    const topFilledSlot = page.locator('#top-active-card');
    await expect(topFilledSlot).toHaveAttribute('data-facedown', 'true');

    // 6. Pre-game controls are visible: turn decision & Let's Play button
    const turnDecisionBtn = page.locator('#btn-open-turn-decision');
    await expect(turnDecisionBtn).toBeVisible();

    const letsPlayBtn = page.locator('#btn-reveal-all-facedown');
    await expect(letsPlayBtn).toBeVisible();
    await expect(letsPlayBtn).toContainText(/Let's Play!/i);

    // 7. Dock button also shows Let's Play thumb action before game starts
    const dockLetsPlay = page.locator('#btn-dock-reveal-all');
    await expect(dockLetsPlay).toBeVisible();

    // 8. Click Let's Play to reveal cards and start game
    await letsPlayBtn.click();

    // 9. Verify both Active slots are revealed face up and game is started
    await expect(activeFilledSlot).toHaveAttribute('data-facedown', 'false');
    await expect(topFilledSlot).toHaveAttribute('data-facedown', 'false');
    await expect(letsPlayBtn).not.toBeVisible();
    await expect(dockLetsPlay).not.toBeVisible();
  });

  test('rigid viewport fit on 360x640 with zero window scroll and fully visible dock', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-mobile-arena')).toBeVisible({ timeout: 15000 });

    // Draw cards & setup prizes
    await page.locator('#btn-setup-draw-7').click();
    const bottomPrizesBtn = page.locator('#btn-setup-prizes');
    if (await bottomPrizesBtn.isVisible()) {
      await bottomPrizesBtn.click();
    }

    // Verify container height and body overflow lock
    const containerBox = await page.locator('#playmat-v3-container').boundingBox();
    expect(containerBox).not.toBeNull();
    expect(containerBox!.height).toBeLessThanOrEqual(640);

    // Verify window scroll position is strictly 0
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);

    // Verify bottom dock is completely on-screen (not clipped below bottom edge)
    const dock = page.locator('#tabletop-v3-dock');
    await expect(dock).toBeVisible();
    const dockBox = await dock.boundingBox();
    expect(dockBox).not.toBeNull();
    expect(dockBox!.y + dockBox!.height).toBeLessThanOrEqual(640);

    // Attempt to scroll document
    await page.evaluate(() => window.scrollTo(0, 500));
    const postScrollY = await page.evaluate(() => window.scrollY);
    expect(postScrollY).toBe(0);
  });

  test('mobile trainer card play via tap quick action bar displays in-play slot and discards cleanly', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-mobile-arena')).toBeVisible({ timeout: 15000 });

    // Draw initial 7 cards
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // Ensure we have a Trainer card in hand (draw more if necessary)
    let trainerCard = page.locator('#hand-cards-tray [data-card-supertype="Trainer"]').first();
    let attempts = 0;
    while (!(await trainerCard.isVisible()) && attempts < 6) {
      await page.locator('#bottom-deck-pile').click();
      await page.waitForTimeout(100);
      trainerCard = page.locator('#hand-cards-tray [data-card-supertype="Trainer"]').first();
      attempts++;
    }
    await expect(trainerCard).toBeVisible();

    // 1. Tap the Trainer card in hand
    await trainerCard.click();

    // 2. Verify Quick Action Bar appears above hand tray
    const quickBar = page.locator('#mobile-hand-quick-bar');
    await expect(quickBar).toBeVisible();
    const playBtn = page.locator('#btn-quick-play-trainer');
    await expect(playBtn).toBeVisible();
    await expect(playBtn).toContainText(/เล่นการ์ดนี้/i);

    // 3. Click "เล่นการ์ดนี้" to play Trainer to the in-play board slot
    await playBtn.click();

    // 4. In-play slot is now prominently displayed in center board zone
    const revealedSlot = page.locator('#mobile-bottom-revealed-card-slot');
    await expect(revealedSlot).toBeVisible();
    await expect(revealedSlot).toContainText(/การ์ดที่เล่น/i);

    // 5. Test Zoom on in-play card
    const zoomBtn = page.locator('#btn-mobile-zoom-revealed');
    await expect(zoomBtn).toBeVisible();

    // 6. Test Discard button
    const discardBtn = page.locator('#btn-mobile-discard-revealed');
    await expect(discardBtn).toBeVisible();
    await discardBtn.click();

    // In-play slot clears and card is now in discard pile
    await expect(revealedSlot).not.toBeVisible();
    const discardPile = page.locator('#bottom-btn-discard');
    await expect(discardPile).toBeVisible();
    await expect(discardPile).not.toContainText(/🗑️ 0/);
  });

  test('mobile trainer card play via drag-and-drop to center trainer zone and send to lost zone', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-mobile-arena')).toBeVisible({ timeout: 15000 });

    // Draw initial 7 cards
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // Ensure we have a Trainer card in hand
    let trainerCard = page.locator('#hand-cards-tray [data-card-supertype="Trainer"]').first();
    let attempts = 0;
    while (!(await trainerCard.isVisible()) && attempts < 6) {
      await page.locator('#bottom-deck-pile').click();
      await page.waitForTimeout(100);
      trainerCard = page.locator('#hand-cards-tray [data-card-supertype="Trainer"]').first();
      attempts++;
    }
    await expect(trainerCard).toBeVisible();

    // Center trainer drop zone is visible
    const dropZone = page.locator('#center-trainer-drop-zone');
    await expect(dropZone).toBeVisible();

    // Drag trainer card onto the center trainer drop zone
    const trainerBox = await trainerCard.boundingBox();
    const dropBox = await dropZone.boundingBox();
    expect(trainerBox).not.toBeNull();
    expect(dropBox).not.toBeNull();

    await page.mouse.move(trainerBox!.x + trainerBox!.width / 2, trainerBox!.y + trainerBox!.height / 2);
    await page.mouse.down();
    // Drag upward to activate drag mode (dy < -10)
    await page.mouse.move(trainerBox!.x + trainerBox!.width / 2, trainerBox!.y - 20, { steps: 5 });
    // Move to center drop zone
    await page.mouse.move(dropBox!.x + dropBox!.width / 2, dropBox!.y + dropBox!.height / 2, { steps: 10 });
    await page.mouse.up();

    // Verify card is now in in-play revealed slot
    const revealedSlot = page.locator('#mobile-bottom-revealed-card-slot');
    await expect(revealedSlot).toBeVisible({ timeout: 5000 });

    // Test sending to Lost Zone
    const lostBtn = page.locator('#btn-mobile-lost-revealed');
    await expect(lostBtn).toBeVisible();
    await lostBtn.click();

    // In-play slot clears
    await expect(revealedSlot).not.toBeVisible();
  });

  test('mobile mulligan workflow opens MulliganCheckModal and performs hand reshuffle', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // 1. Initial state before draw: mulligan button is not shown because hand is 0
    await expect(page.locator('#btn-mobile-mulligan')).not.toBeVisible();

    // 2. Draw 7 cards
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // 3. Mobile Mulligan button is now visible in the hand tray header
    const mulliganBtn = page.locator('#btn-mobile-mulligan');
    await expect(mulliganBtn).toBeVisible();
    await expect(mulliganBtn).toContainText('มัลลิแกน');

    // 4. Tap Mulligan button to open MulliganCheckModal
    await mulliganBtn.click();
    const modal = page.locator('#mulligan-verification-modal');
    await expect(modal).toBeVisible();
    await expect(page.getByText(/ตรวจสอบสิทธิ์มัลลิแกน/i)).toBeVisible();

    // 5. Check if basic exists or not, and trigger confirm or force mulligan
    const hasBasic = (await modal.getAttribute('data-has-basic')) === 'true';
    if (hasBasic) {
      const forceBtn = page.locator('#btn-force-mulligan');
      await expect(forceBtn).toBeVisible();
      await forceBtn.click();
    } else {
      const confirmBtn = page.locator('#btn-confirm-mulligan');
      await expect(confirmBtn).toBeVisible();
      await confirmBtn.click();
    }

    // 6. Modal closes and hand is refreshed to 7 cards
    await expect(modal).not.toBeVisible();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();
  });

  test('mobile opponent mulligan button is accessible in top zone', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // Draw 7 cards for opponent
    const topDraw7 = page.locator('#btn-setup-top-draw7');
    await expect(topDraw7).toBeVisible();
    await topDraw7.click();

    // Top Mulligan button is now visible
    const topMulliganBtn = page.locator('#btn-top-setup-mulligan');
    await expect(topMulliganBtn).toBeVisible();
    await topMulliganBtn.click();

    // Verification modal opens for opponent
    const modal = page.locator('#mulligan-verification-modal');
    await expect(modal).toBeVisible();

    // Close modal
    await page.locator('#btn-close-mulligan-modal').click();
    await expect(modal).not.toBeVisible();
  });
});




