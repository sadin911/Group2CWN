import { test, expect } from '@playwright/test';

test.describe('Playmat V3: Advanced UX Enhancements & Realtime Safeguards', () => {
  test('verifies in-game coin flip overlay, energy aura styling, energy card preview, and damage memory', async ({ page }) => {
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // 1. In-game Center Coin Flip
    const btnCenterCoinFlip = page.locator('#btn-center-coin-flip');
    await expect(btnCenterCoinFlip).toBeVisible();
    await btnCenterCoinFlip.click();

    // Verify 3D Coin Flip Overlay appears
    const coinFlipOverlay = page.locator('#tabletop-coin-flip-overlay');
    await expect(coinFlipOverlay).toBeVisible();
    await expect(coinFlipOverlay).toContainText(/(กำลังหมุนเหรียญ|ทอยเหรียญ|ออกผล)/i);

    // Wait for overlay to resolve and dismiss
    const btnCloseOverlay = page.locator('#btn-close-coin-overlay');
    if (await btnCloseOverlay.isVisible()) {
      await btnCloseOverlay.click();
    }
    await expect(coinFlipOverlay).not.toBeVisible({ timeout: 6000 });

    // 2. Setup board
    await page.locator('#btn-quick-setup').click();
    await page.waitForTimeout(1000);

    // Attach an Energy card directly to Active via Deck Search
    await page.locator('#btn-dock-search').click();
    const deckSearchModal = page.locator('#deck-search-modal');
    await expect(deckSearchModal).toBeVisible({ timeout: 5000 });

    await deckSearchModal.locator('#btn-deck-category-energy').click();
    const firstEnergyCard = deckSearchModal.locator('[data-card-id]').first();
    await firstEnergyCard.click();
    await deckSearchModal.locator('#btn-deck-attach-active').click();
    await expect(deckSearchModal).not.toBeVisible({ timeout: 5000 });

    const activeSlot = page.locator('[data-slot-side="player1"][id="slot-active-card"]');
    await expect(activeSlot).toBeVisible({ timeout: 10000 });

    // 3. Open action modal on Active Pokemon to inspect attached energy and preview
    await activeSlot.click();
    const actionModal = page.locator('#pokemon-action-modal');
    await expect(actionModal).toBeVisible();

    // Verify Energy Section is now present with attached energy
    await expect(actionModal).toContainText(/พลังงานที่แนบอยู่/i);

    // Verify Zoom preview button for attached energy
    const btnPreviewEnergy = actionModal.locator('#btn-preview-energy-0');
    await expect(btnPreviewEnergy).toBeVisible();
    await btnPreviewEnergy.click();

    const previewModal = page.locator('#card-image-preview-modal');
    await expect(previewModal).toBeVisible({ timeout: 5000 });
    await page.locator('#btn-close-card-preview').click();
    await expect(previewModal).not.toBeVisible();

    // Close action modal to inspect energy aura
    await page.locator('#btn-close-pokemon-modal').click();
    await expect(actionModal).not.toBeVisible();

    // Verify energy aura glow is subtle ring-1 / ring-1.5
    const auraGlow = activeSlot.locator('[data-testid="energy-aura-glow"]');
    await expect(auraGlow).toBeVisible();
    const classAttr = await auraGlow.getAttribute('class');
    expect(classAttr).toContain('ring-1');

    // 4. Test Damage Memory: Custom damage persists for this Pokemon
    await activeSlot.click();
    await expect(actionModal).toBeVisible();

    const inputCustomDamage = actionModal.locator('#input-custom-damage');
    await expect(inputCustomDamage).toBeVisible();
    await inputCustomDamage.fill('80');
    await actionModal.locator('#btn-submit-custom-damage').click();

    // Reopen modal and verify damage is 80
    await page.locator('#btn-close-pokemon-modal').click();
    await expect(actionModal).not.toBeVisible();

    await activeSlot.click();
    await expect(actionModal).toBeVisible();
    await expect(actionModal.locator('#current-damage-value')).toContainText('80');
    await page.locator('#btn-close-pokemon-modal').click();
  });

  test('verifies turn-gated pass turn and online deck search cut/shuffle consent', async ({ context }) => {
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

    // 2. Guest joins room
    const guestPage = await context.newPage();
    await guestPage.goto('/playmat-v3');
    await expect(guestPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    await guestPage.locator('#btn-v3-online-room').click();
    const guestModal = guestPage.locator('#online-room-modal');
    await expect(guestModal).toBeVisible();
    await guestPage.getByText(/เข้าร่วมห้อง/i).click();

    await guestPage.locator('#input-room-code').fill(roomCode);
    await guestPage.locator('#btn-confirm-join-room').click();
    await expect(guestModal).not.toBeVisible({ timeout: 15000 });
    await pageWait(1000);

    // 3. Quick setup on both
    await hostPage.locator('#btn-quick-setup').click();
    await pageWait(1000);
    await guestPage.locator('#btn-quick-setup').click();
    await pageWait(1500);

    // 4. Start match via Let's Play consent
    await hostPage.locator('#btn-reveal-all-facedown').click();
    const guestConsentModal = guestPage.locator('#tabletop-consent-modal');
    await expect(guestConsentModal).toBeVisible({ timeout: 5000 });
    await guestConsentModal.locator('#btn-consent-approve').click();

    await expect(guestConsentModal).not.toBeVisible({ timeout: 5000 });
    await pageWait(1000);

    // Dismiss turn splash banner if visible
    const hostSplash = hostPage.locator('#turn-splash-banner');
    if (await hostSplash.isVisible().catch(() => false)) {
      await hostSplash.click();
    }
    await pageWait(500);

    // 5. Verify Turn-gated Pass Turn:
    // Host is Turn 1 (player1). Guest is player2 (not their turn).
    const guestDockPassTurn = guestPage.locator('#btn-dock-pass-turn');
    await expect(guestDockPassTurn).toBeVisible();
    await expect(guestDockPassTurn).toBeDisabled();

    // Host IS active player, so Host can pass turn
    const hostDockPassTurn = hostPage.locator('#btn-dock-pass-turn');
    await expect(hostDockPassTurn).toBeVisible();
    await expect(hostDockPassTurn).toBeEnabled();

    // 6. Test Deck Search Cut/Shuffle Consent:
    // Host opens Deck Search Modal via #btn-dock-search
    await hostPage.locator('#btn-dock-search').click();
    const deckSearchModal = hostPage.locator('#deck-search-modal');
    await expect(deckSearchModal).toBeVisible({ timeout: 5000 });

    // Host closes Deck Search modal -> triggers cut/shuffle consent request to Guest
    const btnCloseSearch = deckSearchModal.locator('#btn-deck-search-close');
    await btnCloseSearch.click();
    await expect(deckSearchModal).not.toBeVisible({ timeout: 5000 });

    // Guest receives consent modal: "คู่ต่อสู้ค้นหาสำรับเสร็จแล้ว"
    await expect(guestConsentModal).toBeVisible({ timeout: 5000 });
    await expect(guestConsentModal).toContainText(/คู่ต่อสู้ค้นหาสำรับเสร็จแล้ว/i);

    // Guest has Shuffle and Skip buttons
    const btnConsentApprove = guestConsentModal.locator('#btn-consent-approve');
    const btnConsentDeny = guestConsentModal.locator('#btn-consent-deny');
    await expect(btnConsentApprove).toBeVisible();
    await expect(btnConsentDeny).toBeVisible();
    await expect(btnConsentApprove).toContainText(/สับเด็ค/i);
    await expect(btnConsentDeny).toContainText(/ไม่สับ/i);

    // Guest clicks Shuffle
    await btnConsentApprove.click();
    await expect(guestConsentModal).not.toBeVisible({ timeout: 5000 });
  });
});

function pageWait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
