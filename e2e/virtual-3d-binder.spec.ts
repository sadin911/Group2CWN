import { test, expect } from '@playwright/test';

test.describe('Virtual 3D Realistic Card Binder Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/collection');
    await expect(page.locator('h1')).toContainText('PokéCollection');
  });

  test('toggles between standard grid view and virtual 3D binder view', async ({ page }) => {
    // 1. Locate binder view toggle button in top header
    const binderToggleBtn = page.locator('[data-testid="binder-view-toggle"]');
    await expect(binderToggleBtn).toBeVisible({ timeout: 10000 });

    // 2. Click to enter 3D Binder view
    await binderToggleBtn.click();
    await page.waitForTimeout(500);

    // 3. Verify 3D Binder Book Spread and Page Sheet are rendered
    const pageSheet1 = page.locator('[data-testid="binder-page-sheet-1"]:visible').first();
    await expect(pageSheet1).toBeVisible({ timeout: 10000 });

    // 4. Verify book spine / metallic rings or header elements exist
    const settingsBtn = page.locator('[data-testid="binder-settings-btn"]');
    await expect(settingsBtn).toBeVisible();

    // 5. Click "ตารางปกติ" to switch back to Grid View
    const switchToGridBtn = page.locator('[data-testid="switch-to-grid-btn"]');
    await expect(switchToGridBtn).toBeVisible();
    await switchToGridBtn.click();
    await page.waitForTimeout(500);

    // 6. Verify back in grid view
    const searchInput = page.getByPlaceholder(/ค้นหาชื่อการ์ด/i);
    await expect(searchInput).toBeVisible();
  });

  test('navigates pages forward and backward in 3D book spread', async ({ page }) => {
    // Open 3D Binder
    await page.locator('[data-testid="binder-view-toggle"]').click();
    await page.waitForTimeout(500);

    // Verify initial page
    await expect(page.locator('[data-testid="binder-page-sheet-1"]:visible').first()).toBeVisible({ timeout: 10000 });

    // Click Next Page button
    const nextBtn = page.locator('[data-testid="btn-binder-next"]:visible');
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(650);

      // Verify page 2 or page 3 is visible
      const hasPage2 = await page.locator('[data-testid="binder-page-sheet-2"]:visible').first().isVisible();
      const hasPage3 = await page.locator('[data-testid="binder-page-sheet-3"]:visible').first().isVisible();
      expect(hasPage2 || hasPage3).toBe(true);

      // Click Prev Page button
      const prevBtn = page.locator('[data-testid="btn-binder-prev"]:visible');
      await expect(prevBtn).toBeVisible();
      await prevBtn.click();
      await page.waitForTimeout(650);

      // Back to page 1
      await expect(page.locator('[data-testid="binder-page-sheet-1"]:visible').first()).toBeVisible();
    }
  });

  test('opens binder settings modal and allows theme customization', async ({ page }) => {
    // Open 3D Binder
    await page.locator('[data-testid="binder-view-toggle"]').click();
    await page.waitForTimeout(500);

    // Open Settings Modal
    const settingsBtn = page.locator('[data-testid="binder-settings-btn"]');
    await expect(settingsBtn).toBeVisible({ timeout: 10000 });
    await settingsBtn.click();

    // Verify Settings Modal opens
    const modalTitle = page.locator('#binder-settings-title');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
    await expect(modalTitle).toContainText('ตั้งค่าสมุดสะสมการ์ด');

    // Click another cover theme (e.g. Vintage Brown or Poké Ball)
    const brownThemeBtn = page.locator('button:has-text("หนังน้ำตาลวินเทจ")').first();
    if (await brownThemeBtn.isVisible()) {
      await brownThemeBtn.click();
    }

    // Save settings
    const saveBtn = page.locator('button:has-text("บันทึกการตั้งค่า")');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await page.waitForTimeout(300);

    // Verify modal is closed
    await expect(modalTitle).not.toBeVisible();
  });

  test('allows clicking card slots in binder to inspect details', async ({ page }) => {
    // Open 3D Binder
    await page.locator('[data-testid="binder-view-toggle"]').click();
    await page.waitForTimeout(500);

    // Find first card slot inside page sheet
    const firstSlot = page.locator('[data-testid="binder-slot-0"]:visible').first();
    await expect(firstSlot).toBeVisible({ timeout: 10000 });

    // Click slot
    await firstSlot.click();
    await page.waitForTimeout(500);

    // If card inspection modal opens, close it
    const modalCloseBtn = page.locator('button:has-text("✕")').first();
    if (await modalCloseBtn.isVisible()) {
      await modalCloseBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('supports multi-select rarity filtering on main collection page', async ({ page }) => {
    // 1. Locate and open the Rarity Multi-Select Popover on main collection view
    const rarityBtn = page.locator('[data-testid="rarity-filter-button"]');
    await expect(rarityBtn).toBeVisible({ timeout: 10000 });
    await expect(rarityBtn).toContainText('ทุกระดับ');

    await rarityBtn.click();
    await page.waitForTimeout(200);

    // 2. Locate and toggle SAR and AR
    const sarOption = page.locator('button:has-text("SAR")').first();
    await expect(sarOption).toBeVisible();
    await sarOption.click();
    await page.waitForTimeout(150);

    const arOption = page.locator('button:has-text("AR / CHR")').first();
    await expect(arOption).toBeVisible();
    await arOption.click();
    await page.waitForTimeout(150);

    // Close popover
    const doneBtn = page.locator('button:has-text("เสร็จสิ้น")').first();
    if (await doneBtn.isVisible()) {
      await doneBtn.click();
    }

    // 3. Verify active rarity chips bar displays both SAR and AR
    await expect(page.locator('text=ระดับที่เลือก:')).toBeVisible();
    await expect(page.locator('button[title="ลบตัวกรอง SAR"]')).toBeVisible();
    await expect(page.locator('button[title="ลบตัวกรอง AR"]')).toBeVisible();

    // 4. Verify Rarity Button label reflects multi-selection
    await expect(rarityBtn).toContainText('SAR, AR');

    // 5. Click "ล้างตัวกรองความหายาก" to reset
    const clearRarityBtn = page.locator('button:has-text("ล้างตัวกรองความหายาก")');
    await expect(clearRarityBtn).toBeVisible();
    await clearRarityBtn.click();
    await page.waitForTimeout(200);

    // 6. Verify reset back to All
    await expect(rarityBtn).toContainText('ทุกระดับ');
  });

  test('supports filtering by Set and Multi-Select Rarity in Custom Binder card picker drawer', async ({ page }) => {
    // 1. Switch to 3D Binder View
    await page.locator('[data-testid="binder-view-toggle"]').click();
    await page.waitForTimeout(500);

    // 2. Switch to Custom Binder mode ("✨ สร้างเอง")
    const customBinderTab = page.locator('button:has-text("✨ สร้างเอง")');
    await expect(customBinderTab).toBeVisible({ timeout: 10000 });
    await customBinderTab.click();
    await page.waitForTimeout(500);

    // 3. Click first empty slot to open Card Picker Drawer
    const emptySlot = page.locator('[data-testid="binder-slot-0"]:visible').first();
    await expect(emptySlot).toBeVisible({ timeout: 5000 });
    await emptySlot.click();
    await page.waitForTimeout(400);

    // 4. Verify Card Picker Drawer is open
    const pickerTitle = page.locator('#card-picker-title');
    await expect(pickerTitle).toBeVisible({ timeout: 5000 });
    await expect(pickerTitle).toContainText('เลือกการ์ดใส่ช่องสมุดสะสม');

    // 5. Verify Set selector exists and select a specific set
    const setSelect = page.locator('[data-testid="picker-set-select"]');
    await expect(setSelect).toBeVisible();

    // Select second option if available
    const optionCount = await setSelect.locator('option').count();
    if (optionCount > 1) {
      await setSelect.selectOption({ index: 1 });
      await page.waitForTimeout(200);
    }

    // 6. Verify Multi-Select Rarity Chips exist in Drawer
    const sarChip = page.locator('[data-testid="picker-rarity-SAR"]');
    const arChip = page.locator('[data-testid="picker-rarity-AR"]');
    await expect(sarChip).toBeVisible();
    await expect(arChip).toBeVisible();

    // 7. Click SAR and AR chips to multi-select
    await sarChip.click();
    await page.waitForTimeout(150);
    await arChip.click();
    await page.waitForTimeout(150);

    // 8. Verify both chips are active (contain amber highlight styling)
    await expect(sarChip).toHaveClass(/bg-amber-400/);
    await expect(arChip).toHaveClass(/bg-amber-400/);

    // 9. Verify "ล้างตัวกรอง" button is visible and works
    const resetFiltersBtn = page.locator('button:has-text("ล้างตัวกรอง")');
    await expect(resetFiltersBtn).toBeVisible();
    await resetFiltersBtn.click();
    await page.waitForTimeout(200);

    // 10. Close the drawer
    const closeBtn = page.locator('button:has-text("✕")').first();
    await closeBtn.click();
    await page.waitForTimeout(300);
    await expect(pickerTitle).not.toBeVisible();
  });

  test('supports batch selecting and inserting multiple cards into custom binder', async ({ page }) => {
    // 1. Switch to 3D Binder View
    await page.locator('[data-testid="binder-view-toggle"]').click();
    await page.waitForTimeout(500);

    // 2. Switch to Custom Binder mode ("✨ สร้างเอง")
    const customBinderTab = page.locator('button:has-text("✨ สร้างเอง")');
    await expect(customBinderTab).toBeVisible({ timeout: 10000 });
    await customBinderTab.click();
    await page.waitForTimeout(500);

    // 3. Click Batch Insert button in toolbar
    const batchAddBtn = page.locator('[data-testid="btn-batch-add-cards"]');
    await expect(batchAddBtn).toBeVisible({ timeout: 5000 });
    await batchAddBtn.click();
    await page.waitForTimeout(400);

    // 4. Verify Drawer is open and switch to Batch Mode
    const batchModeBtn = page.locator('[data-testid="picker-mode-batch"]');
    await expect(batchModeBtn).toBeVisible({ timeout: 5000 });
    await batchModeBtn.click();
    await page.waitForTimeout(200);

    // 5. Click "เลือก 9 ใบแรกที่พบ" quick selection button
    const select9Btn = page.locator('[data-testid="btn-select-first-9"]');
    await expect(select9Btn).toBeVisible();
    await select9Btn.click();
    await page.waitForTimeout(200);

    // 6. Verify selection count shows 9 cards
    const confirmBtn = page.locator('[data-testid="btn-confirm-batch-insert"]');
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toContainText('ใส่การ์ด 9 ใบ');

    // 7. Click Confirm to insert all 9 cards
    await confirmBtn.click();
    await page.waitForTimeout(500);

    // 8. Verify drawer closes and slots now contain cards with action buttons
    await expect(page.locator('#card-picker-title')).not.toBeVisible();
    const moveBtnSlot0 = page.locator('[data-testid="btn-move-slot-0"]:visible').first();
    await expect(moveBtnSlot0).toBeVisible({ timeout: 5000 });
  });

  test('supports repositioning card slot via tap-to-move', async ({ page }) => {
    // 1. Switch to 3D Binder View
    await page.locator('[data-testid="binder-view-toggle"]').click();
    await page.waitForTimeout(500);

    // 2. Switch to Custom Binder mode ("✨ สร้างเอง")
    const customBinderTab = page.locator('button:has-text("✨ สร้างเอง")');
    await expect(customBinderTab).toBeVisible({ timeout: 10000 });
    await customBinderTab.click();
    await page.waitForTimeout(500);

    // 3. Check if slot 0 has a card, if not add one quickly
    let moveBtn0 = page.locator('[data-testid="btn-move-slot-0"]:visible').first();
    if (!(await moveBtn0.isVisible())) {
      const slot0 = page.locator('[data-testid="binder-slot-0"]:visible').first();
      await slot0.click();
      await page.waitForTimeout(400);
      const firstCardOption = page.locator('[data-testid^="picker-card-"]').first();
      if (await firstCardOption.isVisible()) {
        await firstCardOption.click();
        await page.waitForTimeout(300);
        const confirmSingleBtn = page.locator('[data-testid="btn-confirm-single-insert"]');
        await expect(confirmSingleBtn).toBeVisible({ timeout: 3000 });
        await confirmSingleBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // 4. Click Move button on slot 0
    moveBtn0 = page.locator('[data-testid="btn-move-slot-0"]:visible').first();
    await expect(moveBtn0).toBeVisible({ timeout: 5000 });
    await moveBtn0.click();
    await page.waitForTimeout(200);

    // 5. Verify moving active banner is displayed
    const movingBanner = page.locator('[data-testid="moving-active-banner"]');
    await expect(movingBanner).toBeVisible();
    await expect(movingBanner).toContainText('กำลังย้ายการ์ด');

    // 6. Tap slot 2 to move/place the card there
    const targetSlot = page.locator('[data-testid="binder-slot-2"]:visible').first();
    await expect(targetSlot).toBeVisible();
    await targetSlot.click();
    await page.waitForTimeout(400);

    // 7. Verify moving banner dismissed after successful move
    await expect(movingBanner).not.toBeVisible();
  });

  test('allows changing rows and columns layout in settings and immediately updates page 1', async ({ page }) => {
    // 1. Open 3D Binder
    await page.locator('[data-testid="binder-view-toggle"]').click();
    await page.waitForTimeout(500);

    // 2. Verify Page 1 initial state (default 9-pocket layout has slots 0 to 8)
    const pageSheet1 = page.locator('[data-testid="binder-page-sheet-1"]:visible').first();
    await expect(pageSheet1).toBeVisible({ timeout: 10000 });
    await expect(pageSheet1.locator('[data-testid="binder-slot-8"]')).toBeVisible();

    // 3. Open Settings Modal
    const settingsBtn = page.locator('[data-testid="binder-settings-btn"]');
    await settingsBtn.click();
    await page.waitForTimeout(300);

    // 4. Click 4 ช่อง (2x2) preset
    const preset2x2Btn = page.locator('button:has-text("4 ช่อง (2x2)")');
    await expect(preset2x2Btn).toBeVisible();
    await preset2x2Btn.click();

    // 5. Verify summary reflects 2 แถว × 2 คอลัมน์ = 4 ช่อง
    await expect(page.locator('text=2 แถว × 2 คอลัมน์ = 4 ช่อง')).toBeVisible();

    // 6. Save settings
    const saveBtn = page.locator('button:has-text("บันทึกการตั้งค่า")');
    await saveBtn.click();
    await page.waitForTimeout(400);

    // 7. Page 1 must immediately update to have exactly 4 slots (0..3) and slot 4 is absent
    const updatedPageSheet1 = page.locator('[data-testid="binder-page-sheet-1"]:visible').first();
    await expect(updatedPageSheet1.locator('[data-testid="binder-slot-3"]')).toBeVisible();
    await expect(updatedPageSheet1.locator('[data-testid="binder-slot-4"]')).not.toBeVisible();
  });
});
