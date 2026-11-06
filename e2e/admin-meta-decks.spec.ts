import { test, expect } from '@playwright/test';

test.describe('Admin Meta Decks Manager & Card Remap Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('pokecount_admin_session_auth', 'poke911admin');
    });
  });

  test('navigates to Admin Console and opens Meta Decks tab', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('PokeCount Admin Console')).toBeVisible({ timeout: 10000 });

    // Find and click the Meta Decks tab
    const metaTabBtn = page.getByRole('button', { name: /จัดการเด็คเมต้า/i });
    await expect(metaTabBtn).toBeVisible();
    await metaTabBtn.click();

    // Verify header in MetaDecksAdminPanel
    await expect(page.getByText('จัดการเด็คเมต้าแข่งขัน (Meta Decks Manager)')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Export metaDecks.json')).toBeVisible();

    // Verify meta deck cards are listed
    const firstDeckCard = page.locator('div.rounded-2xl.border:has-text("แก้ไข / Remap")').first();
    await expect(firstDeckCard).toBeVisible({ timeout: 10000 });
  });

  test('opens MetaDeckEditModal from Admin Console and performs card remap', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: /จัดการเด็คเมต้า/i }).click();

    // Click "แก้ไข / Remap" button on first deck
    const editBtn = page.locator('[data-testid="btn-edit-meta-deck"]').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    // Verify MetaDeckEditModal is open
    await expect(page.getByText('Admin Deck Editor')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('รายการการ์ดในเด็ค')).toBeVisible();

    // Verify 60 card counter is displayed
    const counterBadge = page.locator('span:has-text("/ 60 ใบ")').first();
    await expect(counterBadge).toBeVisible();

    // Click "🔁 Remap" on the first card inside modal
    const remapBtn = page.locator('[data-testid="btn-remap-card"]').first();
    await expect(remapBtn).toBeVisible();
    await remapBtn.click();

    // Verify search picker sub-modal opens
    await expect(page.getByText('เลือกการ์ดที่ถูกต้อง (Remap)')).toBeVisible({ timeout: 5000 });

    // Search for a specific card
    const searchInput = page.locator('input[placeholder*="พิมพ์ชื่อการ์ด"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('พิคาชู');
    await page.waitForTimeout(400);

    // Pick a card from results
    const candidateBtn = page.locator('button:has-text("เลือกการ์ดนี้")').first();
    await expect(candidateBtn).toBeVisible({ timeout: 5000 });
    await candidateBtn.click();

    // Verify feedback toast inside modal
    await expect(page.getByText('เปลี่ยนการ์ดเป็น')).toBeVisible({ timeout: 5000 });

    // Save changes
    const saveBtn = page.locator('button:has-text("บันทึกขึ้น Cloud")');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Verify success and modal closes
    await expect(page.getByText('Admin Deck Editor')).not.toBeVisible({ timeout: 5000 });
  });

  test('shows Admin edit button on cards in MetaDecksHub when authorized', async ({ page }) => {
    await page.goto('/deck');

    // Open Meta Decks Hub tab
    const metaHubTab = page.getByRole('button', { name: /เด็คเมต้าแข่งขัน/i }).first();
    await expect(metaHubTab).toBeVisible({ timeout: 10000 });
    await metaHubTab.click();

    // Verify Meta Decks Hub header
    await expect(page.getByText('เด็คแข่งขันระดับโลก')).toBeVisible({ timeout: 10000 });

    // Verify that "แก้ไข (Admin)" button appears on the meta deck card
    const adminEditBtn = page.locator('button:has-text("แก้ไข (Admin)")').first();
    await expect(adminEditBtn).toBeVisible({ timeout: 10000 });

    // Click to open edit modal
    await adminEditBtn.click();
    await expect(page.getByText('Admin Deck Editor')).toBeVisible({ timeout: 5000 });

    // Close modal
    const closeBtn = page.locator('button[title*="ปิดหน้าต่าง"], button:has-text("✕")').first();
    await closeBtn.click();
    await expect(page.getByText('Admin Deck Editor')).not.toBeVisible();
  });
});
