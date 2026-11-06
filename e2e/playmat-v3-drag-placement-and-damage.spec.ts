import { test, expect } from '@playwright/test';

test.describe('Playmat V3: Drag-Only Placement and Combat Damage Adjustments', () => {
  test('empty slot click does not place card; mouse drag places card; attack damage buttons (+10, +50, +100, -10, -50, -100) adjust correctly', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Open Playmat V3
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 30000 });

    // 2. Setup match: Draw 7 cards
    const draw7Btn = page.locator('#btn-setup-draw-7');
    await expect(draw7Btn).toBeVisible();
    await draw7Btn.click();

    // Verify hand has 7 cards
    const handTray = page.locator('#hand-cards-tray');
    await expect(handTray).toBeVisible();
    const handCards = page.locator('[data-testid="hand-card-item"]');
    await expect(handCards).toHaveCount(7);

    // 3. Search deck for a Basic Pokémon so we have a guaranteed Basic Pokémon in hand
    await page.locator('#btn-dock-search').click();
    const searchModal = page.locator('#deck-search-modal');
    await expect(searchModal).toBeVisible();
    await searchModal.getByRole('button', { name: 'Basic Pokémon' }).click();
    await page.locator('.deck-search-card').first().click();
    await page.locator('#btn-deck-take-hand').click();
    await expect(searchModal).not.toBeVisible();

    // Hand now has 8 cards
    await expect(handCards).toHaveCount(8);

    // The newly taken Basic Pokémon is the last card in hand
    const lastHandCard = page.locator('#hand-card-7');
    await expect(lastHandCard).toBeVisible();

    // 4. Click first hand card to test that clicking card and clicking slot does NOT place card
    const firstCard = page.locator('#hand-card-0');
    await firstCard.click();

    // 5. Verify Clicking Bottom Empty Active Slot does NOT place card
    const bottomEmptyActive = page.locator('[data-slot-zone="true"][data-slot-side="player1"][data-slot-pos="ACTIVE"]');
    await expect(bottomEmptyActive).toBeVisible();
    await bottomEmptyActive.click({ force: true });

    // Hand card count must remain 8 (not placed via clicking!)
    await expect(handCards).toHaveCount(8);

    // Dismiss selection pill before drag
    const cancelBtn = page.locator('#btn-cancel-card-selection');
    if (await cancelBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await cancelBtn.click();
    }

    // Wait for card draw animation to settle before getting bounding boxes
    await page.waitForTimeout(500);
    await bottomEmptyActive.scrollIntoViewIfNeeded();
    await lastHandCard.scrollIntoViewIfNeeded();

    // 6. Drag the Basic Pokémon from hand to bottom active slot using mouse pointer
    const cardBox = await lastHandCard.boundingBox();
    const slotBox = await bottomEmptyActive.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(slotBox).not.toBeNull();

    await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(slotBox!.x + slotBox!.width / 2, slotBox!.y + slotBox!.height / 2, { steps: 30 });
    await page.waitForTimeout(300);
    await page.mouse.up();

    // Now active spot is occupied, hand count is back to 7
    await expect(handCards).toHaveCount(7, { timeout: 15000 });
    await page.waitForTimeout(300);
    const activeSurface = page.locator('#slot-active-surface').last();
    await expect(activeSurface).toBeVisible();
    await activeSurface.click();

    const actionModal = page.locator('#pokemon-action-modal');
    await expect(actionModal).toBeVisible();

    // Flip face-up if facedown during pre-game setup
    const flipBtn = page.locator('#btn-flip-face-up');
    if (await flipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await flipBtn.click();
      await activeSurface.click();
      await expect(actionModal).toBeVisible();
    }

    // 8. Verify Attack Declaration section has +/- 10, 50, 100 delta buttons
    const dmgInput = page.locator('#input-custom-attack-damage');
    await expect(dmgInput).toBeVisible({ timeout: 5000 });

    const plus10Btn = page.locator('#btn-attack-delta-plus-10');
    const plus50Btn = page.locator('#btn-attack-delta-plus-50');
    const plus100Btn = page.locator('#btn-attack-delta-plus-100');
    const minus10Btn = page.locator('#btn-attack-delta-minus-10');
    const minus50Btn = page.locator('#btn-attack-delta-minus-50');
    const minus100Btn = page.locator('#btn-attack-delta-minus-100');

    await expect(plus10Btn).toBeVisible();
    await expect(plus50Btn).toBeVisible();
    await expect(plus100Btn).toBeVisible();
    await expect(minus10Btn).toBeVisible();
    await expect(minus50Btn).toBeVisible();
    await expect(minus100Btn).toBeVisible();

    const initialDmg = Number(await dmgInput.inputValue());

    // Test clicking +10
    await plus10Btn.click();
    await expect(dmgInput).toHaveValue(String(initialDmg + 10));

    // Test clicking +50
    await plus50Btn.click();
    await expect(dmgInput).toHaveValue(String(initialDmg + 10 + 50));

    // Test clicking +100
    await plus100Btn.click();
    await expect(dmgInput).toHaveValue(String(initialDmg + 10 + 50 + 100));

    // Test clicking -50
    await minus50Btn.click();
    await expect(dmgInput).toHaveValue(String(initialDmg + 10 + 100));

    // Test clicking -10
    await minus10Btn.click();
    await expect(dmgInput).toHaveValue(String(initialDmg + 100));

    // Test clicking -100
    await minus100Btn.click();
    await expect(dmgInput).toHaveValue(String(initialDmg));

    // 9. Declare attack to open TabletopCombatBanner and verify its damage delta buttons
    await page.locator('#btn-declare-attack').click();
    await expect(actionModal).not.toBeVisible();

    const combatBanner = page.locator('#tabletop-combat-banner');
    await expect(combatBanner).toBeVisible();

    const bannerDmgInput = page.locator('#input-combat-damage-override');
    await expect(bannerDmgInput).toBeVisible();

    const bannerPlus10 = page.locator('#btn-combat-delta-plus-10');
    const bannerPlus50 = page.locator('#btn-combat-delta-plus-50');
    const bannerPlus100 = page.locator('#btn-combat-delta-plus-100');
    const bannerMinus10 = page.locator('#btn-combat-delta-minus-10');
    const bannerMinus50 = page.locator('#btn-combat-delta-minus-50');
    const bannerMinus100 = page.locator('#btn-combat-delta-minus-100');

    await expect(bannerPlus10).toBeVisible();
    await expect(bannerPlus50).toBeVisible();
    await expect(bannerPlus100).toBeVisible();
    await expect(bannerMinus10).toBeVisible();
    await expect(bannerMinus50).toBeVisible();
    await expect(bannerMinus100).toBeVisible();

    await page.waitForTimeout(300);
    let val = Number(await bannerDmgInput.inputValue());

    await bannerPlus10.click();
    await expect(bannerDmgInput).toHaveValue(String(val + 10));
    val += 10;

    await bannerPlus50.click();
    await expect(bannerDmgInput).toHaveValue(String(val + 50));
    val += 50;

    await bannerPlus100.click();
    await expect(bannerDmgInput).toHaveValue(String(val + 100));
    val += 100;

    await bannerMinus50.click();
    await expect(bannerDmgInput).toHaveValue(String(val - 50));
    val -= 50;

    await bannerMinus10.click();
    await expect(bannerDmgInput).toHaveValue(String(val - 10));
    val -= 10;

    await bannerMinus100.click();
    await expect(bannerDmgInput).toHaveValue(String(Math.max(0, val - 100)));

    // Cancel combat
    await page.locator('#cancel-attack-button').click();
    await expect(combatBanner).not.toBeVisible();
  });
});
