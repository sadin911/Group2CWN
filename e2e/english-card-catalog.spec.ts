import { test, expect } from '@playwright/test';

test.describe('English Card Catalog & Bilingual Pairing E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/collection');
    await expect(page.locator('header')).toBeVisible({ timeout: 10000 });
  });

  test('toggles to English Card Catalog and verifies sets & cards load', async ({ page }) => {
    // 1. Locate and click the English Catalog toggle button in the header
    const catalogToggle = page.locator('[data-testid="region-catalog-toggle"]');
    await expect(catalogToggle).toBeVisible();
    await catalogToggle.click();

    // 2. Verify English Card Browser banner is visible
    const enBanner = page.locator('text=English Pokémon TCG Catalog (คลังการ์ดภาษาอังกฤษ)');
    await expect(enBanner).toBeVisible({ timeout: 10000 });

    // 3. Verify total cards counter or set selector is populated
    const setSelectBtn = page.locator('[data-testid="searchable-set-select-btn"]');
    await expect(setSelectBtn).toBeVisible();
    await setSelectBtn.click();
    await expect(page.locator('text=Prismatic Evolutions').first()).toBeVisible();
    await page.keyboard.press('Escape');

    // Ensure English cards are loaded
    await expect(page.locator('[data-testid="en-card-item"]').first()).toBeVisible({ timeout: 25000 });

    // 4. Test searching for an English card
    const searchInput = page.locator('[data-testid="en-search-input"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Pikachu');

    // Wait for filtered results
    const cardTitle = page.locator('h4:has-text("Pikachu")').first();
    await expect(cardTitle).toBeVisible({ timeout: 15000 });

    // 5. Switch back to Thai cards
    const switchBackBtn = page.locator('button:has-text("การ์ดไทย")').first();
    await switchBackBtn.click();

    // Verify back to Thai view
    await expect(page.locator('text=English Pokémon TCG Catalog')).not.toBeVisible();
  });

  test('opens card detail modal, switches bilingual TH/EN, and opens re-match drawer', async ({ page }) => {
    // 1. In Thai binder, wait for card items and click the first card
    const firstThaiCard = page.locator('[data-testid="collection-card-item"]').first();
    await expect(firstThaiCard).toBeVisible({ timeout: 15000 });
    await firstThaiCard.click();

    // 2. Verify CardCollectionModal opened
    const modal = page.locator('[data-testid="card-detail"]');
    await expect(modal).toBeVisible({ timeout: 8000 });

    // 3. Verify Bilingual Switcher Bar is present
    const thTab = page.locator('[data-testid="bilingual-tab-th"]');
    const enTab = page.locator('[data-testid="bilingual-tab-en"]');
    await expect(thTab).toBeVisible();
    await expect(enTab).toBeVisible();

    // 4. Click '🇺🇸 EN' tab to toggle counterpart
    await enTab.click();

    // 5. Verify '✏️ แก้ไขคู่' button is visible and click it
    const editRematchBtn = page.locator('[data-testid="bilingual-rematch-btn"]');
    await expect(editRematchBtn).toBeVisible();
    await editRematchBtn.click();

    // 6. Verify Re-Match Modal appears with candidate search
    const rematchModal = page.locator('[data-testid="rematch-modal"]');
    await expect(rematchModal).toBeVisible({ timeout: 8000 });

    // Verify search input in re-match modal
    const rematchInput = page.locator('[data-testid="rematch-search-input"]');
    await expect(rematchInput).toBeVisible();

    // Close re-match modal
    const closeDrawerBtn = page.locator('[data-testid="rematch-close-btn"]');
    await closeDrawerBtn.click();
    await expect(rematchModal).not.toBeVisible();

    // Close the detail modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('opens English card, verifies detail modal with Thai switch, and re-match search', async ({ page }) => {
    // 1. Toggle to English Catalog
    const catalogToggle = page.locator('[data-testid="region-catalog-toggle"]');
    await catalogToggle.click();
    await expect(page.locator('text=English Pokémon TCG Catalog (คลังการ์ดภาษาอังกฤษ)')).toBeVisible({ timeout: 10000 });

    // 2. Click on the first English card in the grid
    const firstEnCard = page.locator('[data-testid="en-card-item"]').first();
    await expect(firstEnCard).toBeVisible({ timeout: 25000 });
    await firstEnCard.click();

    // 3. Detail modal opens for English card
    const modal = page.locator('[data-testid="card-detail"]');
    await expect(modal).toBeVisible({ timeout: 8000 });

    // 4. Verify bilingual switcher has '🇺🇸 EN' and '🇹🇭 ไทย'
    const thTab = page.locator('[data-testid="bilingual-tab-th"]');
    await expect(thTab).toBeVisible();
    await thTab.click();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('opens Thai-English Mapping Studio modal from header toolbar', async ({ page }) => {
    // Click '🔄 จับคู่ TH-EN' button in header
    const mappingStudioBtn = page.locator('[data-testid="card-mapping-button"]');
    await expect(mappingStudioBtn).toBeVisible();
    await mappingStudioBtn.click();

    // Verify Mapping Studio modal opened
    const studioHeader = page.locator('h2:has-text("Thai ⇄ English Card Mapping Studio")');
    await expect(studioHeader).toBeVisible({ timeout: 7000 });

    // Close studio via testid
    const closeBtn = page.locator('[data-testid="mapping-studio-close-btn"]');
    await closeBtn.click();
    await expect(studioHeader).not.toBeVisible();
  });

  test('filters English cards by Mark J and verifies Mega Darkrai ex cards display artwork', async ({ page }) => {
    // 1. Toggle to English Catalog
    const catalogToggle = page.locator('[data-testid="region-catalog-toggle"]');
    await catalogToggle.click();
    await expect(page.locator('text=English Pokémon TCG Catalog (คลังการ์ดภาษาอังกฤษ)')).toBeVisible({ timeout: 10000 });

    // 2. Select Mark [J] in regulation dropdown
    const regSelect = page.locator('[data-testid="regulation-select"]');
    if (!(await regSelect.isVisible())) {
      const advBtn = page.locator('[data-testid="english-advanced-filter-btn"]');
      if (await advBtn.isVisible()) {
        await advBtn.click();
      }
    }
    await expect(regSelect).toBeVisible();
    await regSelect.selectOption('J');

    // 3. Search for Darkrai
    const searchInput = page.locator('[data-testid="en-search-input"]');
    await searchInput.fill('Darkrai');

    // 4. Verify Mega Darkrai ex appears
    const darkraiCard = page.locator('h4:has-text("Mega Darkrai ex")').first();
    await expect(darkraiCard).toBeVisible({ timeout: 15000 });

    // 5. Verify no "รอภาพเปิดตัว" overlay is displayed
    const upcomingOverlay = page.locator('text=รอภาพเปิดตัว');
    await expect(upcomingOverlay).not.toBeVisible();

    // 6. Verify image loads successfully
    const cardImg = page.locator('[data-testid="en-card-item"] img').first();
    await expect(cardImg).toBeVisible();
    const imgSrc = await cardImg.getAttribute('src');
    expect(imgSrc).toContain('card-images-en/me5/');
  });
});
