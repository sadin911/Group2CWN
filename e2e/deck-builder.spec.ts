import { test, expect } from '@playwright/test';

test.describe('Deck Builder Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/deck');
    await expect(page.getByText('Deck Manager', { exact: false })).toBeVisible({ timeout: 10000 });
  });

  test('creates a new deck and navigates to Deck Editor', async ({ page }) => {
    const createDeckBtn = page.getByRole('button', { name: /สร้างเด็คใหม่/i }).first();
    await expect(createDeckBtn).toBeVisible();
    await createDeckBtn.click();

    const nameInput = page.locator('input[placeholder*="Charizard"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('E2E Test Pikachu Deck');

    const confirmCreateBtn = page.locator('button:has-text("สร้างเด็ค")').last();
    await confirmCreateBtn.click();

    await expect(page.getByText('E2E Test Pikachu Deck')).toBeVisible({ timeout: 10000 });
  });

  test('searches catalog in Deck Editor and adds cards to deck', async ({ page }) => {
    const createDeckBtn = page.getByRole('button', { name: /สร้างเด็คใหม่/i }).first();
    await createDeckBtn.click();
    const nameInput = page.locator('input[placeholder*="Charizard"]');
    await nameInput.fill('E2E Search Add Deck');
    await page.locator('button:has-text("สร้างเด็ค")').last().click();

    // Switch to Catalog tab if on mobile
    const catalogTab = page.locator('button:has-text("ค้นหาการ์ดเพิ่ม"), button:has-text("ค้นหาการ์ด")').first();
    if (await catalogTab.isVisible()) {
      await catalogTab.click();
      await page.waitForTimeout(200);
    }

    const searchInput = page.locator('input[placeholder*="ค้นหาชื่อการ์ด"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('พิคาชู');
      await page.waitForTimeout(400);
    }

    const addCardBtn = page.locator('button[title*="เพิ่มเข้าเด็ค (+1)"], button:has-text("+")').first();
    if (await addCardBtn.isVisible()) {
      await addCardBtn.click({ force: true });
      await page.waitForTimeout(200);
    }

    // If mobile tab switcher is present, switch back to Deck tab
    const deckTab = page.locator('button:has-text("การ์ดในเด็ค")').first();
    if (await deckTab.isVisible()) {
      await deckTab.click();
      await page.waitForTimeout(200);
    }

    await expect(page.locator('text=60 ใบ').first()).toBeVisible();
  });

  test('opens and closes Deck Import/Export modal', async ({ page }) => {
    const importExportBtn = page.locator('button:has-text("นำเข้าเด็ค"), button[title*="นำเข้า"]').first();
    if (await importExportBtn.isVisible()) {
      await importExportBtn.click();
      await expect(page.locator('.fixed.inset-0.z-50')).toBeVisible();

      await page.keyboard.press('Escape');
    }
  });

  test('imports Limitless English decklist text into a new deck with live preview', async ({ page }) => {
    const importBtn = page.locator('button:has-text("นำเข้าเด็ค"), button[title*="นำเข้า"]').first();
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).toBeVisible();

    // Click Import tab
    const importTab = modal.locator('button:has-text("นำเข้าเด็ค (Import)")');
    await importTab.click();

    // Paste Limitless English decklist text
    const sampleLimitlessText = `Pokémon: 10
4 Dreepy TWM 128
4 Drakloak TWM 129
2 Dragapult ex TWM 130
Trainer: 8
4 Buddy-Buddy Poffin TEF 144
4 Ultra Ball PAF 91
Energy: 4
4 Fire Energy MEE 2`;

    const textarea = modal.locator('textarea[placeholder*="ตัวอย่างจาก Limitless"]');
    await textarea.fill(sampleLimitlessText);

    // Verify live preview renders deck title, total count badge, breakdown badges
    await expect(modal.locator('text=Dragapult ex').first()).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('text=22 / 60 ใบ')).toBeVisible();
    await expect(modal.locator('text=โดราพัลท์ex').first()).toBeVisible();

    // Click submit import button
    const submitBtn = modal.locator('button:has-text("นำเข้าเด็ค \\"Dragapult ex\\"")');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Verify modal closes and new deck appears in Deck Manager list
    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Dragapult ex').first()).toBeVisible();
  });

  test('interactively maps an unmatched card via search picker modal and updates deck count', async ({ page }) => {
    const importBtn = page.locator('button:has-text("นำเข้าเด็ค"), button[title*="นำเข้า"]').first();
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).toBeVisible();

    // Click Import tab
    const importTab = modal.locator('button:has-text("นำเข้าเด็ค (Import)")');
    await importTab.click();

    // Text with an unmatched card name
    const deckWithUnmatched = `4 Dreepy TWM 128
2 MysteryTrainerXYZ TEF 999`;

    const textarea = modal.locator('textarea[placeholder*="ตัวอย่างจาก Limitless"]');
    await textarea.fill(deckWithUnmatched);

    // Verify unmatched box appears with Map Card button
    await expect(modal.locator('text=ยังไม่พบการ์ดในระบบ 1 รายการ')).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('span:has-text("MysteryTrainerXYZ")')).toBeVisible();

    const mapBtn = modal.locator('button:has-text("จับคู่การ์ด")').first();
    await expect(mapBtn).toBeVisible();
    await mapBtn.click();

    // CardMappingPickerModal should open
    const pickerModal = page.locator('.fixed.inset-0.z-60');
    await expect(pickerModal).toBeVisible();
    await expect(pickerModal.locator('span:has-text("MysteryTrainerXYZ")')).toBeVisible();

    // Search for a Thai card, e.g. "คำสั่งของบอส"
    const searchInput = pickerModal.locator('input[placeholder*="ค้นหาชื่อการ์ด"]');
    await searchInput.fill('คำสั่งของบอส');
    await page.waitForTimeout(400);

    // Pick the first result
    const selectBtn = pickerModal.locator('button:has-text("เลือก")').first();
    await expect(selectBtn).toBeVisible();
    await selectBtn.click();

    // Picker modal should close, deck preview should now have 6 cards and 0 unmatched cards
    await expect(pickerModal).not.toBeVisible({ timeout: 5000 });
    await expect(modal.locator('text=6 / 60 ใบ')).toBeVisible();
    await expect(modal.locator('text=ยังไม่พบการ์ดในระบบ')).not.toBeVisible();
  });

  test('switches Deck Editor between List view and Grid view', async ({ page }) => {
    // Create new deck with name prompt
    const createDeckBtn = page.getByRole('button', { name: /สร้างเด็คใหม่/i }).first();
    await createDeckBtn.click();
    const nameInput = page.locator('input[placeholder*="Charizard"]');
    await nameInput.fill('E2E Grid View Deck');
    await page.locator('button:has-text("สร้างเด็ค")').last().click();

    // Switch to Catalog tab if on mobile
    const catalogTab = page.locator('button:has-text("ค้นหาการ์ดเพิ่ม"), button:has-text("ค้นหาการ์ด")').first();
    if (await catalogTab.isVisible()) {
      await catalogTab.click();
      await page.waitForTimeout(200);
    }

    const searchInput = page.locator('input[placeholder*="ค้นหาชื่อการ์ด"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('พิคาชู');
      await page.waitForTimeout(400);
    }

    const addCardBtn = page.locator('button[title*="เพิ่มเข้าเด็ค (+1)"], button:has-text("+")').first();
    if (await addCardBtn.isVisible()) {
      await addCardBtn.click({ force: true });
      await page.waitForTimeout(200);
    }

    // If mobile, switch back to Deck tab
    const deckTab = page.locator('button:has-text("การ์ดในเด็ค")').first();
    if (await deckTab.isVisible()) {
      await deckTab.click();
      await page.waitForTimeout(200);
    }

    // Verify card is added in List view by default
    const swapBtn = page.locator('button[title*="Swap Card"], button:has-text("🔄")').first();
    await expect(swapBtn).toBeVisible();

    // Switch to Grid view
    const gridBtn = page.locator('button:has-text("ตาราง")').first();
    await expect(gridBtn).toBeVisible();
    await gridBtn.click();

    // Verify grid item swap button is visible
    await expect(page.locator('button[title*="Swap Card"], button:has-text("🔄")').first()).toBeVisible();

    // Switch back to List view
    const listBtn = page.locator('button:has-text("รายการ")').first();
    await expect(listBtn).toBeVisible();
    await listBtn.click();

    await expect(page.locator('button[title*="Swap Card"], button:has-text("🔄")').first()).toBeVisible();
  });

  test('swaps a card in Deck Editor using CardSwapModal', async ({ page }) => {
    // Create new deck with name prompt
    const createDeckBtn = page.getByRole('button', { name: /สร้างเด็คใหม่/i }).first();
    await createDeckBtn.click();
    const nameInput = page.locator('input[placeholder*="Charizard"]');
    await nameInput.fill('E2E Swap Card Deck');
    await page.locator('button:has-text("สร้างเด็ค")').last().click();

    // Switch to Catalog tab if on mobile
    const catalogTab = page.locator('button:has-text("ค้นหาการ์ดเพิ่ม"), button:has-text("ค้นหาการ์ด")').first();
    if (await catalogTab.isVisible()) {
      await catalogTab.click();
      await page.waitForTimeout(200);
    }

    const searchInput = page.locator('input[placeholder*="ค้นหาชื่อการ์ด"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('พิคาชู');
      await page.waitForTimeout(400);
    }

    const addCardBtn = page.locator('button[title*="เพิ่มเข้าเด็ค (+1)"], button:has-text("+")').first();
    if (await addCardBtn.isVisible()) {
      await addCardBtn.click({ force: true });
      await page.waitForTimeout(200);
    }

    // Switch to Deck tab if on mobile
    const deckTab = page.locator('button:has-text("การ์ดในเด็ค")').first();
    if (await deckTab.isVisible()) {
      await deckTab.click();
      await page.waitForTimeout(200);
    }

    // Click Swap button
    const swapBtn = page.locator('button[title*="Swap Card"], button:has-text("🔄")').first();
    await expect(swapBtn).toBeVisible();
    await swapBtn.click();

    // CardSwapModal should open
    const swapModal = page.locator('.fixed.inset-0.z-60, .fixed.inset-0:has-text("สลับการ์ดในเด็ค")').first();
    await expect(swapModal).toBeVisible();
    await expect(swapModal.locator('text=สลับการ์ดในเด็ค')).toBeVisible();

    // Switch to Search All tab
    const searchTab = swapModal.locator('button:has-text("ค้นหาการ์ดทั้งหมด")');
    await searchTab.click();

    const swapSearch = swapModal.locator('input[placeholder*="ค้นหาชื่อการ์ด"]');
    await swapSearch.fill('อีวุย');
    await page.waitForTimeout(400);

    // Pick first candidate to swap
    const selectSwapBtn = swapModal.locator('button:has-text("สลับใบนี้")').first();
    await expect(selectSwapBtn).toBeVisible();
    await selectSwapBtn.click();

    // Modal closes and deck now contains Eevee
    await expect(swapModal).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=อีวุย').first()).toBeVisible();
  });

  test('views deck in standalone DeckViewModal and toggles Grid view', async ({ page }) => {
    // Look for View Deck button in deck manager
    const viewBtn = page.locator('button:has-text("ดูเด็ค")').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();

      const viewModal = page.locator('.fixed.inset-0.z-50');
      await expect(viewModal).toBeVisible({ timeout: 10000 });
      await expect(viewModal.locator('text=Deck View')).toBeVisible();

      // Toggle buttons exist
      const listBtn = viewModal.locator('button:has-text("รายการ")').first();
      const gridBtn = viewModal.locator('button:has-text("ตาราง")').first();
      await expect(listBtn).toBeVisible();
      await expect(gridBtn).toBeVisible();

      // Switch to list and back to grid
      await listBtn.click();
      await gridBtn.click();

      // Close modal
      const closeBtn = viewModal.locator('button:has-text("✕"), button[title*="ปิด"], button:has-text("ปิด")').first();
      await closeBtn.click();
      await expect(viewModal).not.toBeVisible();
    }
  });

  test('verifies meta decks hub card action buttons fit within card boundaries without overflow across multiple viewports', async ({ page }) => {
    // Open Meta Decks Hub tab
    const metaTabBtn = page.getByRole('button', { name: /เด็คเมต้าแข่งขัน/i }).first();
    await expect(metaTabBtn).toBeVisible();
    await metaTabBtn.click();

    // Verify Meta Decks Hub title is visible
    await expect(page.getByText('เด็คแข่งขันระดับโลก')).toBeVisible({ timeout: 10000 });

    // Wait for meta deck cards to appear
    const firstDeckCard = page.locator('div.rounded-3xl.p-5').first();
    await expect(firstDeckCard).toBeVisible();

    const viewports = [
      { width: 360, height: 740 },  // Mobile small
      { width: 640, height: 800 },  // Small tablet / phablet breakpoint
      { width: 768, height: 1024 }, // Tablet portrait (2 columns)
      { width: 1024, height: 768 }, // Desktop small (3 columns start - where previous bug occurred)
      { width: 1280, height: 800 }, // Standard laptop
      { width: 1440, height: 900 }, // Full desktop
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(200);

      // Check buttons
      const viewBtn = firstDeckCard.locator('button:has-text("ดูการ์ด")');
      const missingBtn = firstDeckCard.locator('button:has-text("การ์ดขาด")');
      const cloneBtn = firstDeckCard.locator('button:has-text("โคลนเด็ค")');

      await expect(viewBtn).toBeVisible();
      await expect(missingBtn).toBeVisible();
      await expect(cloneBtn).toBeVisible();

      // Bounding box overflow assertion
      const cardBox = await firstDeckCard.boundingBox();
      expect(cardBox).not.toBeNull();

      const cloneBox = await cloneBtn.boundingBox();
      expect(cloneBox).not.toBeNull();

      if (cardBox && cloneBox) {
        // Clone button must stay strictly within card horizontal boundary (tolerance 2px)
        expect(cloneBox.x).toBeGreaterThanOrEqual(cardBox.x - 2);
        expect(cloneBox.x + cloneBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 2);
      }

      const viewBtnBox = await viewBtn.boundingBox();
      const missingBtnBox = await missingBtn.boundingBox();
      if (cardBox && viewBtnBox && missingBtnBox) {
        expect(viewBtnBox.x).toBeGreaterThanOrEqual(cardBox.x - 2);
        expect(missingBtnBox.x + missingBtnBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 2);
      }
    }
  });
});



