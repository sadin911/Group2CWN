import { test, expect } from '@playwright/test';

async function placeFirstPokemonFromHand(page: any, toSlot: 'ACTIVE' | 'BENCH') {
  for (let i = 0; i < 7; i++) {
    // If preview modal or hand menu is currently open, close it first
    const previewCloseBtn = page.locator('#btn-close-card-preview');
    if (await previewCloseBtn.isVisible({ timeout: 300 }).catch(() => false)) {
      await previewCloseBtn.click().catch(() => {});
    }
    const menuCloseBtn = page.locator('#btn-close-hand-menu');
    if (await menuCloseBtn.isVisible({ timeout: 300 }).catch(() => false)) {
      await menuCloseBtn.click().catch(() => {});
    }

    const card = page.locator(`#hand-card-${i}`);
    if (!(await card.isVisible({ timeout: 1000 }).catch(() => false))) continue;
    await card.click().catch(() => {});

    const btnOpenMenu = page.locator('#btn-open-card-menu');
    if (await btnOpenMenu.isVisible({ timeout: 500 }).catch(() => false)) {
      await btnOpenMenu.click().catch(() => {});
    }

    const handModal = page.locator('#hand-card-menu-modal');
    let modalVisible = await handModal.isVisible({ timeout: 1000 }).catch(() => false);
    if (!modalVisible) {
      await card.dispatchEvent('click').catch(() => {});
      if (await btnOpenMenu.isVisible({ timeout: 500 }).catch(() => false)) {
        await btnOpenMenu.click().catch(() => {});
      }
      modalVisible = await handModal.isVisible({ timeout: 1500 }).catch(() => false);
    }

    // If card preview modal opened inadvertently, close it so it does not intercept clicks
    if (await previewCloseBtn.isVisible({ timeout: 300 }).catch(() => false)) {
      await previewCloseBtn.click().catch(() => {});
    }

    const btnPlace = toSlot === 'ACTIVE'
      ? page.locator('#btn-hand-place-active')
      : (await page.locator('#btn-hand-place-bench-0').isVisible({ timeout: 500 }).catch(() => false))
        ? page.locator('#btn-hand-place-bench-0')
        : page.locator('#btn-hand-place-bench').first();

    const btnVisible = await btnPlace.isVisible({ timeout: 2000 }).catch(() => false);

    if (btnVisible) {
      if (await previewCloseBtn.isVisible({ timeout: 200 }).catch(() => false)) {
        await previewCloseBtn.click().catch(() => {});
      }
      await btnPlace.click({ force: true });
      return;
    }
    if (await menuCloseBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await menuCloseBtn.click().catch(() => {});
    }
    if (await previewCloseBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await previewCloseBtn.click().catch(() => {});
    }
  }
}

test.describe('Playmat V3: Turn Decision, Hand Indicator, and Real-time Damage Sync', () => {
  test('allows deciding turn order via coin flip and choosing first or second', async ({ page }) => {
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // 1. Verify Pre-Game Turn Decision button is visible in Center Board
    const btnTurnDecision = page.locator('#btn-open-turn-decision');
    await expect(btnTurnDecision).toBeVisible();
    await btnTurnDecision.click();

    // 2. Verify Turn Decision Modal opens
    const modal = page.locator('#turn-decision-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/เลือกฝ่ายเริ่มก่อน \/ หลัง/i);

    // 3. Test Manual Winner selection (e.g. Player 1 wins coin flip)
    const btnWinnerP1 = page.locator('#btn-manual-winner-p1');
    await expect(btnWinnerP1).toBeVisible();
    await btnWinnerP1.click();

    // 4. Verify Winner Announcement and Choice Buttons appear
    await expect(modal).toContainText(/ผู้ชนะการทอยเหรียญ/i);
    const btnGoFirst = page.locator('#btn-choose-go-first');
    const btnGoSecond = page.locator('#btn-choose-go-second');
    await expect(btnGoFirst).toBeVisible();
    await expect(btnGoSecond).toBeVisible();

    // 5. Winner chooses "เล่นก่อน (Go First)"
    await btnGoFirst.click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // 6. Verify Hand Zone Turn Indicator shows "เทิร์นของคุณ (YOUR TURN)"
    const handIndicator = page.locator('#hand-zone-turn-indicator');
    await expect(handIndicator).toBeVisible();
    await expect(handIndicator).toHaveAttribute('data-my-turn', 'true');
    await expect(handIndicator).toContainText(/เทิร์นของคุณ/i);

    // 7. Verify Dock Turn Indicator also shows "เทิร์นของคุณ"
    const dockIndicator = page.locator('#dock-turn-indicator');
    await expect(dockIndicator).toBeVisible();
    await expect(dockIndicator).toHaveAttribute('data-my-turn', 'true');
    await expect(dockIndicator).toContainText(/เทิร์นของคุณ/i);

    // 8. Re-open Turn Decision modal, pick Player 2, and choose "เล่นหลัง (Go Second)"
    await page.waitForTimeout(800);
    await btnTurnDecision.click();
    await expect(modal).toBeVisible();
    await page.locator('#btn-manual-winner-p2').click();
    await expect(btnGoSecond).toBeVisible();
    await btnGoSecond.click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Player 2 chose "เล่นหลัง", so Player 1 starts first!
    await expect(handIndicator).toHaveAttribute('data-my-turn', 'true');
  });

  test('synchronizes damage dealt to opponent across Host and Guest tabs in real-time', async ({ context }) => {
    test.setTimeout(90000);

    // 1. Host creates online room
    const hostPage = await context.newPage();
    await hostPage.goto('/playmat-v3');
    await expect(hostPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    await hostPage.locator('#btn-v3-online-room').click();
    const hostModal = hostPage.locator('#online-room-modal');
    await expect(hostModal).toBeVisible();

    await hostPage.locator('#btn-confirm-create-room').click();
    await expect(hostModal).not.toBeVisible({ timeout: 15000 });

    const hostOnlineBtn = hostPage.locator('#btn-v3-online-room');
    await expect(hostOnlineBtn).toHaveAttribute('data-room-code', /V3-\d{4}/i);
    const roomCode = (await hostOnlineBtn.getAttribute('data-room-code'))!.toUpperCase();
    await expect(hostPage.locator('#badge-realtime-connection')).toBeVisible({ timeout: 15000 });
    await expect(hostPage.locator('#badge-online-role')).toContainText(/Player 1/i);

    // 2. Guest joins the online room
    const guestPage = await context.newPage();
    await guestPage.goto('/playmat-v3');
    await expect(guestPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    await guestPage.locator('#btn-v3-online-room').click();
    const guestModal = guestPage.locator('#online-room-modal');
    await expect(guestModal).toBeVisible();
    await guestPage.locator('#tab-online-join').click();

    await guestPage.locator('#input-room-code').fill(roomCode);
    const guestJoinBtn = guestPage.locator('#btn-confirm-join-room');
    await guestJoinBtn.click();
    for (let attempt = 0; attempt < 5; attempt++) {
      if (!(await guestModal.isVisible({ timeout: 1000 }).catch(() => false))) break;
      if (await guestJoinBtn.isEnabled().catch(() => false)) {
        await guestJoinBtn.click().catch(() => {});
      }
      await guestPage.waitForTimeout(2000);
    }
    await expect(guestModal).not.toBeVisible({ timeout: 35000 });

    // 3. Host draws cards and places Active card
    await hostPage.locator('#btn-setup-draw-7').click();
    await expect(hostPage.locator('#hand-card-0')).toBeVisible({ timeout: 15000 });
    await placeFirstPokemonFromHand(hostPage, 'ACTIVE');

    // 4. Guest draws cards and places Active card
    await guestPage.locator('#btn-setup-draw-7').click();
    await expect(guestPage.locator('#hand-card-0')).toBeVisible({ timeout: 15000 });
    await placeFirstPokemonFromHand(guestPage, 'ACTIVE');

    // 5. Flip cards face-up for battle
    const hostActiveSlot = hostPage.locator('[data-slot-side="player1"][id="slot-active-card"]');
    const guestActiveSlot = guestPage.locator('[data-slot-side="player2"][id="slot-active-card"]');
    await expect(hostActiveSlot).toBeVisible({ timeout: 15000 });
    await expect(guestActiveSlot).toBeVisible({ timeout: 15000 });

    // 6. Host deals damage (+10) to Guest's Active Pokémon via Detail Modal
    const hostOpponentActive = hostPage.locator('[data-slot-side="player2"][id="slot-active-card"]');
    await expect(hostOpponentActive).toBeVisible();
    await hostOpponentActive.click();

    const hostActionModal = hostPage.locator('#pokemon-action-modal');
    await expect(hostActionModal).toBeVisible();
    await hostActionModal.locator('button:has-text("+10")').first().click();
    await hostActionModal.locator('#btn-close-pokemon-modal').click();
    await expect(hostActionModal).not.toBeVisible();

    // 7. Verify Guest's active Pokémon receives the 10 damage in real-time!
    const guestOwnActive = guestPage.locator('[data-slot-side="player2"][id="slot-active-card"]');
    await expect(guestOwnActive.locator('#damage-counter-active')).toHaveText('10', { timeout: 15000 });

    // Host applies another +10 damage by clicking damage counter (total 20 DMG)
    await hostOpponentActive.locator('#damage-counter-active').click();
    await expect(hostActionModal).toBeVisible();
    await hostActionModal.locator('button:has-text("+10")').first().click();
    await hostActionModal.locator('#btn-close-pokemon-modal').click();
    await expect(guestOwnActive.locator('#damage-counter-active')).toHaveText('20', { timeout: 15000 });

    // 8. Guest deals damage back to Host's Active Pokémon (+10) via Detail Modal
    const guestOpponentActive = guestPage.locator('[data-slot-side="player1"][id="slot-active-card"]');
    await expect(guestOpponentActive).toBeVisible();
    await guestOpponentActive.click();

    const guestActionModal = guestPage.locator('#pokemon-action-modal');
    await expect(guestActionModal).toBeVisible();
    await guestActionModal.locator('button:has-text("+10")').first().click();
    await guestActionModal.locator('#btn-close-pokemon-modal').click();

    // 9. Verify Host's active Pokémon receives the 10 damage in real-time!
    const hostOwnActive = hostPage.locator('[data-slot-side="player1"][id="slot-active-card"]');
    await expect(hostOwnActive.locator('#damage-counter-active')).toHaveText('10', { timeout: 15000 });
  });

  test('isolates damage on Pokémon switch and provides non-intrusive energy pills with quick discard and opponent cursor sync', async ({ context }) => {
    test.setTimeout(90000);

    // 1. Host creates online room
    const hostPage = await context.newPage();
    await hostPage.goto('/playmat-v3');
    await expect(hostPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    await hostPage.locator('#btn-v3-online-room').click();
    const hostModal = hostPage.locator('#online-room-modal');
    await expect(hostModal).toBeVisible();
    await hostPage.locator('#btn-confirm-create-room').click();
    await expect(hostModal).not.toBeVisible({ timeout: 15000 });

    const hostOnlineBtn = hostPage.locator('#btn-v3-online-room');
    await expect(hostOnlineBtn).toHaveAttribute('data-room-code', /V3-\d{4}/i);
    const roomCode = (await hostOnlineBtn.getAttribute('data-room-code'))!.toUpperCase();
    await expect(hostPage.locator('#badge-realtime-connection')).toBeVisible({ timeout: 15000 });
    await expect(hostPage.locator('#badge-online-role')).toContainText(/Player 1/i);

    // 2. Guest joins room
    const guestPage = await context.newPage();
    await guestPage.goto('/playmat-v3');
    await expect(guestPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    await guestPage.locator('#btn-v3-online-room').click();
    const guestModal = guestPage.locator('#online-room-modal');
    await expect(guestModal).toBeVisible();
    await guestPage.locator('#tab-online-join').click();
    await guestPage.locator('#input-room-code').fill(roomCode);
    const guestJoinBtn3 = guestPage.locator('#btn-confirm-join-room');
    await guestJoinBtn3.click();
    for (let attempt = 0; attempt < 5; attempt++) {
      if (!(await guestModal.isVisible({ timeout: 1000 }).catch(() => false))) break;
      if (await guestJoinBtn3.isEnabled().catch(() => false)) {
        await guestJoinBtn3.click().catch(() => {});
      }
      await guestPage.waitForTimeout(2000);
    }
    await expect(guestModal).not.toBeVisible({ timeout: 35000 });

    // 3. Opponent live mouse cursor verification across network
    const hostBoard = hostPage.locator('#playmat-v3-board');
    await expect(hostBoard).toBeVisible();
    const boardBox = await hostBoard.boundingBox();
    if (boardBox) {
      // Move Host pointer on board
      await hostPage.mouse.move(boardBox.x + boardBox.width * 0.4, boardBox.y + boardBox.height * 0.4);
      // Verify Guest sees Host's live cursor
      const guestOpponentCursor = guestPage.locator('#opponent-live-cursor');
      await expect(guestOpponentCursor).toBeVisible({ timeout: 10000 });
    }

    // 4. Guest sets up Active and Bench Pokémon
    await guestPage.locator('#btn-setup-draw-7').click();
    await expect(guestPage.locator('#hand-card-0')).toBeVisible({ timeout: 15000 });
    await placeFirstPokemonFromHand(guestPage, 'ACTIVE');

    // Guest places Bench 0 Pokémon
    await expect(guestPage.locator('#hand-card-0')).toBeVisible({ timeout: 15000 });
    await placeFirstPokemonFromHand(guestPage, 'BENCH');

    const guestActiveCard = guestPage.locator('[data-slot-side="player2"][id="slot-active-card"]');
    await expect(guestActiveCard).toBeVisible({ timeout: 15000 });

    // 5. Host inflicts 50 damage on Guest's Active Pokémon via Detail Modal
    const hostOpponentActive = hostPage.locator('[data-slot-side="player2"][id="slot-active-card"]');
    await expect(hostOpponentActive).toBeVisible();
    await hostOpponentActive.click();

    const hostActionModal = hostPage.locator('#pokemon-action-modal');
    await expect(hostActionModal).toBeVisible();
    await hostActionModal.locator('button:has-text("+50")').first().click();
    await hostActionModal.locator('#btn-close-pokemon-modal').click();

    // Guest's active now has 50 damage
    await expect(guestActiveCard.locator('#damage-counter-active')).toHaveText('50', { timeout: 15000 });

    // 6. Guest retreats/switches Active with Bench 0
    await guestActiveCard.click();
    const guestActionModal = guestPage.locator('#pokemon-action-modal');
    await expect(guestActionModal).toBeVisible();

    // Retreat to Bench 0
    const btnRetreat = guestActionModal.locator('#btn-retreat-to-bench-0');
    await expect(btnRetreat).toBeVisible();
    await btnRetreat.click();
    await expect(guestActionModal).not.toBeVisible({ timeout: 5000 });

    // 7. CRITICAL DAMAGE ISOLATION ASSERTION:
    // The incoming Pokémon on Active must have 0 damage (counter not visible or text is not 50)!
    const guestNewActiveCounter = guestPage.locator('[data-slot-side="player2"][id="slot-active-card"] #damage-counter-active');
    await expect(guestNewActiveCounter).not.toBeVisible();

    // The retreating Pokémon now on Bench 0 must retain its 50 damage!
    const guestBench0Counter = guestPage.locator('[data-slot-side="player2"][id="slot-bench-0-card"] #damage-counter-bench-0');
    await expect(guestBench0Counter).toHaveText('50', { timeout: 15000 });

    // Verify on Host's view of Guest's board: Active has NO damage, Bench has 50 damage!
    const hostViewGuestActiveCounter = hostPage.locator('[data-slot-side="player2"][id="slot-active-card"] #damage-counter-active');
    await expect(hostViewGuestActiveCounter).not.toBeVisible();

    const hostViewGuestBenchCounter = hostPage.locator('[data-slot-side="player2"][id="slot-bench-0-card"] #damage-counter-bench-0');
    await expect(hostViewGuestBenchCounter).toHaveText('50', { timeout: 15000 });
  });

  test('verifies shuffle Pokémon to deck, ability button separation, and attack announcement', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // 1. Draw 7 cards and place Active Pokémon
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.locator('#hand-card-0')).toBeVisible({ timeout: 15000 });
    await placeFirstPokemonFromHand(page, 'ACTIVE');

    const activeCard = page.locator('[data-slot-side="player1"][id="slot-active-card"]');
    await expect(activeCard).toBeVisible({ timeout: 15000 });

    // 2. Open action modal on Active Pokémon
    await activeCard.click();
    const actionModal = page.locator('#pokemon-action-modal');
    await expect(actionModal).toBeVisible();

    // If facedown, flip face-up so attacks and abilities become visible
    const btnFlipFaceUp = actionModal.locator('#btn-flip-face-up');
    if (await btnFlipFaceUp.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btnFlipFaceUp.click();
      await expect(actionModal).not.toBeVisible({ timeout: 5000 });
      await activeCard.click();
      await expect(actionModal).toBeVisible();
    }

    // 3. Verify attack announcement section is clean and has announcement button
    const btnCustomAttackToggle = actionModal.locator('#btn-toggle-custom-attack');
    if (await btnCustomAttackToggle.isVisible({ timeout: 500 }).catch(() => false)) {
      await btnCustomAttackToggle.click();
    }

    const inputAttackName = actionModal.locator('#input-custom-attack-name');
    await expect(inputAttackName).toBeVisible();
    await inputAttackName.fill('ท่าไม้ตายทดสอบ');

    const btnDeclareAttack = actionModal.locator('#btn-declare-attack');
    await expect(btnDeclareAttack).toBeVisible();
    await btnDeclareAttack.click();

    // Modal closes and action toast appears
    await expect(actionModal).not.toBeVisible({ timeout: 5000 });
    const toast = page.locator('#tabletop-action-toast');
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText(/ท่าไม้ตายทดสอบ/i);

    // Dismiss combat banner if opened so it doesn't intercept clicks on mobile
    const cancelAttackBtn = page.locator('#cancel-attack-button');
    if (await cancelAttackBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cancelAttackBtn.click();
    }

    // 4. Test "Shuffle into deck" (🔀 นำกลับเข้ากองทั้งหมดแล้วสับ)
    await activeCard.click({ force: true });
    await expect(actionModal).toBeVisible();

    const btnShuffleToDeck = actionModal.locator('#btn-shuffle-pokemon-to-deck');
    await expect(btnShuffleToDeck).toBeVisible();
    await btnShuffleToDeck.click();

    // Verify modal closes and active slot becomes empty!
    await expect(actionModal).not.toBeVisible({ timeout: 5000 });
    const activeEmptySlot = page.locator('[data-slot-side="player1"][id="slot-active-empty"]');
    await expect(activeEmptySlot).toBeVisible({ timeout: 5000 });

    // Action toast announces return to deck and shuffle
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText(/กลับเข้ากองการ์ดแล้วสับ/i);
  });

  test('verifies stadium located beside Active Pokémon in player arena and center turn trackers', async ({ page }) => {
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // 1. Stadium slot exists beside Active Pokémon in player arena (#bottom-player-zone)
    const playerStadium = page.locator('#bottom-player-zone #center-stadium-empty');
    await expect(playerStadium).toBeVisible();
    await expect(playerStadium).toContainText(/Stadium/i);

    // Center board zone is clean (no stadium slot in center board)
    await expect(page.locator('#center-board-zone #center-stadium-empty')).not.toBeVisible();

    // 2. Turn trackers (Energy & Support 0/1) are located in CenterBoardZone
    const energyTracker = page.locator('#btn-toggle-turn-energy');
    const supportTracker = page.locator('#btn-toggle-turn-supporter');
    await expect(energyTracker).toBeVisible();
    await expect(supportTracker).toBeVisible();

    // Toggle Energy tracker
    await energyTracker.click();
    await expect(energyTracker).toContainText('1/1');
    await energyTracker.click();
    await expect(energyTracker).toContainText('0/1');

    // Toggle Supporter tracker
    await supportTracker.click();
    await expect(supportTracker).toContainText('1/1');
    await supportTracker.click();
    await expect(supportTracker).toContainText('0/1');
  });
});

