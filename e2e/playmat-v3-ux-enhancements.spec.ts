import { test, expect } from '@playwright/test';

test.describe('Playmat V3 UX Enhancements & Match Flow', () => {
  test('Requirement 6 & 1: Local bypass and YOU/OPP Coin Toss modal with turn decision', async ({ page }) => {
    // Req 6: In local mode, /playmat-v3 opens directly without permission gate
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#playmat-access-gate')).not.toBeVisible();

    // Req 1: Open Turn Decision Modal
    const btnTurnDecision = page.locator('#btn-open-turn-decision');
    await expect(btnTurnDecision).toBeVisible();
    await btnTurnDecision.click();

    const modal = page.locator('#turn-decision-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/YOU vs OPP/i);

    // Verify Coin Toss visual with YOU / OPP
    const coinVisual = page.locator('#coin-toss-visual');
    await expect(coinVisual).toBeVisible();
    await expect(coinVisual).toContainText(/YOU \/ OPP/i);

    // Test Flip Coin action
    const btnFlip = page.locator('#btn-action-flip-coin');
    await expect(btnFlip).toBeVisible();
    await btnFlip.click();

    // Wait for flip outcome to resolve to CHOOSING phase
    const banner = page.locator('#turn-winner-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#coin-result-label')).toContainText(/(YOU|OPP)/i);

    // Choose Go First or Go Second
    const btnGoFirst = page.locator('#btn-choose-go-first');
    await expect(btnGoFirst).toBeVisible();
    await btnGoFirst.click();

    // Modal closes upon choice
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Hand turn indicator verifies starting player
    const handIndicator = page.locator('#hand-zone-turn-indicator');
    await expect(handIndicator).toBeVisible();
  });

  test('Requirement 3 & 5: Turn transition splash animation and 6-prize victory modal', async ({ page }) => {
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // Setup active and prizes for both players
    await page.locator('#btn-quick-setup').click();
    await page.waitForTimeout(500);

    // Start game via Let's Play
    const btnLetsPlay = page.locator('#btn-reveal-all-facedown');
    await expect(btnLetsPlay).toBeVisible();
    await btnLetsPlay.click();

    // Req 3: Turn transition screen animation appears with "YOUR TURN!"
    const turnSplash = page.locator('#turn-splash-banner');
    await expect(turnSplash).toBeVisible({ timeout: 5000 });
    await expect(turnSplash).toContainText(/YOUR TURN!/i);
    await expect(turnSplash).toContainText(/เทิร์นของคุณแล้ว!/i);

    // Clicking dismisses splash
    await turnSplash.click();
    await expect(turnSplash).not.toBeVisible();

    // Req 5: Take all 6 prizes to trigger victory modal
    // Claim prizes by clicking 6 times on prize card #0
    for (let i = 0; i < 6; i++) {
      const prizeCard = page.locator('#prize-card-0');
      await expect(prizeCard).toBeVisible({ timeout: 5000 });
      await prizeCard.click();
      await page.waitForTimeout(300);
    }

    // Tabletop Victory Modal appears
    const victoryModal = page.locator('#tabletop-victory-modal');
    await expect(victoryModal).toBeVisible({ timeout: 10000 });
    await expect(victoryModal).toContainText(/คุณชนะการแข่งขัน!/i);
    await expect(victoryModal).toContainText(/6 ใบสำเร็จ/i);

    // Close review board
    await page.locator('#btn-victory-close').click();
    await expect(victoryModal).not.toBeVisible();
  });

  test('Requirement 2 & 4: Online mutual Let\'s Play ready check and Rematch with deck selection', async ({ context }) => {
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

    // 2. Guest joins room via online modal
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

    // 3. Quick setup board on host and guest
    await hostPage.locator('#btn-quick-setup').click();
    await pageWait(1000);
    await guestPage.locator('#btn-quick-setup').click();
    await pageWait(1500);

    // Req 2: Host clicks Let's Play -> Triggers mutual ready check modal
    const hostLetsPlay = hostPage.locator('#btn-reveal-all-facedown');
    await expect(hostLetsPlay).toBeVisible();
    await hostLetsPlay.click();

    // Host sees waiting status in consent modal
    const hostConsentModal = hostPage.locator('#tabletop-consent-modal');
    await expect(hostConsentModal).toBeVisible({ timeout: 5000 });
    await expect(hostConsentModal).toContainText(/พร้อมเริ่มการแข่งขัน/i);

    // Guest receives confirmation modal asking to accept Let's Play
    const guestConsentModal = guestPage.locator('#tabletop-consent-modal');
    await expect(guestConsentModal).toBeVisible({ timeout: 5000 });
    await expect(guestConsentModal).toContainText(/ฝ่ายตรงข้ามกด Let's Play แล้ว!/i);

    // Guest clicks "ตกลง / พร้อมเริ่มเกม"
    const guestApproveBtn = guestConsentModal.locator('#btn-consent-approve');
    await expect(guestApproveBtn).toBeVisible();
    await guestApproveBtn.click();

    // Both consent modals close and both games start simultaneously
    await expect(hostConsentModal).not.toBeVisible({ timeout: 5000 });
    await expect(guestConsentModal).not.toBeVisible({ timeout: 5000 });

    // Req 4: Rematch mutual consent
    // Host clicks reset table / rematch button
    const hostResetBtn = hostPage.locator('#btn-v3-new-game');
    await expect(hostResetBtn).toBeVisible();
    await hostResetBtn.click();

    // Host sees waiting rematch status
    await expect(hostConsentModal).toBeVisible({ timeout: 5000 });
    await expect(hostConsentModal).toContainText(/ส่งคำขอเริ่มเกมใหม่/i);

    // Guest receives rematch request
    await expect(guestConsentModal).toBeVisible({ timeout: 5000 });
    await expect(guestConsentModal).toContainText(/ฝ่ายตรงข้ามขอเริ่มเกมใหม่/i);

    // Guest accepts rematch
    await guestConsentModal.locator('#btn-consent-approve').click();

    // Both clients reset and open Deck Selector modal
    await expect(hostPage.locator('#tabletop-deck-selector-heading')).toBeVisible({ timeout: 10000 });
    await expect(guestPage.locator('#tabletop-deck-selector-heading')).toBeVisible({ timeout: 10000 });
  });

  test('Authentic 180° Tabletop Layout: Opponent Deck on Left, Opponent Prizes on Right', async ({ page }) => {
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // Setup prizes for both sides
    const btnPlacePrizes = page.locator('#btn-setup-prizes');
    if (await btnPlacePrizes.isVisible()) {
      await btnPlacePrizes.click();
    }
    const btnPlaceTopPrizes = page.locator('#btn-setup-top-prizes');
    if (await btnPlaceTopPrizes.isVisible()) {
      await btnPlaceTopPrizes.click();
    }

    // Measure positions of Top player's Deck and Prizes
    const topDeck = page.locator('#top-deck-pile');
    const topPrize = page.locator('#top-prize-0');
    await expect(topDeck).toBeVisible();
    await expect(topPrize).toBeVisible();

    const topDeckBox = await topDeck.boundingBox();
    const topPrizeBox = await topPrize.boundingBox();
    expect(topDeckBox).not.toBeNull();
    expect(topPrizeBox).not.toBeNull();
    // 180-degree authentic perspective: Top player's Deck is on the LEFT of top prizes
    expect(topDeckBox!.x).toBeLessThan(topPrizeBox!.x);

    // Measure positions of Bottom player's Deck and Prizes
    const bottomDeck = page.locator('#deck-pile');
    const bottomPrize = page.locator('#prize-card-0');
    await expect(bottomDeck).toBeVisible();
    await expect(bottomPrize).toBeVisible();

    const bottomDeckBox = await bottomDeck.boundingBox();
    const bottomPrizeBox = await bottomPrize.boundingBox();
    expect(bottomDeckBox).not.toBeNull();
    expect(bottomPrizeBox).not.toBeNull();
    // Player perspective: Player's Prizes are on the LEFT of player's deck
    expect(bottomPrizeBox!.x).toBeLessThan(bottomDeckBox!.x);
  });

  test('Opponent Pokemon Switch (Boss\'s Orders / Gust) online consent flow and layout stability', async ({ context }) => {
    test.setTimeout(60000);
    // 1. Host creates room
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

    // 3. Quick setup board on host and guest
    await hostPage.locator('#btn-quick-setup').click();
    await pageWait(1000);
    await guestPage.locator('#btn-quick-setup').click();
    await pageWait(1500);

    // Guest places a card from hand onto bench 0
    const guestEmptyBench = guestPage.locator('#bottom-player-zone #slot-bench-0-empty');
    if (await guestEmptyBench.isVisible()) {
      await guestEmptyBench.click();
    }
    await pageWait(1000);

    // 4. Start game via Let's Play mutual consent
    await hostPage.locator('#btn-reveal-all-facedown').click();
    const guestConsentModal = guestPage.locator('#tabletop-consent-modal');
    await expect(guestConsentModal).toBeVisible({ timeout: 5000 });
    await guestConsentModal.locator('#btn-consent-approve').click();
    await expect(guestConsentModal).not.toBeVisible({ timeout: 5000 });
    await pageWait(1000);

    // 5. Host views Guest's bench Pokemon to trigger Boss's Orders switch
    // On Host's screen, Guest is topSide. Top bench slot B1 is at #top-player-zone #slot-bench-0-card
    const guestBenchCardOnHost = hostPage.locator('#top-player-zone #slot-bench-0-card');
    await expect(guestBenchCardOnHost).toBeVisible({ timeout: 5000 });
    await guestBenchCardOnHost.click();

    // Pokemon Action Modal opens on Host
    const pokemonModal = hostPage.locator('#pokemon-action-modal');
    await expect(pokemonModal).toBeVisible({ timeout: 5000 });

    // Switch button is present with Thai Boss's Orders text
    const switchBtn = hostPage.locator('#btn-switch-to-active');
    await expect(switchBtn).toBeVisible();
    await expect(switchBtn).toContainText(/คำสั่งของบอส/i);

    // Host clicks to request opponent switch
    await switchBtn.click();
    await expect(pokemonModal).not.toBeVisible();

    // 6. Verify Consent Modals on both clients
    const hostConsentModal = hostPage.locator('#tabletop-consent-modal');
    await expect(hostConsentModal).toBeVisible({ timeout: 5000 });
    await expect(hostConsentModal).toContainText(/คำสั่งของบอส/i);

    await expect(guestConsentModal).toBeVisible({ timeout: 5000 });
    await expect(guestConsentModal).toContainText(/คำขอสลับตำแหน่งโปเกมอน/i);

    // Verify Target Pokemon Card Preview is rendered
    const targetCardBox = guestConsentModal.locator('#consent-revealed-cards-box');
    await expect(targetCardBox).toBeVisible();
    await expect(targetCardBox).toContainText(/โปเกมอนเป้าหมายที่จะสลับตำแหน่ง/i);

    // Guest approves switch
    const guestApproveBtn = guestConsentModal.locator('#btn-consent-approve');
    await expect(guestApproveBtn).toContainText(/ยินยอมสลับตัว/i);
    await guestApproveBtn.click();

    // Both modals close cleanly without flickering or race conditions
    await expect(hostConsentModal).not.toBeVisible({ timeout: 5000 });
    await expect(guestConsentModal).not.toBeVisible({ timeout: 5000 });

    // Host sees success toast in Thai
    await expect(hostPage.locator('#tabletop-action-toast')).toBeVisible({ timeout: 5000 });
    await expect(hostPage.locator('#tabletop-action-toast')).toContainText(/คำสั่งของบอส/i);
  });
});

function pageWait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

