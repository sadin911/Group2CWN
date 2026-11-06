import { test, expect } from '@playwright/test';

async function placeFirstPokemonFromHand(page: any, toSlot: 'ACTIVE' | 'BENCH') {
  for (let i = 0; i < 7; i++) {
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
  }
}

test.describe('Playmat V3: Next-Gen Realtime Multi-Tab Sync', () => {
  test('synchronizes two browser sessions in real-time across Host and Guest with independent decks', async ({ context }) => {
    test.setTimeout(90000);

    // 1. Setup Host Page (Player 1)
    const hostPage = await context.newPage();
    await hostPage.goto('/playmat-v3');
    await expect(hostPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    // Host opens Online Room modal
    await hostPage.locator('#btn-v3-online-room').click();
    const hostModal = hostPage.locator('#online-room-modal');
    await expect(hostModal).toBeVisible();

    // Verify deck picker is visible
    const hostDeckSelect = hostPage.locator('#select-online-deck');
    await expect(hostDeckSelect).toBeVisible();

    // Host selects Charizard ex or default meta deck and creates room
    await hostPage.locator('#btn-confirm-create-room').click();
    await expect(hostModal).not.toBeVisible({ timeout: 15000 });

    // Extract generated room code
    const hostOnlineBtn = hostPage.locator('#btn-v3-online-room');
    await expect(hostOnlineBtn).toHaveAttribute('data-room-code', /V3-\d{4}/i);
    const roomCode = (await hostOnlineBtn.getAttribute('data-room-code'))!.toUpperCase();

    // Verify Realtime badge and Role badge on Host
    const hostBadge = hostPage.locator('#badge-realtime-connection');
    await expect(hostBadge).toBeVisible();
    await expect(hostPage.locator('#badge-online-role')).toContainText(/Player 1/i);

    // 2. Setup Guest Page (Player 2)
    const guestPage = await context.newPage();
    await guestPage.goto('/playmat-v3');
    await expect(guestPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    // Guest opens Online Room modal and selects Join tab
    await guestPage.locator('#btn-v3-online-room').click();
    const guestModal = guestPage.locator('#online-room-modal');
    await expect(guestModal).toBeVisible();

    await guestPage.getByText(/เข้าร่วมห้อง/i).click();

    // Guest selects a different deck (e.g. second option in meta decks)
    const guestDeckSelect = guestPage.locator('#select-online-deck');
    await expect(guestDeckSelect).toBeVisible();

    const inputRoomCode = guestPage.locator('#input-room-code');
    await inputRoomCode.fill(roomCode);

    await guestPage.locator('#btn-confirm-join-room').click();
    await expect(guestModal).not.toBeVisible({ timeout: 15000 });

    // Verify Realtime badge and Role badge on Guest
    const guestOnlineBtn = guestPage.locator('#btn-v3-online-room');
    await expect(guestOnlineBtn).toHaveAttribute('data-room-code', roomCode, { timeout: 15000 });
    const guestBadge = guestPage.locator('#badge-realtime-connection');

    await expect(guestBadge).toBeVisible();
    await expect(guestPage.locator('#badge-online-role')).toContainText(/Player 2/i, { timeout: 15000 });

    // 3. Host draws 7 cards and places active card
    await hostPage.locator('#btn-setup-draw-7').click();
    await expect(hostPage.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();
    await placeFirstPokemonFromHand(hostPage, 'ACTIVE');

    // 4. Verify that Guest sees the active card placed by Host in real-time
    const guestOpponentActive = guestPage.locator('[data-slot-side="player1"][id="slot-active-card"]');
    await expect(guestOpponentActive).toBeVisible({ timeout: 15000 });

    // 5. Guest draws 7 cards and places active card
    await guestPage.locator('#btn-setup-draw-7').click();
    await expect(guestPage.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();
    await placeFirstPokemonFromHand(guestPage, 'ACTIVE');

    // 6. Verify that Host sees the active card placed by Guest in real-time
    const hostOpponentActive = hostPage.locator('[data-slot-side="player2"][id="slot-active-card"]');
    await expect(hostOpponentActive).toBeVisible({ timeout: 15000 });

    // 7. Verify Consent Request across players:
    // Host requests consent to inspect top cards of deck
    await hostPage.locator('#btn-dock-top-cards').click();

    // Host sees "กำลังรอการยินยอม" (waiting for opponent)
    const hostConsentModal = hostPage.locator('#tabletop-consent-modal');
    await expect(hostConsentModal).toBeVisible({ timeout: 20000 });
    await expect(hostConsentModal).toContainText(/กำลังรอการยินยอม/i);
    await expect(hostPage.locator('#btn-consent-cancel')).toBeVisible();

    // Guest receives consent request and sees "คำขอความยินยอม" with Approve button
    const guestConsentModal = guestPage.locator('#tabletop-consent-modal');
    await expect(guestConsentModal).toBeVisible({ timeout: 20000 });
    await expect(guestConsentModal).toContainText(/คำขอความยินยอม/i);
    const guestApproveBtn = guestPage.locator('#btn-consent-approve');
    await expect(guestApproveBtn).toBeVisible();

    // Guest approves the request
    await guestApproveBtn.click();

    // Consent modal closes on both sides
    await expect(guestConsentModal).not.toBeVisible({ timeout: 15000 });
    await expect(hostConsentModal).not.toBeVisible({ timeout: 15000 });

    // Host's top cards modal is now open after approval
    const hostTopCardsModal = hostPage.locator('#top-cards-modal');
    await expect(hostTopCardsModal).toBeVisible({ timeout: 15000 });
    await hostPage.locator('#btn-close-top-cards').click();
    await expect(hostTopCardsModal).not.toBeVisible();

    // 7.5. Verify Consent 3-Second Auto-Approval Timeout:
    // Host requests consent to shuffle deck
    await hostPage.locator('#btn-dock-shuffle').click();

    // Both Host and Guest see consent modal with auto-approval countdown
    await expect(hostConsentModal).toBeVisible({ timeout: 10000 });
    await expect(guestConsentModal).toBeVisible({ timeout: 10000 });
    await expect(guestConsentModal).toContainText(/อนุมัติอัตโนมัติใน/i);

    // Neither player clicks — wait for auto-approval (shuffle is 5s duration)
    await expect(guestConsentModal).not.toBeVisible({ timeout: 15000 });
    await expect(hostConsentModal).not.toBeVisible({ timeout: 15000 });

    // Host receives confirmed shuffle notice
    await expect(hostPage.getByText(/สับแล้ว ✓/i)).toBeVisible({ timeout: 10000 });

    // 8. Turn pass milestone checkpoint sync
    await hostPage.locator('#btn-dock-pass-turn').click();
    await expect(guestPage.locator('#btn-setup-toggle-first')).toContainText(/เทิร์นของคุณ/i, { timeout: 10000 });

    // 9. Cleanup
    await hostPage.close();
    await guestPage.close();
  });

  test('Deck Search reveal card displays to opponent once, closes cleanly without repeat popups or card duplication', async ({ context }) => {
    test.setTimeout(90000);

    // 1. Host creates room
    const hostPage = await context.newPage();
    await hostPage.goto('/playmat-v3');
    await expect(hostPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    await hostPage.locator('#btn-v3-online-room').click();
    await hostPage.locator('#btn-confirm-create-room').click();

    const hostOnlineBtn = hostPage.locator('#btn-v3-online-room');
    await expect(hostOnlineBtn).toHaveAttribute('data-room-code', /V3-\d{4}/i, { timeout: 15000 });
    const roomCode = (await hostOnlineBtn.getAttribute('data-room-code'))!.toUpperCase();

    // 2. Guest joins room
    const guestPage = await context.newPage();
    await guestPage.goto('/playmat-v3');
    await expect(guestPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    await guestPage.locator('#btn-v3-online-room').click();
    const guestModal = guestPage.locator('#online-room-modal');
    await guestPage.getByText(/เข้าร่วมห้อง/i).click();
    await guestPage.locator('#input-room-code').fill(roomCode);
    await guestPage.locator('#btn-confirm-join-room').click();
    await expect(guestModal).not.toBeVisible({ timeout: 15000 });
    const guestOnlineBtn = guestPage.locator('#btn-v3-online-room');
    await expect(guestOnlineBtn).toHaveAttribute('data-room-code', roomCode, { timeout: 15000 });
    await expect(guestPage.locator('#badge-online-role')).toContainText(/Player 2/i, { timeout: 15000 });

    // 3. Host opens Deck Search Modal
    await hostPage.locator('#btn-dock-search').click();
    const searchModal = hostPage.locator('#deck-search-modal');
    await expect(searchModal).toBeVisible({ timeout: 10000 });

    // Ensure "โชว์ใบที่เลือกให้คู่แข่งดู" is checked
    const revealCheckbox = hostPage.locator('#checkbox-reveal-opponent');
    await expect(revealCheckbox).toBeChecked();

    // Select the first card in deck search
    const firstDeckCard = hostPage.locator('.deck-search-card').first();
    await expect(firstDeckCard).toBeVisible();
    await firstDeckCard.click();

    // Move to Hand
    await hostPage.locator('#btn-deck-take-hand').click();
    await expect(searchModal).not.toBeVisible();

    // 4. Guest sees the Consent Modal containing the revealed cards directly
    const guestConsentModal = guestPage.locator('#tabletop-consent-modal');
    await expect(guestConsentModal).toBeVisible({ timeout: 15000 });
    const revealedCardsBox = guestPage.locator('#consent-revealed-cards-box');
    await expect(revealedCardsBox).toBeVisible();
    await expect(revealedCardsBox).toContainText(/การ์ดที่คู่แข่งค้นหาและเลือกจากเด็ค/i);

    // Host also sees the Consent Modal in waiting state
    const hostConsentModal = hostPage.locator('#tabletop-consent-modal');
    await expect(hostConsentModal).toBeVisible();

    // Record Guest's initial hand count to ensure no duplicate cards added
    const guestHandCountBefore = await guestPage.locator('[id^="hand-card-"]').count();

    // 5. Guest approves the shuffle/cut request right from the same modal
    const guestApproveBtn = guestPage.locator('#btn-consent-approve');
    await guestApproveBtn.click();
    await expect(guestConsentModal).not.toBeVisible();
    await expect(hostConsentModal).not.toBeVisible({ timeout: 5000 });

    // 6. Host performs another action (e.g. Draw 1) to trigger state sync
    await hostPage.keyboard.press('d');
    await hostPage.waitForTimeout(1000);

    // 7. Verify no modal pops up repeatedly on Guest's screen
    await expect(guestConsentModal).not.toBeVisible();
    await expect(guestPage.locator('#center-spotlight-modal')).not.toBeVisible();

    // Verify Guest's hand was NOT polluted or duplicated
    const guestHandCountAfter = await guestPage.locator('[id^="hand-card-"]').count();
    expect(guestHandCountAfter).toBe(guestHandCountBefore);

    await hostPage.close();
    await guestPage.close();
  });

  test('synchronizes Boss\'s Orders switch across Host and Guest: both perspectives switch and damage remains strictly on its own card instance', async ({ context }) => {
    test.setTimeout(90000);

    // 1. Host creates room
    const hostPage = await context.newPage();
    await hostPage.goto('/playmat-v3');
    await expect(hostPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    await hostPage.locator('#btn-v3-online-room').click();
    await hostPage.locator('#btn-confirm-create-room').click();

    const hostOnlineBtn = hostPage.locator('#btn-v3-online-room');
    await expect(hostOnlineBtn).toHaveAttribute('data-room-code', /V3-\d{4}/i, { timeout: 15000 });
    const roomCode = (await hostOnlineBtn.getAttribute('data-room-code'))!.toUpperCase();

    // 2. Guest joins room
    const guestPage = await context.newPage();
    await guestPage.goto('/playmat-v3');
    await expect(guestPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    const guestModal = guestPage.locator('#online-room-modal');
    await guestPage.locator('#btn-v3-online-room').click();
    await expect(guestModal).toBeVisible();
    await guestPage.getByText(/เข้าร่วมห้อง/i).click();
    await guestPage.locator('#input-room-code').fill(roomCode);
    await guestPage.locator('#btn-confirm-join-room').click();
    await expect(guestModal).not.toBeVisible({ timeout: 15000 });
    const guestOnlineBtn = guestPage.locator('#btn-v3-online-room');
    await expect(guestOnlineBtn).toHaveAttribute('data-room-code', roomCode, { timeout: 15000 });
    await expect(guestPage.locator('#badge-online-role')).toContainText(/Player 2/i, { timeout: 15000 });

    // 3. Guest draws 7 cards, places Active Pokémon and Bench 0 Pokémon
    await guestPage.locator('#btn-setup-draw-7').click();
    await expect(guestPage.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();

    // Place first card to ACTIVE and second to BENCH
    await placeFirstPokemonFromHand(guestPage, 'ACTIVE');
    await placeFirstPokemonFromHand(guestPage, 'BENCH');

    // 4. Guest adds 60 damage to their Active Pokémon
    const guestActiveSlot = guestPage.locator('[data-slot-side="player2"][id="slot-active-card"]');
    await expect(guestActiveSlot).toBeVisible({ timeout: 15000 });
    await guestActiveSlot.click();

    const guestActionModal = guestPage.locator('#pokemon-action-modal');
    await expect(guestActionModal).toBeVisible();
    await guestPage.locator('#btn-dmg-plus-50').click();
    await guestPage.locator('#btn-dmg-plus-10').click();
    await guestPage.locator('#btn-close-pokemon-modal').click();
    await expect(guestActionModal).not.toBeVisible();

    // Verify Active has 60 damage on Guest screen
    const guestActiveCounter = guestPage.locator('[data-slot-side="player2"][id="slot-active-card"] #damage-counter-active');
    await expect(guestActiveCounter).toHaveText('60', { timeout: 10000 });

    // Verify Host sees Guest's Active with 60 damage
    const hostViewGuestActive = hostPage.locator('[data-slot-side="player2"][id="slot-active-card"]');
    await expect(hostViewGuestActive).toBeVisible({ timeout: 15000 });
    const hostViewGuestActiveCounter = hostPage.locator('[data-slot-side="player2"][id="slot-active-card"] #damage-counter-active');
    await expect(hostViewGuestActiveCounter).toHaveText('60', { timeout: 15000 });

    // Verify Guest's Bench 0 has 0 damage (no damage counter) on Host screen
    const hostViewGuestBench0 = hostPage.locator('[data-slot-side="player2"][id="slot-bench-0-card"]');
    await expect(hostViewGuestBench0).toBeVisible({ timeout: 15000 });
    const hostViewGuestBench0Counter = hostPage.locator('[data-slot-side="player2"][id="slot-bench-0-card"] #damage-counter-bench-0');
    await expect(hostViewGuestBench0Counter).not.toBeVisible();

    // 5. Host clicks Guest's Bench 0 to request Boss's Orders switch
    await hostViewGuestBench0.click();
    const hostActionModal = hostPage.locator('#pokemon-action-modal');
    if (!await hostActionModal.isVisible({ timeout: 1500 }).catch(() => false)) {
      await hostViewGuestBench0.locator('#slot-bench-0-surface').click({ force: true }).catch(() => hostViewGuestBench0.click({ force: true }));
    }
    await expect(hostActionModal).toBeVisible({ timeout: 10000 });

    const btnSwitchActive = hostPage.locator('#btn-switch-to-active');
    await expect(btnSwitchActive).toBeVisible();
    await expect(btnSwitchActive).toContainText(/คำสั่งของบอส/i);
    await btnSwitchActive.click();

    // Host sees consent modal in waiting state
    const hostConsentModal = hostPage.locator('#tabletop-consent-modal');
    await expect(hostConsentModal).toBeVisible({ timeout: 10000 });
    await expect(hostConsentModal).toContainText(/ขอสลับตำแหน่งโปเกมอนของคู่ต่อสู้/i);

    // Guest receives consent request modal
    const guestConsentModal = guestPage.locator('#tabletop-consent-modal');
    await expect(guestConsentModal).toBeVisible({ timeout: 15000 });
    await expect(guestConsentModal).toContainText(/คำขอสลับตำแหน่งโปเกมอน/i);

    // 6. Guest approves the switch
    const guestApproveBtn = guestPage.locator('#btn-consent-approve');
    await expect(guestApproveBtn).toBeVisible({ timeout: 15000 });
    await guestApproveBtn.click().catch(() => {});

    // Modals close on both sides
    await expect(guestConsentModal).not.toBeVisible({ timeout: 15000 });
    await expect(hostConsentModal).not.toBeVisible({ timeout: 15000 });

    // Host MUST NOT have PokemonActionModal or CardImagePreviewModal pop up!
    await expect(hostPage.locator('#pokemon-action-modal')).not.toBeVisible();
    await expect(hostPage.locator('#card-image-preview-modal')).not.toBeVisible();
    await hostPage.waitForTimeout(1000);
    await expect(hostPage.locator('#pokemon-action-modal')).not.toBeVisible();
    await expect(hostPage.locator('#card-image-preview-modal')).not.toBeVisible();

    // 7. Verify both perspectives switched and damage did NOT bleed:
    // On Guest screen:
    // - New Active must have 0 damage (the benched Pokemon that just came up)
    // - Bench 0 must retain 60 damage (the old active Pokemon that moved to bench)
    await expect(guestPage.locator('[data-slot-side="player2"][id="slot-bench-0-card"] #damage-counter-bench-0')).toHaveText('60', { timeout: 15000 });
    await expect(guestPage.locator('[data-slot-side="player2"][id="slot-active-card"] #damage-counter-active')).not.toBeVisible();

    // On Host screen:
    // - Host MUST see Guest's Pokémon switched! (Issue 1 resolved)
    // - New Active has 0 damage (Issue 2 resolved: damage didn't jump to new Active!)
    // - Bench 0 retains 60 damage
    await expect(hostPage.locator('[data-slot-side="player2"][id="slot-bench-0-card"] #damage-counter-bench-0')).toHaveText('60', { timeout: 15000 });
    await expect(hostPage.locator('[data-slot-side="player2"][id="slot-active-card"] #damage-counter-active')).not.toBeVisible();

    await hostPage.close();
    await guestPage.close();
  });

  test('Let\'s Play consent flow: starts game, flips cards face-up, and modal closes cleanly without repeated popups', async ({ context }) => {
    test.setTimeout(90000);

    // 1. Host creates room
    const hostPage = await context.newPage();
    await hostPage.goto('/playmat-v3');
    await expect(hostPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    await hostPage.locator('#btn-v3-online-room').click();
    await hostPage.locator('#btn-confirm-create-room').click();

    const hostOnlineBtn = hostPage.locator('#btn-v3-online-room');
    await expect(hostOnlineBtn).toHaveAttribute('data-room-code', /V3-\d{4}/i);
    const roomCode = (await hostOnlineBtn.getAttribute('data-room-code'))!.toUpperCase();

    // 2. Guest joins room
    const guestPage = await context.newPage();
    await guestPage.goto('/playmat-v3');
    await expect(guestPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    const guestModal = guestPage.locator('#online-room-modal');
    await guestPage.locator('#btn-v3-online-room').click();
    await expect(guestModal).toBeVisible();
    await guestPage.getByText(/เข้าร่วมห้อง/i).click();
    await guestPage.locator('#input-room-code').fill(roomCode);
    const joinBtn = guestPage.locator('#btn-confirm-join-room');
    await expect(joinBtn).toBeEnabled({ timeout: 10000 });
    await joinBtn.click();
    if (await guestModal.isVisible({ timeout: 3000 }).catch(() => false)) {
      await joinBtn.click({ force: true }).catch(() => {});
    }
    await expect(guestModal).not.toBeVisible({ timeout: 30000 });
    const guestOnlineBtn = guestPage.locator('#btn-v3-online-room');
    await expect(guestOnlineBtn).toHaveAttribute('data-room-code', roomCode, { timeout: 15000 });

    // 3. Host setup: draw 7, place active, setup 6 prizes
    await hostPage.locator('#btn-setup-draw-7').click();
    await expect(hostPage.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();
    await placeFirstPokemonFromHand(hostPage, 'ACTIVE');
    await hostPage.locator('#btn-setup-prizes').click();
    await expect(hostPage.locator('#prize-card-0')).toBeVisible({ timeout: 5000 });

    // 4. Guest setup: draw 7, place active, setup 6 prizes
    await guestPage.locator('#btn-setup-draw-7').click();
    await expect(guestPage.getByText(/มือของคุณ \(7 ใบ\)/i)).toBeVisible();
    await placeFirstPokemonFromHand(guestPage, 'ACTIVE');
    await guestPage.locator('#btn-setup-prizes').click();
    await expect(guestPage.locator('#prize-card-0')).toBeVisible({ timeout: 5000 });

    // 5. Let's Play button becomes visible and ready on both sides
    const hostLetsPlayBtn = hostPage.locator('#btn-reveal-all-facedown');
    await expect(hostLetsPlayBtn).toBeVisible({ timeout: 10000 });
    await expect(hostLetsPlayBtn).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // 6. Host clicks Let's Play
    await hostLetsPlayBtn.click();

    // Host sees consent modal in waiting state
    const hostConsentModal = hostPage.locator('#tabletop-consent-modal');
    await expect(hostConsentModal).toBeVisible({ timeout: 10000 });
    await expect(hostConsentModal).toContainText(/พร้อมเริ่มการแข่งขัน/i);

    // Guest receives consent request modal with approve button
    const guestConsentModal = guestPage.locator('#tabletop-consent-modal');
    await expect(guestConsentModal).toBeVisible({ timeout: 15000 });
    await expect(guestConsentModal).toContainText(/ฝ่ายตรงข้ามกด Let's Play แล้ว/i);

    const guestApproveBtn = guestPage.locator('#btn-consent-approve');
    await expect(guestApproveBtn).toBeVisible();
    await guestApproveBtn.click();

    // 7. Modals close cleanly on BOTH sides
    await expect(guestConsentModal).not.toBeVisible({ timeout: 10000 });
    await expect(hostConsentModal).not.toBeVisible({ timeout: 10000 });

    // 8. Verify Let's Play button is gone because game has started
    await expect(hostLetsPlayBtn).not.toBeVisible({ timeout: 10000 });
    await expect(guestPage.locator('#btn-reveal-all-facedown')).not.toBeVisible({ timeout: 10000 });

    // 9. Verify NO REPEATED POPUP: wait 3 seconds and ensure modal remains closed on both sides
    await hostPage.waitForTimeout(3000);
    await expect(hostConsentModal).not.toBeVisible();
    await expect(guestConsentModal).not.toBeVisible();

    // 10. Subsequent game actions (e.g. Draw card) do NOT trigger any modal popup
    await hostPage.keyboard.press('d');
    await hostPage.waitForTimeout(1000);
    await expect(hostConsentModal).not.toBeVisible();
    await expect(guestConsentModal).not.toBeVisible();

    await hostPage.close();
    await guestPage.close();
  });

});

