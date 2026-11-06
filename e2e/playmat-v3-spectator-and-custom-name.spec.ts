import { test, expect } from '@playwright/test';

test.describe('Playmat V3: Custom Display Name, Spectator Mode & Admin View', () => {
  test('allows player to set custom display name and rename self inline', async ({ page }) => {
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // Open Online Room Modal
    await page.locator('#btn-v3-online-room').click();
    const modal = page.locator('#online-room-modal');
    await expect(modal).toBeVisible();

    // Verify custom display name input exists and fill custom name
    const nameInput = page.locator('#input-player-display-name');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('RedTrainer');

    // Create room
    await page.locator('#btn-confirm-create-room').click();
    await expect(modal).not.toBeVisible({ timeout: 15000 });

    // Verify custom name appears in Hand Zone Turn Indicator
    const handIndicator = page.locator('#hand-zone-turn-indicator');
    await expect(handIndicator).toBeVisible();
    await expect(handIndicator).toContainText('RedTrainer');

    // Verify Rename button exists
    const btnRename = page.locator('#btn-rename-self');
    await expect(btnRename).toBeVisible();
  });

  test('allows spectator to join room, view live state, swap perspectives, and has read-only dock', async ({ context }) => {
    test.setTimeout(90000);

    // 1. Host creates room with custom name
    const hostPage = await context.newPage();
    await hostPage.goto('/playmat-v3');
    await expect(hostPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    await hostPage.locator('#btn-v3-online-room').click();
    const hostModal = hostPage.locator('#online-room-modal');
    await expect(hostModal).toBeVisible();
    await hostPage.locator('#input-player-display-name').fill('HostMaster');
    await hostPage.locator('#btn-confirm-create-room').click();
    await expect(hostModal).not.toBeVisible({ timeout: 15000 });

    const hostOnlineBtn = hostPage.locator('#btn-v3-online-room');
    await expect(hostOnlineBtn).toHaveAttribute('data-room-code', /V3-\d{4}/i);
    const roomCode = (await hostOnlineBtn.getAttribute('data-room-code'))!.toUpperCase();

    // 2. Spectator opens playmat and joins as Spectator
    const spectatorPage = await context.newPage();
    await spectatorPage.goto('/playmat-v3');
    await expect(spectatorPage.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    await spectatorPage.locator('#btn-v3-online-room').click();
    const specModal = spectatorPage.locator('#online-room-modal');
    await expect(specModal).toBeVisible();

    // Fill spectator name
    await spectatorPage.locator('#input-player-display-name').fill('SpectatorFan');

    // Navigate to Join Room tab
    await spectatorPage.getByText(/เข้าร่วมห้อง/i).click();
    await spectatorPage.locator('#input-room-code').fill(roomCode);

    // Verify two join buttons exist: Player and Spectator
    const btnJoinSpectator = spectatorPage.locator('#btn-confirm-spectate-room');
    await expect(btnJoinSpectator).toBeVisible();
    await btnJoinSpectator.click();
    await expect(specModal).not.toBeVisible({ timeout: 15000 });

    // 3. Verify Spectator Banner appears at top
    const specBanner = spectatorPage.locator('#banner-spectator-mode');
    await expect(specBanner).toBeVisible({ timeout: 10000 });
    await expect(specBanner).toContainText(/กำลังรับชมห้อง/i);
    await expect(specBanner).toContainText(roomCode);

    // 4. Verify Spectator Dock is rendered (instead of Player Dock)
    const specDock = spectatorPage.locator('#spectator-dock');
    await expect(specDock).toBeVisible();
    await expect(specDock).toContainText(/โหมดผู้เข้าชม/i);
    await expect(specDock).toContainText(/ไพรซ์/i);

    // Verify player action buttons are NOT present in spectator dock
    await expect(spectatorPage.locator('#btn-pass-turn')).not.toBeVisible();
    await expect(spectatorPage.locator('#btn-quick-draw')).not.toBeVisible();

    // 5. Test spectator perspective swap
    const swapViewBtn = spectatorPage.locator('#btn-spectator-swap-view');
    await expect(swapViewBtn).toBeVisible();
    await swapViewBtn.click();

    // Verify dock perspective switched to P2
    await expect(swapViewBtn).toContainText('P2');
  });
});
