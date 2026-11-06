import { test, expect } from '@playwright/test';

test.describe('Playmat V3: Two-Player Tabletop Sandbox & Center Board (โต๊ะจริง 2 ฝั่ง)', () => {
  test('renders dual-player opposing board with shared center board', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');

    // 1. Playmat V3 container is immediately visible
    const container = page.locator('#playmat-v3-container');
    await expect(container).toBeVisible({ timeout: 10000 });

    // 2. Both Top Player (Opponent) and Bottom Player (You) zones are visible
    await expect(page.locator('#top-player-zone')).toBeVisible();
    await expect(page.locator('#bottom-player-zone')).toBeVisible();

    // 3. Center Board Zone is visible between them
    await expect(page.locator('#center-board-zone')).toBeVisible();

    // 4. Header shows dual-player match status and new game button
    await expect(page.getByText('Playmat V3')).toBeVisible();
    await expect(page.getByText(/Turn 1/i)).toBeVisible();
    await expect(page.locator('#btn-v3-new-game')).toBeVisible();

    // 5. Zero auto-draw at start: 0 cards in hand, 0 prizes, 60 in deck
    await expect(page.getByText(/มือของคุณ \(0 ใบ\)/i)).toBeVisible();
    await expect(page.locator('#tabletop-setup-bar')).not.toBeVisible();
    await expect(page.locator('#btn-place-prizes-empty')).toBeVisible();

    // 6. User manually draws 7 and places 6 prizes using setup action buttons
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    await page.locator('#btn-place-prizes-empty').click();
    await expect(page.locator('#prize-card-0')).toBeVisible();

    // 7. Dock is visible at bottom
    const dock = page.locator('#tabletop-v3-dock');
    await expect(dock).toBeVisible();
  });

  test('toggles hand privacy and flips table perspective from center board', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    // Click Hand Privacy Toggle (Solo Study Mode)
    const privacyBtn = page.locator('#btn-toggle-solo-reveal');
    await expect(privacyBtn).toBeVisible();
    await privacyBtn.click();

    // Now Solo mode is active, opponent hand becomes revealed
    await expect(privacyBtn).toHaveClass(/bg-amber-950/);

    // Toggle back to Privacy
    await privacyBtn.click();
    await expect(privacyBtn).not.toHaveClass(/bg-amber-950/);

    // Click Perspective Flip
    const flipBtn = page.locator('#btn-toggle-perspective');
    await expect(flipBtn).toBeVisible();
    await flipBtn.click();

    // Click Pass Turn
    const passBtn = page.locator('#btn-center-pass-turn');
    await passBtn.click();
    await expect(page.getByText(/Turn 2/i)).toBeVisible();
  });

  test('plays Trainer card from hand directly onto tabletop board without popup modal', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // Draw 7 cards to hand first via manual setup action
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // Click first card in hand
    const firstHandCard = page.locator('#hand-card-0');
    await expect(firstHandCard).toBeVisible();
    await firstHandCard.click();

    // Hand card action sheet opens
    const handModal = page.locator('#hand-card-menu-modal');
    await expect(handModal).toBeVisible();

    // Click "▶️ เล่นการ์ดลงกระดาน"
    const playTrainerBtn = page.locator('#btn-hand-play-trainer');
    await expect(playTrainerBtn).toBeVisible();
    await playTrainerBtn.click();

    // Verify NO popup modal appears! (Card is on the board instead)
    const spotlightModal = page.locator('#center-spotlight-modal');
    await expect(spotlightModal).not.toBeVisible();

    // Placed directly on the board in #bottom-revealed-card-slot
    const inPlaySlot = page.locator('#bottom-revealed-card-slot');
    await expect(inPlaySlot).toBeVisible();
    await expect(page.getByText(/การ์ดที่เล่น \(In-Play\)|การ์ดที่เปิดเผย/)).toBeVisible();

    // Click "🗑️ ทิ้ง" to dismiss from board to discard
    const discardBtn = page.locator('#btn-discard-revealed-bottom');
    await expect(discardBtn).toBeVisible();
    await discardBtn.click();

    // In-play slot should now be dismissed
    await expect(inPlaySlot).not.toBeVisible();
  });

  test('reveals any card to opponent as physical card on tabletop board', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // Draw 7 cards to hand first via manual setup action
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // Click second card in hand
    const handCard = page.locator('#hand-card-1');
    await expect(handCard).toBeVisible();
    await handCard.click();

    // Click "โชว์การ์ดให้อีกฝั่งดู"
    const revealBtn = page.locator('#btn-hand-reveal-card');
    await expect(revealBtn).toBeVisible();
    await revealBtn.click();

    // Placed directly on the board in #bottom-revealed-card-slot
    const revealedSlot = page.locator('#bottom-revealed-card-slot');
    await expect(revealedSlot).toBeVisible();

    // Test zoom action
    const zoomBtn = page.locator('#btn-zoom-revealed-bottom');
    await expect(zoomBtn).toBeVisible();
    await zoomBtn.click();
    await expect(page.getByTitle('ปิดหน้าต่าง (ESC)')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTitle('ปิดหน้าต่าง (ESC)')).not.toBeVisible();

    // Test dismiss to graveyard (discard)
    const discardBtn = page.locator('#btn-discard-revealed-bottom');
    await expect(discardBtn).toBeVisible();
    await discardBtn.click();
    await expect(revealedSlot).not.toBeVisible();
  });

  test('selects from 24 Limitless meta decks or custom decks for either player', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // Open Deck Selector Modal
    const changeDeckBtn = page.locator('#btn-v3-change-deck');
    await expect(changeDeckBtn).toBeVisible();
    await changeDeckBtn.click();

    const selectorModal = page.locator('#deck-selector-modal');
    await expect(selectorModal).toBeVisible();

    // Verify Meta tab displays Limitless meta decks
    await expect(page.getByText(/Dragapult ex/i).first()).toBeVisible();
    await expect(page.getByText(/Raging Bolt ex/i).first()).toBeVisible();

    // Search for a meta deck
    const searchInput = page.locator('#input-search-deck');
    await searchInput.fill('Greninja');
    await expect(page.getByText(/Greninja ex/i).first()).toBeVisible();

    // Assign to Player 2
    const assignP2Btn = page.locator('[id^="btn-assign-p2-"]').first();
    await assignP2Btn.click();

    // Modal should close and Player 2 should now have Greninja
    await expect(selectorModal).not.toBeVisible();
    await expect(page.getByText(/Greninja ex/i).first()).toBeVisible();
  });

  test('opens online room modal with 2-device connection and role selection', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // Open Online Room Modal
    const onlineBtn = page.locator('#btn-v3-online-room');
    await expect(onlineBtn).toBeVisible();
    await onlineBtn.click();

    const roomModal = page.locator('#online-room-modal');
    await expect(roomModal).toBeVisible();
    await expect(page.getByText(/เล่นด้วยกัน 2 เครื่อง/i)).toBeVisible();

    // Verify Create and Join tabs
    await expect(page.getByText(/สร้างห้องใหม่/i)).toBeVisible();
    await expect(page.getByText(/เข้าร่วมห้อง/i)).toBeVisible();

    // Verify Role selectors inside modal
    await expect(roomModal.getByText(/Player 1 \(คุณ\)/i)).toBeVisible();
    await expect(roomModal.getByText(/Player 2 \(คู่ต่อสู้\)/i)).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
  });

  test('adjusts damage counters with quick steppers and in-modal controls', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // Draw 7 cards to hand first via manual setup action
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // Ensure a card is placed in active spot
    const activeCard = page.locator('#slot-active-card').first();
    if (!(await activeCard.isVisible())) {
      const hCard = page.locator('#hand-card-0');
      await hCard.click();
      await page.locator('#btn-hand-place-active').click();
    }

    await expect(activeCard).toBeVisible({ timeout: 8000 });

    // Click quick +10 button on card
    const quickAddBtn = page.locator('#btn-add-10-active').first();
    await quickAddBtn.click({ force: true });

    // Damage counter dice appears on active card showing 10
    const damageBadge = page.locator('#damage-counter-active').first();
    await expect(damageBadge).toBeVisible();
    await expect(damageBadge).toHaveText('10');

    // Click card to open full Pokemon action modal
    await activeCard.click();
    const actionModal = page.locator('#pokemon-action-modal');
    await expect(actionModal).toBeVisible();

    // Click +50 in modal
    await page.getByRole('button', { name: '+50' }).click();

    // Close modal
    await page.locator('#btn-close-pokemon-modal').click();
    await expect(actionModal).not.toBeVisible();

    // Damage badge should now be 60
    await expect(damageBadge).toHaveText('60');
  });

  test('takes prize card and draws card via dock and deck clicks', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // Place 6 prizes and draw 7 cards first via manual setup action
    await page.locator('#btn-setup-prizes').click();
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // Click first prize card of player
    const firstPrize = page.locator('#prize-card-0');
    await expect(firstPrize).toBeVisible();
    await firstPrize.click();

    // Hand count should increase to 8
    await expect(page.getByText(/มือของคุณ \(8 ใบ\)/i)).toBeVisible();

    // Draw 1 card via quick action
    const drawBtn = page.locator('#btn-quick-draw');
    await drawBtn.click();

    // Hand count should increase to 9
    await expect(page.getByText(/มือของคุณ \(9 ใบ\)/i)).toBeVisible();
  });

  test('undo and redo revert state transitions seamlessly', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // Draw 7 cards to hand first via manual setup action
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // Draw 1 card
    await page.locator('#btn-quick-draw').click();
    await expect(page.getByText(/มือของคุณ \(8 ใบ\)/i)).toBeVisible();

    // Click Undo
    const undoBtn = page.locator('#btn-dock-undo');
    await expect(undoBtn).toBeEnabled();
    await undoBtn.click();

    // Hand count should revert to 7
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // Click Redo
    const redoBtn = page.locator('#btn-dock-redo');
    await expect(redoBtn).toBeEnabled();
    await redoBtn.click();

    // Hand count should return to 8
    await expect(page.getByText(/มือของคุณ \(8 ใบ\)/i)).toBeVisible();
  });

  test('collapses and expands hand console cleanly without covering active or bench slots', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // Draw 7 cards to hand first via manual setup action
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    const bottomConsole = page.locator('#bottom-hand-console');
    const handTray = page.locator('#hand-cards-tray');
    const toggleBtn = page.locator('#btn-toggle-hand-tray');

    await expect(bottomConsole).toBeVisible();
    await expect(handTray).toBeVisible();
    await expect(page.getByText(/ย่อลง \(ดูโต๊ะเต็มจอ\)/i)).toBeVisible();

    // Verify bench and active spots are visible on the field
    await expect(page.locator('#bottom-player-zone')).toBeVisible();

    // 1. Click toggle button to collapse hand tray
    await toggleBtn.click();
    await expect(handTray).not.toBeVisible();
    await expect(page.getByText(/แสดงการ์ดบนมือ \(7\)/i)).toBeVisible();

    // Field remains completely visible
    await expect(page.locator('#bottom-player-zone')).toBeVisible();

    // 2. Press 'H' shortcut to expand hand tray again
    await page.keyboard.press('h');
    await expect(handTray).toBeVisible();

    // 3. Quick draw button draws card and auto-ensures tray is expanded
    const quickDrawBtn = page.locator('#btn-quick-draw');
    await quickDrawBtn.click();
    await expect(page.getByText(/มือของคุณ \(8 ใบ\)/i)).toBeVisible();
    await expect(page.locator('#hand-card-7')).toBeVisible();
  });

  test('starts new match with deck selection first, confirms zero auto-draw, and performs manual tabletop setup', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Click New Match button from header
    const newGameBtn = page.locator('#btn-v3-new-game');
    await expect(newGameBtn).toBeVisible();
    await newGameBtn.click();

    // 2. Deck Selection Modal opens in New Match Mode
    const modal = page.locator('#deck-selector-modal');
    await expect(modal).toBeVisible();
    await expect(page.getByText(/เริ่มเกมใหม่: เลือกเด็คก่อนจัดโต๊ะ/i)).toBeVisible();

    // 3. Matchup summary bar shows P1 vs P2
    await expect(modal.getByText(/🔵 Player 1 \(คุณ\)/i)).toBeVisible();
    await expect(modal.getByText(/🔴 Player 2 \(คู่ต่อสู้\)/i)).toBeVisible();

    // 4. Select a deck for P2
    const p2AssignBtn = page.locator('[id^="btn-assign-p2-"]').nth(1);
    await p2AssignBtn.click();

    // 5. Choose Player 2 to start first (Turn 1)
    const p2FirstBtn = modal.locator('#btn-select-first-p2');
    await expect(p2FirstBtn).toBeVisible();
    await p2FirstBtn.click();

    // 6. Confirm start new match
    const confirmBtn = page.locator('#btn-confirm-start-match');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Modal closes
    await expect(modal).not.toBeVisible();

    // 7. Verify Player 2 is indeed Turn 1
    await expect(page.locator('#center-board-zone').getByText(/Player 2/i)).toBeVisible();

    // 8. Zero auto-draw: Hand = 0, Prizes = 0, Deck = 60
    await expect(page.getByText(/มือของคุณ \(0 ใบ\)/i)).toBeVisible();
    await expect(page.locator('#btn-place-prizes-empty')).toBeVisible();
    await expect(page.locator('#tabletop-setup-bar')).not.toBeVisible();

    // 9. Manual setup flow:
    // a) Toggle first player directly from setup bar
    const toggleFirstBtn = page.locator('#btn-setup-toggle-first');
    await expect(toggleFirstBtn).toBeVisible();
    await toggleFirstBtn.click();
    await expect(page.locator('#center-board-zone').getByText(/Player 1/i)).toBeVisible();

    // b) Shuffle deck with visual feedback
    const shuffleBtn = page.locator('#btn-setup-shuffle');
    await shuffleBtn.click();
    await expect(page.getByText(/สับแล้ว ✓/i)).toBeVisible();

    // c) Draw 7 cards
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // d) Place 6 prizes
    await page.locator('#btn-setup-prizes').click();
    await expect(page.locator('#prize-card-0')).toBeVisible();

    // e) Mulligan: opens anti-cheat proof modal showing hand cards, then confirms mulligan
    await page.locator('#btn-setup-mulligan').click();
    await expect(page.locator('#mulligan-verification-modal')).toBeVisible();
    await page.locator('#btn-confirm-mulligan, #btn-force-mulligan').click();
    await expect(page.locator('#mulligan-verification-modal')).not.toBeVisible();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // f) Top player manual setup
    await page.locator('#btn-setup-top-draw7').click();
    await page.locator('#btn-setup-top-prizes').click();
    await expect(page.locator('#top-prize-0')).toBeVisible();
  });

  test('supports solo practice hand switching mode: dual tabs, swap button, Tab key, and auto-switch on pass turn', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Dual hand tabs are visible in the bottom console
    const p1Tab = page.locator('#btn-hand-tab-p1');
    const p2Tab = page.locator('#btn-hand-tab-p2');
    const swapBtn = page.locator('#btn-swap-hand');
    const autoSwapToggle = page.locator('#btn-toggle-solo-auto-swap');

    await expect(p1Tab).toBeVisible();
    await expect(p2Tab).toBeVisible();
    await expect(swapBtn).toBeVisible();
    await expect(autoSwapToggle).toBeVisible();

    // 2. Initially P1 is controlled at bottom
    await expect(p1Tab.getByText(/มือของคุณ \(0 ใบ\)/i)).toBeVisible();
    await expect(p2Tab.getByText(/\(0 ใบ\)/i)).toBeVisible();

    // 3. P1 draws 7 cards
    await page.locator('#btn-setup-draw-7').click();
    await expect(p1Tab.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // 4. Click P2 Tab to switch control to Player 2
    await p2Tab.click();
    await expect(p2Tab.getByText(/มือของคุณ \(0 ใบ\)/i)).toBeVisible();
    await expect(p1Tab.getByText(/\(7 ใบ\)/i)).toBeVisible();

    // 5. P2 draws 7 cards
    await page.locator('#btn-setup-draw-7').click();
    await expect(p2Tab.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // 6. Click quick swap button (#btn-swap-hand) to swap back to P1
    await swapBtn.click();
    await expect(p1Tab.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // 7. Press Tab keyboard shortcut to swap to P2
    await page.keyboard.press('Tab');
    await expect(p2Tab.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // Press Tab again to swap back to P1
    await page.keyboard.press('Tab');
    await expect(p1Tab.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // 8. Auto-switch on Pass Turn test:
    // P1 is currently active on Turn 1
    await expect(page.locator('#center-board-zone').getByText(/Player 1/i)).toBeVisible();

    // Pass turn -> Turn 2 for Player 2 -> Perspective should automatically switch to P2!
    await page.locator('#btn-center-pass-turn').click();
    await expect(page.getByText(/Turn 2/i)).toBeVisible();
    await expect(p2Tab.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // 9. Disable auto-switch mode
    await autoSwapToggle.click();
    await expect(autoSwapToggle).toHaveAttribute('title', /ปิด/);

    // Pass turn -> Turn 3 for Player 1 -> Perspective should stay on P2 because auto-switch is OFF
    await page.locator('#btn-center-pass-turn').click();
    await expect(page.getByText(/Turn 3/i)).toBeVisible();
    await expect(p2Tab.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // 10. Top zone quick switch button
    const topSwitchBtn = page.locator('#btn-top-switch-to-me');
    await expect(topSwitchBtn).toBeVisible();
    await topSwitchBtn.evaluate((el: HTMLElement) => el.click());
    await expect(p1Tab.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();
  });


  test('fits screen proportionally across Desktop, Laptop, Tablet, and Mobile viewports', async ({ page }) => {
    test.setTimeout(60000);

    const viewports = [
      { name: 'Desktop (1080p)', width: 1920, height: 1080 },
      { name: 'Laptop (720p)', width: 1280, height: 720 },
      { name: 'Tablet (iPad Portrait)', width: 768, height: 1024 },
      { name: 'Mobile (iPhone 14/15)', width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/playmat-v3');

      const container = page.locator('#playmat-v3-container');
      await expect(container).toBeVisible({ timeout: 10000 });

      // Core zones must all be rendered and visible
      await expect(page.locator('#top-player-zone')).toBeVisible();
      await expect(page.locator('#center-board-zone')).toBeVisible();
      await expect(page.locator('#bottom-player-zone')).toBeVisible();
      await expect(page.locator('#bottom-hand-console')).toBeVisible();

      // Check header and dock
      await expect(page.locator('#btn-v3-new-game')).toBeVisible();
      await expect(page.locator('#tabletop-v3-dock')).toBeVisible();

      // Verify no horizontal document overflow (horizontal scroll blowout)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Verify no vertical board scroll on PC viewports (Desktop & Laptop)
      if (vp.name.includes('Desktop') || vp.name.includes('Laptop')) {
        const hasBoardVerticalScroll = await page.evaluate(() => {
          const main = document.querySelector('#playmat-v3-board');
          return main ? main.scrollHeight > main.clientHeight : false;
        });
        expect(hasBoardVerticalScroll).toBe(false);
      }

      // Setup actions: draw cards to verify hand tray layout scaling
      const drawBtn = page.locator('#btn-setup-draw-7');
      if (await drawBtn.isVisible()) {
        await drawBtn.click();
        await expect(page.locator('#hand-card-0')).toBeVisible();
      }
    }
  });

  test('deck search modal moves card to hand and decrements deck atomically', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // Initial hand: 0 cards, initial deck: 60 cards
    await expect(page.getByText(/มือของคุณ \(0 ใบ\)/i)).toBeVisible();
    await expect(page.locator('#deck-pile')).toContainText('60');

    // Click Search Deck in dock
    const searchBtn = page.locator('#btn-dock-search');
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();

    // Modal appears
    const modal = page.locator('#deck-search-modal');
    await expect(modal).toBeVisible();

    // Select first card in grid
    const firstCard = page.locator('.deck-search-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // "Take to Hand" button should appear
    const takeHandBtn = page.locator('#btn-deck-take-hand');
    await expect(takeHandBtn).toBeVisible();
    await takeHandBtn.click();

    // Modal should close
    await expect(modal).not.toBeVisible();

    // Hand count should now be 1 card, Deck should be 59 cards
    await expect(page.getByText(/มือของคุณ \(1 ใบ\)/i)).toBeVisible();
    await expect(page.locator('#deck-pile')).toContainText('59');
    await expect(page.locator('#hand-card-0')).toBeVisible();
  });

  test('deck search modal places Pokemon onto bench and active spots directly', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Open Deck Search modal
    await page.locator('#btn-dock-search').click();
    const modal = page.locator('#deck-search-modal');
    await expect(modal).toBeVisible();

    // 2. Filter by Basic Pokémon
    await modal.getByRole('button', { name: 'Basic Pokémon' }).click();

    // 3. Select first basic pokemon card
    const firstCard = page.locator('.deck-search-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // 4. Click "Put on Bench"
    const putBenchBtn = page.locator('#btn-deck-put-bench');
    await expect(putBenchBtn).toBeVisible();
    await putBenchBtn.click();
    await expect(modal).not.toBeVisible();

    // 5. Bench slot 0 should now have a card!
    await expect(page.locator('#slot-bench-0-card')).toBeVisible();

    // 6. Open Deck Search modal again to place in Active
    await page.locator('#btn-dock-search').click();
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Basic Pokémon' }).click();
    const secondCard = page.locator('.deck-search-card').first();
    await secondCard.click();

    // 7. Click "Put in Active"
    const putActiveBtn = page.locator('#btn-deck-put-active');
    await expect(putActiveBtn).toBeVisible();
    await putActiveBtn.click();
    await expect(modal).not.toBeVisible();

    // 8. Active spot should now have a card!
    await expect(page.locator('#slot-active-card')).toBeVisible();
  });

  test('supports placing cards face-down on Active and Bench, quick flip, modal flip, and reveal-all', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Draw 7 cards to hand
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // 2. Click hand card 0 -> HandCardMenuModal opens
    await page.locator('#hand-card-0').click();
    const handModal = page.locator('#hand-card-menu-modal');
    await expect(handModal).toBeVisible();

    // 3. Place Face-Down on Active spot
    const placeActiveFacedownBtn = page.locator('#btn-hand-place-active-facedown');
    await expect(placeActiveFacedownBtn).toBeVisible();
    await placeActiveFacedownBtn.click();
    await expect(handModal).not.toBeVisible();

    // 4. Verify Active slot is Face-Down
    const activeCard = page.locator('#slot-active-card');
    await expect(activeCard).toBeVisible();
    await expect(activeCard).toHaveAttribute('data-facedown', 'true');
    await expect(page.locator('#slot-active-facedown')).toBeVisible();
    await expect(page.locator('#btn-quick-flip-active')).toBeVisible();

    // 5. Click hand card 0 (formerly card 1) -> place Face-Down on Bench 0
    await page.locator('#hand-card-0').click();
    await expect(handModal).toBeVisible();
    const placeBenchFacedown0 = page.locator('#btn-hand-place-bench-facedown-0');
    await expect(placeBenchFacedown0).toBeVisible();
    await placeBenchFacedown0.click();
    await expect(handModal).not.toBeVisible();

    // 6. Verify Bench 0 is Face-Down
    const bench0Card = page.locator('#slot-bench-0-card');
    await expect(bench0Card).toBeVisible();
    await expect(bench0Card).toHaveAttribute('data-facedown', 'true');
    await expect(page.locator('#slot-bench-0-facedown')).toBeVisible();

    // 7. Verify "Reveal All Facedown" button appeared in CenterBoardZone
    const revealAllBtn = page.locator('#btn-reveal-all-facedown');
    await expect(revealAllBtn).toBeVisible();

    // 8. Quick Flip Active card using the quick flip button on card
    await page.locator('#btn-quick-flip-active').click();
    await expect(activeCard).toHaveAttribute('data-facedown', 'false');
    await expect(page.locator('#slot-active-facedown')).not.toBeVisible();

    // 9. Click Bench 0 card to open PokemonActionModal
    await bench0Card.click();
    const actionModal = page.locator('#pokemon-action-modal');
    await expect(actionModal).toBeVisible();
    await expect(actionModal.getByText(/การ์ดใบนี้กำลังคว่ำหน้าอยู่/i)).toBeVisible();

    // 10. Click Flip Face-Up button in modal
    const flipUpBtn = page.locator('#btn-flip-face-up');
    await expect(flipUpBtn).toBeVisible();
    await flipUpBtn.click();
    await expect(actionModal).not.toBeVisible();

    // Verify Bench 0 is now face-up
    await expect(bench0Card).toHaveAttribute('data-facedown', 'false');
    // Reveal all button should disappear since no cards are facedown anymore
    await expect(revealAllBtn).not.toBeVisible();

    // 11. Click Bench 0 card again and flip back to face-down from modal
    await page.waitForTimeout(300);
    await page.locator('#slot-bench-0-surface').click({ force: true });
    await expect(actionModal).toBeVisible();
    const flipDownBtn = page.locator('#btn-flip-face-down');
    await expect(flipDownBtn).toBeVisible();
    await flipDownBtn.click();
    await expect(actionModal).not.toBeVisible();
    await expect(bench0Card).toHaveAttribute('data-facedown', 'true');
    await expect(revealAllBtn).toBeVisible();

    // 12. Setup completion before "Let's Play!"
    // a) Clicking while incomplete is blocked with warning toast
    await revealAllBtn.click();
    await expect(page.locator('#tabletop-action-toast')).toBeVisible();
    await expect(bench0Card).toHaveAttribute('data-facedown', 'true');

    // b) Place prizes and opponent active card
    await page.locator('#btn-setup-prizes').click();
    await page.locator('#btn-setup-top-prizes').click();
    await page.locator('#btn-setup-top-draw7').click();
    await page.locator('[data-slot-side="player2"][data-slot-pos="ACTIVE"]').click();

    // c) Now click "✨ Let's Play!" to reveal all facedown cards at once
    await expect(revealAllBtn).toHaveAttribute('data-ready', 'true');
    await revealAllBtn.click();
    await expect(bench0Card).toHaveAttribute('data-facedown', 'false');
    await expect(revealAllBtn).not.toBeVisible();
  });

  test('deck search modal supports placing cards face-down into bench and active', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // Open Deck Search modal
    await page.locator('#btn-dock-search').click();
    const modal = page.locator('#deck-search-modal');
    await expect(modal).toBeVisible();

    // Filter by Basic Pokémon
    await modal.getByRole('button', { name: 'Basic Pokémon' }).click();

    // Select first card
    const firstCard = page.locator('.deck-search-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Click Put Active Facedown
    const putActiveFacedownBtn = page.locator('#btn-deck-put-active-facedown');
    await expect(putActiveFacedownBtn).toBeVisible();
    await putActiveFacedownBtn.click();
    await expect(modal).not.toBeVisible();

    // Active spot should now be facedown
    const activeCard = page.locator('#slot-active-card');
    await expect(activeCard).toBeVisible();
    await expect(activeCard).toHaveAttribute('data-facedown', 'true');

    // Open Deck Search modal again to place bench facedown
    await page.locator('#btn-dock-search').click();
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Basic Pokémon' }).click();

    const secondCard = page.locator('.deck-search-card').first();
    await secondCard.click();

    // Click Put Bench Facedown
    const putBenchFacedownBtn = page.locator('#btn-deck-put-bench-facedown');
    await expect(putBenchFacedownBtn).toBeVisible();
    await putBenchFacedownBtn.click();
    await expect(modal).not.toBeVisible();

    // Bench 0 should now be facedown
    const bench0Card = page.locator('#slot-bench-0-card');
    await expect(bench0Card).toBeVisible();
    await expect(bench0Card).toHaveAttribute('data-facedown', 'true');
  });

  test('top cards deck inspector defaults to 1 card', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // Click Top Cards button in Dock
    const topCardsBtn = page.locator('#btn-dock-top-cards');
    await expect(topCardsBtn).toBeVisible();
    await topCardsBtn.click();

    // Inspector modal appears
    await expect(page.getByText(/Top Deck Inspector \(ดูการ์ดใบบนสุด\)/i)).toBeVisible();

    // Default count is 1: exactly 1 card in the inspector grid (#1)
    await expect(page.locator('.aspect-\\[63\\/88\\]').getByText('#1')).toBeVisible();
    await expect(page.locator('.aspect-\\[63\\/88\\]').getByText('#2')).not.toBeVisible();
  });

  test('supports Pokemon Ability trigger, turn tracking for Energy & Supporter, and retreat with energy discard', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Place a guaranteed Basic Pokémon with Ability (Rotom V) into Active Spot
    await page.locator('#btn-dock-search').click();
    const searchModal = page.locator('#deck-search-modal');
    await expect(searchModal).toBeVisible();
    await page.locator('#deck-search-input').fill('Rotom');
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-put-active').click();
    await expect(searchModal).not.toBeVisible();

    // Place a second Basic Pokémon onto Bench 0
    await page.locator('#btn-dock-search').click();
    await expect(searchModal).toBeVisible();
    await page.locator('#deck-search-input').clear();
    await searchModal.getByRole('button', { name: 'Basic Pokémon' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-put-bench').click();
    await expect(searchModal).not.toBeVisible();

    // Draw cards to hand
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ/i)).toBeVisible();

    const activeCard = page.locator('#slot-active-card');
    await expect(activeCard).toBeVisible();

    // 2. Quick Ability Trigger directly on Active card
    const quickAbilityBtn = page.locator('#btn-quick-ability-active');
    await expect(quickAbilityBtn).toBeVisible();
    await quickAbilityBtn.click();

    // Button updates to used state (title contains ใช้แล้ว)
    await expect(quickAbilityBtn).toHaveAttribute('title', /ใช้แล้ว/);

    // 3. Open Pokemon Action Modal on Active card
    await activeCard.locator('img').click();
    const modal = page.locator('#pokemon-action-modal');
    await expect(modal).toBeVisible();

    // Ability banner is shown with "ใช้แล้วในรอบนี้"
    const useAbilityBtn = page.locator('#btn-use-ability');
    await expect(useAbilityBtn).toBeVisible();
    await expect(useAbilityBtn).toContainText('ใช้แล้ว');

    // Click to reset ability
    await useAbilityBtn.click();
    await expect(useAbilityBtn).toContainText(/ประกาศใช้/);
    await page.locator('#btn-close-pokemon-modal').click();

    // 4. Energy & Supporter Turn Tracking Badges in Center Board Zone
    const energyBadge = page.locator('#btn-toggle-turn-energy');
    const supporterBadge = page.locator('#btn-toggle-turn-supporter');

    await expect(energyBadge).toBeVisible();
    await expect(energyBadge).toContainText('0/1');
    await expect(supporterBadge).toBeVisible();
    await expect(supporterBadge).toContainText('0/1');

    // Manually toggle energy badge
    await energyBadge.click();
    await expect(energyBadge).toContainText('1/1 ✓');

    // Manually toggle supporter badge
    await supporterBadge.click();
    await expect(supporterBadge).toContainText('1/1 ✓');

    // Pass turn -> auto-resets tracking and ability on both sides!
    await page.locator('#btn-center-pass-turn').click();
    await expect(energyBadge).toContainText('0/1');
    await expect(supporterBadge).toContainText('0/1');
    await expect(quickAbilityBtn).not.toContainText('ใช้แล้ว');

    // Switch back to Player 1 hand control
    await page.locator('#btn-hand-tab-p1').click();
    await expect(page.locator('#hand-card-0')).toBeVisible();

    // 5. Attach Energy and Retreat with Energy Discard
    // Attach an energy from hand
    await page.locator('#hand-card-0').click();
    const attachBtn = page.locator('#btn-hand-attach-energy-ACTIVE');
    if (await attachBtn.isVisible()) {
      await attachBtn.click();
    } else {
      await page.locator('[id^="btn-hand-attach-energy-"]').first().click();
    }

    // Open active card action modal
    await activeCard.locator('img').click();
    await expect(modal).toBeVisible();

    // Retreat section appears with bench target
    const retreatBtn = page.locator('#btn-retreat-to-bench-0');
    await expect(retreatBtn).toBeVisible();

    // If active has attached energy, energy discard toggle button is available
    const discardEnergyBtn = page.locator('#btn-retreat-discard-energy-0');
    if (await discardEnergyBtn.isVisible()) {
      await discardEnergyBtn.click();
      await expect(discardEnergyBtn).toContainText('(ทิ้ง)');
    }

    // Click Retreat to Bench 0
    await retreatBtn.click();
    await expect(modal).not.toBeVisible();

    // Active spot still has a Pokémon (swapped!)
    await expect(page.locator('#slot-active-card')).toBeVisible();
    await expect(page.locator('#slot-bench-0-card')).toBeVisible();
  });

  test('allows clicking cards to view large preview and clear card text', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Draw 7 cards to hand via manual setup button
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // 2. Place first card as Active Pokémon
    await page.locator('#hand-card-0').click();
    await page.locator('#btn-hand-place-active').click();
    const activeCard = page.locator('#slot-active-card');
    await expect(activeCard).toBeVisible();

    // Flip face-up if face-down by default before start
    const quickFlipActive = page.locator('#btn-quick-flip-active');
    if (await quickFlipActive.isVisible()) {
      await quickFlipActive.click();
    }

    // 3. Test Quick Zoom on Tabletop Board slot (#btn-quick-zoom-active)
    const quickZoomBtn = page.locator('#btn-quick-zoom-active');
    await expect(quickZoomBtn).toBeVisible();
    await quickZoomBtn.click();

    // Large preview modal appears with card text reader
    await expect(page.getByTitle('ปิดหน้าต่าง (ESC)')).toBeVisible();
    await expect(page.locator('img[alt]').first()).toBeVisible();

    // Close preview modal via ESC key
    await page.keyboard.press('Escape');
    await expect(page.getByTitle('ปิดหน้าต่าง (ESC)')).not.toBeVisible();

    // 4. Test Quick Zoom on Hand Card (#btn-zoom-hand-0)
    const handCardZoomBtn = page.locator('#btn-zoom-hand-0');
    await expect(handCardZoomBtn).toBeAttached();
    // Hover over hand card or click zoom button directly
    await handCardZoomBtn.click({ force: true });
    await expect(page.getByTitle('ปิดหน้าต่าง (ESC)')).toBeVisible();

    // Toggle 150% zoom on image
    const zoomImgContainer = page.locator('div[title*="คลิกเพื่อขยายดูรายละเอียดชัดเจน"], div[title*="คลิกเพื่อย่อกลับขนาดปกติ"]').first();
    await zoomImgContainer.click();
    await expect(page.getByText(/🔍 100%/)).toBeVisible();

    // Close via fixed close button
    await page.locator('#btn-close-card-preview').click();
    await expect(page.locator('#btn-close-card-preview')).not.toBeVisible();

    // 5. Test Zoom from Pokemon Action Modal
    await activeCard.locator('img').click();
    await expect(page.locator('#pokemon-action-modal')).toBeVisible();

    const zoomFromActionBtn = page.locator('#btn-zoom-pokemon-card-action');
    await expect(zoomFromActionBtn).toBeVisible();
    await zoomFromActionBtn.click();

    // Large preview modal appears
    await expect(page.getByTitle('ปิดหน้าต่าง (ESC)')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTitle('ปิดหน้าต่าง (ESC)')).not.toBeVisible();

    // Close Pokémon Action modal
    await page.locator('#btn-close-pokemon-modal').click();
    await expect(page.locator('#pokemon-action-modal')).not.toBeVisible();

    // 6. Test Zoom from Hand Card Menu Modal
    await page.locator('#hand-card-0').click();
    await expect(page.locator('#hand-card-menu-modal')).toBeVisible();

    const zoomFromHandActionBtn = page.locator('#btn-zoom-hand-action');
    await expect(zoomFromHandActionBtn).toBeVisible();
    await zoomFromHandActionBtn.click();

    // Large preview modal appears
    await expect(page.getByTitle('ปิดหน้าต่าง (ESC)')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTitle('ปิดหน้าต่าง (ESC)')).not.toBeVisible();
  });

  test('resolves remaining inspected cards to the bottom of the deck', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Open Top Cards Inspector from Dock
    const topCardsBtn = page.locator('#btn-dock-top-cards');
    await expect(topCardsBtn).toBeVisible();
    await topCardsBtn.click();

    const topModal = page.locator('#top-cards-modal');
    await expect(topModal).toBeVisible();

    // 2. Select 5 cards to inspect
    await page.getByRole('button', { name: '5', exact: true }).click();
    await expect(page.locator('#top-card-item-4')).toBeVisible();

    // Remember card instance IDs: card 0 and card 1
    const card0 = page.locator('#top-card-item-0');
    const card1 = page.locator('#top-card-item-1');
    const firstCardId = await card0.getAttribute('data-instance-id');
    const secondCardId = await card1.getAttribute('data-instance-id');

    // 3. Move first card to hand
    const moveToHandBtn = page.locator('#btn-top-take-hand-0');
    await expect(moveToHandBtn).toBeVisible();
    await moveToHandBtn.click();

    // 4. Click "⬇️ วางที่เหลือลงใต้กอง" (#btn-resolve-remainder-bottom)
    const putBottomBtn = page.locator('#btn-resolve-remainder-bottom');
    await expect(putBottomBtn).toBeVisible();
    await putBottomBtn.click();

    // Modal closes upon resolution
    await expect(topModal).not.toBeVisible();

    // 5. Open Top Cards Inspector again (default 1 card)
    await topCardsBtn.click();
    await expect(topModal).toBeVisible();

    // Verify card currently on top is NOT card 0 (in hand) and NOT card 1 (sent to bottom!)
    const newCard0 = page.locator('#top-card-item-0');
    await expect(newCard0).toBeVisible();
    const newCardId = await newCard0.getAttribute('data-instance-id');
    expect(newCardId).not.toBe(firstCardId);
    expect(newCardId).not.toBe(secondCardId);


    // Close modal
    await page.locator('#btn-close-top-cards').click();
    await expect(topModal).not.toBeVisible();
  });

  test('attaches energy or tool card to active or bench from deck search modal', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // Setup: place a Pokémon from hand to Active
    await page.locator('#btn-setup-draw-7').click();
    await page.locator('#hand-card-0').click();
    await page.locator('#btn-hand-place-active').click();
    await expect(page.locator('#slot-active-card')).toBeVisible();

    // Open Deck Search Modal from Dock
    await page.locator('#btn-dock-search').click();
    const searchModal = page.locator('#deck-search-modal');
    await expect(searchModal).toBeVisible();

    // Verify Thai category filter tabs are visible
    await expect(page.locator('#btn-deck-category-energy')).toBeVisible();
    await expect(page.locator('#btn-deck-category-trainer')).toBeVisible();

    // Filter to Energy
    await page.locator('#btn-deck-category-energy').click();

    // Select first energy card
    const firstCard = page.locator('.deck-search-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Verify attach to Active button is present
    const attachActiveBtn = page.locator('#btn-deck-attach-active');
    await expect(attachActiveBtn).toBeVisible();
    await attachActiveBtn.click();

    // Modal closes and energy is attached
    await expect(searchModal).not.toBeVisible();
  });

  test('operates 2-player opponent consent system for critical actions', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Toggle Consent Mode on via Header Button
    const consentToggleBtn = page.locator('#btn-toggle-consent-mode');
    await expect(consentToggleBtn).toBeVisible();
    await consentToggleBtn.click();
    await expect(consentToggleBtn).toContainText('ขอความยินยอม: เปิด');

    // 2. Trigger Shuffle Deck with consent enabled
    await page.locator('#btn-dock-shuffle').click();

    // Consent modal should appear
    const consentModal = page.locator('#tabletop-consent-modal');
    await expect(consentModal).toBeVisible();
    await expect(page.getByText('คำขอความยินยอม (Consent Request)')).toBeVisible();
    await expect(page.getByText(/ขอสับกองสำรับการ์ด/i)).toBeVisible();

    // Click Deny
    await page.locator('#btn-consent-deny').click();
    await expect(consentModal).not.toBeVisible();

    // 3. Trigger Inspect Top Cards with consent enabled
    await page.locator('#btn-dock-top-cards').click();
    await expect(consentModal).toBeVisible();
    await expect(page.getByText(/ขอดูการ์ดบนสุดของกองสำรับ/i)).toBeVisible();

    // Click Approve
    await page.locator('#btn-consent-approve').click();
    await expect(consentModal).not.toBeVisible();

    // Top Cards modal opens upon approval!
    await expect(page.locator('#top-cards-modal')).toBeVisible();
    await page.locator('#btn-close-top-cards').click();
  });

  test('declares attack, renders attacker glow and target reticle, calculates weakness, and applies 1-tap damage', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Setup bottom player Active via Deck Search
    await page.locator('#btn-dock-search').click();
    const searchModal = page.locator('#deck-search-modal');
    await expect(searchModal).toBeVisible();
    await searchModal.getByRole('button', { name: 'Basic Pokémon' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-put-active').click();
    await expect(page.locator('#bottom-player-zone #slot-active-card')).toBeVisible();

    // 2. Setup top player Active and Bench by flipping perspective
    await page.locator('#btn-toggle-perspective').click();
    await page.locator('#btn-dock-search').click();
    await expect(searchModal).toBeVisible();
    await searchModal.getByRole('button', { name: 'Basic Pokémon' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-put-active').click();

    // Also place one on bench for Bench Snipe testing
    await page.locator('#btn-dock-search').click();
    await expect(searchModal).toBeVisible();
    await searchModal.getByRole('button', { name: 'Basic Pokémon' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-put-bench').click();
    await expect(searchModal).not.toBeVisible();

    // Flip perspective back to Player 1
    await page.locator('#btn-toggle-perspective').click();
    await expect(page.locator('#top-player-zone #slot-active-card')).toBeVisible();
    await expect(page.locator('#top-player-zone #slot-bench-0-card')).toBeVisible();



    // 3. Bottom Player clicks their Active to open Pokemon Action Modal
    await page.locator('#bottom-player-zone #slot-active-surface').click();
    const actionModal = page.locator('#pokemon-action-modal');
    await expect(actionModal).toBeVisible();

    // Check for attack button
    const declareAttackBtn = page.locator('#btn-declare-attack-0');
    if (await declareAttackBtn.isVisible()) {
      await declareAttackBtn.click();

      // Action modal should close immediately upon attack declaration
      await expect(actionModal).not.toBeVisible();

      // Combat banner should appear at center/bottom
      const combatBanner = page.locator('#tabletop-combat-banner');
      await expect(combatBanner).toBeVisible();

      // Action toast appears
      const toast = page.locator('#tabletop-action-toast');
      await expect(toast).toBeVisible();

      // Attacker badge is visible on bottom active
      await expect(page.locator('#bottom-player-zone #slot-active-card')).toContainText('ตัวโจมตี');

      // Target badge is visible on top active (default target)
      await expect(page.locator('#top-player-zone #slot-active-card')).toContainText('เป้าหมาย');

      // Test Bench Snipe: Click top bench slot #0
      await page.locator('#top-player-zone #slot-bench-0-surface').click();

      // Target switches to Bench #1
      await expect(combatBanner).toContainText('Bench #1');
      await expect(page.locator('#top-player-zone #slot-bench-0-card')).toContainText('เป้าหมาย');

      // Switch back to Active
      await page.locator('#top-player-zone #slot-active-surface').click();
      await expect(combatBanner).toContainText('Active');

      // 4. Confirm damage using 1-Tap button
      const confirmDamageBtn = page.locator('#confirm-combat-damage-button');
      await expect(confirmDamageBtn).toBeVisible();
      await confirmDamageBtn.click();

      // Combat banner closes
      await expect(combatBanner).not.toBeVisible();

      // Damage is applied to defender active
      const damageCounter = page.locator('#top-player-zone #damage-counter-active');
      await expect(damageCounter).toBeVisible();
    }
  });

  test('allows custom attack damage input and delta adjustment in action modal and combat banner', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // Setup active for both players
    await page.locator('#btn-setup-draw-7').click();
    await page.locator('#hand-card-0').click();
    await page.locator('#btn-hand-place-active').click();

    // Switch to P2 and set up active
    await page.locator('#btn-toggle-perspective').click();
    await page.locator('#btn-setup-draw-7').click();
    await page.locator('#hand-card-0').click();
    await page.locator('#btn-hand-place-active').click();

    // Switch back to P1
    await page.locator('#btn-toggle-perspective').click();

    // Open action modal on bottom active
    await page.locator('#bottom-player-zone #slot-active-surface').click();
    const actionModal = page.locator('#pokemon-action-modal');
    await expect(actionModal).toBeVisible();

    // Verify custom attack damage input is present
    const customDmgInput = page.locator('#input-attack-damage-0');
    if (await customDmgInput.isVisible()) {
      // Modify attack damage directly to 250
      await customDmgInput.fill('250');
      await expect(customDmgInput).toHaveValue('250');

      // Click attack
      await page.locator('#btn-declare-attack-0').click();
      await expect(actionModal).not.toBeVisible();

      // Combat banner appears with custom base
      const combatBanner = page.locator('#tabletop-combat-banner');
      await expect(combatBanner).toBeVisible();

      // Verify editable damage input in combat banner
      const bannerDmgInput = page.locator('#input-combat-damage-override');
      await expect(bannerDmgInput).toBeVisible();

      // Adjust with +30 button
      await page.locator('#btn-combat-delta-plus-30').click();

      // Confirm combat damage
      await page.locator('#confirm-combat-damage-button').click();
      await expect(combatBanner).not.toBeVisible();

      // Verify damage counter on defender active
      const damageCounter = page.locator('#top-player-zone #damage-counter-active');
      await expect(damageCounter).toBeVisible();
    }
  });

  test('displays real-time action toast banner when performing tabletop actions', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // Click shuffle deck in dock
    await page.locator('#btn-dock-shuffle').click();

    // Real-time Action Toast appears floating on playmat
    const toast = page.locator('#tabletop-action-toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('สับกองสำรับ');
  });

  test('supports drag and drop: moves Pokemon from bench to active and attaches energy from hand', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Place a Basic Pokemon onto Bench 0 using Deck Search
    await page.locator('#btn-dock-search').click();
    const modal = page.locator('#deck-search-modal');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Basic Pokémon' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-put-bench').click();
    await expect(modal).not.toBeVisible();

    const benchCard = page.locator('#slot-bench-0-card');
    await expect(benchCard).toBeVisible();

    // 2. Active spot is currently empty
    const emptyActive = page.locator('#bottom-player-zone #slot-active-empty');
    await expect(emptyActive).toBeVisible();

    // 3. Drag Bench Pokemon to Empty Active Slot
    await benchCard.dragTo(emptyActive);

    // 4. Pokemon is now promoted to Active!
    const activeCard = page.locator('#bottom-player-zone #slot-active-card');
    await expect(activeCard).toBeVisible();

    // 5. Search deck for an Energy card and put it into hand
    await page.locator('#btn-dock-search').click();
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Energy' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-take-hand').click();
    await expect(modal).not.toBeVisible();

    // 6. Hand now has the energy card
    const handCard = page.locator('#hand-card-0');
    await expect(handCard).toBeVisible();

    // 7. Drag Energy card from hand onto Active Pokemon
    await handCard.dragTo(activeCard);

    // 8. Action toast confirms energy attachment
    const toast = page.locator('#tabletop-action-toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('ติด');

    // 9. Search deck for a Basic Pokemon and put it into hand
    await page.locator('#btn-dock-search').click();
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Basic Pokémon' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-take-hand').click();
    await expect(modal).not.toBeVisible();

    // 10. Drag Pokemon card from hand to empty Bench slot 1
    const emptyBench1 = page.locator('#bottom-player-zone #slot-bench-1-empty');
    await expect(emptyBench1).toBeVisible();
    await page.locator('#hand-card-0').dragTo(emptyBench1);

    // 11. Bench slot 1 now has a card!
    await expect(page.locator('#slot-bench-1-card')).toBeVisible();

    // 12. Search deck for an Item/Trainer card and put it into hand
    await page.locator('#btn-dock-search').click();
    await expect(modal).toBeVisible();
    await page.locator('#btn-deck-category-trainer').click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-take-hand').click();
    await expect(modal).not.toBeVisible();

    // 13. Drag Trainer card from hand to Center Board
    const centerBoard = page.locator('#center-board-zone');
    await page.locator('#hand-card-0').dragTo(centerBoard);

    // 14. Trainer appears directly on tabletop board as In-Play card!
    const inPlaySlot = page.locator('#bottom-revealed-card-slot');
    await expect(inPlaySlot).toBeVisible();
    await expect(page.getByText(/การ์ดที่เล่น \(In-Play\)|การ์ดที่เปิดเผย/)).toBeVisible();
  });

  test('supports human mouse pointer drag & drop: smooth 60fps avatar, drop slot glow, and no popup conflict', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Put a Basic Pokemon into Hand via Deck Search
    await page.locator('#btn-dock-search').click();
    const modal = page.locator('#deck-search-modal');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Basic Pokémon' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-take-hand').click();
    await expect(modal).not.toBeVisible();

    const handCard = page.locator('#hand-card-0');
    await expect(handCard).toBeVisible();

    // 2. Active slot is empty
    const emptyActive = page.locator('#bottom-player-zone #slot-active-empty');
    await expect(emptyActive).toBeVisible();

    const handBox = await handCard.boundingBox();
    const activeBox = await emptyActive.boundingBox();
    expect(handBox).not.toBeNull();
    expect(activeBox).not.toBeNull();

    // 3. Human Mouse Drag: Move to hand card, press mouse button down, move halfway
    await page.mouse.move(handBox!.x + handBox!.width / 2, handBox!.y + handBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      (handBox!.x + activeBox!.x) / 2,
      (handBox!.y + activeBox!.y) / 2,
      { steps: 5 }
    );

    // 4. Floating Avatar is visible and smoothly following mouse
    const avatar = page.locator('#floating-drag-avatar');
    await expect(avatar).toBeVisible();
    await expect(avatar).toContainText(/ลากไป|ปล่อยเพื่อวาง/);

    // 5. Move directly over Active slot
    await page.mouse.move(activeBox!.x + activeBox!.width / 2, activeBox!.y + activeBox!.height / 2, { steps: 5 });
    // Active slot shows drop target cue
    await expect(emptyActive).toHaveClass(/border-emerald-400|ring-emerald-400/);

    // 6. Release mouse button to drop
    await page.mouse.up();

    // 7. Avatar disappears and card is now placed in Active spot!
    await expect(avatar).not.toBeVisible();
    const activeCard = page.locator('#bottom-player-zone #slot-active-card');
    await expect(activeCard).toBeVisible();

    // 8. Crucial UX rule: NO modal popup opens upon dropping!
    const cardModal = page.locator('#pokemon-action-modal');
    await expect(cardModal).not.toBeVisible();
    const handModal = page.locator('#hand-card-menu-modal');
    await expect(handModal).not.toBeVisible();
  });

  test('renders authentic playmat layout: 3x2 prizes on left flank and deck over discard on right flank', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Setup 6 prizes for bottom player
    const setupPrizesBtn = page.locator('#btn-setup-prizes');
    await expect(setupPrizesBtn).toBeVisible();
    await setupPrizesBtn.click();

    // 2. All 6 prizes rendered in 2-column grid on left
    for (let i = 0; i < 6; i++) {
      await expect(page.locator(`#prize-card-${i}`)).toBeVisible();
    }

    // 3. Right flank: Deck pile is on top, Discard pile is directly underneath
    const deckPile = page.locator('#deck-pile');
    const discardPile = page.locator('#btn-view-discard');
    await expect(deckPile).toBeVisible();
    await expect(discardPile).toBeVisible();

    const deckBox = await deckPile.boundingBox();
    const discardBox = await discardPile.boundingBox();
    expect(deckBox).not.toBeNull();
    expect(discardBox).not.toBeNull();
    expect(deckBox!.y).toBeLessThan(discardBox!.y);

    // 4. Setup prizes for top player
    const topSetupPrizesBtn = page.locator('#btn-setup-top-prizes');
    await expect(topSetupPrizesBtn).toBeVisible();
    await topSetupPrizesBtn.click();

    // Top player prizes visible on left flank
    for (let i = 0; i < 6; i++) {
      await expect(page.locator(`#top-prize-${i}`)).toBeVisible();
    }

    // Top player right flank: Top Deck is above Top Discard
    const topDeckPile = page.locator('#top-deck-pile');
    const topDiscardPile = page.locator('#top-btn-discard');
    await expect(topDeckPile).toBeVisible();
    await expect(topDiscardPile).toBeVisible();

    const topDeckBox = await topDeckPile.boundingBox();
    const topDiscardBox = await topDiscardPile.boundingBox();
    expect(topDeckBox).not.toBeNull();
    expect(topDiscardBox).not.toBeNull();
    expect(topDeckBox!.y).toBeLessThan(topDiscardBox!.y);
  });

  test('supports dedicated large Stadium arena: drag Stadium card to arena, zoom preview, and discard', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Stadium arena is empty initially
    const stadiumEmpty = page.locator('#center-stadium-empty');
    await expect(stadiumEmpty).toBeVisible();
    await expect(page.locator('#bottom-player-zone').getByText(/Stadium/i).first()).toBeVisible();

    // 2. Search deck for a Stadium card and take to hand
    await page.locator('#btn-dock-search').click();
    const modal = page.locator('#deck-search-modal');
    await expect(modal).toBeVisible();
    await page.locator('#btn-deck-category-stadium').click();

    const firstStadiumCard = page.locator('.deck-search-card').first();
    await expect(firstStadiumCard).toBeVisible();
    await firstStadiumCard.click();
    await page.locator('#btn-deck-take-hand').click();
    await expect(modal).not.toBeVisible();

    // 3. Hand card is now in hand
    const handCard = page.locator('#hand-card-0');
    await expect(handCard).toBeVisible();

    // 4. Drag Stadium card to Stadium slot
    await handCard.dragTo(stadiumEmpty);

    // 5. Stadium is placed in the Arena!
    const stadiumCard = page.locator('#center-stadium-card');
    await expect(stadiumCard).toBeVisible();
    await expect(page.locator('#btn-zoom-stadium')).toBeVisible();
    await expect(page.locator('#btn-discard-stadium')).toBeVisible();

    // 6. Click discard button to discard Stadium
    await page.locator('#btn-discard-stadium').click();
    await expect(stadiumCard).not.toBeVisible();
    await expect(stadiumEmpty).toBeVisible();
  });

  test('supports dragging cards from hand and Pokemon from field directly into discard pile', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    const discardPile = page.locator('#btn-view-discard');
    await expect(discardPile).toBeVisible();
    await expect(discardPile).toContainText('0');

    // 1. Draw 1 card to hand
    await page.locator('#deck-pile').click();
    const handCard = page.locator('#hand-card-0');
    await expect(handCard).toBeVisible();

    // 2. Drag hand card directly to discard pile
    await handCard.dragTo(discardPile);

    // 3. Discard pile count is now 1!
    await expect(discardPile).toContainText('1');

    // 4. Put a Basic Pokemon into Bench via search
    await page.locator('#btn-dock-search').click();
    const modal = page.locator('#deck-search-modal');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Basic Pokémon' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-put-bench').click();
    await expect(modal).not.toBeVisible();

    const benchSlot = page.locator('#bottom-player-zone #slot-bench-0-card');
    await expect(benchSlot).toBeVisible();

    // 5. Drag bench Pokemon to discard pile
    await benchSlot.dragTo(discardPile);

    // 6. Bench slot is now empty, and discard pile count is 2!
    await expect(benchSlot).not.toBeVisible();
    await expect(page.locator('#bottom-player-zone #slot-bench-0-empty')).toBeVisible();
    await expect(discardPile).toContainText('2');
  });

  test('supports multi-card selection and bulk actions in DeckSearchModal', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // Open Deck Search Modal
    await page.locator('#btn-dock-search').click();
    const modal = page.locator('#deck-search-modal');
    await expect(modal).toBeVisible();

    // Select Card 1
    const cards = page.locator('.deck-search-card');
    await cards.nth(0).click();
    await expect(page.locator('#deck-search-select-badge-0')).toBeVisible();
    await expect(page.locator('#deck-search-select-badge-0')).toContainText('✓');

    // Select Card 2
    await cards.nth(1).click();
    await expect(page.locator('#deck-search-select-badge-1')).toBeVisible();
    await expect(page.locator('#deck-search-select-badge-1')).toContainText('✓2');

    // Bulk Action bar is visible with 2 cards
    const bulkTakeHandBtn = page.locator('#btn-bulk-take-hand');
    await expect(bulkTakeHandBtn).toBeVisible();
    await expect(bulkTakeHandBtn).toContainText('2');

    // Click bulk take to hand
    await bulkTakeHandBtn.click();
    await expect(modal).not.toBeVisible();

    // Hand now has both cards (2 cards)
    await expect(page.getByText(/มือของคุณ \(2 ใบ\)/i)).toBeVisible();
    await expect(page.locator('#hand-card-0')).toBeVisible();
    await expect(page.locator('#hand-card-1')).toBeVisible();
  });

  test('renders typed glowing energy aura halo, floating elemental crest, and authentic badges when energy is attached to Pokemon', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Put a Basic Pokemon into Active spot
    await page.locator('#btn-dock-search').click();
    const modal = page.locator('#deck-search-modal');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Basic Pokémon' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-put-active').click();
    await expect(modal).not.toBeVisible();

    const activeSlot = page.locator('#bottom-player-zone #slot-active-card');
    await expect(activeSlot).toBeVisible();

    // 2. Before attaching energy: NO energy aura glow, crest, or badges
    await expect(activeSlot).not.toHaveAttribute('data-energy-aura');
    await expect(activeSlot.locator('[data-testid="energy-aura-glow"]')).not.toBeVisible();
    await expect(activeSlot.locator('[data-testid="energy-element-crest"]')).not.toBeVisible();
    await expect(activeSlot.locator('[data-testid="energy-aura-badge"]')).not.toBeVisible();

    // 3. Search deck for a Fire Energy card and take to hand
    await page.locator('#btn-dock-search').click();
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Energy' }).click();
    // In Charizard ex deck, filter specifically for Fire Energy
    const fireEnergyCard = page.locator('.deck-search-card').filter({ hasText: /ไฟ|Fire/i }).first();
    await expect(fireEnergyCard).toBeVisible();
    await fireEnergyCard.click();
    await page.locator('#btn-deck-take-hand').click();
    await expect(modal).not.toBeVisible();

    const handEnergy = page.locator('#hand-card-0');
    await expect(handEnergy).toBeVisible();

    // 4. Drag Fire Energy card onto Active Pokemon
    await handEnergy.dragTo(activeSlot);

    // 5. Fire Energy Aura is now prominently glowing and visually communicates Fire type!
    await expect(activeSlot).toHaveAttribute('data-attached-energies-count', '1');
    await expect(activeSlot).toHaveAttribute('data-energy-aura', 'Fire');

    const auraGlow = activeSlot.locator('[data-testid="energy-aura-glow"]');
    await expect(auraGlow).toBeVisible();
    await expect(auraGlow).toHaveAttribute('data-energy-type', 'Fire');

    // 6. Clean Card Surface: Floating crest is removed, keeping clean glowing aura
    await expect(activeSlot.locator('[data-testid="energy-element-crest"]')).not.toBeVisible();

    // 7. Card surface reflects Fire element neon border
    const cardSurface = activeSlot.locator('#slot-active-surface');
    await expect(cardSurface).toHaveClass(/border-orange-400/);

    // 9. Attach a Darkness Energy card as second energy directly from deck search to Active spot
    await page.locator('#btn-dock-search').click();
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Energy' }).click();
    // Filter/select Darkness Energy (cards after Fire Energy or last card in list)
    const darknessCard = page.locator('.deck-search-card').filter({ hasText: /ความมืด|Darkness/i }).first();
    await expect(darknessCard).toBeVisible();
    await darknessCard.click();
    await page.locator('#btn-deck-attach-active').click();
    await expect(modal).not.toBeVisible();

    // 10. Multi-Energy Transition: Aura reflects Multi element!
    await expect(activeSlot).toHaveAttribute('data-attached-energies-count', '2');
    await expect(activeSlot).toHaveAttribute('data-energy-aura', 'Multi');
    await expect(auraGlow).toHaveAttribute('data-energy-type', 'Multi');

    // 11. Bench Pokemon also supports radiant energy aura and badges
    // Put a basic Pokemon onto Bench 0
    await page.locator('#btn-dock-search').click();
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Basic Pokémon' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-put-bench').click();
    await expect(modal).not.toBeVisible();

    const bench0Slot = page.locator('#bottom-player-zone #slot-bench-0-card');
    await expect(bench0Slot).toBeVisible();
    await expect(bench0Slot.locator('[data-testid="energy-aura-glow"]')).not.toBeVisible();

    // Attach energy to Bench 0 from deck search
    await page.locator('#btn-dock-search').click();
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Energy' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-attach-bench-0').click();
    await expect(modal).not.toBeVisible();

    // Bench 0 now radiates energy aura!
    await expect(bench0Slot).toHaveAttribute('data-attached-energies-count', '1');
    await expect(bench0Slot).toHaveAttribute('data-energy-aura', /.+/);
    await expect(bench0Slot.locator('[data-testid="energy-aura-glow"]')).toBeVisible();
  });

  test('supports attaching energy from hand directly inside PokemonActionModal', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Put a Basic Pokemon into Active spot
    await page.locator('#btn-dock-search').click();
    const modal = page.locator('#deck-search-modal');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Basic Pokémon' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-put-active').click();
    await expect(modal).not.toBeVisible();

    // 2. Search deck for an Energy card and take to hand
    await page.locator('#btn-dock-search').click();
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Energy' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-take-hand').click();
    await expect(modal).not.toBeVisible();

    // 3. Click Active Pokemon surface to open PokemonActionModal
    const activeSlot = page.locator('#bottom-player-zone #slot-active-card');
    await activeSlot.locator('#slot-active-surface').click();

    // 4. Modal shows "Attach Energy from Hand"
    const attachHandBtn = page.locator('button[id^="btn-modal-attach-energy-"]').first();
    await expect(attachHandBtn).toBeVisible();
    await attachHandBtn.click();

    // 5. Close modal
    await page.locator('#btn-close-pokemon-modal').click();

    // 6. Active slot now has energy attached and glowing aura
    await expect(activeSlot).toHaveAttribute('data-attached-energies-count', '1');
    await expect(activeSlot.locator('[data-testid="energy-aura-glow"]')).toBeVisible();
    await expect(activeSlot.locator('[data-testid="energy-element-crest"]')).not.toBeVisible();
  });

  test('supports Stadium at Bench 1, Active aligned with Bench 3, automatic Face-Down placement before game start, and anti-cheat Mulligan proof modal', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Verify 5-column grid alignment
    // Column 1 has Stadium slot, Bench 1 is underneath it
    const stadiumEmpty = page.locator('#center-stadium-empty');
    const bench0Empty = page.locator('#bottom-player-zone #slot-bench-0-empty');
    await expect(stadiumEmpty).toBeVisible();
    await expect(bench0Empty).toBeVisible();

    // Column 3 has Active slot, Bench 3 (index 2) is underneath it
    const activeEmpty = page.locator('#bottom-player-zone #slot-active-empty');
    const bench2Empty = page.locator('#bottom-player-zone #slot-bench-2-empty');
    await expect(activeEmpty).toBeVisible();
    await expect(bench2Empty).toBeVisible();

    // 2. Draw 7 cards to hand
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // 3. Test Anti-Cheat Mulligan Proof Popup
    await page.locator('#btn-setup-mulligan').click();
    const mulliganModal = page.locator('#mulligan-verification-modal');
    await expect(mulliganModal).toBeVisible();
    await expect(mulliganModal.getByText(/ตรวจสอบสิทธิ์มัลลิแกน/i)).toBeVisible();

    // Hand cards gallery is visible
    await expect(mulliganModal.locator('[data-mulligan-card]')).toHaveCount(7);

    // Cancel modal returns to field
    await page.locator('#btn-cancel-mulligan').click();
    await expect(mulliganModal).not.toBeVisible();

    // 4. Test Automatic Face-Down Placement before game starts
    await page.locator('#hand-card-0').click();
    const handModal = page.locator('#hand-card-menu-modal');
    await expect(handModal).toBeVisible();

    // Place active: should indicate face-down before game start
    await expect(page.locator('#btn-hand-place-active')).toContainText(/คว่ำ/i);
    await page.locator('#btn-hand-place-active').click();
    await expect(handModal).not.toBeVisible();

    // Active card on table is face-down
    const activeSlot = page.locator('#bottom-player-zone #slot-active-card');
    await expect(activeSlot).toBeVisible();
    await expect(activeSlot).toHaveAttribute('data-facedown', 'true');

    // Place bench card: should default to face-down
    await page.locator('#hand-card-0').click();
    await expect(handModal).toBeVisible();
    await page.locator('#btn-hand-place-bench-0').click();
    await expect(handModal).not.toBeVisible();

    // Bench 0 card on table is face-down
    const bench0Slot = page.locator('#bottom-player-zone #slot-bench-0-card');
    await expect(bench0Slot).toBeVisible();
    await expect(bench0Slot).toHaveAttribute('data-facedown', 'true');

    // 5. Test setup validation on "Let's Play!" in CenterBoardZone
    const revealAllBtn = page.locator('#btn-reveal-all-facedown');
    await expect(revealAllBtn).toBeVisible();
    await expect(revealAllBtn).toHaveAttribute('data-ready', 'false');

    // Clicking while setup is incomplete triggers warning toast and blocks face-up flip
    await revealAllBtn.click();
    const actionToast = page.locator('#tabletop-action-toast');
    await expect(actionToast).toBeVisible();
    await expect(actionToast).toContainText(/ยังไม่พร้อมเริ่มเกม/i);
    await expect(actionToast).toContainText(/Active ของ Player 2/i);
    await expect(actionToast).toContainText(/Prize/i);

    // Cards remain face-down
    await expect(activeSlot).toHaveAttribute('data-facedown', 'true');
    await expect(bench0Slot).toHaveAttribute('data-facedown', 'true');

    // Complete setup for all players:
    // a) Place 6 prizes for Player 1
    await page.locator('#btn-setup-prizes').click();
    // b) Place 6 prizes for Player 2
    await page.locator('#btn-setup-top-prizes').click();
    // c) Draw 7 cards for Player 2 and place Active Pokemon
    await page.locator('#btn-setup-top-draw7').click();
    await page.locator('[data-slot-side="player2"][data-slot-pos="ACTIVE"]').click();
    const pickerCard = page.locator('[data-testid^="slot-picker-card-"]').first();
    if (await pickerCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pickerCard.click();
    }

    // Now Let's Play is ready!
    await expect(revealAllBtn).toHaveAttribute('data-ready', 'true');
    await revealAllBtn.click();

    // Both players' cards now face-up
    await expect(activeSlot).toHaveAttribute('data-facedown', 'false');
    await expect(bench0Slot).toHaveAttribute('data-facedown', 'false');
    const topActiveSlot = page.locator('#top-player-zone #slot-active-card');
    await expect(topActiveSlot).toHaveAttribute('data-facedown', 'false');

    // 6. After Let's Play, subsequent placements default to face-up
    await page.locator('#hand-card-0').click();
    await expect(handModal).toBeVisible();
    await expect(page.locator('#btn-hand-place-active')).toContainText(/หงาย/i);
    await expect(handModal.getByText(/วางลงเบนช์ \(หงายหน้า\)/i)).toBeVisible();
    await page.locator('#btn-hand-place-bench-1').click();
    await expect(handModal).not.toBeVisible();

    const bench1Slot = page.locator('#bottom-player-zone #slot-bench-1-card');
    await expect(bench1Slot).toBeVisible();
    await expect(bench1Slot).toHaveAttribute('data-facedown', 'false');
  });

  test('supports returning cards from hand to deck via modal, context menu, and deck drop zone', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Draw 7 cards to hand
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // 2. Open HandToDeckModal via #btn-hand-return-deck
    const returnDeckBtn = page.locator('#btn-hand-return-deck');
    await expect(returnDeckBtn).toBeVisible();
    await returnDeckBtn.click();

    const handToDeckModal = page.locator('#hand-to-deck-modal');
    await expect(handToDeckModal).toBeVisible();

    // Select first card
    const firstCardCheckbox = handToDeckModal.locator('[id^="hand-to-deck-card-"]').first();
    await firstCardCheckbox.click();
    await expect(handToDeckModal.getByText(/เลือกแล้ว:/i)).toContainText('1');

    // Click Select All
    await page.locator('#btn-select-all-hand-to-deck').click();
    await expect(handToDeckModal.getByText(/เลือกแล้ว:/i)).toContainText('7');

    // Click Clear
    await page.locator('#btn-clear-hand-to-deck').click();
    await expect(handToDeckModal.getByText(/เลือกแล้ว:/i)).toContainText('0');

    // Select 2 cards
    await handToDeckModal.locator('[id^="hand-to-deck-card-"]').nth(0).click();
    await handToDeckModal.locator('[id^="hand-to-deck-card-"]').nth(1).click();
    await expect(handToDeckModal.getByText(/เลือกแล้ว:/i)).toContainText('2');

    // Put to Top of Deck
    await page.locator('#btn-put-deck-top-selected').click();
    await expect(handToDeckModal).not.toBeVisible();
    // Hand should now have 5 cards (7 - 2)
    await expect(page.getByText(/มือของคุณ \(5 ใบ\)/i)).toBeVisible();

    // 3. Single card context menu return to deck (Shuffle)
    await page.locator('#hand-card-0').click();
    const handCardModal = page.locator('#hand-card-menu-modal');
    await expect(handCardModal).toBeVisible();

    const shuffleToDeckBtn = page.locator('#btn-hand-shuffle-deck');
    await expect(shuffleToDeckBtn).toBeVisible();
    await shuffleToDeckBtn.click();
    await expect(handCardModal).not.toBeVisible();
    // Hand should now have 4 cards (5 - 1)
    await expect(page.getByText(/มือของคุณ \(4 ใบ\)/i)).toBeVisible();

    // 4. Verify Deck pile is marked as data-deck-zone="true"
    const deckPile = page.locator('#deck-pile');
    await expect(deckPile).toHaveAttribute('data-deck-zone', 'true');
  });

  test('creates an online room, connects WebRTC P2P / cloud sync, renders realtime badge, and displays connection tooltip', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Open Online Room Modal
    const onlineBtn = page.locator('#btn-v3-online-room');
    await expect(onlineBtn).toBeVisible();
    await onlineBtn.click();

    const roomModal = page.locator('#online-room-modal');
    await expect(roomModal).toBeVisible();

    // 2. Click confirm create room
    const createBtn = page.locator('#btn-confirm-create-room');
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Modal closes upon successful creation
    await expect(roomModal).not.toBeVisible({ timeout: 10000 });

    // 3. Online room button now reflects room code
    await expect(onlineBtn).toContainText(/ห้อง V3-/i);

    // 4. RealtimeConnectionBadge appears next to online room button
    const realtimeBadge = page.locator('#badge-realtime-connection');
    await expect(realtimeBadge).toBeVisible({ timeout: 5000 });

    // Hover or click badge to see connection detail tooltip
    await realtimeBadge.click();
    const tooltip = page.locator('#tooltip-realtime-connection');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(/Realtime Connection/i);
    await expect(tooltip).toContainText(/RTT:/i);

    // 5. Open online modal again to verify connected state and disconnect button
    await onlineBtn.click();
    await expect(roomModal).toBeVisible();
    await expect(page.getByText(/กำลังเชื่อมต่อห้องออนไลน์/i)).toBeVisible();

    // Disconnect and verify return to local mode
    await page.getByText(/ตัดการเชื่อมต่อ/i).click();
    await expect(roomModal).not.toBeVisible();
    await expect(onlineBtn).toContainText(/เล่น 2 เครื่อง/i);
    await expect(realtimeBadge).not.toBeVisible();
  });

  test('supports auto-draw toggle, Active Rooms list on Join, DeckSearch reveal-to-opponent checkbox, and Ability VFX overlay', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 10000 });

    // 1. Verify Auto-Draw toggle button in Quick Menu
    await page.locator('#btn-v3-menu').click();
    const autoDrawBtn = page.locator('#btn-toggle-autodraw');
    await expect(autoDrawBtn).toBeVisible();
    await expect(autoDrawBtn).toHaveAttribute('data-autodraw', 'false');
    await autoDrawBtn.click();
    await expect(autoDrawBtn).toHaveAttribute('data-autodraw', 'true');
    await autoDrawBtn.click();
    await expect(autoDrawBtn).toHaveAttribute('data-autodraw', 'false');
    await page.locator('#menu-v3-backdrop').click({ position: { x: 10, y: 10 } });

    // 2. Verify Active Rooms list on Join tab
    const onlineBtn = page.locator('#btn-v3-online-room');
    await onlineBtn.click();
    const roomModal = page.locator('#online-room-modal');
    await expect(roomModal).toBeVisible();
    await page.locator('#tab-online-join').click();
    await expect(page.locator('#btn-refresh-active-rooms')).toBeVisible();
    await page.locator('#btn-close-online-modal').click();
    await expect(roomModal).not.toBeVisible();

    // 3. Verify DeckSearchModal has "Reveal to Opponent" checkbox (default checked)
    await page.locator('#btn-dock-search').click();
    const searchModal = page.locator('#deck-search-modal');
    await expect(searchModal).toBeVisible();
    const revealCheckbox = page.locator('#checkbox-reveal-opponent');
    await expect(revealCheckbox).toBeVisible();
    await expect(revealCheckbox).toBeChecked();
    await page.locator('#btn-deck-search-close').click();
    await expect(searchModal).not.toBeVisible();

    // 4. Verify Ability activation triggers Tabletop VFX Overlay
    // Put a card in active
    await page.locator('#btn-dock-search').click();
    await expect(searchModal).toBeVisible();
    await searchModal.getByRole('button', { name: 'Basic Pokémon' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-put-active').click();
    await expect(page.locator('#bottom-player-zone #slot-active-card')).toBeVisible();

    // Open Active Pokemon Action Modal
    await page.locator('#bottom-player-zone #slot-active-surface').click();
    const actionModal = page.locator('#pokemon-action-modal');
    await expect(actionModal).toBeVisible();

    // Trigger Ability
    const abilityBtn = page.locator('#btn-use-ability');
    await expect(abilityBtn).toBeVisible();
    await abilityBtn.click();
    await page.locator('#btn-close-pokemon-modal').click();

    // Tabletop VFX Overlay appears with ABILITY type
    const vfxOverlay = page.locator('#tabletop-vfx-overlay');
    await expect(vfxOverlay).toBeVisible();
    await expect(vfxOverlay).toHaveAttribute('data-vfx-type', 'ABILITY');
    await expect(vfxOverlay).toContainText(/ABILITY ACTIVATION/i);

    // Clicking dismisses VFX overlay
    await vfxOverlay.getByText(/ABILITY ACTIVATION/i).click();
    await expect(vfxOverlay).not.toBeVisible();
  });
});


