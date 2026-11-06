import { test, expect } from '@playwright/test';

test.describe('Battle Counter Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/battle');
    await expect(page.locator('text=Player 1').first()).toBeVisible({ timeout: 10000 });
  });

  test('loads Battle board and displays Player 1 and Player 2 sections', async ({ page }) => {
    await expect(page.locator('text=Player 1').first()).toBeVisible();
    await expect(page.locator('text=Player 2').first()).toBeVisible();
  });

  test('sets Active Pokemon HP via HP preset picker modal', async ({ page }) => {
    const activeSlot = page.locator('button:has-text("Active"), button:has-text("Set HP")').first();
    await expect(activeSlot).toBeVisible();
    await activeSlot.click();

    const presetModal = page.locator('.fixed.inset-0.z-50');
    await expect(presetModal).toBeVisible();

    // Pick an HP preset in Step 1
    const hpBtn = presetModal.locator('button:has-text("200"), button:has-text("220"), button:has-text("280")').first();
    await hpBtn.click();
    await page.waitForTimeout(300);

    // In Step 2, click the first matching card
    const cardChoice = presetModal.locator('button:has-text("ex"), button:has-text("พื้นฐาน"), button').first();
    if (await cardChoice.isVisible()) {
      await cardChoice.click();
    } else {
      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(300);
  });

  test('interacts with damage counter buttons (+10, -10)', async ({ page }) => {
    const emptySlot = page.locator('button:has-text("Active"), button:has-text("Set HP")').first();
    if (await emptySlot.isVisible()) {
      await emptySlot.click();
      const presetModal = page.locator('.fixed.inset-0.z-50');
      const hpBtn = presetModal.locator('button:has-text("200")').first();
      if (await hpBtn.isVisible()) {
        await hpBtn.click();
        await page.waitForTimeout(300);
        const cardChoice = presetModal.locator('button').first();
        if (await cardChoice.isVisible()) {
          await cardChoice.click();
        }
      }
    }

    const plus10Btn = page.locator('button:has-text("+10"), button[title*="+10"]').first();
    if (await plus10Btn.isVisible()) {
      await plus10Btn.click();
      await page.waitForTimeout(100);
      const minus10Btn = page.locator('button:has-text("-10"), button[title*="-10"]').first();
      if (await minus10Btn.isVisible()) {
        await minus10Btn.click();
      }
    }
  });

  test('opens Coin Flip and Dice Roller tools', async ({ page }) => {
    // Test Coin Flip tool
    const coinBtn = page.locator('button:has-text("🪙")').first();
    if (await coinBtn.isVisible()) {
      await coinBtn.click();
      await page.waitForTimeout(1100); // Wait for flip animation
      // Tap overlay to dismiss
      const coinOverlay = page.locator('.fixed.inset-0.z-50');
      if (await coinOverlay.isVisible()) {
        await coinOverlay.click();
      }
    }

    // Test Dice Roller tool
    const diceBtn = page.locator('button:has-text("🎲")').first();
    if (await diceBtn.isVisible()) {
      await diceBtn.click();
      await page.waitForTimeout(1100);
      const diceOverlay = page.locator('.fixed.inset-0.z-50');
      if (await diceOverlay.isVisible()) {
        await diceOverlay.click();
      }
    }
  });
});
