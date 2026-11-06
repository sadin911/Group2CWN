import { test, expect } from '@playwright/test';

test.describe('Share Collection Showcase E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/collection');
    await expect(page.locator('h1')).toContainText('PokéCollection');
  });

  test('opens share collection modal, generates share link, and views shared collection', async ({ page }) => {
    // Click the Share button in the header
    const shareButton = page.locator('button[data-testid="share-collection-button"]');
    await expect(shareButton).toBeVisible({ timeout: 10000 });
    await shareButton.click();

    // Verify modal is visible
    const modal = page.locator('[data-testid="share-collection-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify share options/checkboxes exist
    await expect(modal.locator('text=แสดงราคาตลาด')).toBeVisible();

    // Sharing is view-only, so there is no longer an option to let visitors
    // copy the binder into their own account.
    await expect(modal.locator('text=อนุญาตให้ผู้อื่นคัดลอกสมุดนี้')).toHaveCount(0);

    // Verify publish button
    const publishBtn = modal.locator('button[data-testid="publish-share-btn"]');
    await expect(publishBtn).toBeVisible();
    await publishBtn.click();

    // After publishing, share link and copy button should appear
    const copyBtn = modal.locator('button[data-testid="copy-share-link-btn"]');
    await expect(copyBtn).toBeVisible({ timeout: 8000 });

    // Get the generated share URL from the input
    const shareUrlInput = modal.locator('input[readonly]');
    const shareUrl = await shareUrlInput.inputValue();
    expect(shareUrl).toContain('/share/');

    // Click QR Code thumbnail to expand QR modal
    const qrThumbnail = modal.locator('img[alt="QR Code"]').first();
    await expect(qrThumbnail).toBeVisible();
    await qrThumbnail.click();

    // Verify large QR modal opened
    await expect(page.locator('text=QR Code สแกนดูสมุดสะสม')).toBeVisible({ timeout: 5000 });

    // Close QR modal
    await page.locator('button:has-text("ปิด")').last().click();

    // Close share modal
    await page.locator('button:has-text("ปิด")').last().click();

    // Navigate to the published share URL
    await page.goto(shareUrl);

    // Verify Shared Collection Viewer loaded
    await expect(page.locator('[data-testid="shared-collection-page"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=สมุดสะสมการ์ด (Showcase Binder)')).toBeVisible();

    // Verify stats banner values
    await expect(page.locator('text=การ์ดทั้งหมด')).toBeVisible();
    await expect(page.locator('text=แบบไม่ซ้ำ')).toBeVisible();

    // Sharing is view-only: a visitor is given no way to copy the binder into
    // their own account, which would have made their binder claim cards they do
    // not own and inflated the community ownership counts.
    await expect(page.locator('button[data-testid="clone-binder-btn"]')).toHaveCount(0);
    await expect(page.locator('text=คัดลอกลงสมุดฉัน')).toHaveCount(0);
  });
});
