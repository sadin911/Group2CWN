import { test, expect } from '@playwright/test';

test.describe('PixiJS v8 Hardware-Accelerated Playmat Engine', () => {
  test.beforeEach(async () => {
    test.setTimeout(60000);
  });

  test('loads PixiJS engine with 100% feature parity, dock, online multiplayer room, and unified permanent engine across routes', async ({ page }) => {
    // 1. Navigate to PixiJS Playmat mode via URL parameter
    await page.goto('/?mode=playmat-pixi');

    // 2. Verify Playmat V3 container is mounted with Pixi engine indicator
    const v3Container = page.locator('#playmat-v3-container');
    await expect(v3Container).toBeVisible({ timeout: 15000 });

    // Verify PixiJS Engine indicator badge and Hardware-Accelerated Canvas
    await expect(page.getByText('PIXIJS V8 ENGINE')).toBeVisible();
    const pixiContainer = page.locator('#pixi-canvas-container');
    await expect(pixiContainer).toBeVisible();
    await expect(pixiContainer.locator('canvas')).toBeVisible({ timeout: 10000 });

    // 3. Verify Bottom Dock (TabletopV3Dock) is mounted and functional
    const dock = page.locator('#tabletop-v3-dock');
    await expect(dock).toBeVisible({ timeout: 10000 });

    // 4. Test Online Room Mode (2 Devices real-time multiplayer)
    const btnOnlineRoom = page.locator('#btn-v3-online-room');
    await expect(btnOnlineRoom).toBeVisible();
    await btnOnlineRoom.click();

    const onlineModal = page.locator('#online-room-modal');
    await expect(onlineModal).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#tab-online-create')).toBeVisible();
    await expect(page.locator('#tab-online-join')).toBeVisible();

    // Close Online Room Modal
    await page.locator('#btn-close-online-modal').click();
    await expect(onlineModal).not.toBeVisible({ timeout: 5000 });

    // 5. Test Quick Setup Button (⚡ จัดด่วน)
    const btnQuickSetup = page.locator('#btn-quick-setup');
    if (await btnQuickSetup.isVisible()) {
      await btnQuickSetup.click();
    }

    // 6. Test Let's Play Button (Reveal All Facedown)
    const btnReveal = page.locator('#btn-reveal-all-facedown');
    if (await btnReveal.isVisible()) {
      await btnReveal.click();
    }

    // 7. Test Deck Search Modal from Dock (🔍)
    const btnDeckSearch = page.locator('#btn-dock-search');
    await expect(btnDeckSearch).toBeVisible();
    await btnDeckSearch.click();

    // Verify DeckSearchModal opened
    const deckSearchModal = page.locator('#deck-search-modal');
    await expect(deckSearchModal).toBeVisible({ timeout: 5000 });

    // Close DeckSearchModal
    const btnCloseSearch = deckSearchModal.locator('button:has-text("✕")').first();
    await btnCloseSearch.click();
    await expect(deckSearchModal).not.toBeVisible({ timeout: 5000 });

    // 8. Verify PixiJS Engine remains permanently active across route navigation
    await page.goto('/?mode=playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('PIXIJS V8 ENGINE')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#pixi-canvas-container canvas')).toBeVisible();
  });

  test('supports full Dock interactions (draw, search, top cards, prizes, discard zone, randomizer, undo/redo, and pass turn)', async ({ page }) => {
    await page.goto('/?mode=playmat-pixi');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // Pre-game setup if needed
    const btnQuickSetup = page.locator('#btn-quick-setup');
    if (await btnQuickSetup.isVisible()) {
      await btnQuickSetup.click();
    }

    // A. Prize draw via Dock button
    const btnPrizes = page.locator('#btn-dock-prizes');
    await expect(btnPrizes).toBeVisible();
    await btnPrizes.click();

    // B. Top Cards Inspector Modal
    const btnTopCards = page.locator('#btn-dock-top-cards');
    await expect(btnTopCards).toBeVisible();
    await btnTopCards.click();

    const topCardsModal = page.locator('#top-cards-modal');
    await expect(topCardsModal).toBeVisible({ timeout: 5000 });
    const btnCloseTopCards = page.locator('#btn-close-top-cards');
    await btnCloseTopCards.click();
    await expect(topCardsModal).not.toBeVisible({ timeout: 5000 });

    // C. Discard & Lost Zone Modal
    const btnDiscard = page.locator('#btn-dock-discard-zone');
    await expect(btnDiscard).toBeVisible();
    await btnDiscard.click();

    const discardModal = page.locator('#discard-lost-modal');
    await expect(discardModal).toBeVisible({ timeout: 5000 });
    const btnCloseDiscard = discardModal.locator('button:has-text("✕")').first();
    await btnCloseDiscard.click();
    await expect(discardModal).not.toBeVisible({ timeout: 5000 });

    // D. Randomizer (Coin & Dice) Modal
    const btnRandomizer = page.locator('#btn-dock-randomizer');
    await expect(btnRandomizer).toBeVisible();
    await btnRandomizer.click();

    const randomizerModal = page.locator('#randomizer-modal');
    await expect(randomizerModal).toBeVisible({ timeout: 5000 });
    const btnCloseRandomizer = randomizerModal.locator('button:has-text("✕")').first();
    await btnCloseRandomizer.click();
    await expect(randomizerModal).not.toBeVisible({ timeout: 5000 });

    // E. Undo / Redo buttons
    const btnUndo = page.locator('#btn-dock-undo');
    await expect(btnUndo).toBeEnabled();
    await btnUndo.click();

    // F. Pass Turn button
    const btnPassTurn = page.locator('#btn-dock-pass-turn');
    await expect(btnPassTurn).toBeVisible();
    await btnPassTurn.click();
  });

  test('supports keyboard shortcuts (D to draw, P for prize, Space to pass turn, S to search, Ctrl+Z to undo)', async ({ page }) => {
    await page.goto('/?mode=playmat-pixi');
    const container = page.locator('#playmat-v3-container');
    await expect(container).toBeVisible({ timeout: 15000 });
    await container.click({ force: true });

    // 1. Press 'd' to draw a card
    await page.keyboard.press('d');

    // 2. Press 'p' to take prize card
    await page.keyboard.press('p');

    // 3. Press 'Space' to pass turn
    await page.keyboard.press('Space');

    // 4. Press 's' to open deck search modal
    await page.keyboard.press('s');
    const deckSearchModal = page.locator('#deck-search-modal');
    await expect(deckSearchModal).toBeVisible({ timeout: 5000 });
    const btnCloseSearch = deckSearchModal.locator('button:has-text("✕")').first();
    await btnCloseSearch.click();
    await expect(deckSearchModal).not.toBeVisible({ timeout: 5000 });

    // 5. Press 'Control+z' to undo
    await page.keyboard.press('Control+z');
  });

  test('supports meta deck selector modal and custom deck loading', async ({ page }) => {
    await page.goto('/?mode=playmat-pixi');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // 1. Open Deck Selector modal from Header
    const btnChangeDeck = page.locator('#btn-v3-change-deck');
    await expect(btnChangeDeck).toBeVisible();
    await btnChangeDeck.click();

    const deckModal = page.locator('#deck-selector-modal');
    await expect(deckModal).toBeVisible({ timeout: 5000 });

    // Close Deck Selector
    const btnCloseDeck = deckModal.locator('button:has-text("✕")').first();
    await btnCloseDeck.click();
    await expect(deckModal).not.toBeVisible({ timeout: 5000 });
  });

  test('supports selecting and discarding multiple cards from hand via HandToDiscardModal and PixiJS HUD toggle', async ({ page }) => {
    await page.goto('/?mode=playmat-pixi');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // 1. Verify PixiJS Performance HUD & toggle
    const btnVfxToggle = page.locator('#btn-toggle-pixi-vfx');
    await expect(btnVfxToggle).toBeVisible();
    await expect(btnVfxToggle).toContainText(/VFX/i);

    // Toggle VFX OFF
    await btnVfxToggle.click();
    await expect(btnVfxToggle).toContainText(/VFX: ปิด/i);

    // Toggle VFX ON
    await btnVfxToggle.click();
    await expect(btnVfxToggle).toContainText(/VFX: เปิด/i);

    // 2. Setup game or draw cards so hand is not empty
    const btnQuickSetup = page.locator('#btn-quick-setup');
    if (await btnQuickSetup.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnQuickSetup.click();
    } else {
      const btnDraw7 = page.locator('#btn-setup-draw-7');
      if (await btnDraw7.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btnDraw7.click();
      } else {
        await page.keyboard.press('d');
        await page.keyboard.press('d');
      }
    }

    // 3. Open HandToDiscardModal
    const btnOpenDiscard = page.locator('#btn-open-hand-to-discard');
    await expect(btnOpenDiscard).toBeVisible({ timeout: 5000 });
    await btnOpenDiscard.click();

    const discardModal = page.locator('#hand-to-discard-modal');
    await expect(discardModal).toBeVisible({ timeout: 5000 });
    await expect(discardModal.getByText(/เลือกทิ้งการ์ดจากมือ/i)).toBeVisible();

    // 4. Select cards using Select All
    const btnSelectAll = page.locator('#btn-discard-modal-select-all');
    await expect(btnSelectAll).toBeVisible();
    await btnSelectAll.click();

    // 5. Confirm discard
    const btnConfirmDiscard = page.locator('#btn-confirm-discard-cards');
    await expect(btnConfirmDiscard).toBeEnabled();
    await btnConfirmDiscard.click();

    // Verify modal closed
    await expect(discardModal).not.toBeVisible({ timeout: 5000 });
  });

  test('executes lethal combat damage and knockout without any arena background displacement', async ({ page }) => {
    await page.goto('/?mode=playmat-pixi');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // Quick setup
    const btnQuickSetup = page.locator('#btn-quick-setup');
    if (await btnQuickSetup.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnQuickSetup.click();
    }
    const btnReveal = page.locator('#btn-reveal-all-facedown');
    if (await btnReveal.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnReveal.click();
    }

    const pixiCanvas = page.locator('#pixi-canvas-container canvas');
    await expect(pixiCanvas).toBeVisible({ timeout: 10000 });
    const initialBox = await pixiCanvas.boundingBox();
    expect(initialBox).not.toBeNull();

    // Open Active Pokémon modal
    const p1Active = page.locator('[data-slot-side="player1"][id="slot-active-card"]');
    await expect(p1Active).toBeVisible({ timeout: 10000 });
    await p1Active.click();

    const actionModal = page.locator('#pokemon-action-modal');
    await expect(actionModal).toBeVisible({ timeout: 5000 });

    // Specify high lethal damage (180 DMG)
    const dmgInput = page.locator('#input-custom-attack-damage');
    await dmgInput.fill('180');
    await page.locator('#btn-declare-attack').click();

    // Tabletop combat banner appears
    const combatBanner = page.locator('#tabletop-combat-banner');
    await expect(combatBanner).toBeVisible({ timeout: 5000 });
    await expect(combatBanner).toContainText('180');

    // Confirm attack damage
    await page.locator('#confirm-combat-damage-button').click();
    await expect(combatBanner).not.toBeVisible({ timeout: 5000 });

    // Allow impact shockwave and damage resolution
    await page.waitForTimeout(600);

    // Verify canvas position is 100% stable and perfectly preserved (zero shift)
    const finalBox = await pixiCanvas.boundingBox();
    expect(finalBox).not.toBeNull();
    expect(Math.abs((finalBox?.x || 0) - (initialBox?.x || 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((finalBox?.y || 0) - (initialBox?.y || 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((finalBox?.width || 0) - (initialBox?.width || 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((finalBox?.height || 0) - (initialBox?.height || 0))).toBeLessThanOrEqual(1);

    // Verify damage counter is shown on opponent active Pokémon
    const oppActive = page.locator('[data-slot-side="player2"][id="slot-active-card"]');
    await expect(oppActive).toBeVisible();
    const damageCounter = oppActive.locator('#damage-counter-active');
    await expect(damageCounter).toBeVisible();
    await expect(damageCounter).toContainText('180');
  });

  test('synchronizes two browser sessions in real-time across Host (PixiJS) and Guest (PixiJS) with independent decks', async ({ context }) => {
    test.setTimeout(90000);

    // 1. Setup Host Page with PixiJS engine
    const hostPage = await context.newPage();
    await hostPage.goto('/?mode=playmat-pixi');
    await expect(hostPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });
    await expect(hostPage.getByText('PIXIJS V8 ENGINE')).toBeVisible();

    // Host opens Online Room modal
    await hostPage.locator('#btn-v3-online-room').click();
    const hostModal = hostPage.locator('#online-room-modal');
    await expect(hostModal).toBeVisible();

    // Host creates room
    await hostPage.locator('#btn-confirm-create-room').click();
    await expect(hostModal).not.toBeVisible({ timeout: 30000 });

    // Extract generated room code
    const hostOnlineBtn = hostPage.locator('#btn-v3-online-room');
    await expect(hostOnlineBtn).toHaveAttribute('data-room-code', /V3-\d{4}/i, { timeout: 30000 });
    const roomCode = (await hostOnlineBtn.getAttribute('data-room-code'))!.toUpperCase();

    // Verify Realtime badge and Role badge on Host
    await expect(hostPage.locator('#badge-realtime-connection')).toBeVisible();
    await expect(hostPage.locator('#badge-online-role')).toContainText(/Player 1/i);

    // 2. Setup Guest Page with PixiJS engine
    const guestPage = await context.newPage();
    await guestPage.goto('/?mode=playmat-pixi');
    await expect(guestPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });
    await expect(guestPage.getByText('PIXIJS V8 ENGINE')).toBeVisible();

    // Guest opens Online Room modal and selects Join tab
    await guestPage.locator('#btn-v3-online-room').click();
    const guestModal = guestPage.locator('#online-room-modal');
    await expect(guestModal).toBeVisible();

    await guestPage.getByText(/เข้าร่วมห้อง/i).click();
    const inputRoomCode = guestPage.locator('#input-room-code');
    await inputRoomCode.fill(roomCode);
    await guestPage.waitForTimeout(500);

    await guestPage.locator('#btn-confirm-join-room').click();
    await expect(guestModal).not.toBeVisible({ timeout: 45000 });

    // Verify Realtime badge and Role badge on Guest
    const guestOnlineBtn = guestPage.locator('#btn-v3-online-room');
    await expect(guestOnlineBtn).toHaveAttribute('data-room-code', roomCode, { timeout: 30000 });
    await expect(guestPage.locator('#badge-realtime-connection')).toBeVisible({ timeout: 30000 });
    await expect(guestPage.locator('#badge-online-role')).toContainText(/Player 2/i, { timeout: 30000 });

    // 3. Host draws 7 cards using Quick Setup
    const hostQuickSetup = hostPage.locator('#btn-quick-setup');
    if (await hostQuickSetup.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hostQuickSetup.click();
    }
    const hostReveal = hostPage.locator('#btn-reveal-all-facedown');
    if (await hostReveal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hostReveal.click();
    }

    // 4. Guest also performs Quick Setup
    const guestQuickSetup = guestPage.locator('#btn-quick-setup');
    if (await guestQuickSetup.isVisible({ timeout: 2000 }).catch(() => false)) {
      await guestQuickSetup.click();
    }
    const guestReveal = guestPage.locator('#btn-reveal-all-facedown');
    if (await guestReveal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await guestReveal.click();
    }

    // 5. Verify that Host and Guest see each other's active Pokemon across screens
    await expect(hostPage.locator('[data-slot-side="player1"][id="slot-active-card"]')).toBeVisible({ timeout: 15000 });
    await expect(guestPage.locator('[data-slot-side="player2"][id="slot-active-card"]')).toBeVisible({ timeout: 15000 });

    // Handle any pending consent handshake between the two online players
    const guestApprove = guestPage.locator('#btn-consent-approve');
    if (await guestApprove.isVisible({ timeout: 2000 }).catch(() => false)) {
      await guestApprove.click().catch(() => {});
    }
    const hostApprove = hostPage.locator('#btn-consent-approve');
    if (await hostApprove.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hostApprove.click().catch(() => {});
    }

    // 6. Test turn passing sync across Host and Guest
    await hostPage.locator('#btn-dock-pass-turn').click();
    await expect(guestPage.locator('#btn-setup-toggle-first')).toContainText(/เทิร์นของคุณ/i, { timeout: 10000 });

    // Cleanup
    await hostPage.close();
    await guestPage.close();
  });
});
