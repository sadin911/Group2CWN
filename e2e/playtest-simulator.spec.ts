import { test, expect } from '@playwright/test';

async function ensureDeck(page: any) {
  await page.waitForTimeout(400);
  const deckCard = page.locator('[data-testid="deck-card"]').first();
  if (!(await deckCard.isVisible())) {
    const createDeckBtn = page.getByRole('button', { name: /สร้างเด็คใหม่/i }).first();
    if (await createDeckBtn.isVisible()) {
      await createDeckBtn.click();
      const nameInput = page.locator('input[placeholder*="Charizard"]');
      await expect(nameInput).toBeVisible({ timeout: 5000 });
      await nameInput.fill('E2E Uniform Button Deck');
      await page.locator('button:has-text("สร้างเด็ค")').last().click();
      await page.waitForTimeout(400);

      // We are in DeckEditor. Return to DeckManager via back button
      const backBtn = page.locator('button:has-text("ปิดเด็ค")');
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await page.waitForTimeout(400);
      }
    }
  }
}

test.describe('Deck Manager Card Actions & Layout Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/deck', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Deck Manager', { exact: false }).first()).toBeVisible({ timeout: 15000 });
    await ensureDeck(page);
  });

  test('deck card displays uniform, balanced action buttons without Playmat link', async ({ page }) => {
    const deckCard = page.locator('[data-testid="deck-card"]').first();
    await expect(deckCard).toBeVisible({ timeout: 10000 });

    // Verify Playmat link is removed
    await expect(deckCard.locator('button[title*="Digital Playmat"]')).not.toBeVisible();

    // Verify essential action buttons are properly rendered
    const viewBtn = deckCard.locator('button:has-text("ดูเด็ค")');
    const editBtn = deckCard.locator('button:has-text("จัดเด็ค")');
    const duplicateBtn = deckCard.locator('button[title="คัดลอกเด็คนี้"]');
    const deleteBtn = deckCard.locator('button[title="ลบเด็คนี้"]');

    await expect(viewBtn).toBeVisible();
    await expect(editBtn).toBeVisible();
    await expect(duplicateBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();
  });

  test('deck view modal opens cleanly without Playmat button', async ({ page }) => {
    const viewBtn = page.locator('[data-testid="deck-card"] button:has-text("ดูเด็ค")').first();
    await expect(viewBtn).toBeVisible({ timeout: 10000 });
    await viewBtn.click();

    const viewModal = page.locator('.fixed.inset-0.z-50');
    await expect(viewModal).toBeVisible({ timeout: 10000 });

    // Verify Playmat button is NOT present in modal
    await expect(viewModal.locator('button:has-text("เล่นบน Playmat")')).not.toBeVisible();

    // Verify modal actions
    await expect(viewModal.locator('button:has-text("คัดลอก Deck List")')).toBeVisible();
    await expect(viewModal.locator('button:has-text("จัดเด็คนี้")')).toBeVisible();

    // Close modal
    await viewModal.locator('button:has-text("ปิด")').first().click();
    await expect(viewModal).not.toBeVisible();
  });

  test('DeckEditor stats bar renders clean missing cards button without Playmat', async ({ page }) => {
    const editBtn = page.locator('[data-testid="deck-card"] button:has-text("จัดเด็ค")').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    await page.waitForTimeout(500);

    // Verify Playmat button is NOT present in stats bar
    await expect(page.locator('button[title*="Digital Playmat"]')).not.toBeVisible();

    // Verify Missing cards calculator trigger is visible
    const missingTrigger = page.locator('[data-testid="missing-cards-trigger"]');
    await expect(missingTrigger).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Collapsible Filter Bar Suite', () => {
  test('toggles advanced filter panel visibility on click', async ({ page }) => {
    await page.goto('/collection');
    await expect(page.locator('h1')).toContainText('PokéCollection');

    const filterBtn = page.locator('[data-testid="advanced-filter-btn"]');
    await expect(filterBtn).toBeVisible({ timeout: 10000 });

    const categorySelect = page.locator('[data-testid="category-select"]');

    // Initially collapsed to save vertical screen space
    await expect(categorySelect).not.toBeVisible();

    // Click to open/expand
    await filterBtn.click();
    await expect(categorySelect).toBeVisible({ timeout: 5000 });

    // Click again to hide/collapse
    await filterBtn.click();
    await expect(categorySelect).not.toBeVisible({ timeout: 5000 });
  });
});
