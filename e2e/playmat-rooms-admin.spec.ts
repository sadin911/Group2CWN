import { test, expect } from '@playwright/test';

test.describe('Playmat Rooms Admin Management', () => {
  test('Admin can access Playmat Rooms Manager tab, filter, and inspect rooms', async ({ page }) => {
    // 1. Go to Admin console using passkey
    await page.goto('/admin');
    await expect(page.getByText('PokéCount Admin Access')).toBeVisible({ timeout: 10000 });

    const passkeyInput = page.locator('input[type="password"]');
    await passkeyInput.fill('poke911admin');
    await page.getByRole('button', { name: /ปลดล็อกระบบ Admin/ }).click();

    // Verify Admin Console dashboard loads
    await expect(page.getByText('PokeCount Admin Console')).toBeVisible({ timeout: 10000 });

    // 2. Click on "ห้องดวล Playmat" tab
    const roomsTab = page.getByRole('button', { name: /ห้องดวล Playmat/ });
    await expect(roomsTab).toBeVisible({ timeout: 10000 });
    await roomsTab.click();

    // 3. Verify PlaymatRoomsPanel loaded
    await expect(page.getByTestId('playmat-admin-rooms-panel')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('จัดการห้องดวล Digital Playmat')).toBeVisible();

    // 4. Verify search and filter controls exist
    const searchInput = page.getByPlaceholder(/ค้นหารหัสห้อง/);
    await expect(searchInput).toBeVisible();

    // 5. Test search filter interaction
    await searchInput.fill('PK-NONEXISTENT-999');
    await expect(page.getByText('ไม่พบห้องดวลที่ตรงกับเงื่อนไขการค้นหา')).toBeVisible();

    // Clear search
    await searchInput.fill('');

    // 6. Test status filter buttons scoped to panel
    const panel = page.getByTestId('playmat-admin-rooms-panel');
    const activeFilterBtn = panel.getByRole('button', { name: /กำลังเล่น/ });
    await expect(activeFilterBtn).toBeVisible();
    await activeFilterBtn.click();

    const allFilterBtn = panel.getByRole('button', { name: 'ทั้งหมด', exact: true });
    await expect(allFilterBtn).toBeVisible();
    await allFilterBtn.click();
  });
});
