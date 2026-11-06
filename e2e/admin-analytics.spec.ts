import { test, expect } from '@playwright/test';

test.describe('Admin Analytics & Telemetry Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);

    // Pre-populate mock telemetry and cloud cache
    await page.addInitScript(() => {
      // Mock local telemetry events
      const mockEvents = [
        { id: '1', category: 'card', action: 'add', label: 'card-001', value: 1, timestamp: Date.now() },
        { id: '2', category: 'deck', action: 'add_card', label: 'deck-001', value: 4, timestamp: Date.now() },
        { id: '3', category: 'filter', action: 'set', label: 'sv8a', value: 1, timestamp: Date.now() },
        { id: '4', category: 'filter', action: 'set', label: 'sv8s', value: 1, timestamp: Date.now() },
      ];
      localStorage.setItem('pokecount_analytics_events', JSON.stringify(mockEvents));

      // Mock cloud metrics cache
      const mockCloudMetrics = {
        users: { totalRegistered: 125, active7d: 42, active24h: 18 },
        communityCards: 18500,
        rooms: { total: 35, active: 4 },
        sharedCollections: 12,
        cachedAt: Date.now(),
      };
      localStorage.setItem('pokecount_admin_cloud_metrics', JSON.stringify(mockCloudMetrics));
    });
  });

  test('Admin dashboard renders updated KPIs, Series A-J database count, and telemetry breakdown', async ({ page }) => {
    // 1. Visit /admin
    await page.goto('/admin');
    await expect(page.getByText('PokéCount Admin Access')).toBeVisible({ timeout: 10000 });

    // 2. Authenticate
    await page.locator('input[type="password"]').fill('poke911admin');
    await page.getByRole('button', { name: /ปลดล็อกระบบ Admin/ }).click();

    // 3. Verify Admin Console Header & refresh time indicator
    await expect(page.getByText('PokeCount Admin Console')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/System Analytics & Telemetry Control/)).toBeVisible();

    // 4. Verify 4 KPI Top Cards
    // KPI 1: Registered users
    await expect(page.getByText('ผู้ใช้งานที่ลงทะเบียน')).toBeVisible();
    await expect(page.getByText(/Active 7 วัน:/)).toBeVisible();

    // KPI 2: Community cards
    await expect(page.getByText('การ์ดที่ถูกครอบครองในระบบ')).toBeVisible();

    // KPI 3: Total cards database with Series A-J
    await expect(page.getByText('การ์ดทั้งหมดในระบบ')).toBeVisible();
    await expect(page.getByText(/Series A - J/)).toBeVisible();

    // KPI 4: Battle & share stats
    await expect(page.getByText('ห้องดวล & การแชร์')).toBeVisible();

    // 5. Tab 1: ภาพรวม & การค้นหา
    await expect(page.getByText('Local Session Telemetry')).toBeVisible();
    await expect(page.getByText('ใส่การ์ดในเด็ค')).toBeVisible();

    // 6. Tab 2: Regulation & ธาตุ
    const trendsTab = page.getByRole('button', { name: /Regulation & ธาตุ/ });
    await trendsTab.click();
    await expect(page.getByText('ชุดการ์ดยอดนิยม (Top Filtered Expansion Sets)')).toBeVisible({ timeout: 5000 });

    // 7. Tab 4: ชุมชน & ฐานข้อมูล
    const communityTab = page.getByRole('button', { name: /ชุมชน & ฐานข้อมูล/ });
    await communityTab.click();
    await expect(page.getByText('สถิติชุมชน & ฐานข้อมูลกลาง (Community Stats)')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('การ์ดที่มีผู้ครอบครองสูงสุดในระบบ (Top Owned Community Cards)')).toBeVisible({ timeout: 5000 });
  });
});
