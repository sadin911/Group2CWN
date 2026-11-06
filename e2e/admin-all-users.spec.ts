import { test, expect } from '@playwright/test';

test.describe('Admin All Users & Beta Permission Management', () => {
  test.beforeEach(async () => {
    test.setTimeout(60000);
  });

  test('Admin can access All Users panel and toggle Playmat Beta access', async ({ page }) => {
    // 1. Seed some mock users in localStorage for user service fallback
    await page.addInitScript(() => {
      const mockUsers = [
        {
          uid: 'user_ash_ketchum',
          email: 'ash@pallettown.com',
          displayName: 'Ash Ketchum',
          lastActive: Date.now(),
        },
        {
          uid: 'user_misty_cerulean',
          email: 'misty@ceruleangym.com',
          displayName: 'Misty Waterflower',
          lastActive: Date.now() - 100000,
        },
        {
          uid: 'user_brock_pewter',
          email: 'brock@pewtergym.com',
          displayName: 'Brock Harrison',
          lastActive: Date.now() - 200000,
        },
      ];
      localStorage.setItem('pokecount_all_web_users_cache', JSON.stringify(mockUsers));
      // Pre-grant access only to Ash
      localStorage.setItem(
        'pokecount_playmat_allowed_users',
        JSON.stringify([
          {
            id: 'allow_1',
            identifier: 'ash@pallettown.com',
            note: 'Champion Ash',
            addedAt: Date.now(),
          },
        ])
      );
    });

    // 2. Go to /admin
    await page.goto('/admin');
    await expect(page.getByText('PokéCount Admin Access')).toBeVisible({ timeout: 10000 });

    // Enter passkey
    const passkeyInput = page.locator('input[type="password"]');
    await passkeyInput.fill('poke911admin');
    await page.getByRole('button', { name: /ปลดล็อกระบบ Admin/ }).click();

    // Verify Admin Dashboard loads
    await expect(page.getByText('PokeCount Admin Console')).toBeVisible({ timeout: 10000 });

    // 3. Click on "ผู้ใช้ & ชุมชน" category then "ผู้ใช้ทั้งหมด" tab
    const communityCat = page.getByRole('button', { name: /ผู้ใช้ & ชุมชน/ });
    if (await communityCat.isVisible()) {
      await communityCat.click();
    }
    const usersTab = page.getByRole('button', { name: /ผู้ใช้ทั้งหมด/ });
    await expect(usersTab).toBeVisible();
    await usersTab.click();

    // Verify All Users panel renders
    await expect(page.getByTestId('admin-all-users-panel')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('รายชื่อผู้ใช้ที่บันทึกในระบบ (Web Users Directory)')).toBeVisible();

    // 4. Verify seeded users are displayed
    await expect(page.getByTestId('user-row-user_ash_ketchum')).toBeVisible();
    await expect(page.getByTestId('user-row-user_misty_cerulean')).toBeVisible();
    await expect(page.getByTestId('user-row-user_brock_pewter')).toBeVisible();

    // Ash should have "Beta Allowed" badge
    const ashRow = page.getByTestId('user-row-user_ash_ketchum');
    await expect(ashRow.getByTestId('badge-allowed')).toBeVisible();

    // Misty should have "No Access" badge
    const mistyRow = page.getByTestId('user-row-user_misty_cerulean');
    await expect(mistyRow.getByTestId('badge-denied')).toBeVisible();

    // 5. Test search filter
    const searchInput = page.getByTestId('search-users-input');
    await searchInput.fill('Misty');
    await expect(page.getByTestId('user-row-user_misty_cerulean')).toBeVisible();
    await expect(page.getByTestId('user-row-user_ash_ketchum')).not.toBeVisible();
    await searchInput.clear();

    // 6. Grant Playmat Beta access to Misty with 1-click
    const grantBtn = mistyRow.getByTestId('toggle-playmat-access-btn');
    await grantBtn.click();

    // Misty's row should now show Beta Allowed
    await expect(mistyRow.getByTestId('badge-allowed')).toBeVisible({ timeout: 10000 });
  });
});
