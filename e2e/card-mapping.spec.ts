import { test, expect } from '@playwright/test';

test.describe('Card Mapping Studio Suite', () => {
  test('navigates to mapping studio from deck manager and direct url', async ({ page }) => {
    // 1. Direct URL navigation
    await page.goto('/mapping');
    await expect(page.locator('h1:has-text("PokéMapping Studio")')).toBeVisible({ timeout: 7000 });

    // Click back to deck
    const backBtn = page.locator('button[title*="กลับไปหน้าจัดเด็ค"]');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Verify in Deck Manager
    await expect(page.locator('h2:has-text("คลังเด็คการ์ดของคุณ")')).toBeVisible({ timeout: 5000 });

    // 2. Open via button in Deck Manager
    const mappingBtn = page.locator('button:has-text("จัดการ Map การ์ด")');
    await expect(mappingBtn).toBeVisible();
    await mappingBtn.click();

    // Verify back in studio
    await expect(page.locator('h1:has-text("PokéMapping Studio")')).toBeVisible();
  });

  test('adds a new card mapping, displays it, and deletes it', async ({ page }) => {
    await page.goto('/mapping');
    await expect(page.locator('h1:has-text("PokéMapping Studio")')).toBeVisible({ timeout: 7000 });

    // Click "+ เพิ่มการจับคู่ใหม่"
    const addBtn = page.locator('button:has-text("เพิ่มการจับคู่ใหม่")').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Fill English name
    const enInput = page.locator('input[placeholder*="Dragapult ex, Ultra Ball"]');
    await expect(enInput).toBeVisible();
    await enInput.fill('TestE2ECard');

    // Submit step 1
    const nextBtn = page.locator('button:has-text("ถัดไป: เลือกการ์ดไทย")');
    await nextBtn.click();

    // Verify CardMappingPickerModal appears
    await expect(page.locator('h3:has-text("จับคู่การ์ด: TestE2ECard")')).toBeVisible();

    // Search for a Thai card
    const searchInput = page.locator('input[placeholder*="ค้นหาชื่อการ์ดภาษาไทย"]');
    await searchInput.fill('คำสั่งของบอส');

    // Select the first card candidate via testid
    const selectBtn = page.locator('[data-testid="select-card-mapping"]').first();
    await expect(selectBtn).toBeVisible({ timeout: 5000 });
    await selectBtn.click();

    // Verify notification or mapping item in list
    await expect(page.locator('text=TestE2ECard').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=คำสั่งของบอส').first()).toBeVisible();

    // Delete the mapping
    const deleteBtn = page.locator('button:has-text("ลบ")').first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Verify removed
    await expect(page.locator('text=TestE2ECard')).not.toBeVisible({ timeout: 5000 });
  });

  test('switches between tabs: Built-in Dictionary and Community Suggestions', async ({ page }) => {
    await page.goto('/mapping');
    await expect(page.locator('h1:has-text("PokéMapping Studio")')).toBeVisible({ timeout: 7000 });

    // Switch to Built-in tab
    const builtInTab = page.locator('button:has-text("คลังแปลอัตโนมัติในระบบ")');
    await expect(builtInTab).toBeVisible();
    await builtInTab.click();

    // Verify info banner and cards shown
    await expect(page.locator('text=รายการเหล่านี้ได้รับการแปลและจับคู่ให้อัตโนมัติโดยระบบแล้ว')).toBeVisible();

    // Switch to Community tab
    const communityTab = page.locator('button:has-text("ข้อเสนอแนะจากชุมชน")');
    await expect(communityTab).toBeVisible();
    await communityTab.click();

    // Verify community info banner
    await expect(page.locator('text=ข้อเสนอแนะที่ผู้เล่นท่านอื่นได้ช่วยกันจับคู่ไว้ในระบบ')).toBeVisible({ timeout: 10000 });
  });
});
